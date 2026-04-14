import { eq } from "drizzle-orm";
import { type Db } from "../db/client";
import { type Finding } from "../db/types";
import { findings } from "../db/schema";
import { assertFeatureExists } from "../db/helpers";
import { nowUnix } from "../utils/time";
import { validate } from "./validate";
import { AddFindingInput, ListFindingsInput, ResolveFindingInput } from "./schemas";

export const FINDING_PASSES = ["business", "technical"] as const;
export const FINDING_SEVERITIES = ["critical", "major", "minor", "suggestion"] as const;
export const FINDING_CATEGORIES = [
  "security",
  "convention",
  "quality",
  "test",
  "scope",
  "correctness",
] as const;
export const FINDING_RESOLUTIONS = ["fixed", "wontfix", "deferred"] as const;

export type FindingPass = (typeof FINDING_PASSES)[number];
export type FindingSeverity = (typeof FINDING_SEVERITIES)[number];
export type FindingCategory = (typeof FINDING_CATEGORIES)[number];
export type FindingResolution = (typeof FINDING_RESOLUTIONS)[number];

// ── Services ──────────────────────────────────────────────────────────────────

export async function addFinding(
  db: Db,
  featureId: string,
  description: string,
  options: {
    pass: FindingPass;
    severity: FindingSeverity;
    category?: FindingCategory;
    sessionId?: number;
  },
): Promise<Finding> {
  validate(AddFindingInput, { featureId, description, ...options });
  await assertFeatureExists(db, featureId);

  const now = nowUnix();
  const [inserted] = await db
    .insert(findings)
    .values({
      featureId,
      sessionId: options.sessionId ?? null,
      pass: options.pass,
      severity: options.severity,
      category: options.category ?? null,
      description,
      taskId: null,
      resolution: null,
      createdAt: now,
    })
    .returning()
    .all();
  if (!inserted) throw new Error("Failed to insert finding");
  return inserted;
}

export async function listFindings(
  db: Db,
  featureId: string,
  options?: {
    unresolved?: boolean;
    pass?: FindingPass;
    severity?: FindingSeverity;
  },
): Promise<Finding[]> {
  validate(ListFindingsInput, { featureId, ...options });
  await assertFeatureExists(db, featureId);

  const all = await db.query.findings.findMany({
    where: { featureId },
    orderBy: { createdAt: "asc" },
  });

  return all.filter((f) => {
    if (options?.unresolved && f.resolution != null) return false;
    if (options?.pass && f.pass !== options.pass) return false;
    if (options?.severity && f.severity !== options.severity) return false;
    return true;
  });
}

export async function resolveFinding(
  db: Db,
  findingId: number,
  resolution: FindingResolution,
  taskId?: number,
): Promise<Finding> {
  validate(ResolveFindingInput, { findingId, resolution, taskId });

  const finding = await db.query.findings.findFirst({ where: { id: findingId } });
  if (!finding) throw new Error(`Finding not found: ${findingId}`);
  if (finding.resolution != null) {
    throw new Error(`Finding ${findingId} is already resolved as ${finding.resolution}`);
  }

  const [updated] = await db
    .update(findings)
    .set({ resolution, taskId: taskId ?? null })
    .where(eq(findings.id, findingId))
    .returning()
    .all();
  if (!updated) throw new Error("Failed to update finding");
  return updated;
}
