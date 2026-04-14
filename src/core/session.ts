import { eq } from "drizzle-orm";
import { type Db } from "../db/client";
import { type Session } from "../db/types";
import { sessions } from "../db/schema";
import { assertFeatureExists } from "../db/helpers";
import { nowUnix } from "../utils/time";
import { validate } from "./validate";
import {
  StartSessionInput,
  EndSessionInput,
  ListSessionsInput,
  GetCurrentSessionInput,
} from "./schemas";

export const SESSION_TYPES = ["prd", "dev", "review", "docs"] as const;
export type SessionType = (typeof SESSION_TYPES)[number];
export type SessionStatus = "active" | "completed" | "aborted";

// ── Services ──────────────────────────────────────────────────────────────────

export async function startSession(
  db: Db,
  featureId: string,
  type: SessionType,
  phaseId?: number,
): Promise<Session> {
  validate(StartSessionInput, { featureId, type, phaseId });
  await assertFeatureExists(db, featureId);

  const now = nowUnix();
  const [inserted] = await db
    .insert(sessions)
    .values({
      featureId,
      type,
      status: "active",
      phaseId: phaseId ?? null,
      summary: null,
      createdAt: now,
      completedAt: null,
    })
    .returning()
    .all();
  if (!inserted) throw new Error("Failed to insert session");
  return inserted;
}

export async function endSession(
  db: Db,
  options: { sessionId?: number; featureId?: string; summary?: string },
): Promise<Session> {
  validate(EndSessionInput, options);

  let session: Session | undefined;

  if (options.sessionId != null) {
    session = await db.query.sessions.findFirst({ where: { id: options.sessionId } });
    if (!session) throw new Error(`Session not found: ${options.sessionId}`);
  } else if (options.featureId != null) {
    session = await db.query.sessions.findFirst({
      where: { featureId: options.featureId, status: "active" },
      orderBy: { createdAt: "desc" },
    });
    if (!session) throw new Error(`No active session for feature: ${options.featureId}`);
  } else {
    session = await db.query.sessions.findFirst({
      where: { status: "active" },
      orderBy: { createdAt: "desc" },
    });
    if (!session) throw new Error("No active session found");
  }

  if (session.status !== "active") {
    throw new Error(`Session ${session.id} is already ${session.status}`);
  }

  const now = nowUnix();
  const [updated] = await db
    .update(sessions)
    .set({
      status: "completed",
      summary: options.summary ?? null,
      completedAt: now,
    })
    .where(eq(sessions.id, session.id))
    .returning()
    .all();
  if (!updated) throw new Error("Failed to update session");
  return updated;
}

export async function listSessions(
  db: Db,
  featureId: string,
  options?: { type?: SessionType; status?: SessionStatus },
): Promise<Session[]> {
  validate(ListSessionsInput, { featureId, ...options });
  await assertFeatureExists(db, featureId);

  const all = await db.query.sessions.findMany({
    where: { featureId },
    orderBy: { createdAt: "asc" },
  });

  return all.filter((s) => {
    if (options?.type && s.type !== options.type) return false;
    if (options?.status && s.status !== options.status) return false;
    return true;
  });
}

export async function getCurrentSession(db: Db, featureId?: string): Promise<Session> {
  validate(GetCurrentSessionInput, { featureId });

  let session: Session | undefined;

  if (featureId) {
    session = await db.query.sessions.findFirst({
      where: { featureId, status: "active" },
      orderBy: { createdAt: "desc" },
    });
    if (!session) throw new Error(`No active session for feature: ${featureId}`);
  } else {
    session = await db.query.sessions.findFirst({
      where: { status: "active" },
      orderBy: { createdAt: "desc" },
    });
    if (!session) throw new Error("No active session found");
  }

  return session;
}
