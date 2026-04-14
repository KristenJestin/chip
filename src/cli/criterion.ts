import { Command } from "@commander-js/extra-typings";
import { getDb } from "../db/client";
import { die, errMsg } from "../utils/die";
import { formatDateTime } from "../utils/format";
import { addCriterion, checkCriterion, listCriteria } from "../core/criterion";

// ── Commander registration ────────────────────────────────────────────────────

export function registerCriteriaCommands(program: Command): void {
  const criteriaCmd = program.command("criteria").description("Manage acceptance criteria");

  // ── criteria add ──────────────────────────────────────────────────────────
  criteriaCmd
    .command("add")
    .description("Add an acceptance criterion to a feature")
    .argument("<feature-id>", "Feature ID")
    .argument("<description>", "Criterion description")
    .option("--phase <id>", "Phase ID to scope this criterion to")
    .action(async (featureId, description, options) => {
      const db = await getDb();
      const phaseId = options.phase != null ? parseInt(options.phase, 10) : undefined;
      if (phaseId !== undefined && isNaN(phaseId)) {
        die(`Invalid phase ID: ${options.phase}`);
      }
      try {
        const criterion = await addCriterion(db, featureId, description, { phaseId });
        console.log(`Added criterion ${criterion.id} to ${featureId}`);
      } catch (err) {
        die(errMsg(err));
      }
    });

  // ── criteria check ────────────────────────────────────────────────────────
  criteriaCmd
    .command("check")
    .description("Mark a criterion as satisfied")
    .argument("<criterion-id>", "Criterion ID (numeric)")
    .option("--source <source>", "Source or session that verified it")
    .action(async (criterionIdStr, options) => {
      const db = await getDb();
      const criterionId = parseInt(criterionIdStr, 10);
      if (isNaN(criterionId)) die(`Invalid criterion ID: ${criterionIdStr}`);
      try {
        const criterion = await checkCriterion(db, criterionId, {
          source: options.source,
        });
        console.log(`Criterion ${criterion.id} satisfied`);
      } catch (err) {
        die(errMsg(err));
      }
    });

  // ── criteria list ─────────────────────────────────────────────────────────
  criteriaCmd
    .command("list")
    .description("List acceptance criteria for a feature")
    .argument("<feature-id>", "Feature ID")
    .option("--pending", "Only show unsatisfied criteria")
    .option("--phase <id>", "Filter by phase ID")
    .action(async (featureId, options) => {
      const db = await getDb();
      const phaseId = options.phase != null ? parseInt(options.phase, 10) : undefined;
      try {
        const rows = await listCriteria(db, featureId, {
          pending: options.pending,
          phaseId,
        });

        if (rows.length === 0) {
          console.log("No criteria found.");
          return;
        }

        for (const c of rows) {
          const check = c.satisfied === 1 ? "x" : " ";
          const verified = c.verifiedBy ? ` (by ${c.verifiedBy})` : "";
          const phaseScope = c.phaseId != null ? ` [phase ${c.phaseId}]` : "";
          console.log(
            `[${c.id}] [${check}]${phaseScope} ${formatDateTime(c.createdAt)}${verified}`,
          );
          console.log(`  ${c.description}`);
        }
      } catch (err) {
        die(errMsg(err));
      }
    });
}
