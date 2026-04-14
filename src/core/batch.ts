import { type Db } from "../db/client";
import { phases, tasks } from "../db/schema";
import { assertFeatureExists, nextPhaseOrder, nextTaskOrder } from "../db/helpers";
import { validate } from "./validate";
import { BatchInput, BatchPayload } from "./schemas";
import { nowUnix } from "../utils/time";

// ── Types ─────────────────────────────────────────────────────────────────────

export type BatchResult = {
  phasesCreated: number;
  tasksCreated: number;
};

// ── Services ──────────────────────────────────────────────────────────────────

export async function executeBatch(
  db: Db,
  featureId: string,
  payload: unknown,
): Promise<BatchResult> {
  // Validate the full input (featureId + payload shape)
  validate(BatchInput, { featureId, payload });

  const parsed = BatchPayload.parse(payload);
  await assertFeatureExists(db, featureId);

  let phasesCreated = 0;
  let tasksCreated = 0;
  const now = nowUnix();

  for (const phaseSpec of parsed.phases) {
    const order = await nextPhaseOrder(db, featureId);
    const [insertedPhase] = await db
      .insert(phases)
      .values({
        featureId,
        order,
        title: phaseSpec.title,
        description: phaseSpec.description ?? null,
        createdAt: now,
        startedAt: null,
        completedAt: null,
      })
      .returning()
      .all();

    if (!insertedPhase) throw new Error("Failed to insert phase");
    phasesCreated++;

    for (const taskSpec of phaseSpec.tasks) {
      const taskOrder = await nextTaskOrder(db, insertedPhase.id);
      const [insertedTask] = await db
        .insert(tasks)
        .values({
          phaseId: insertedPhase.id,
          order: taskOrder,
          title: taskSpec.title,
          description: taskSpec.description ?? null,
          type: taskSpec.type ?? "feature",
          parentTaskId: null,
          createdAt: now,
          startedAt: null,
          completedAt: null,
        })
        .returning()
        .all();

      if (!insertedTask) throw new Error("Failed to insert task");
      tasksCreated++;
    }
  }

  return { phasesCreated, tasksCreated };
}
