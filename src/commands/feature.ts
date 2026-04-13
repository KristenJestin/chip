import { Command } from "@commander-js/extra-typings";
import { eq, desc, asc } from "drizzle-orm";
import { type Db, getDb } from "../db/client";
import { features, phases, tasks, logs } from "../db/schema";
import { toSlug, uniqueSlug } from "../utils/slug";
import { formatDate, formatDateTime, statusBadge, sep, pad } from "../utils/format";
import { die } from "../utils/die";

// ── Types ────────────────────────────────────────────────────────────────────

type Feature = typeof features.$inferSelect;
type Phase = typeof phases.$inferSelect;
type Task = typeof tasks.$inferSelect;
type Log = typeof logs.$inferSelect;

export type PhaseWithTasks = Phase & { phaseTasks: Task[] };

export type FeatureDetails = {
  feature: Feature;
  featurePhases: PhaseWithTasks[];
  recentLogs: Log[];
};

// ── Services (exported for testing) ─────────────────────────────────────────

export async function createFeature(
  db: Db,
  title: string,
  description?: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const existing = await db.select({ id: features.id }).from(features).all();
  const id = uniqueSlug(toSlug(title), existing.map((f) => f.id));
  await db
    .insert(features)
    .values({ id, title, description: description ?? null, status: "active", createdAt: now, updatedAt: now })
    .run();
  return id;
}

export async function listFeatures(db: Db): Promise<Feature[]> {
  return db.select().from(features).orderBy(asc(features.createdAt)).all();
}

export async function getFeatureDetails(db: Db, featureId: string): Promise<FeatureDetails> {
  const feature = await db
    .select()
    .from(features)
    .where(eq(features.id, featureId))
    .get();

  if (!feature) throw new Error(`Feature not found: ${featureId}`);

  const featurePhases = await db
    .select()
    .from(phases)
    .where(eq(phases.featureId, featureId))
    .orderBy(asc(phases.order))
    .all();

  const phasesWithTasks: PhaseWithTasks[] = await Promise.all(
    featurePhases.map(async (phase) => {
      const phaseTasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.phaseId, phase.id))
        .orderBy(asc(tasks.order))
        .all();
      return { ...phase, phaseTasks };
    })
  );

  const recentLogs = await db
    .select()
    .from(logs)
    .where(eq(logs.featureId, featureId))
    .orderBy(desc(logs.createdAt))
    .limit(10)
    .all();

  return { feature, featurePhases: phasesWithTasks, recentLogs };
}

// ── Commander registration ───────────────────────────────────────────────────

export function registerFeatureCommands(program: Command): void {
  const featureCmd = program
    .command("feature")
    .description("Manage features");

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
        die(err instanceof Error ? err.message : String(err));
      }
    });

  // ── feature list ─────────────────────────────────────────────────────────────
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

  // ── feature status ───────────────────────────────────────────────────────────
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
        die(err instanceof Error ? err.message : String(err));
      }

      const { feature, featurePhases, recentLogs } = details;

      // ── header ────────────────────────────────────────────────────────────────
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

      // ── phases ────────────────────────────────────────────────────────────────
      console.log("");
      console.log(`phases (${featurePhases.length})`);
      console.log(sep());

      if (featurePhases.length === 0) {
        console.log("  (none)");
      } else {
        for (const phase of featurePhases) {
          console.log(`  ${phase.order}.  ${statusBadge(phase.status)}  ${phase.title}`);
          if (phase.description) console.log(`        ${phase.description}`);
          if (phase.startedAt != null) console.log(`        started:   ${formatDate(phase.startedAt)}`);
          if (phase.completedAt != null) console.log(`        completed: ${formatDate(phase.completedAt)}`);

          if (phase.phaseTasks.length === 0) {
            console.log("        tasks: (none)");
          } else {
            console.log("        tasks:");
            for (const task of phase.phaseTasks) {
              console.log(`          ${task.order}.  ${statusBadge(task.status)}  ${task.title}`);
              if (task.description) console.log(`                ${task.description}`);
            }
          }
          console.log("");
        }
      }

      // ── logs ──────────────────────────────────────────────────────────────────
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
