import { tool, type ToolDefinition } from "@opencode-ai/plugin/tool";
import type { Db } from "../../db/client";
import { addFinding, listFindings, resolveFinding } from "../../core/finding";

export function findingTools(db: Db): Record<string, ToolDefinition> {
  return {
    chip_finding_add: tool({
      description: "Add a review finding to a feature",
      args: {
        featureId: tool.schema.string().min(1),
        description: tool.schema.string().min(1),
        pass: tool.schema.enum(["business", "technical"]),
        severity: tool.schema.enum(["critical", "major", "minor", "suggestion"]),
        category: tool.schema
          .enum(["security", "convention", "quality", "test", "scope", "correctness"])
          .optional(),
        sessionId: tool.schema.number().int().positive().optional(),
      },
      async execute(args) {
        const finding = await addFinding(db, args.featureId, args.description, {
          pass: args.pass,
          severity: args.severity,
          category: args.category,
          sessionId: args.sessionId,
        });
        return JSON.stringify(finding);
      },
    }),

    chip_finding_list: tool({
      description: "List findings for a feature, with optional filters",
      args: {
        featureId: tool.schema.string().min(1),
        unresolved: tool.schema.boolean().optional(),
        pass: tool.schema.enum(["business", "technical"]).optional(),
        severity: tool.schema.enum(["critical", "major", "minor", "suggestion"]).optional(),
      },
      async execute(args) {
        const items = await listFindings(db, args.featureId, {
          unresolved: args.unresolved,
          pass: args.pass,
          severity: args.severity,
        });
        return JSON.stringify(items);
      },
    }),

    chip_finding_resolve: tool({
      description: "Resolve a finding with a resolution (fixed, wontfix, deferred)",
      args: {
        findingId: tool.schema.number().int().positive(),
        resolution: tool.schema.enum(["fixed", "wontfix", "deferred"]),
        taskId: tool.schema.number().int().positive().optional(),
      },
      async execute(args) {
        const finding = await resolveFinding(db, args.findingId, args.resolution, args.taskId);
        return JSON.stringify(finding);
      },
    }),
  };
}
