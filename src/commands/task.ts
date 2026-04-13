import { Command } from "@commander-js/extra-typings";
import { type Db, getDb } from "../db/client";
import { type Task } from "../db/types";
import { tasks } from "../db/schema";
import { assertFeatureExists, assertPhaseExists, nextTaskOrder } from "../db/helpers";
import { die, errMsg } from "../utils/die";
import { nowUnix } from "../utils/time";

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
}
