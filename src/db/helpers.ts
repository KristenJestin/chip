import { eq, max } from "drizzle-orm";
import { type Db } from "./client";
import { phases, tasks } from "./schema";

// ── Feature guards ────────────────────────────────────────────────────────────

/**
 * Throws if the feature does not exist.
 * Used by phase and task services before operating on child records.
 */
export async function assertFeatureExists(db: Db, featureId: string): Promise<void> {
  const row = await db.query.features.findFirst({
    where: { id: featureId },
    columns: { id: true },
  });
  if (!row) throw new Error(`Feature not found: ${featureId}`);
}

// ── Phase guards ──────────────────────────────────────────────────────────────

/**
 * Throws if the phase does not exist or does not belong to the given feature.
 */
export async function assertPhaseExists(db: Db, phaseId: number, featureId: string): Promise<void> {
  const row = await db.query.phases.findFirst({
    where: { id: phaseId },
    columns: { id: true, featureId: true },
  });
  if (!row) throw new Error(`Phase not found: ${phaseId}`);
  if (row.featureId !== featureId)
    throw new Error(`Phase ${phaseId} does not belong to feature ${featureId}`);
}

// ── Task guards ───────────────────────────────────────────────────────────────

/**
 * Throws if the task does not exist or does not belong to the given phase.
 */
export async function assertTaskExists(db: Db, taskId: number, phaseId: number): Promise<void> {
  const row = await db.query.tasks.findFirst({
    where: { id: taskId },
    columns: { id: true, phaseId: true },
  });
  if (!row) throw new Error(`Task not found: ${taskId}`);
  if (row.phaseId !== phaseId)
    throw new Error(`Task ${taskId} does not belong to phase ${phaseId}`);
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
