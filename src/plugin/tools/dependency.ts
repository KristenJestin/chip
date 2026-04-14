import { tool, type ToolDefinition } from "@opencode-ai/plugin/tool";
import type { Db } from "../../db/client";
import { addTaskDependency, removeTaskDependency, listTaskDependencies } from "../../core/dependency";

export function dependencyTools(db: Db): Record<string, ToolDefinition> {
  return {
    chip_task_dep_add: tool({
      description:
        "Add a blocking dependency between two tasks: taskId will be blocked by blockingTaskId (blockingTaskId must be done before taskId can start). Both tasks must belong to the same feature. Cycles are rejected.",
      args: {
        featureId: tool.schema.string().min(1),
        taskId: tool.schema.number().int().positive(),
        blockingTaskId: tool.schema.number().int().positive(),
      },
      async execute(args) {
        const dep = await addTaskDependency(db, args.featureId, args.taskId, args.blockingTaskId);
        return JSON.stringify(dep);
      },
    }),

    chip_task_dep_remove: tool({
      description: "Remove a blocking dependency between two tasks",
      args: {
        featureId: tool.schema.string().min(1),
        taskId: tool.schema.number().int().positive(),
        blockingTaskId: tool.schema.number().int().positive(),
      },
      async execute(args) {
        await removeTaskDependency(db, args.featureId, args.taskId, args.blockingTaskId);
        return JSON.stringify({ removed: true });
      },
    }),

    chip_task_dep_list: tool({
      description:
        "List all dependencies for a task — returns the tasks that block it (blockedBy) and the tasks it is blocking (blocks)",
      args: {
        featureId: tool.schema.string().min(1),
        taskId: tool.schema.number().int().positive(),
      },
      async execute(args) {
        const deps = await listTaskDependencies(db, args.featureId, args.taskId);
        return JSON.stringify(deps);
      },
    }),
  };
}
