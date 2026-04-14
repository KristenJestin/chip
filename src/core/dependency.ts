import { eq, and, inArray } from "drizzle-orm";
import { type Db } from "../db/client";
import { type Task, type TaskDependency } from "../db/types";
import { tasks, taskDependencies } from "../db/schema";
import { assertFeatureExists } from "../db/helpers";
import { nowUnix } from "../utils/time";
import { validate } from "./validate";
import { AddTaskDependencyInput, RemoveTaskDependencyInput } from "./schemas";

// ── Internal helpers ──────────────────────────────────────────────────────────

async function assertTaskBelongsToFeature(
  db: Db,
  taskId: number,
  featureId: string,
): Promise<void> {
  const task = await db.query.tasks.findFirst({
    where: { id: taskId },
    with: { phase: { columns: { id: true, featureId: true } } },
  });
  if (!task) throw new Error(`Task not found: ${taskId}`);
  if (!task.phase || task.phase.featureId !== featureId)
    throw new Error(`Task ${taskId} does not belong to feature ${featureId}`);
}

// ── Cycle detection ───────────────────────────────────────────────────────────

/**
 * Returns true if adding a dependency where `newBlockedTaskId` is blocked by
 * `newBlockingTaskId` would create a cycle in the dependency graph.
 *
 * Algorithm: DFS from `newBlockingTaskId`, following existing "blocked by"
 * chains. If `newBlockedTaskId` is reached, a cycle exists (T → B → … → T).
 */
export async function detectCycle(
  db: Db,
  newBlockedTaskId: number,
  newBlockingTaskId: number,
): Promise<boolean> {
  const visited = new Set<number>();
  const queue: number[] = [newBlockingTaskId];

  while (queue.length > 0) {
    const current = queue.pop()!;
    if (current === newBlockedTaskId) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    // Find all tasks that `current` is blocked by (i.e. current's blockers)
    const deps = await db.query.taskDependencies.findMany({
      where: { taskId: current },
    });
    for (const dep of deps) {
      queue.push(dep.blocksTaskId);
    }
  }

  return false;
}

// ── Services ──────────────────────────────────────────────────────────────────

export async function addTaskDependency(
  db: Db,
  featureId: string,
  taskId: number,
  blockingTaskId: number,
): Promise<TaskDependency> {
  validate(AddTaskDependencyInput, { featureId, taskId, blockingTaskId });
  await assertFeatureExists(db, featureId);
  await assertTaskBelongsToFeature(db, taskId, featureId);
  await assertTaskBelongsToFeature(db, blockingTaskId, featureId);

  if (taskId === blockingTaskId) {
    throw new Error("A task cannot depend on itself");
  }

  const hasCycle = await detectCycle(db, taskId, blockingTaskId);
  if (hasCycle) {
    throw new Error(
      `Adding dependency would create a cycle: task ${blockingTaskId} is already transitively blocked by task ${taskId}`,
    );
  }

  const existing = await db.query.taskDependencies.findFirst({
    where: { taskId, blocksTaskId: blockingTaskId },
  });
  if (existing) {
    throw new Error(
      `Dependency already exists: task ${taskId} is already blocked by task ${blockingTaskId}`,
    );
  }

  const [inserted] = await db
    .insert(taskDependencies)
    .values({ taskId, blocksTaskId: blockingTaskId, createdAt: nowUnix() })
    .returning()
    .all();
  if (!inserted) throw new Error("Failed to insert task dependency");
  return inserted;
}

export async function removeTaskDependency(
  db: Db,
  featureId: string,
  taskId: number,
  blockingTaskId: number,
): Promise<void> {
  validate(RemoveTaskDependencyInput, { featureId, taskId, blockingTaskId });
  await assertFeatureExists(db, featureId);

  const existing = await db.query.taskDependencies.findFirst({
    where: { taskId, blocksTaskId: blockingTaskId },
  });
  if (!existing) {
    throw new Error(
      `Dependency not found: task ${taskId} is not blocked by task ${blockingTaskId}`,
    );
  }

  await db
    .delete(taskDependencies)
    .where(
      and(
        eq(taskDependencies.taskId, taskId),
        eq(taskDependencies.blocksTaskId, blockingTaskId),
      ),
    );
}

export async function listTaskDependencies(
  db: Db,
  featureId: string,
  taskId: number,
): Promise<{ blockedBy: Task[]; blocks: Task[] }> {
  await assertFeatureExists(db, featureId);

  const blockedByDeps = await db.query.taskDependencies.findMany({
    where: { taskId },
    with: { blockerTask: true },
  });

  const blocksDeps = await db.query.taskDependencies.findMany({
    where: { blocksTaskId: taskId },
    with: { blockedTask: true },
  });

  return {
    blockedBy: blockedByDeps.map((d) => d.blockerTask).filter((t): t is Task => t !== null),
    blocks: blocksDeps.map((d) => d.blockedTask).filter((t): t is Task => t !== null),
  };
}

export async function checkDependenciesSatisfied(
  db: Db,
  taskId: number,
): Promise<{ blocked: boolean; blockers: Task[] }> {
  const deps = await db.query.taskDependencies.findMany({
    where: { taskId },
    with: { blockerTask: true },
  });

  const blockers = deps
    .map((d) => d.blockerTask)
    .filter((t): t is Task => t !== null && t.status !== "done");

  return { blocked: blockers.length > 0, blockers };
}

export async function checkPhaseOrderingSatisfied(
  db: Db,
  phaseId: number,
): Promise<{ blocked: boolean; incompleteTasks: Task[] }> {
  const phase = await db.query.phases.findFirst({ where: { id: phaseId } });
  if (!phase) throw new Error(`Phase not found: ${phaseId}`);

  // First phase — never blocked by ordering
  if (phase.order === 1) return { blocked: false, incompleteTasks: [] };

  // Find the immediately preceding phase in the same feature
  const prevPhase = await db.query.phases.findFirst({
    where: { featureId: phase.featureId, order: phase.order - 1 },
  });
  if (!prevPhase) return { blocked: false, incompleteTasks: [] };

  const prevTasks = await db.query.tasks.findMany({
    where: { phaseId: prevPhase.id },
  });

  const incompleteTasks = prevTasks.filter((t): t is Task => t !== null && t.status !== "done");
  return { blocked: incompleteTasks.length > 0, incompleteTasks };
}

/**
 * Efficiently fetches all dependency relationships for a set of task IDs in
 * one batch (two SQL queries total). Used by the feature status display.
 *
 * Returns:
 *   blockedBy — maps taskId → tasks that must finish before it
 *   blocks    — maps taskId → tasks that this task is blocking
 */
export async function getFeatureDependencyMap(
  db: Db,
  taskIds: number[],
): Promise<{ blockedBy: Map<number, Task[]>; blocks: Map<number, Task[]> }> {
  if (taskIds.length === 0) {
    return { blockedBy: new Map(), blocks: new Map() };
  }

  // All rows where a feature task is blocked
  const blockedByRows = await db
    .select()
    .from(taskDependencies)
    .where(inArray(taskDependencies.taskId, taskIds))
    .all();

  // All rows where a feature task is the blocker
  const blocksRows = await db
    .select()
    .from(taskDependencies)
    .where(inArray(taskDependencies.blocksTaskId, taskIds))
    .all();

  // Collect all referenced task IDs not already in the input set
  const inputSet = new Set(taskIds);
  const referencedIds = new Set<number>();
  for (const d of blockedByRows) {
    if (!inputSet.has(d.blocksTaskId)) referencedIds.add(d.blocksTaskId);
  }
  for (const d of blocksRows) {
    if (!inputSet.has(d.taskId)) referencedIds.add(d.taskId);
  }

  // Load referenced tasks (may be from other phases/features)
  const extraTasks =
    referencedIds.size > 0
      ? await db.select().from(tasks).where(inArray(tasks.id, [...referencedIds])).all()
      : [];

  // Also load feature tasks themselves (needed as values in maps)
  const ownTasks = await db.select().from(tasks).where(inArray(tasks.id, taskIds)).all();
  const taskMap = new Map<number, Task>([
    ...ownTasks.map((t): [number, Task] => [t.id, t]),
    ...extraTasks.map((t): [number, Task] => [t.id, t]),
  ]);

  const blockedBy = new Map<number, Task[]>();
  for (const dep of blockedByRows) {
    const blocker = taskMap.get(dep.blocksTaskId);
    if (!blocker) continue;
    const list = blockedBy.get(dep.taskId) ?? [];
    list.push(blocker);
    blockedBy.set(dep.taskId, list);
  }

  const blocks = new Map<number, Task[]>();
  for (const dep of blocksRows) {
    const blocked = taskMap.get(dep.taskId);
    if (!blocked) continue;
    const list = blocks.get(dep.blocksTaskId) ?? [];
    list.push(blocked);
    blocks.set(dep.blocksTaskId, list);
  }

  return { blockedBy, blocks };
}
