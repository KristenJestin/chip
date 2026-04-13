import { Command } from "@commander-js/extra-typings";
import { eq, max } from "drizzle-orm";
import { type Db, getDb } from "../db/client";
import { features, phases } from "../db/schema";
import { die } from "../utils/die";

// ── Types ────────────────────────────────────────────────────────────────────

type Phase = typeof phases.$inferSelect;

// ── Services (exported for testing) ─────────────────────────────────────────

export async function addPhase(
  db: Db,
  featureId: string,
  title: string,
  description?: string
): Promise<Phase> {
  const now = Math.floor(Date.now() / 1000);

  const feature = await db
    .select({ id: features.id })
    .from(features)
    .where(eq(features.id, featureId))
    .get();

  if (!feature) throw new Error(`Feature not found: ${featureId}`);

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
    .returning()
    .all();

  if (!inserted) throw new Error("Failed to insert phase");
  return inserted;
}

// ── Commander registration ───────────────────────────────────────────────────

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
        die(err instanceof Error ? err.message : String(err));
      }
    });
}
