import { type Db } from "../db/client";
import { phases, tasks } from "../db/schema";
import { assertFeatureExists, nextPhaseOrder, nextTaskOrder } from "../db/helpers";
import { validate } from "./validate";
import { BatchInput, BatchPayload, type BatchTaskSpec } from "./schemas";
import { nowUnix } from "../utils/time";
import { addTaskDependency } from "./dependency";

// ── Types ─────────────────────────────────────────────────────────────────────

export type BatchResult = {
  phasesCreated: number;
  tasksCreated: number;
  depsCreated: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Validates that all refs in the batch are unique and that all blockedBy refs
 * reference a ref defined within the same batch.
 */
function validateBatchRefs(flatTasks: BatchTaskSpec[]): void {
  const refs = new Set<string>();

  for (const task of flatTasks) {
    if (!task.ref) continue;
    if (refs.has(task.ref)) {
      throw new Error(`Duplicate ref in batch: "${task.ref}"`);
    }
    refs.add(task.ref);
  }

  for (const task of flatTasks) {
    if (!task.blockedBy) continue;
    for (const dep of task.blockedBy) {
      if (!refs.has(dep)) {
        throw new Error(`Unknown ref in blockedBy: "${dep}" (not defined in this batch)`);
      }
    }
  }
}

/**
 * Detects cycles in the within-batch dependency graph using a 3-color DFS.
 * "blocked by" ref means the current task depends on (must wait for) that ref.
 */
function checkWithinBatchCycles(flatTasks: BatchTaskSpec[]): void {
  // Build dependency graph: ref → list of refs it depends on (its blockers)
  const dependsOn = new Map<string, string[]>();
  for (const task of flatTasks) {
    if (task.ref && task.blockedBy && task.blockedBy.length > 0) {
      dependsOn.set(task.ref, task.blockedBy);
    }
  }

  if (dependsOn.size === 0) return;

  const allRefs = new Set([...dependsOn.keys(), ...[...dependsOn.values()].flat()]);
  const color = new Map<string, "white" | "gray" | "black">();
  for (const ref of allRefs) color.set(ref, "white");

  function dfs(ref: string): void {
    color.set(ref, "gray");
    for (const dep of dependsOn.get(ref) ?? []) {
      const c = color.get(dep) ?? "white";
      if (c === "gray") {
        throw new Error(
          `Cyclic dependency detected in batch: "${ref}" and "${dep}" form a cycle`,
        );
      }
      if (c === "white") dfs(dep);
    }
    color.set(ref, "black");
  }

  for (const ref of allRefs) {
    if (color.get(ref) === "white") dfs(ref);
  }
}

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

  // Validate refs before touching the DB
  const flatTasks = parsed.phases.flatMap((p) => p.tasks);
  validateBatchRefs(flatTasks);
  checkWithinBatchCycles(flatTasks);

  let phasesCreated = 0;
  let tasksCreated = 0;
  let depsCreated = 0;
  const now = nowUnix();

  // ref → inserted task id, resolved after all inserts
  const refToTaskId = new Map<string, number>();
  // Pairs to create as dependencies once all tasks are inserted
  const pendingDeps: Array<{ taskId: number; blockedByRef: string }> = [];

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

      if (taskSpec.ref) {
        refToTaskId.set(taskSpec.ref, insertedTask.id);
      }

      if (taskSpec.blockedBy) {
        for (const blockedByRef of taskSpec.blockedBy) {
          pendingDeps.push({ taskId: insertedTask.id, blockedByRef });
        }
      }
    }
  }

  // Create all dependencies now that every task has a real DB id
  for (const { taskId, blockedByRef } of pendingDeps) {
    const blockingTaskId = refToTaskId.get(blockedByRef);
    if (!blockingTaskId) {
      // Should be unreachable after validateBatchRefs — guard for safety
      throw new Error(`Internal error: ref not resolved: "${blockedByRef}"`);
    }
    await addTaskDependency(db, featureId, taskId, blockingTaskId);
    depsCreated++;
  }

  return { phasesCreated, tasksCreated, depsCreated };
}
