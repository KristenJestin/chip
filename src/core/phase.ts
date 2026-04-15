import { eq } from "drizzle-orm";
import { type Db } from "../db/client";
import { type Phase } from "../db/types";
import { phases, features } from "../db/schema";
import { assertFeatureExists, assertPhaseExists, nextPhaseOrder, ADVANCED_STAGES } from "../db/helpers";
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
  options?: { force?: boolean },
): Promise<Phase> {
  validate(AddPhaseInput, { featureId, title, description });

  // Single query: existence check + stage guard in one round-trip
  const feature = await db.query.features.findFirst({
    where: { id: featureId },
    columns: { id: true, stage: true },
  });
  if (!feature) throw new Error(`Feature not found: ${featureId}`);

  if (!options?.force && ADVANCED_STAGES.has(feature.stage)) {
    throw new Error(
      `Cannot add phase: feature is in '${feature.stage}' stage. Use --force to override.`,
    );
  }

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
): Promise<{ phase: Phase; stageAdvanced: boolean }> {
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

  // Auto-advance feature stage: development → review when all phases are done
  let stageAdvanced = false;
  if (status === "done") {
    const feature = await db.query.features.findFirst({ where: { id: featureId } });
    if (feature && feature.stage === "development") {
      const allPhases = await db.query.phases.findMany({ where: { featureId } });
      const allDone = allPhases.length > 0 && allPhases.every((p) => p.status === "done");
      if (allDone) {
        await db
          .update(features)
          .set({ stage: "review", updatedAt: nowUnix() })
          .where(eq(features.id, featureId))
          .run();
        stageAdvanced = true;
      }
    }
  }

  return { phase: updated, stageAdvanced };
}
