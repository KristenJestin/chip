import { writeFile } from "fs/promises";
import { Command } from "@commander-js/extra-typings";
import { getDb } from "../db/client";
import { type FeatureDetails } from "../db/types";
import { formatDate, formatDateTime, statusBadge, sep, pad } from "../utils/format";
import { die, errMsg } from "../utils/die";
import {
  STAGE_ORDER,
  type FeatureStage,
  createFeature,
  listFeatures,
  getFeatureDetails,
  exportFeature,
  updateFeatureStage,
} from "../core/feature";
import { getFeatureDependencyMap } from "../core/dependency";

// ── Commander registration ────────────────────────────────────────────────────

export function registerFeatureCommands(program: Command): void {
  const featureCmd = program.command("feature").description("Manage features");

  // ── feature create ──────────────────────────────────────────────────────────
  featureCmd
    .command("create")
    .description("Create a new feature")
    .argument("<title>", "Feature title")
    .argument("[description]", "Feature description")
    .action(async (title, description) => {
      const db = await getDb();
      try {
        const id = await createFeature(db, title, description);
        console.log(`Created feature: ${id}`);
      } catch (err) {
        die(errMsg(err));
      }
    });

  // ── feature list ────────────────────────────────────────────────────────────
  featureCmd
    .command("list")
    .description("List all features")
    .action(async () => {
      const db = await getDb();
      const rows = await listFeatures(db);

      if (rows.length === 0) {
        console.log("No features found.");
        return;
      }

      const idW = Math.max(10, ...rows.map((f) => f.id.length));
      const titleW = Math.max(10, ...rows.map((f) => f.title.length));

      console.log(pad("ID", idW) + "  " + pad("TITLE", titleW) + "  STATUS");
      console.log(sep(idW + titleW + 10));
      for (const f of rows) {
        console.log(pad(f.id, idW) + "  " + pad(f.title, titleW) + "  " + f.status);
      }
    });

  // ── feature status ──────────────────────────────────────────────────────────
  featureCmd
    .command("status")
    .description("Show detailed status of a feature")
    .argument("<feature-id>", "Feature ID")
    .action(async (featureId) => {
      const db = await getDb();
      let details: FeatureDetails;
      try {
        details = await getFeatureDetails(db, featureId);
      } catch (err) {
        die(errMsg(err));
      }

      const { feature, phases: featurePhases, recentLogs, findings, criteria } = details;

      // Fetch dependency map for all tasks in one batch
      const allTaskIds = featurePhases.flatMap((p) => p.tasks.map((t) => t.id));
      const depMap = await getFeatureDependencyMap(db, allTaskIds);

      // ── header ──────────────────────────────────────────────────────────────
      console.log(`feature: ${feature.id}`);
      console.log(sep());
      console.log(`title:   ${feature.title}`);
      console.log(`status:  ${feature.status}`);
      console.log(`stage:   ${feature.stage}`);
      if (feature.description) {
        console.log(`desc:    ${feature.description}`);
      }
      console.log(`created: ${formatDate(feature.createdAt)}`);
      if (feature.updatedAt !== feature.createdAt) {
        console.log(`updated: ${formatDate(feature.updatedAt)}`);
      }

      // ── phases ───────────────────────────────────────────────────────────────
      console.log("");
      console.log(`phases (${featurePhases.length})`);
      console.log(sep());

      if (featurePhases.length === 0) {
        console.log("  (none)");
      } else {
        for (const phase of featurePhases) {
          console.log(`  ${phase.order}.  ${statusBadge(phase.status)}  ${phase.title}`);
          if (phase.description) console.log(`        ${phase.description}`);
          if (phase.startedAt != null)
            console.log(`        started:   ${formatDate(phase.startedAt)}`);
          if (phase.completedAt != null)
            console.log(`        completed: ${formatDate(phase.completedAt)}`);

          if (phase.tasks.length === 0) {
            console.log("        tasks: (none)");
          } else {
            console.log("        tasks:");
            for (const task of phase.tasks) {
              const typeTag = task.type !== "feature" ? ` [${task.type}]` : "";
              console.log(
                `          ${task.order}.  ${statusBadge(task.status)}  ${task.title}${typeTag}`,
              );
              if (task.description) console.log(`                ${task.description}`);

              const blockedBy = depMap.blockedBy.get(task.id);
              if (blockedBy && blockedBy.length > 0) {
                const names = blockedBy.map((t) => `#${t.id} ${t.title}`).join(", ");
                console.log(`                Bloqué par : ${names}`);
              }
              const blocks = depMap.blocks.get(task.id);
              if (blocks && blocks.length > 0) {
                const names = blocks.map((t) => `#${t.id} ${t.title}`).join(", ");
                console.log(`                Bloque : ${names}`);
              }
            }
          }
          console.log("");
        }
      }

      // ── criteria ─────────────────────────────────────────────────────────────
      if (criteria.length > 0) {
        const satisfiedCount = criteria.filter((c) => c.satisfied).length;
        console.log(`criteria (${satisfiedCount}/${criteria.length} satisfied)`);
        console.log(sep());
        for (const c of criteria) {
          const check = c.satisfied ? "x" : " ";
          console.log(`  [${check}] ${c.description}`);
        }
        console.log("");
      }

      // ── findings ─────────────────────────────────────────────────────────────
      if (findings.length > 0) {
        const unresolvedCount = findings.filter((f) => f.resolution == null).length;
        console.log(`findings (${findings.length} — ${unresolvedCount} unresolved)`);
        console.log(sep());
        for (const f of findings) {
          const status = f.resolution ? `resolved:${f.resolution}` : "unresolved";
          const category = f.category ? ` · ${f.category}` : "";
          console.log(`  [${f.severity}] [${f.pass}${category}]  ${f.description}  (${status})`);
        }
        console.log("");
      }

      // ── logs ─────────────────────────────────────────────────────────────────
      console.log(`recent logs (${recentLogs.length})`);
      console.log(sep());

      if (recentLogs.length === 0) {
        console.log("  (none)");
      } else {
        for (const log of recentLogs) {
          const src = log.source ? `[${log.source}] ` : "";
          console.log(`  ${formatDateTime(log.createdAt)}  ${src}${log.message}`);
        }
      }
    });

  // ── feature export ───────────────────────────────────────────────────────────
  featureCmd
    .command("export")
    .description("Export a feature as markdown")
    .argument("<feature-id>", "Feature ID")
    .option("-o, --output <file>", "Write output to a file instead of stdout")
    .action(async (featureId, options) => {
      const db = await getDb();
      try {
        const markdown = await exportFeature(db, featureId);
        if (options.output) {
          await writeFile(options.output, markdown, "utf-8");
          console.log(`Exported to ${options.output}`);
        } else {
          process.stdout.write(markdown);
        }
      } catch (err) {
        die(errMsg(err));
      }
    });

  // ── feature stage ─────────────────────────────────────────────────────────
  featureCmd
    .command("stage")
    .description("Update the pipeline stage of a feature")
    .argument("<feature-id>", "Feature ID")
    .argument(
      "<stage>",
      "New stage (planning|development|review|documentation|released)",
    )
    .option("--force", "Allow backwards transitions and skip task checks")
    .action(async (featureId, stage, options) => {
      const db = await getDb();
      if (!(STAGE_ORDER as readonly string[]).includes(stage)) {
        die(
          `Invalid stage: ${stage}. Must be one of: ${STAGE_ORDER.join(", ")}`,
        );
      }
      try {
        const feature = await updateFeatureStage(
          db,
          featureId,
          stage as FeatureStage,
          options.force ?? false,
        );
        console.log(`Feature ${feature.id} stage → ${feature.stage}`);
      } catch (err) {
        die(errMsg(err));
      }
    });
}
