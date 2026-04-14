import { eq } from "drizzle-orm";
import { type Db } from "../db/client";
import { type Phase } from "../db/types";
import { phases } from "../db/schema";
import { assertFeatureExists, assertPhaseExists, nextPhaseOrder } from "../db/helpers";
import { nowUnix } from "../utils/time";
import { validate } from "./validate";
import { AddPhaseInput, UpdatePhaseStatusInput } from "./schemas";

export const VALID_PHASE_STATUSES = ["todo", "in-progress", "review", "done"] as const;
export type PhaseTaskStatus = (typeof VALID_PHASE_STATUSES)[number];

// ── Services ──────────────────────────────────────────────────────────────────

export async function addPhase(
  db: Db,
  featureId: string,
  title: string,
  description?: string,
): Promise<Phase> {
  validate(AddPhaseInput, { featureId, title, description });
  await assertFeatureExists(db, featureId);

  const order = await nextPhaseOrder(db, featureId);
  const now = nowUnix();

  const [inserted] = await db
    .insert(phases)
    .values({
      featureId,
      order,
      title,
      description: description ?? null,
      createdAt: now,
      startedAt: null,
      completedAt: null,
    })
    .returning()
    .all();

  if (!inserted) throw new Error("Failed to insert phase");
  return inserted;
}

export async function updatePhaseStatus(
  db: Db,
  featureId: string,
  phaseId: number,
  status: PhaseTaskStatus,
): Promise<Phase> {
  validate(UpdatePhaseStatusInput, { featureId, phaseId, status });
  await assertFeatureExists(db, featureId);
  await assertPhaseExists(db, phaseId, featureId);

  const now = nowUnix();
  const updates: { status: PhaseTaskStatus; startedAt?: number; completedAt?: number } = { status };

  if (status === "in-progress") {
    const current = await db.query.phases.findFirst({ where: { id: phaseId } });
    if (!current?.startedAt) updates.startedAt = now;
  }

  if (status === "done") {
    updates.completedAt = now;
  }

  const [updated] = await db.update(phases).set(updates).where(eq(phases.id, phaseId)).returning().all();
  if (!updated) throw new Error("Failed to update phase");
  return updated;
}
