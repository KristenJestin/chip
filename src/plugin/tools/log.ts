import { tool, type ToolDefinition } from "@opencode-ai/plugin/tool";
import type { Db } from "../../db/client";
import { addLog, listLogs } from "../../core/log";

export function logTools(db: Db): Record<string, ToolDefinition> {
  return {
    chip_log_add: tool({
      description: "Add a log entry to a feature",
      args: {
        featureId: tool.schema.string().min(1),
        message: tool.schema.string().min(1),
        phaseId: tool.schema.number().int().positive().optional(),
        taskId: tool.schema.number().int().positive().optional(),
        source: tool.schema.string().optional(),
      },
      async execute(args) {
        const log = await addLog(db, args.featureId, args.message, {
          phaseId: args.phaseId,
          taskId: args.taskId,
          source: args.source,
        });
        return JSON.stringify(log);
      },
    }),

    chip_log_list: tool({
      description: "List logs for a feature, optionally filtered by phase or task",
      args: {
        featureId: tool.schema.string().min(1),
        phaseId: tool.schema.number().int().positive().optional(),
        taskId: tool.schema.number().int().positive().optional(),
      },
      async execute(args) {
        const entries = await listLogs(db, args.featureId, {
          phaseId: args.phaseId,
          taskId: args.taskId,
        });
        return JSON.stringify(entries);
      },
    }),
  };
}
