import { Command } from "@commander-js/extra-typings";
import { getDb } from "../db/client";
import { die, errMsg } from "../utils/die";
import { formatDateTime } from "../utils/format";
import {
  FINDING_PASSES,
  FINDING_SEVERITIES,
  FINDING_CATEGORIES,
  FINDING_RESOLUTIONS,
  type FindingPass,
  type FindingSeverity,
  type FindingCategory,
  type FindingResolution,
  addFinding,
  listFindings,
  resolveFinding,
} from "../core/finding";

// ── Commander registration ────────────────────────────────────────────────────

export function registerFindingCommands(program: Command): void {
  const findingCmd = program.command("finding").description("Manage review findings");

  // ── finding add ───────────────────────────────────────────────────────────
  findingCmd
    .command("add")
    .description("Add a finding to a feature")
    .argument("<feature-id>", "Feature ID")
    .argument("<description>", "Finding description")
    .requiredOption("--pass <pass>", `Review pass (${FINDING_PASSES.join("|")})`)
    .requiredOption("--severity <sev>", `Severity (${FINDING_SEVERITIES.join("|")})`)
    .option("--category <cat>", `Category (${FINDING_CATEGORIES.join("|")})`)
    .option("--session <id>", "Session ID to associate")
    .action(async (featureId, description, options) => {
      const db = await getDb();
      if (!(FINDING_PASSES as readonly string[]).includes(options.pass)) {
        die(`Invalid pass: ${options.pass}. Must be one of: ${FINDING_PASSES.join(", ")}`);
      }
      if (!(FINDING_SEVERITIES as readonly string[]).includes(options.severity)) {
        die(
          `Invalid severity: ${options.severity}. Must be one of: ${FINDING_SEVERITIES.join(", ")}`,
        );
      }
      const sessionId =
        options.session != null ? parseInt(options.session, 10) : undefined;
      try {
        const finding = await addFinding(db, featureId, description, {
          pass: options.pass as FindingPass,
          severity: options.severity as FindingSeverity,
          category: options.category as FindingCategory | undefined,
          sessionId,
        });
        console.log(`Added finding ${finding.id} (${finding.severity}) to ${featureId}`);
      } catch (err) {
        die(errMsg(err));
      }
    });

  // ── finding list ──────────────────────────────────────────────────────────
  findingCmd
    .command("list")
    .description("List findings for a feature")
    .argument("<feature-id>", "Feature ID")
    .option("--unresolved", "Only show unresolved findings")
    .option("--pass <pass>", `Filter by pass (${FINDING_PASSES.join("|")})`)
    .option("--severity <sev>", `Filter by severity (${FINDING_SEVERITIES.join("|")})`)
    .action(async (featureId, options) => {
      const db = await getDb();
      try {
        const rows = await listFindings(db, featureId, {
          unresolved: options.unresolved,
          pass: options.pass as FindingPass | undefined,
          severity: options.severity as FindingSeverity | undefined,
        });

        if (rows.length === 0) {
          console.log("No findings found.");
          return;
        }

        for (const f of rows) {
          const res = f.resolution ?? "unresolved";
          console.log(
            `[${f.id}] ${f.severity} | ${f.pass} | ${res} | ${formatDateTime(f.createdAt)}`,
          );
          console.log(`  ${f.description}`);
          if (f.category) console.log(`  category: ${f.category}`);
          if (f.taskId != null) console.log(`  fix task: ${f.taskId}`);
        }
      } catch (err) {
        die(errMsg(err));
      }
    });

  // ── finding resolve ────────────────────────────────────────────────────────
  findingCmd
    .command("resolve")
    .description("Resolve a finding")
    .argument("<finding-id>", "Finding ID (numeric)")
    .argument("<resolution>", `Resolution (${FINDING_RESOLUTIONS.join("|")})`)
    .option("--task <task-id>", "Link to a fix task")
    .action(async (findingIdStr, resolutionStr, options) => {
      const db = await getDb();
      const findingId = parseInt(findingIdStr, 10);
      if (isNaN(findingId)) die(`Invalid finding ID: ${findingIdStr}`);
      if (!(FINDING_RESOLUTIONS as readonly string[]).includes(resolutionStr)) {
        die(
          `Invalid resolution: ${resolutionStr}. Must be one of: ${FINDING_RESOLUTIONS.join(", ")}`,
        );
      }
      const taskId =
        options.task != null ? parseInt(options.task, 10) : undefined;
      try {
        const finding = await resolveFinding(
          db,
          findingId,
          resolutionStr as FindingResolution,
          taskId,
        );
        console.log(`Finding ${finding.id} resolved as ${finding.resolution}`);
      } catch (err) {
        die(errMsg(err));
      }
    });
}
