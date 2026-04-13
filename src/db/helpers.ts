import { eq, max } from "drizzle-orm";
import { type Db } from "./client";
import { features, phases, tasks } from "./schema";

// ── Feature guards ────────────────────────────────────────────────────────────

/**
 * Throws if the feature does not exist.
 * Used by phase and task services before operating on child records.
 */
export async function assertFeatureExists(db: Db, featureId: string): Promise<void> {
  const row = await db
    .select({ id: features.id })
    .from(features)
    .where(eq(features.id, featureId))
    .get();
  if (!row) throw new Error(`Feature not found: ${featureId}`);
}

// ── Phase guards ──────────────────────────────────────────────────────────────

/**
 * Throws if the phase does not exist or does not belong to the given feature.
 */
export async function assertPhaseExists(
  db: Db,
  phaseId: number,
  featureId: string
): Promise<void> {
  const row = await db
    .select({ id: phases.id, featureId: phases.featureId })
    .from(phases)
    .where(eq(phases.id, phaseId))
    .get();
  if (!row) throw new Error(`Phase not found: ${phaseId}`);
  if (row.featureId !== featureId)
    throw new Error(`Phase ${phaseId} does not belong to feature ${featureId}`);
}

// ── Order helpers ─────────────────────────────────────────────────────────────

/** Returns the next `order` value for a new phase inside a feature. */
export async function nextPhaseOrder(db: Db, featureId: string): Promise<number> {
  const [row] = await db
    .select({ max: max(phases.order) })
    .from(phases)
    .where(eq(phases.featureId, featureId))
    .all();
  return (row?.max ?? 0) + 1;
}

/** Returns the next `order` value for a new task inside a phase. */
export async function nextTaskOrder(db: Db, phaseId: number): Promise<number> {
  const [row] = await db
    .select({ max: max(tasks.order) })
    .from(tasks)
    .where(eq(tasks.phaseId, phaseId))
    .all();
  return (row?.max ?? 0) + 1;
}
