import { tool, type ToolDefinition } from "@opencode-ai/plugin/tool";
import type { Db } from "../../db/client";
import {
  createFeature,
  listFeatures,
  getFeatureDetails,
  exportFeature,
  updateFeatureStage,
} from "../../core/feature";
import { getSummary } from "../../core/summary";

export function featureTools(db: Db): Record<string, ToolDefinition> {
  return {
    chip_feature_create: tool({
      description: "Create a new feature and return its slug ID",
      args: {
        title: tool.schema.string().min(1),
        description: tool.schema.string().optional(),
      },
      async execute(args) {
        const id = await createFeature(db, args.title, args.description);
        return JSON.stringify({ id });
      },
    }),

    chip_feature_list: tool({
      description: "List all features",
      args: {},
      async execute() {
        const rows = await listFeatures(db);
        return JSON.stringify(rows);
      },
    }),

    chip_feature_status: tool({
      description: "Get detailed status of a feature including phases, tasks, findings, and criteria",
      args: {
        featureId: tool.schema.string().min(1),
      },
      async execute(args) {
        const details = await getFeatureDetails(db, args.featureId);
        return JSON.stringify(details);
      },
    }),

    chip_feature_stage: tool({
      description:
        "Update the pipeline stage of a feature (planning → development → review → documentation → released)",
      args: {
        featureId: tool.schema.string().min(1),
        stage: tool.schema.enum([
          "planning",
          "development",
          "review",
          "documentation",
          "released",
        ]),
        force: tool.schema.boolean().optional(),
      },
      async execute(args) {
        const feature = await updateFeatureStage(
          db,
          args.featureId,
          args.stage,
          args.force ?? false,
        );
        return JSON.stringify({ id: feature.id, stage: feature.stage });
      },
    }),

    chip_feature_export: tool({
      description: "Export a feature as a markdown document",
      args: {
        featureId: tool.schema.string().min(1),
      },
      async execute(args) {
        const markdown = await exportFeature(db, args.featureId);
        return markdown;
      },
    }),

    chip_feature_summary: tool({
      description: "Get a summary dashboard with stats for a feature",
      args: {
        featureId: tool.schema.string().min(1),
      },
      async execute(args) {
        const summary = await getSummary(db, args.featureId);
        return JSON.stringify(summary);
      },
    }),
  };
}
