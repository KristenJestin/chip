import { Command } from "@commander-js/extra-typings";
import { type Db, getDb } from "../db/client";
import { die, errMsg } from "../utils/die";
import {
  VALID_TASK_STATUSES,
  VALID_TASK_TYPES,
  type PhaseTaskStatus,
  type TaskType,
  addTask,
  updateTaskStatus,
} from "../core/task";
import { addTaskDependency } from "../core/dependency";
import { resolvePhaseId } from "./phase";

// ── Ordinal resolver ──────────────────────────────────────────────────────────

/**
 * Resolves a task identifier (numeric ID or 1-based ordinal position within a
 * phase) to an actual task DB id.
 *
 * Resolution order:
 *   1. Fetch all tasks for the phase ordered by `order`.
 *   2. If a task with id === parseInt(identifier) exists → return that id
 *      (exact ID match takes priority).
 *   3. Else if parseInt(identifier) is a valid 1-based ordinal (1..n) →
 *      return tasks[parseInt(identifier) - 1].id.
 *   4. Else → die with "Task not found".
 */
export async function resolveTaskId(
  db: Db,
  phaseId: number,
  identifier: string,
): Promise<number> {
  const n = parseInt(identifier, 10);
  if (isNaN(n) || n < 1) die(`Invalid task identifier: ${identifier}`);

  const allTasks = await db.query.tasks.findMany({
    where: { phaseId },
    orderBy: { order: "asc" },
    columns: { id: true, order: true },
  });

  // Try exact ID match first
  const byId = allTasks.find((t) => t.id === n);
  if (byId) return byId.id;

  // Fall back to 1-based ordinal position
  const byOrdinal = allTasks[n - 1];
  if (byOrdinal) return byOrdinal.id;

  die(`Task not found: ${identifier}`);
  // die() always exits; this line is unreachable but satisfies the type checker
  throw new Error(`Task not found: ${identifier}`);
}

// ── Commander registration ────────────────────────────────────────────────────

export function registerTaskCommands(program: Command): void {
  const taskCmd = program.command("task").description("Manage tasks");

  // ── task add ──────────────────────────────────────────────────────────────
  taskCmd
    .command("add")
    .description("Add a task to a phase")
    .argument("<feature-id>", "Feature ID")
    .argument("<phase-id>", "Phase ID or 1-based ordinal position within the feature")
    .argument("<title>", "Task title")
    .argument("[description]", "Task description")
    .option("--type <type>", `Task type (${VALID_TASK_TYPES.join("|")})`, "feature")
    .option("--parent <task-id>", "Parent task ID (for fix/docs/test tasks)")
    .option("--blocked-by <task-id>", "Block this task until the given task ID is done")
    .option("--force", "Override stage guard (allow adding task in review/documentation/released)")
    .action(async (featureId, phaseIdStr, title, description, options) => {
      const db = await getDb();
      const phaseId = await resolvePhaseId(db, featureId, phaseIdStr);

      const type = options.type as TaskType;
      if (!(VALID_TASK_TYPES as readonly string[]).includes(type)) {
        die(`Invalid type: ${type}. Valid values: ${VALID_TASK_TYPES.join(", ")}`);
      }

      const parentTaskId =
        options.parent != null ? parseInt(options.parent, 10) : undefined;
      if (parentTaskId !== undefined && isNaN(parentTaskId)) {
        die(`Invalid parent task ID: ${options.parent}`);
      }

      const blockedById =
        options.blockedBy != null ? parseInt(options.blockedBy, 10) : undefined;
      if (blockedById !== undefined && isNaN(blockedById)) {
        die(`Invalid blocking task ID: ${options.blockedBy}`);
      }

      try {
        const task = await addTask(db, featureId, phaseId, title, description, {
          type,
          parentTaskId,
          force: options.force,
        });
        console.log(`Task ${task.id} added to phase ${phaseId}: ${title}`);

        if (blockedById !== undefined) {
          await addTaskDependency(db, featureId, task.id, blockedById);
          console.log(`Task ${task.id} blocked by task ${blockedById}`);
        }
      } catch (err) {
        die(errMsg(err));
      }
    });

  // ── task status ───────────────────────────────────────────────────────────
  taskCmd
    .command("status")
    .description("Update the status of a task")
    .argument("<feature-id>", "Feature ID")
    .argument("<phase-id>", "Phase ID or 1-based ordinal position within the feature")
    .argument("<task-id>", "Task ID or 1-based ordinal position within the phase")
    .argument("<status>", `New status (${VALID_TASK_STATUSES.join("|")})`)
    .action(async (featureId, phaseIdStr, taskIdStr, statusStr) => {
      const db = await getDb();
      if (!(VALID_TASK_STATUSES as readonly string[]).includes(statusStr)) {
        die(
          `Invalid status: ${statusStr}. Valid values: ${VALID_TASK_STATUSES.join(", ")}`,
        );
      }
      const phaseId = await resolvePhaseId(db, featureId, phaseIdStr);
      const taskId = await resolveTaskId(db, phaseId, taskIdStr);

      try {
        const task = await updateTaskStatus(
          db,
          featureId,
          phaseId,
          taskId,
          statusStr as PhaseTaskStatus,
        );
        console.log(`Task ${task.id}: status → ${task.status}`);
      } catch (err) {
        die(errMsg(err));
      }
    });
}
