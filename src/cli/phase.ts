import { Command } from "@commander-js/extra-typings";
import { getDb } from "../db/client";
import { die, errMsg } from "../utils/die";
import {
  VALID_PHASE_STATUSES,
  type PhaseTaskStatus,
  addPhase,
  updatePhaseStatus,
} from "../core/phase";

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
    .argument("<status>", `New status (${VALID_PHASE_STATUSES.join("|")})`)
    .action(async (featureId, phaseIdStr, statusStr) => {
      const db = await getDb();
      const phaseId = parseInt(phaseIdStr, 10);
      if (isNaN(phaseId)) die(`Invalid phase ID: ${phaseIdStr}`);
      if (!(VALID_PHASE_STATUSES as readonly string[]).includes(statusStr)) {
        die(`Invalid status: ${statusStr}. Must be one of: ${VALID_PHASE_STATUSES.join(", ")}`);
      }
      try {
        const phase = await updatePhaseStatus(db, featureId, phaseId, statusStr as PhaseTaskStatus);
        console.log(`Phase ${phase.id} status → ${phase.status}`);
      } catch (err) {
        die(errMsg(err));
      }
    });
}
