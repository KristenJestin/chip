import { Command } from "@commander-js/extra-typings";
import { eq, max } from "drizzle-orm";
import { getDb } from "../db/client";
import { features, phases, tasks } from "../db/schema";

function die(msg: string): never {
  console.error(`error: ${msg}`);
  process.exit(1);
}

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
    .action(
      async (
        featureId: string,
        phaseIdStr: string,
        title: string,
        description?: string
      ) => {
        const db = await getDb();
        const now = Math.floor(Date.now() / 1000);

        // Validate feature exists
        const feature = await db
          .select({ id: features.id })
          .from(features)
          .where(eq(features.id, featureId))
          .get();

        if (!feature) die(`Feature not found: ${featureId}`);

        const phaseId = parseInt(phaseIdStr, 10);
        if (isNaN(phaseId)) die(`Invalid phase ID: ${phaseIdStr}`);

        // Validate phase belongs to the given feature
        const phaseCheck = await db
          .select({ id: phases.id, featureId: phases.featureId })
          .from(phases)
          .where(eq(phases.id, phaseId))
          .get();

        if (!phaseCheck) die(`Phase not found: ${phaseId}`);

        if (phaseCheck.featureId !== featureId) {
          die(`Phase ${phaseId} does not belong to feature ${featureId}`);
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
          .returning({ id: tasks.id })
          .all();

        console.log(
          `Added task ${inserted?.id ?? "?"} to phase ${phaseId}: ${title}`
        );
      }
    );
}
