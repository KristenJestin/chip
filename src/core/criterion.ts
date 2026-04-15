import { eq } from "drizzle-orm";
import { type Db } from "../db/client";
import { type Criterion } from "../db/types";
import { criteria } from "../db/schema";
import { assertFeatureExists, ADVANCED_STAGES } from "../db/helpers";
import { nowUnix } from "../utils/time";
import { validate } from "./validate";
import { AddCriterionInput, CheckCriterionInput, ListCriteriaInput } from "./schemas";

// ── Services ──────────────────────────────────────────────────────────────────

export async function addCriterion(
  db: Db,
  featureId: string,
  description: string,
  options?: { phaseId?: number; force?: boolean },
): Promise<Criterion> {
  validate(AddCriterionInput, { featureId, description, phaseId: options?.phaseId });

  // Single query: existence check + stage guard in one round-trip
  const feature = await db.query.features.findFirst({
    where: { id: featureId },
    columns: { id: true, stage: true },
  });
  if (!feature) throw new Error(`Feature not found: ${featureId}`);

  if (!options?.force && ADVANCED_STAGES.has(feature.stage)) {
    throw new Error(
      `Cannot add criterion: feature is in '${feature.stage}' stage. Use --force to override.`,
    );
  }

  const now = nowUnix();
  const [inserted] = await db
    .insert(criteria)
    .values({
      featureId,
      phaseId: options?.phaseId ?? null,
      description,
      satisfied: 0,
      satisfiedAt: null,
      verifiedBy: null,
      createdAt: now,
    })
    .returning()
    .all();
  if (!inserted) throw new Error("Failed to insert criterion");
  return inserted;
}

export async function checkCriterion(
  db: Db,
  criterionId: number,
  options?: { source?: string },
): Promise<Criterion> {
  validate(CheckCriterionInput, { criterionId, source: options?.source });

  const criterion = await db.query.criteria.findFirst({ where: { id: criterionId } });
  if (!criterion) throw new Error(`Criterion not found: ${criterionId}`);
  if (criterion.satisfied === 1) {
    throw new Error(`Criterion ${criterionId} is already satisfied`);
  }

  const now = nowUnix();
  const [updated] = await db
    .update(criteria)
    .set({
      satisfied: 1,
      satisfiedAt: now,
      verifiedBy: options?.source ?? null,
    })
    .where(eq(criteria.id, criterionId))
    .returning()
    .all();
  if (!updated) throw new Error("Failed to update criterion");
  return updated;
}

export async function listCriteria(
  db: Db,
  featureId: string,
  options?: { pending?: boolean; phaseId?: number },
): Promise<Criterion[]> {
  validate(ListCriteriaInput, { featureId, ...options });
  await assertFeatureExists(db, featureId);

  const all = await db.query.criteria.findMany({
    where: { featureId },
    orderBy: { createdAt: "asc" },
  });

  return all.filter((c) => {
    if (options?.pending && c.satisfied !== 0) return false;
    if (options?.phaseId !== undefined && c.phaseId !== options.phaseId) return false;
    return true;
  });
}
