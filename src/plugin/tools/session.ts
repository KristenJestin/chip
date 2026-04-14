import { tool, type ToolDefinition } from "@opencode-ai/plugin/tool";
import type { Db } from "../../db/client";
import {
  startSession,
  endSession,
  listSessions,
  getCurrentSession,
} from "../../core/session";

export function sessionTools(db: Db): Record<string, ToolDefinition> {
  return {
    chip_session_start: tool({
      description: "Start a new work session for a feature",
      args: {
        featureId: tool.schema.string().min(1),
        type: tool.schema.enum(["prd", "dev", "review", "docs"]),
        phaseId: tool.schema.number().int().positive().optional(),
      },
      async execute(args) {
        const session = await startSession(db, args.featureId, args.type, args.phaseId);
        return JSON.stringify(session);
      },
    }),

    chip_session_end: tool({
      description: "End an active session (by session ID or feature ID)",
      args: {
        sessionId: tool.schema.number().int().positive().optional(),
        featureId: tool.schema.string().optional(),
        summary: tool.schema.string().optional(),
      },
      async execute(args) {
        const session = await endSession(db, {
          sessionId: args.sessionId,
          featureId: args.featureId,
          summary: args.summary,
        });
        return JSON.stringify(session);
      },
    }),

    chip_session_current: tool({
      description: "Get the currently active session",
      args: {
        featureId: tool.schema.string().optional(),
      },
      async execute(args) {
        const session = await getCurrentSession(db, args.featureId);
        return JSON.stringify(session);
      },
    }),

    chip_session_list: tool({
      description: "List sessions for a feature",
      args: {
        featureId: tool.schema.string().min(1),
        type: tool.schema.enum(["prd", "dev", "review", "docs"]).optional(),
        status: tool.schema.enum(["active", "completed", "aborted"]).optional(),
      },
      async execute(args) {
        const sessions = await listSessions(db, args.featureId, {
          type: args.type,
          status: args.status,
        });
        return JSON.stringify(sessions);
      },
    }),
  };
}
