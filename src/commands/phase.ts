import { Command } from "@commander-js/extra-typings";
import { eq, max } from "drizzle-orm";
import { getDb } from "../db/client";
import { features, phases } from "../db/schema";

function die(msg: string): never {
  console.error(`error: ${msg}`);
  process.exit(1);
}

export function registerPhaseCommands(program: Command): void {
  const phaseCmd = program.command("phase").description("Manage phases");

  // ── phase add ────────────────────────────────────────────────────────────────
  phaseCmd
    .command("add")
    .description("Add a phase to a feature")
    .argument("<feature-id>", "Feature ID")
    .argument("<title>", "Phase title")
    .argument("[description]", "Phase description")
    .action(async (featureId: string, title: string, description?: string) => {
      const db = await getDb();
      const now = Math.floor(Date.now() / 1000);

      const feature = await db
        .select({ id: features.id })
        .from(features)
        .where(eq(features.id, featureId))
        .get();

      if (!feature) die(`Feature not found: ${featureId}`);

      const [maxRow] = await db
        .select({ maxOrder: max(phases.order) })
        .from(phases)
        .where(eq(phases.featureId, featureId))
        .all();

      const nextOrder = (maxRow?.maxOrder ?? 0) + 1;

      const [inserted] = await db
        .insert(phases)
        .values({
          featureId,
          order: nextOrder,
          title,
          description: description ?? null,
          status: "todo",
          createdAt: now,
          startedAt: null,
          completedAt: null,
        })
        .returning({ id: phases.id })
        .all();

      console.log(`Added phase ${inserted?.id ?? "?"} to ${featureId}: ${title}`);
    });
}
