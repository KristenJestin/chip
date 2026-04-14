import { eq } from "drizzle-orm";
import { type Db } from "../db/client";
import { type Task } from "../db/types";
import { tasks } from "../db/schema";
import {
  assertFeatureExists,
  assertPhaseExists,
  assertTaskExists,
  nextTaskOrder,
} from "../db/helpers";
import { nowUnix } from "../utils/time";
import { validate } from "./validate";
import { AddTaskInputV2, UpdateTaskStatusInput } from "./schemas";
import { checkDependenciesSatisfied, checkPhaseOrderingSatisfied } from "./dependency";
import { addFinding } from "./finding";

export const VALID_TASK_STATUSES = ["todo", "in-progress", "done"] as const;
export type PhaseTaskStatus = (typeof VALID_TASK_STATUSES)[number];

export const VALID_TASK_TYPES = ["feature", "fix", "docs", "test"] as const;
export type TaskType = (typeof VALID_TASK_TYPES)[number];

// ── Services ──────────────────────────────────────────────────────────────────

export async function addTask(
  db: Db,
  featureId: string,
  phaseId: number,
  title: string,
  description?: string,
  options?: { type?: TaskType; parentTaskId?: number },
): Promise<Task> {
  validate(AddTaskInputV2, {
    featureId,
    phaseId,
    title,
    description,
    type: options?.type,
    parentTaskId: options?.parentTaskId,
  });
  await assertFeatureExists(db, featureId);
  await assertPhaseExists(db, phaseId, featureId);

  const order = await nextTaskOrder(db, phaseId);
  const now = nowUnix();

  const [inserted] = await db
    .insert(tasks)
    .values({
      phaseId,
      order,
      title,
      description: description ?? null,
      type: options?.type ?? "feature",
      parentTaskId: options?.parentTaskId ?? null,
      createdAt: now,
      startedAt: null,
      completedAt: null,
    })
    .returning()
    .all();

  if (!inserted) throw new Error("Failed to insert task");
  return inserted;
}

export async function updateTaskStatus(
  db: Db,
  featureId: string,
  phaseId: number,
  taskId: number,
  status: PhaseTaskStatus,
  // `force` and `reason` are intentionally NOT exposed via the CLI or the
  // OpenCode plugin. The rationale:
  //
  //   - Allowing an agent to bypass blocking dependencies with a flag creates
  //     a silent escape hatch: an agent that keeps hitting blocked tasks can
  //     trivially --force its way through, defeating the entire dependency
  //     system without any human awareness.
  //
  //   - The correct flow when a task is blocked is to surface the blocker to
  //     the user and ask how to proceed (resolve the dependency, reorder work,
  //     or explicitly decide to skip it). Forcing should be a conscious human
  //     decision, not an automated one.
  //
  //   - The `force` path is kept here at the core level so the logic is
  //     preserved and can be re-exposed (with proper guardrails — e.g. a
  //     dedicated human-only CLI flag, an audit log, or an approval flow) if
  //     the need arises. Deleting it now would mean re-implementing it later
  //     without the context of why it existed.
  options?: { force?: boolean; reason?: string },
): Promise<Task> {
  validate(UpdateTaskStatusInput, { featureId, phaseId, taskId, status });
  await assertFeatureExists(db, featureId);
  await assertPhaseExists(db, phaseId, featureId);
  await assertTaskExists(db, taskId, phaseId);

  // Enforce blocking checks when moving to in-progress or done
  if (status === "in-progress" || status === "done") {
    const depCheck = await checkDependenciesSatisfied(db, taskId);
    const phaseCheck = await checkPhaseOrderingSatisfied(db, phaseId);
    const isBlocked = depCheck.blocked || phaseCheck.blocked;

    if (isBlocked) {
      if (!options?.force) {
        const blockerNames = [
          ...depCheck.blockers.map((t) => `task ${t.id} "${t.title}"`),
          ...phaseCheck.incompleteTasks.map((t) => `task ${t.id} "${t.title}" (phase ordering)`),
        ];
        throw new Error(
          `Task ${taskId} is blocked by: ${blockerNames.join(", ")}. Resolve blocking tasks first, or ask the user how to proceed.`,
        );
      }

      if (!options.reason) {
        throw new Error(
          "A reason is required when forcing a blocked task status transition",
        );
      }

      // Record forced override as a critical finding
      await addFinding(
        db,
        featureId,
        `Forced status override on task ${taskId} to "${status}": ${options.reason}`,
        { pass: "technical", severity: "critical", category: "correctness" },
      );
    }
  }

  const now = nowUnix();
  const updates: { status: PhaseTaskStatus; startedAt?: number; completedAt?: number } = { status };

  if (status === "in-progress") {
    const current = await db.query.tasks.findFirst({ where: { id: taskId } });
    if (!current?.startedAt) updates.startedAt = now;
  }

  if (status === "done") {
    updates.completedAt = now;
  }

  const [updated] = await db
    .update(tasks)
    .set(updates)
    .where(eq(tasks.id, taskId))
    .returning()
    .all();
  if (!updated) throw new Error("Failed to update task");
  return updated;
}
