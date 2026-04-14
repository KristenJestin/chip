import { eq, and, asc } from "drizzle-orm";
import { type Db } from "../db/client";
import { type Log } from "../db/types";
import { logs } from "../db/schema";
import { assertFeatureExists } from "../db/helpers";
import { nowUnix } from "../utils/time";
import { validate } from "./validate";
import { AddLogInput, ListLogsInput } from "./schemas";

// ── Services ──────────────────────────────────────────────────────────────────

export async function addLog(
  db: Db,
  featureId: string,
  message: string,
  opts?: { phaseId?: number; taskId?: number; source?: string },
): Promise<Log> {
  validate(AddLogInput, { featureId, message, ...opts });
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
  validate(ListLogsInput, { featureId, ...filters });
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
