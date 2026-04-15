import { tool, type ToolDefinition } from "@opencode-ai/plugin/tool";
import type { Db } from "../../db/client";
import { addTask, updateTaskStatus } from "../../core/task";

export function taskTools(db: Db): Record<string, ToolDefinition> {
  return {
    chip_task_add: tool({
      description: "Add a task to a phase",
      args: {
        featureId: tool.schema.string().min(1),
        phaseId: tool.schema.number().int().positive(),
        title: tool.schema.string().min(1),
        description: tool.schema.string().optional(),
        type: tool.schema.enum(["feature", "fix", "docs", "test"]).optional(),
        parentTaskId: tool.schema.number().int().positive().optional(),
        force: tool.schema.boolean().optional(),
      },
      async execute(args) {
        const task = await addTask(db, args.featureId, args.phaseId, args.title, args.description, {
          type: args.type,
          parentTaskId: args.parentTaskId,
          force: args.force ?? false,
        });
        return JSON.stringify(task);
      },
    }),

    chip_task_status: tool({
      description:
        "Update the status of a task. If the task is blocked by unfinished dependencies or an incomplete previous phase, the update will fail — ask the user how to proceed.",
      args: {
        featureId: tool.schema.string().min(1),
        phaseId: tool.schema.number().int().positive(),
        taskId: tool.schema.number().int().positive(),
        status: tool.schema.enum(["todo", "in-progress", "done"]),
      },
      async execute(args) {
        const task = await updateTaskStatus(
          db,
          args.featureId,
          args.phaseId,
          args.taskId,
          args.status,
        );
        return JSON.stringify(task);
      },
    }),
  };
}
