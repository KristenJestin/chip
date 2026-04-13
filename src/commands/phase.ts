import { eq } from "drizzle-orm";
import { Command } from "@commander-js/extra-typings";
import { type Db, getDb } from "../db/client";
import { type Phase } from "../db/types";
import { phases } from "../db/schema";
import { assertFeatureExists, assertPhaseExists, nextPhaseOrder } from "../db/helpers";
import { die, errMsg } from "../utils/die";
import { nowUnix } from "../utils/time";

const VALID_STATUSES = ["todo", "in-progress", "review", "done"] as const;
type PhaseTaskStatus = (typeof VALID_STATUSES)[number];

// ── Services (exported for testing) ──────────────────────────────────────────

export async function addPhase(
  db: Db,
  featureId: string,
  title: string,
  description?: string,
): Promise<Phase> {
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

// ── Commander registration ────────────────────────────────────────────────────

export function registerPhaseCommands(program: Command): void {
  const phaseCmd = program.command("phase").description("Manage phases");

  // ── phase add ────────────────────────────────────────────────────────────────
  phaseCmd
    .command("add")
    .description("Add a phase to a feature")
    .argument("<feature-id>", "Feature ID")
    .argument("<title>", "Phase title")
    .argument("[description]", "Phase description")
    .action(async (featureId, title, description) => {
      const db = await getDb();
      try {
        const phase = await addPhase(db, featureId, title, description);
        console.log(`Added phase ${phase.id} to ${featureId}: ${title}`);
      } catch (err) {
        die(errMsg(err));
      }
    });

  // ── phase status ─────────────────────────────────────────────────────────────
  phaseCmd
    .command("status")
    .description("Update the status of a phase")
    .argument("<feature-id>", "Feature ID")
    .argument("<phase-id>", "Phase ID (numeric)")
    .argument("<status>", `New status (${VALID_STATUSES.join("|")})`)
    .action(async (featureId, phaseIdStr, statusStr) => {
      const db = await getDb();
      const phaseId = parseInt(phaseIdStr, 10);
      if (isNaN(phaseId)) die(`Invalid phase ID: ${phaseIdStr}`);
      if (!(VALID_STATUSES as readonly string[]).includes(statusStr)) {
        die(`Invalid status: ${statusStr}. Must be one of: ${VALID_STATUSES.join(", ")}`);
      }
      try {
        const phase = await updatePhaseStatus(db, featureId, phaseId, statusStr as PhaseTaskStatus);
        console.log(`Phase ${phase.id} status → ${phase.status}`);
      } catch (err) {
        die(errMsg(err));
      }
    });
}
