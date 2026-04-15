import { Command } from "@commander-js/extra-typings";
import { type Db, getDb } from "../db/client";
import { die, errMsg } from "../utils/die";
import {
  VALID_PHASE_STATUSES,
  type PhaseTaskStatus,
  addPhase,
  updatePhaseStatus,
} from "../core/phase";

// ── Ordinal resolver ──────────────────────────────────────────────────────────

/**
 * Resolves a phase identifier (numeric ID or 1-based ordinal position) to an
 * actual phase DB id.
 *
 * Resolution order:
 *   1. Fetch all phases for the feature ordered by `order`.
 *   2. If a phase with id === parseInt(identifier) exists → return that id
 *      (exact ID match takes priority).
 *   3. Else if parseInt(identifier) is a valid 1-based ordinal (1..n) →
 *      return phases[parseInt(identifier) - 1].id.
 *   4. Else → die with "Phase not found".
 */
export async function resolvePhaseId(
  db: Db,
  featureId: string,
  identifier: string,
): Promise<number> {
  const n = parseInt(identifier, 10);
  if (isNaN(n) || n < 1) die(`Invalid phase identifier: ${identifier}`);

  const allPhases = await db.query.phases.findMany({
    where: { featureId },
    orderBy: { order: "asc" },
    columns: { id: true, order: true },
  });

  // Try exact ID match first
  const byId = allPhases.find((p) => p.id === n);
  if (byId) return byId.id;

  // Fall back to 1-based ordinal position
  const byOrdinal = allPhases[n - 1];
  if (byOrdinal) return byOrdinal.id;

  die(`Phase not found: ${identifier}`);
  // die() always exits; this line is unreachable but satisfies the type checker
  throw new Error(`Phase not found: ${identifier}`);
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
    .option("--force", "Override stage guard (allow adding phase in review/documentation/released)")
    .action(async (featureId, title, description, options) => {
      const db = await getDb();
      try {
        const phase = await addPhase(db, featureId, title, description, { force: options.force });
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
    .argument("<phase-id>", "Phase ID or 1-based ordinal position within the feature")
    .argument("<status>", `New status (${VALID_PHASE_STATUSES.join("|")})`)
    .action(async (featureId, phaseIdStr, statusStr) => {
      const db = await getDb();
      if (!(VALID_PHASE_STATUSES as readonly string[]).includes(statusStr)) {
        die(`Invalid status: ${statusStr}. Must be one of: ${VALID_PHASE_STATUSES.join(", ")}`);
      }
      const phaseId = await resolvePhaseId(db, featureId, phaseIdStr);
      try {
        const result = await updatePhaseStatus(db, featureId, phaseId, statusStr as PhaseTaskStatus);
        console.log(`Phase ${result.phase.id} status → ${result.phase.status}`);
        if (result.stageAdvanced) {
          console.log("Feature stage advanced to 'review'");
        }
      } catch (err) {
        die(errMsg(err));
      }
    });
}
