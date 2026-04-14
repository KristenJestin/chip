import { Command } from "@commander-js/extra-typings";
import { getDb } from "../db/client";
import { die, errMsg } from "../utils/die";
import {
  VALID_TASK_STATUSES,
  VALID_TASK_TYPES,
  type PhaseTaskStatus,
  type TaskType,
  addTask,
  updateTaskStatus,
} from "../core/task";

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
    .option("--type <type>", `Task type (${VALID_TASK_TYPES.join("|")})`, "feature")
    .option("--parent <task-id>", "Parent task ID (for fix/docs/test tasks)")
    .action(async (featureId, phaseIdStr, title, description, options) => {
      const db = await getDb();
      const phaseId = parseInt(phaseIdStr, 10);
      if (isNaN(phaseId)) die(`Invalid phase ID: ${phaseIdStr}`);

      const type = options.type as TaskType;
      if (!(VALID_TASK_TYPES as readonly string[]).includes(type)) {
        die(`Invalid type: ${type}. Must be one of: ${VALID_TASK_TYPES.join(", ")}`);
      }

      const parentTaskId =
        options.parent != null ? parseInt(options.parent, 10) : undefined;
      if (parentTaskId !== undefined && isNaN(parentTaskId)) {
        die(`Invalid parent task ID: ${options.parent}`);
      }

      try {
        const task = await addTask(db, featureId, phaseId, title, description, {
          type,
          parentTaskId,
        });
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
    .argument("<status>", `New status (${VALID_TASK_STATUSES.join("|")})`)
    .action(async (featureId, phaseIdStr, taskIdStr, statusStr) => {
      const db = await getDb();
      const phaseId = parseInt(phaseIdStr, 10);
      if (isNaN(phaseId)) die(`Invalid phase ID: ${phaseIdStr}`);
      const taskId = parseInt(taskIdStr, 10);
      if (isNaN(taskId)) die(`Invalid task ID: ${taskIdStr}`);
      if (!(VALID_TASK_STATUSES as readonly string[]).includes(statusStr)) {
        die(`Invalid status: ${statusStr}. Must be one of: ${VALID_TASK_STATUSES.join(", ")}`);
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
