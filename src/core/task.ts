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
): Promise<Task> {
  validate(UpdateTaskStatusInput, { featureId, phaseId, taskId, status });
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

  const [updated] = await db
    .update(tasks)
    .set(updates)
    .where(eq(tasks.id, taskId))
    .returning()
    .all();
  if (!updated) throw new Error("Failed to update task");
  return updated;
}
