import { Command } from "@commander-js/extra-typings";
import { type Db, getDb } from "../db/client";
import { type Phase } from "../db/types";
import { phases } from "../db/schema";
import { assertFeatureExists, nextPhaseOrder } from "../db/helpers";
import { die, errMsg } from "../utils/die";
import { nowUnix } from "../utils/time";

export type { Phase };

// ── Services (exported for testing) ──────────────────────────────────────────

export async function addPhase(
  db: Db,
  featureId: string,
  title: string,
  description?: string
): Promise<Phase> {
  await assertFeatureExists(db, featureId);

  const order = await nextPhaseOrder(db, featureId);
  const now = nowUnix();

  const [inserted] = await db
    .insert(phases)
    .values({
      featureId,
      order,
      title,
      description: description ?? null,
      createdAt: now,
      startedAt: null,
      completedAt: null,
    })
    .returning()
    .all();

  if (!inserted) throw new Error("Failed to insert phase");
  return inserted;
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
    .action(async (featureId, title, description) => {
      const db = await getDb();
      try {
        const phase = await addPhase(db, featureId, title, description);
        console.log(`Added phase ${phase.id} to ${featureId}: ${title}`);
      } catch (err) {
        die(errMsg(err));
      }
    });
}
