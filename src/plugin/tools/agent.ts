import { tool, type ToolDefinition } from "@opencode-ai/plugin/tool";
import type { Db } from "../../db/client";
import { getNext } from "../../core/next";
import { executeBatch } from "../../core/batch";

export function agentTools(db: Db): Record<string, ToolDefinition> {
  return {
    chip_next: tool({
      description:
        "Get the next suggested action for a feature — aggregates stage, pending tasks, unresolved findings, and unsatisfied criteria into a structured diagnostic",
      args: {
        featureId: tool.schema.string().min(1),
      },
      async execute(args) {
        const diagnostic = await getNext(db, args.featureId);
        return JSON.stringify(diagnostic);
      },
    }),

    chip_batch: tool({
      description:
        "Create phases and tasks in bulk for a feature from a JSON payload. Format: { phases: [{ title, description?, tasks: [{ title, description?, type? }] }] }",
      args: {
        featureId: tool.schema.string().min(1),
        payload: tool.schema.object({
          phases: tool.schema.array(
            tool.schema.object({
              title: tool.schema.string().min(1),
              description: tool.schema.string().optional(),
              tasks: tool.schema.array(
                tool.schema.object({
                  title: tool.schema.string().min(1),
                  description: tool.schema.string().optional(),
                  type: tool.schema
                    .enum(["feature", "fix", "docs", "test"])
                    .optional(),
                }),
              ),
            }),
          ),
        }),
      },
      async execute(args) {
        const result = await executeBatch(db, args.featureId, args.payload);
        return JSON.stringify(result);
      },
    }),
  };
}
