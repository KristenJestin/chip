import { tool, type ToolDefinition } from "@opencode-ai/plugin/tool";
import type { Db } from "../../db/client";
import { addPhase, updatePhaseStatus } from "../../core/phase";

export function phaseTools(db: Db): Record<string, ToolDefinition> {
  return {
    chip_phase_add: tool({
      description: "Add a phase to a feature",
      args: {
        featureId: tool.schema.string().min(1),
        title: tool.schema.string().min(1),
        description: tool.schema.string().optional(),
        force: tool.schema.boolean().optional(),
      },
      async execute(args) {
        const phase = await addPhase(db, args.featureId, args.title, args.description, { force: args.force ?? false });
        return JSON.stringify(phase);
      },
    }),

    chip_phase_status: tool({
      description: "Update the status of a phase",
      args: {
        featureId: tool.schema.string().min(1),
        phaseId: tool.schema.number().int().positive(),
        status: tool.schema.enum(["todo", "in-progress", "review", "done"]),
      },
      async execute(args) {
        const result = await updatePhaseStatus(db, args.featureId, args.phaseId, args.status);
        return JSON.stringify({ phase: result.phase, stageAdvanced: result.stageAdvanced });
      },
    }),
  };
}
