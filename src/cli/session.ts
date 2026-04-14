import { Command } from "@commander-js/extra-typings";
import { getDb } from "../db/client";
import { die, errMsg } from "../utils/die";
import { formatDateTime } from "../utils/format";
import {
  SESSION_TYPES,
  type SessionType,
  type SessionStatus,
  startSession,
  endSession,
  listSessions,
  getCurrentSession,
} from "../core/session";

// ── Commander registration ────────────────────────────────────────────────────

export function registerSessionCommands(program: Command): void {
  const sessionCmd = program.command("session").description("Manage work sessions");

  // ── session start ──────────────────────────────────────────────────────────
  sessionCmd
    .command("start")
    .description("Start a new work session")
    .argument("<feature-id>", "Feature ID")
    .argument("<type>", `Session type (${SESSION_TYPES.join("|")})`)
    .option("--phase <id>", "Phase ID to associate with this session")
    .action(async (featureId, typeStr, options) => {
      const db = await getDb();
      if (!(SESSION_TYPES as readonly string[]).includes(typeStr)) {
        die(`Invalid type: ${typeStr}. Must be one of: ${SESSION_TYPES.join(", ")}`);
      }
      const phaseId = options.phase != null ? parseInt(options.phase, 10) : undefined;
      if (phaseId !== undefined && isNaN(phaseId)) {
        die(`Invalid phase ID: ${options.phase}`);
      }
      try {
        const session = await startSession(db, featureId, typeStr as SessionType, phaseId);
        console.log(`Started session ${session.id} (${session.type}) for ${featureId}`);
      } catch (err) {
        die(errMsg(err));
      }
    });

  // ── session end ────────────────────────────────────────────────────────────
  sessionCmd
    .command("end")
    .description("End the current (or a specific) session")
    .argument("[session-id]", "Session ID (ends most recent active session if omitted)")
    .argument("[summary]", "Summary of what was accomplished")
    .option("--feature <feature-id>", "Scope to a specific feature's active session")
    .action(async (sessionIdStr, summary, options) => {
      const db = await getDb();
      const sessionId =
        sessionIdStr != null ? parseInt(sessionIdStr, 10) : undefined;
      if (sessionId !== undefined && isNaN(sessionId)) {
        die(`Invalid session ID: ${sessionIdStr}`);
      }
      try {
        const session = await endSession(db, {
          sessionId,
          featureId: options.feature,
          summary,
        });
        console.log(`Session ${session.id} completed`);
        if (session.summary) console.log(`Summary: ${session.summary}`);
      } catch (err) {
        die(errMsg(err));
      }
    });

  // ── session list ───────────────────────────────────────────────────────────
  sessionCmd
    .command("list")
    .description("List sessions for a feature")
    .argument("<feature-id>", "Feature ID")
    .option("--type <type>", `Filter by type (${SESSION_TYPES.join("|")})`)
    .option("--status <status>", "Filter by status (active|completed|aborted)")
    .action(async (featureId, options) => {
      const db = await getDb();
      try {
        const type =
          options.type != null
            ? (options.type as SessionType)
            : undefined;
        const status =
          options.status != null
            ? (options.status as SessionStatus)
            : undefined;
        const rows = await listSessions(db, featureId, { type, status });

        if (rows.length === 0) {
          console.log("No sessions found.");
          return;
        }

        for (const s of rows) {
          const end = s.completedAt != null ? formatDateTime(s.completedAt) : "—";
          console.log(
            `[${s.id}] ${s.type} | ${s.status} | ${formatDateTime(s.createdAt)} → ${end}`,
          );
          if (s.summary) console.log(`  ${s.summary}`);
        }
      } catch (err) {
        die(errMsg(err));
      }
    });

  // ── session current ────────────────────────────────────────────────────────
  sessionCmd
    .command("current")
    .description("Show the currently active session")
    .argument("[feature-id]", "Optional feature ID to scope the lookup")
    .action(async (featureId) => {
      const db = await getDb();
      try {
        const session = await getCurrentSession(db, featureId);
        console.log(
          `Active session ${session.id}: ${session.type} for ${session.featureId} (started ${formatDateTime(session.createdAt)})`,
        );
        if (session.phaseId != null) console.log(`  phase: ${session.phaseId}`);
      } catch (err) {
        die(errMsg(err));
      }
    });
}
