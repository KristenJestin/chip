import { eq, and, asc } from "drizzle-orm";
import { Command } from "@commander-js/extra-typings";
import { type Db, getDb } from "../db/client";
import { type Log } from "../db/types";
import { logs } from "../db/schema";
import { assertFeatureExists } from "../db/helpers";
import { die, errMsg } from "../utils/die";
import { formatDateTime, sep } from "../utils/format";
import { nowUnix } from "../utils/time";

// ── Services (exported for testing) ──────────────────────────────────────────

export async function addLog(
  db: Db,
  featureId: string,
  message: string,
  opts?: { phaseId?: number; taskId?: number; source?: string },
): Promise<Log> {
  await assertFeatureExists(db, featureId);

  const now = nowUnix();

  const [inserted] = await db
    .insert(logs)
    .values({
      featureId,
      message,
      phaseId: opts?.phaseId ?? null,
      taskId: opts?.taskId ?? null,
      source: opts?.source ?? null,
      createdAt: now,
    })
    .returning()
    .all();

  if (!inserted) throw new Error("Failed to insert log");
  return inserted;
}

export async function listLogs(
  db: Db,
  featureId: string,
  filters?: { phaseId?: number; taskId?: number },
): Promise<Log[]> {
  await assertFeatureExists(db, featureId);

  return db
    .select()
    .from(logs)
    .where(
      and(
        eq(logs.featureId, featureId),
        filters?.phaseId !== undefined ? eq(logs.phaseId, filters.phaseId) : undefined,
        filters?.taskId !== undefined ? eq(logs.taskId, filters.taskId) : undefined,
      ),
    )
    .orderBy(asc(logs.createdAt))
    .all();
}

// ── Commander registration ────────────────────────────────────────────────────

export function registerLogCommands(program: Command): void {
  const logCmd = program.command("log").description("Manage logs");

  // ── log add ───────────────────────────────────────────────────────────────
  logCmd
    .command("add")
    .description("Add a log entry to a feature")
    .argument("<feature-id>", "Feature ID")
    .argument("<message>", "Log message")
    .option("--phase <id>", "Associate with a phase (numeric ID)")
    .option("--task <id>", "Associate with a task (numeric ID)")
    .option("--source <cmd>", "Source command (e.g. /dev, /review)")
    .action(async (featureId, message, options) => {
      const db = await getDb();

      const phaseId = options.phase !== undefined ? parseInt(options.phase, 10) : undefined;
      if (options.phase !== undefined && isNaN(phaseId!)) die(`Invalid phase ID: ${options.phase}`);

      const taskId = options.task !== undefined ? parseInt(options.task, 10) : undefined;
      if (options.task !== undefined && isNaN(taskId!)) die(`Invalid task ID: ${options.task}`);

      try {
        const log = await addLog(db, featureId, message, {
          phaseId,
          taskId,
          source: options.source,
        });
        console.log(`Log ${log.id} added to ${featureId}`);
      } catch (err) {
        die(errMsg(err));
      }
    });

  // ── log list ──────────────────────────────────────────────────────────────
  logCmd
    .command("list")
    .description("List log entries for a feature")
    .argument("<feature-id>", "Feature ID")
    .option("--phase <id>", "Filter by phase (numeric ID)")
    .option("--task <id>", "Filter by task (numeric ID)")
    .action(async (featureId, options) => {
      const db = await getDb();

      const phaseId = options.phase !== undefined ? parseInt(options.phase, 10) : undefined;
      if (options.phase !== undefined && isNaN(phaseId!)) die(`Invalid phase ID: ${options.phase}`);

      const taskId = options.task !== undefined ? parseInt(options.task, 10) : undefined;
      if (options.task !== undefined && isNaN(taskId!)) die(`Invalid task ID: ${options.task}`);

      try {
        const entries = await listLogs(db, featureId, { phaseId, taskId });

        if (entries.length === 0) {
          console.log("No logs found.");
          return;
        }

        console.log(sep());
        for (const entry of entries) {
          const ts = formatDateTime(entry.createdAt);
          const phase = entry.phaseId !== null ? ` [phase ${entry.phaseId}]` : "";
          const task = entry.taskId !== null ? ` [task ${entry.taskId}]` : "";
          const src = entry.source ? `  ${entry.source}` : "";
          console.log(`${ts}${phase}${task}${src}`);
          console.log(`  ${entry.message}`);
        }
        console.log(sep());
      } catch (err) {
        die(errMsg(err));
      }
    });
}
