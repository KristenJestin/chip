import { Command } from "@commander-js/extra-typings";
import { getDb } from "../db/client";
import { die, errMsg } from "../utils/die";
import { formatDateTime, sep } from "../utils/format";
import { addEvent, listEvents } from "../core/event";
import { type EventKind, eventKind } from "../core/schemas";

// ── Commander registration ────────────────────────────────────────────────────

export function registerEventCommands(program: Command): void {
  const eventCmd = program.command("event").description("Manage typed events");

  // ── event add ─────────────────────────────────────────────────────────────
  eventCmd
    .command("add")
    .description("Add a typed event to a feature")
    .argument("<feature-id>", "Feature ID")
    .requiredOption("--kind <kind>", "Event kind (task_result|correction|decision|phase_summary)")
    .requiredOption("--data <json>", "Event payload as JSON string")
    .option("--phase <id>", "Associate with a phase (numeric ID)")
    .option("--task <id>", "Associate with a task (numeric ID)")
    .option("--finding <id>", "Associate with a finding (numeric ID)")
    .option("--session <id>", "Associate with a session (numeric ID)")
    .option("--source <cmd>", "Source identifier (e.g. chip_dev_subagent)")
    .action(async (featureId, options) => {
      // Validate kind
      const kindResult = eventKind.safeParse(options.kind);
      if (!kindResult.success) {
        die(
          `Invalid kind "${options.kind}". Must be one of: ${eventKind.options.join(", ")}`,
        );
        return;
      }
      const kind = kindResult.data;

      // Parse JSON data
      let data: unknown;
      try {
        data = JSON.parse(options.data);
      } catch {
        die(`--data must be valid JSON. Received: ${options.data}`);
        return;
      }

      const phaseId = options.phase !== undefined ? parseInt(options.phase, 10) : undefined;
      if (options.phase !== undefined && isNaN(phaseId!)) die(`Invalid phase ID: ${options.phase}`);

      const taskId = options.task !== undefined ? parseInt(options.task, 10) : undefined;
      if (options.task !== undefined && isNaN(taskId!)) die(`Invalid task ID: ${options.task}`);

      const findingId = options.finding !== undefined ? parseInt(options.finding, 10) : undefined;
      if (options.finding !== undefined && isNaN(findingId!))
        die(`Invalid finding ID: ${options.finding}`);

      const sessionId = options.session !== undefined ? parseInt(options.session, 10) : undefined;
      if (options.session !== undefined && isNaN(sessionId!))
        die(`Invalid session ID: ${options.session}`);

      const db = await getDb();

      try {
        const event = await addEvent(db, featureId, kind, data, {
          phaseId,
          taskId,
          findingId,
          sessionId,
          source: options.source,
        });
        console.log(`Event ${event.id} (${event.kind}) added to ${featureId}`);
      } catch (err) {
        die(errMsg(err));
      }
    });

  // ── event list ────────────────────────────────────────────────────────────
  eventCmd
    .command("list")
    .description("List events for a feature")
    .argument("<feature-id>", "Feature ID")
    .option("--kind <kind>", "Filter by kind")
    .option("--task <id>", "Filter by task (numeric ID)")
    .option("--finding <id>", "Filter by finding (numeric ID)")
    .option("--session <id>", "Filter by session (numeric ID)")
    .action(async (featureId, options) => {
      let kind: EventKind | undefined;
      if (options.kind !== undefined) {
        const kindResult = eventKind.safeParse(options.kind);
        if (!kindResult.success) {
          die(`Invalid kind "${options.kind}". Must be one of: ${eventKind.options.join(", ")}`);
          return;
        }
        kind = kindResult.data;
      }

      const taskId = options.task !== undefined ? parseInt(options.task, 10) : undefined;
      if (options.task !== undefined && isNaN(taskId!)) die(`Invalid task ID: ${options.task}`);

      const findingId = options.finding !== undefined ? parseInt(options.finding, 10) : undefined;
      if (options.finding !== undefined && isNaN(findingId!))
        die(`Invalid finding ID: ${options.finding}`);

      const sessionId = options.session !== undefined ? parseInt(options.session, 10) : undefined;
      if (options.session !== undefined && isNaN(sessionId!))
        die(`Invalid session ID: ${options.session}`);

      const db = await getDb();

      try {
        const entries = await listEvents(db, featureId, { kind, taskId, findingId, sessionId });

        if (entries.length === 0) {
          console.log("No events found.");
          return;
        }

        console.log(sep());
        for (const entry of entries) {
          const ts = formatDateTime(entry.createdAt);
          const phase = entry.phaseId !== null ? ` [phase ${entry.phaseId}]` : "";
          const task = entry.taskId !== null ? ` [task ${entry.taskId}]` : "";
          const finding = entry.findingId !== null ? ` [finding ${entry.findingId}]` : "";
          const session = entry.sessionId !== null ? ` [session ${entry.sessionId}]` : "";
          const src = entry.source ? `  ${entry.source}` : "";
          console.log(`[${entry.id}] ${ts}  [${entry.kind}]${phase}${task}${finding}${session}${src}`);
          // Pretty-print the JSON data
          try {
            const parsed = JSON.parse(entry.data);
            console.log(`  ${JSON.stringify(parsed)}`);
          } catch {
            console.log(`  ${entry.data}`);
          }
        }
        console.log(sep());
      } catch (err) {
        die(errMsg(err));
      }
    });
}
