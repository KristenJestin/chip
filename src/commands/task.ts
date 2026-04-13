import { Command } from "@commander-js/extra-typings";
import { eq, max } from "drizzle-orm";
import { type Db, getDb } from "../db/client";
import { features, phases, tasks } from "../db/schema";
import { die } from "../utils/die";

// ── Types ────────────────────────────────────────────────────────────────────

type Task = typeof tasks.$inferSelect;

// ── Services (exported for testing) ─────────────────────────────────────────

export async function addTask(
  db: Db,
  featureId: string,
  phaseId: number,
  title: string,
  description?: string
): Promise<Task> {
  const now = Math.floor(Date.now() / 1000);

  const feature = await db
    .select({ id: features.id })
    .from(features)
    .where(eq(features.id, featureId))
    .get();

  if (!feature) throw new Error(`Feature not found: ${featureId}`);

  const phase = await db
    .select({ id: phases.id, featureId: phases.featureId })
    .from(phases)
    .where(eq(phases.id, phaseId))
    .get();

  if (!phase) throw new Error(`Phase not found: ${phaseId}`);

  if (phase.featureId !== featureId) {
    throw new Error(`Phase ${phaseId} does not belong to feature ${featureId}`);
  }

  const [maxRow] = await db
    .select({ maxOrder: max(tasks.order) })
    .from(tasks)
    .where(eq(tasks.phaseId, phaseId))
    .all();

  const nextOrder = (maxRow?.maxOrder ?? 0) + 1;

  const [inserted] = await db
    .insert(tasks)
    .values({
      phaseId,
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

  if (!inserted) throw new Error("Failed to insert task");
  return inserted;
}

// ── Commander registration ───────────────────────────────────────────────────

export function registerTaskCommands(program: Command): void {
  const taskCmd = program.command("task").description("Manage tasks");

  // ── task add ─────────────────────────────────────────────────────────────────
  taskCmd
    .command("add")
    .description("Add a task to a phase")
    .argument("<feature-id>", "Feature ID")
    .argument("<phase-id>", "Phase ID (numeric)")
    .argument("<title>", "Task title")
    .argument("[description]", "Task description")
    .action(async (featureId, phaseIdStr, title, description) => {
      const db = await getDb();
      const phaseId = parseInt(phaseIdStr, 10);
      if (isNaN(phaseId)) die(`Invalid phase ID: ${phaseIdStr}`);

      try {
        const task = await addTask(db, featureId, phaseId, title, description);
        console.log(`Added task ${task.id} to phase ${phaseId}: ${title}`);
      } catch (err) {
        die(err instanceof Error ? err.message : String(err));
      }
    });
}
