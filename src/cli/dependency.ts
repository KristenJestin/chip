import { Command } from "@commander-js/extra-typings";
import { getDb } from "../db/client";
import { statusBadge, pad } from "../utils/format";
import { die, errMsg } from "../utils/die";
import {
  addTaskDependency,
  removeTaskDependency,
  listTaskDependencies,
} from "../core/dependency";

// ── Commander registration ────────────────────────────────────────────────────

export function registerDependencyCommands(program: Command): void {
  // Attach `dep` as a sub-command of `task`
  const taskCmd = program.commands.find((c) => c.name() === "task");
  if (!taskCmd) throw new Error("task command not found — register task commands first");

  const depCmd = taskCmd.command("dep").description("Manage task blocking dependencies");

  // ── task dep add ──────────────────────────────────────────────────────────
  depCmd
    .command("add")
    .description("Block a task until another task is done")
    .argument("<feature-id>", "Feature ID")
    .argument("<task-id>", "ID of the task to block (numeric)")
    .argument("<blocking-task-id>", "ID of the task that must finish first (numeric)")
    .action(async (featureId, taskIdStr, blockingTaskIdStr) => {
      const db = await getDb();
      const taskId = parseInt(taskIdStr, 10);
      if (isNaN(taskId)) die(`Invalid task ID: ${taskIdStr}`);
      const blockingTaskId = parseInt(blockingTaskIdStr, 10);
      if (isNaN(blockingTaskId)) die(`Invalid blocking task ID: ${blockingTaskIdStr}`);

      try {
        await addTaskDependency(db, featureId, taskId, blockingTaskId);
        console.log(`Task ${taskId} blocked by task ${blockingTaskId}`);
      } catch (err) {
        die(errMsg(err));
      }
    });

  // ── task dep remove ───────────────────────────────────────────────────────
  depCmd
    .command("remove")
    .description("Remove a blocking dependency between two tasks")
    .argument("<feature-id>", "Feature ID")
    .argument("<task-id>", "ID of the blocked task (numeric)")
    .argument("<blocking-task-id>", "ID of the blocking task to remove (numeric)")
    .action(async (featureId, taskIdStr, blockingTaskIdStr) => {
      const db = await getDb();
      const taskId = parseInt(taskIdStr, 10);
      if (isNaN(taskId)) die(`Invalid task ID: ${taskIdStr}`);
      const blockingTaskId = parseInt(blockingTaskIdStr, 10);
      if (isNaN(blockingTaskId)) die(`Invalid blocking task ID: ${blockingTaskIdStr}`);

      try {
        await removeTaskDependency(db, featureId, taskId, blockingTaskId);
        console.log(`Dependency removed: task ${taskId} is no longer blocked by task ${blockingTaskId}`);
      } catch (err) {
        die(errMsg(err));
      }
    });

  // ── task dep list ─────────────────────────────────────────────────────────
  depCmd
    .command("list")
    .description("List blocking dependencies for a task")
    .argument("<feature-id>", "Feature ID")
    .argument("<task-id>", "Task ID (numeric)")
    .action(async (featureId, taskIdStr) => {
      const db = await getDb();
      const taskId = parseInt(taskIdStr, 10);
      if (isNaN(taskId)) die(`Invalid task ID: ${taskIdStr}`);

      try {
        const { blockedBy, blocks } = await listTaskDependencies(db, featureId, taskId);

        if (blockedBy.length === 0 && blocks.length === 0) {
          console.log(`Task ${taskId}: no dependencies`);
          return;
        }

        if (blockedBy.length > 0) {
          console.log(`Blocked by (${blockedBy.length}):`);
          for (const t of blockedBy) {
            console.log(`  #${pad(String(t.id), 4)}  ${statusBadge(t.status)}  ${t.title}`);
          }
        }

        if (blocks.length > 0) {
          console.log(`Blocks (${blocks.length}):`);
          for (const t of blocks) {
            console.log(`  #${pad(String(t.id), 4)}  ${statusBadge(t.status)}  ${t.title}`);
          }
        }
      } catch (err) {
        die(errMsg(err));
      }
    });
}
