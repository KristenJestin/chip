import { Command } from "@commander-js/extra-typings";
import { eq, desc, asc } from "drizzle-orm";
import { getDb } from "../db/client";
import { features, phases, tasks, logs } from "../db/schema";
import { toSlug, uniqueSlug } from "../utils/slug";
import { formatDate, formatDateTime, statusBadge, sep, pad } from "../utils/format";

function die(msg: string): never {
  console.error(`error: ${msg}`);
  process.exit(1);
}

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
    .action(async (title: string, description?: string) => {
      const db = await getDb();
      const now = Math.floor(Date.now() / 1000);

      const existing = await db.select({ id: features.id }).from(features).all();
      const id = uniqueSlug(toSlug(title), existing.map((f) => f.id));

      await db.insert(features)
        .values({
          id,
          title,
          description: description ?? null,
          status: "active",
          createdAt: now,
          updatedAt: now,
        })
        .run();

      console.log(`Created feature: ${id}`);
    });

  // ── feature list ─────────────────────────────────────────────────────────────
  featureCmd
    .command("list")
    .description("List all features")
    .action(async () => {
      const db = await getDb();
      const rows = await db
        .select()
        .from(features)
        .orderBy(asc(features.createdAt))
        .all();

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
    .action(async (featureId: string) => {
      const db = await getDb();

      const feature = await db
        .select()
        .from(features)
        .where(eq(features.id, featureId))
        .get();

      if (!feature) die(`Feature not found: ${featureId}`);

      const featurePhases = await db
        .select()
        .from(phases)
        .where(eq(phases.featureId, featureId))
        .orderBy(asc(phases.order))
        .all();

      const recentLogs = await db
        .select()
        .from(logs)
        .where(eq(logs.featureId, featureId))
        .orderBy(desc(logs.createdAt))
        .limit(10)
        .all();

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
          console.log(
            `  ${phase.order}.  ${statusBadge(phase.status)}  ${phase.title}`
          );
          if (phase.description) {
            console.log(`        ${phase.description}`);
          }
          if (phase.startedAt != null) {
            console.log(`        started:   ${formatDate(phase.startedAt)}`);
          }
          if (phase.completedAt != null) {
            console.log(`        completed: ${formatDate(phase.completedAt)}`);
          }

          const phaseTasks = await db
            .select()
            .from(tasks)
            .where(eq(tasks.phaseId, phase.id))
            .orderBy(asc(tasks.order))
            .all();

          if (phaseTasks.length === 0) {
            console.log("        tasks: (none)");
          } else {
            console.log("        tasks:");
            for (const task of phaseTasks) {
              console.log(
                `          ${task.order}.  ${statusBadge(task.status)}  ${task.title}`
              );
              if (task.description) {
                console.log(`                ${task.description}`);
              }
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
