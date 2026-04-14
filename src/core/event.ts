import { eq, and, asc } from "drizzle-orm";
import { type Db } from "../db/client";
import { type Event } from "../db/types";
import { events } from "../db/schema";
import { assertFeatureExists } from "../db/helpers";
import { nowUnix } from "../utils/time";
import { validate } from "./validate";
import {
  AddEventInput,
  ListEventsInput,
  EVENT_DATA_SCHEMAS,
  type EventKind,
} from "./schemas";

// ── Services ──────────────────────────────────────────────────────────────────

/**
 * Adds a typed event to a feature.
 *
 * Validates `data` against the kind-specific Zod schema before inserting.
 * Throws with a descriptive message if `kind` is unknown or `data` is invalid.
 */
export async function addEvent(
  db: Db,
  featureId: string,
  kind: EventKind,
  data: unknown,
  opts?: {
    phaseId?: number;
    taskId?: number;
    findingId?: number;
    sessionId?: number;
    source?: string;
  },
): Promise<Event> {
  validate(AddEventInput, { featureId, kind, data, ...opts });
  await assertFeatureExists(db, featureId);

  // Validate data payload against the kind-specific schema
  const dataSchema = EVENT_DATA_SCHEMAS[kind];
  const parsed = dataSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(
      `Invalid data for event kind "${kind}": ${parsed.error.issues.map((i) => i.message).join(", ")}`,
    );
  }

  const now = nowUnix();

  const [inserted] = await db
    .insert(events)
    .values({
      featureId,
      kind,
      data: JSON.stringify(parsed.data),
      phaseId: opts?.phaseId ?? null,
      taskId: opts?.taskId ?? null,
      findingId: opts?.findingId ?? null,
      sessionId: opts?.sessionId ?? null,
      source: opts?.source ?? null,
      createdAt: now,
    })
    .returning()
    .all();

  if (!inserted) throw new Error("Failed to insert event");
  return inserted;
}

/**
 * Lists events for a feature, optionally filtered by kind, taskId, findingId, or sessionId.
 * Returns events in chronological order with the `data` field as a raw JSON string.
 */
export async function listEvents(
  db: Db,
  featureId: string,
  filters?: {
    kind?: EventKind;
    taskId?: number;
    findingId?: number;
    sessionId?: number;
  },
): Promise<Event[]> {
  validate(ListEventsInput, { featureId, ...filters });
  await assertFeatureExists(db, featureId);

  return db
    .select()
    .from(events)
    .where(
      and(
        eq(events.featureId, featureId),
        filters?.kind !== undefined ? eq(events.kind, filters.kind) : undefined,
        filters?.taskId !== undefined ? eq(events.taskId, filters.taskId) : undefined,
        filters?.findingId !== undefined ? eq(events.findingId, filters.findingId) : undefined,
        filters?.sessionId !== undefined ? eq(events.sessionId, filters.sessionId) : undefined,
      ),
    )
    .orderBy(asc(events.createdAt))
    .all();
}
