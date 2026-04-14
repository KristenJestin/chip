import { tool, type ToolDefinition } from "@opencode-ai/plugin/tool";
import type { Db } from "../../db/client";
import { addCriterion, checkCriterion, listCriteria } from "../../core/criterion";

export function criteriaTools(db: Db): Record<string, ToolDefinition> {
  return {
    chip_criteria_add: tool({
      description: "Add an acceptance criterion to a feature",
      args: {
        featureId: tool.schema.string().min(1),
        description: tool.schema.string().min(1),
        phaseId: tool.schema.number().int().positive().optional(),
      },
      async execute(args) {
        const criterion = await addCriterion(db, args.featureId, args.description, {
          phaseId: args.phaseId,
        });
        return JSON.stringify(criterion);
      },
    }),

    chip_criteria_check: tool({
      description: "Mark an acceptance criterion as satisfied",
      args: {
        criterionId: tool.schema.number().int().positive(),
        source: tool.schema.string().optional(),
      },
      async execute(args) {
        const criterion = await checkCriterion(db, args.criterionId, {
          source: args.source,
        });
        return JSON.stringify(criterion);
      },
    }),

    chip_criteria_list: tool({
      description: "List acceptance criteria for a feature",
      args: {
        featureId: tool.schema.string().min(1),
        pending: tool.schema.boolean().optional(),
        phaseId: tool.schema.number().int().positive().optional(),
      },
      async execute(args) {
        const items = await listCriteria(db, args.featureId, {
          pending: args.pending,
          phaseId: args.phaseId,
        });
        return JSON.stringify(items);
      },
    }),
  };
}
