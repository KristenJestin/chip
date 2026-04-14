import { tool, type ToolDefinition } from "@opencode-ai/plugin/tool";
import type { Db } from "../../db/client";
import { addEvent, listEvents } from "../../core/event";
import { type EventKind } from "../../core/schemas";

export function eventTools(db: Db): Record<string, ToolDefinition> {
  return {
    chip_event_add: tool({
      description:
        "Add a typed structured event to a feature. The `data` field is validated against the schema for the chosen kind. " +
        "task_result: emitted by sub-agents on task completion (files, decisions, issues, test_result). " +
        "correction: emitted by reviewers on auto-correction (root_cause, fix, files). " +
        "decision: captures an architecture/implementation decision (context, options, chosen, rationale). " +
        "phase_summary: emitted at phase end (delivered, coverage_verdict, risks).",
      args: {
        featureId: tool.schema.string().min(1),
        kind: tool.schema.enum(["task_result", "correction", "decision", "phase_summary"]),
        /** JSON object matching the schema for the chosen kind. */
        data: tool.schema.object({
          // task_result fields (optional to allow flexibility; core validates strictly)
          files: tool.schema
            .object({
              created: tool.schema.array(tool.schema.string()).optional(),
              modified: tool.schema.array(tool.schema.string()).optional(),
              deleted: tool.schema.array(tool.schema.string()).optional(),
            })
            .optional(),
          decisions: tool.schema.array(tool.schema.string()).optional(),
          issues: tool.schema.array(tool.schema.string()).optional(),
          test_result: tool.schema
            .object({
              passed: tool.schema.boolean().optional(),
              count: tool.schema.number().int().nonnegative().optional(),
            })
            .optional(),
          // correction fields
          root_cause: tool.schema.string().optional(),
          fix: tool.schema.string().optional(),
          // decision fields
          context: tool.schema.string().optional(),
          options: tool.schema.array(tool.schema.string()).optional(),
          chosen: tool.schema.string().optional(),
          rationale: tool.schema.string().optional(),
          // phase_summary fields
          delivered: tool.schema.array(tool.schema.string()).optional(),
          coverage_verdict: tool.schema.enum(["SUFFICIENT", "PARTIAL", "MISSING"]).optional(),
          risks: tool.schema.array(tool.schema.string()).optional(),
        }),
        phaseId: tool.schema.number().int().positive().optional(),
        taskId: tool.schema.number().int().positive().optional(),
        findingId: tool.schema.number().int().positive().optional(),
        sessionId: tool.schema.number().int().positive().optional(),
        source: tool.schema.string().optional(),
      },
      async execute(args) {
        const event = await addEvent(db, args.featureId, args.kind as EventKind, args.data, {
          phaseId: args.phaseId,
          taskId: args.taskId,
          findingId: args.findingId,
          sessionId: args.sessionId,
          source: args.source,
        });
        return JSON.stringify(event);
      },
    }),

    chip_event_list: tool({
      description:
        "List typed events for a feature. Supports filtering by kind, taskId, findingId, or sessionId. " +
        "Returns events in chronological order. The `data` field contains the deserialized payload.",
      args: {
        featureId: tool.schema.string().min(1),
        kind: tool.schema
          .enum(["task_result", "correction", "decision", "phase_summary"])
          .optional(),
        taskId: tool.schema.number().int().positive().optional(),
        findingId: tool.schema.number().int().positive().optional(),
        sessionId: tool.schema.number().int().positive().optional(),
      },
      async execute(args) {
        const items = await listEvents(db, args.featureId, {
          kind: args.kind as EventKind | undefined,
          taskId: args.taskId,
          findingId: args.findingId,
          sessionId: args.sessionId,
        });
        // Deserialize data field so callers receive parsed objects, not raw strings
        const deserialized = items.map((e) => ({
          ...e,
          data: (() => {
            try {
              return JSON.parse(e.data);
            } catch {
              return e.data;
            }
          })(),
        }));
        return JSON.stringify(deserialized);
      },
    }),
  };
}
