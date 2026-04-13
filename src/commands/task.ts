import { eq } from "drizzle-orm";
import { Command } from "@commander-js/extra-typings";
import { type Db, getDb } from "../db/client";
import { type Task } from "../db/types";
import { tasks } from "../db/schema";
import { assertFeatureExists, assertPhaseExists, assertTaskExists, nextTaskOrder } from "../db/helpers";
import { die, errMsg } from "../utils/die";
import { nowUnix } from "../utils/time";

const VALID_STATUSES = ["todo", "in-progress", "review", "done"] as const;
type PhaseTaskStatus = (typeof VALID_STATUSES)[number];

export type { Task };

// ── Services (exported for testing) ──────────────────────────────────────────

export async function addTask(
  db: Db,
  featureId: string,
  phaseId: number,
  title: string,
  description?: string,
): Promise<Task> {
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
): Promise<Task> {
  await assertFeatureExists(db, featureId);
  await assertPhaseExists(db, phaseId, featureId);
  await assertTaskExists(db, taskId, phaseId);

  const now = nowUnix();
  const updates: { status: PhaseTaskStatus; startedAt?: number; completedAt?: number } = { status };

  if (status === "in-progress") {
    const current = await db.query.tasks.findFirst({ where: { id: taskId } });
    if (!current?.startedAt) updates.startedAt = now;
  }

  if (status === "done") {
    updates.completedAt = now;
  }

  const [updated] = await db.update(tasks).set(updates).where(eq(tasks.id, taskId)).returning().all();
  if (!updated) throw new Error("Failed to update task");
  return updated;
}

// ── Commander registration ────────────────────────────────────────────────────

export function registerTaskCommands(program: Command): void {
  const taskCmd = program.command("task").description("Manage tasks");

  // ── task add ──────────────────────────────────────────────────────────────
  taskCmd
    .command("add")
    .description("Add a task to a phase")
    .argument("<feature-id>", "Feature ID")
    .argument("<phase-id>", "Phase ID (numeric)")
    .argument("<title>", "Task title")
    .argument("[description]", "Task description")
    .action(async (featureId, phaseIdStr, title, description) => {
      const db = await getDb();
      const phaseId = parseInt(phaseIdStr, 10);
      if (isNaN(phaseId)) die(`Invalid phase ID: ${phaseIdStr}`);

      try {
        const task = await addTask(db, featureId, phaseId, title, description);
        console.log(`Added task ${task.id} to phase ${phaseId}: ${title}`);
      } catch (err) {
        die(errMsg(err));
      }
    });

  // ── task status ───────────────────────────────────────────────────────────
  taskCmd
    .command("status")
    .description("Update the status of a task")
    .argument("<feature-id>", "Feature ID")
    .argument("<phase-id>", "Phase ID (numeric)")
    .argument("<task-id>", "Task ID (numeric)")
    .argument("<status>", `New status (${VALID_STATUSES.join("|")})`)
    .action(async (featureId, phaseIdStr, taskIdStr, statusStr) => {
      const db = await getDb();
      const phaseId = parseInt(phaseIdStr, 10);
      if (isNaN(phaseId)) die(`Invalid phase ID: ${phaseIdStr}`);
      const taskId = parseInt(taskIdStr, 10);
      if (isNaN(taskId)) die(`Invalid task ID: ${taskIdStr}`);
      if (!(VALID_STATUSES as readonly string[]).includes(statusStr)) {
        die(`Invalid status: ${statusStr}. Must be one of: ${VALID_STATUSES.join(", ")}`);
      }
      try {
        const task = await updateTaskStatus(
          db,
          featureId,
          phaseId,
          taskId,
          statusStr as PhaseTaskStatus,
        );
        console.log(`Task ${task.id} status → ${task.status}`);
      } catch (err) {
        die(errMsg(err));
      }
    });
}
