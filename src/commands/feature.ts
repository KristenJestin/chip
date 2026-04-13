import { Command } from "@commander-js/extra-typings";
import { type Db, getDb } from "../db/client";
import { features } from "../db/schema";
import { type FeatureDetails } from "../db/types";
import { toSlug, uniqueSlug } from "../utils/slug";
import { formatDate, formatDateTime, statusBadge, sep, pad } from "../utils/format";
import { die, errMsg } from "../utils/die";
import { nowUnix } from "../utils/time";

const RECENT_LOGS_LIMIT = 10;

// ── Services (exported for testing) ──────────────────────────────────────────

export async function createFeature(db: Db, title: string, description?: string): Promise<string> {
  const now = nowUnix();
  const existing = await db.query.features.findMany({ columns: { id: true } });
  const id = uniqueSlug(
    toSlug(title),
    existing.map((f) => f.id),
  );
  await db
    .insert(features)
    .values({
      id,
      title,
      description: description ?? null,
      status: "active",
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return id;
}

export async function listFeatures(db: Db) {
  return db.query.features.findMany({ orderBy: { createdAt: "asc" } });
}

export async function getFeatureDetails(db: Db, featureId: string): Promise<FeatureDetails> {
  const result = await db.query.features.findFirst({
    where: { id: featureId },
    with: {
      phases: {
        orderBy: { order: "asc" },
        with: {
          tasks: {
            orderBy: { order: "asc" },
          },
        },
      },
      logs: {
        orderBy: { createdAt: "desc" },
        limit: RECENT_LOGS_LIMIT,
      },
    },
  });

  if (!result) throw new Error(`Feature not found: ${featureId}`);

  const { phases: featurePhases, logs: recentLogs, ...feature } = result;
  return { feature, phases: featurePhases, recentLogs };
}

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

      const { feature, phases: featurePhases, recentLogs } = details;

      // ── header ──────────────────────────────────────────────────────────────
      console.log(`feature: ${feature.id}`);
      console.log(sep());
      console.log(`title:   ${feature.title}`);
      console.log(`status:  ${feature.status}`);
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
              console.log(`          ${task.order}.  ${statusBadge(task.status)}  ${task.title}`);
              if (task.description) console.log(`                ${task.description}`);
            }
          }
          console.log("");
        }
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
}
