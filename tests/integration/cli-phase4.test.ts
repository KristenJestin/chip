/**
 * Phase 4 CLI integration tests — core-layer coverage for new CLI behaviors:
 *  - getFeatureDependencyMap (bulk fetch used by chip feature status)
 *  - task add + --blocked-by combo (add task then dep)
 *  - dep add / remove / list via the core functions wired by CLI
 *  - updateTaskStatus --force/--reason via core (guards CLI flags)
 */

import { describe, it, expect } from "vitest";
import { createTestDb } from "../helpers/db";
import { createFeature } from "../../src/core/feature";
import { addPhase } from "../../src/core/phase";
import { addTask, updateTaskStatus } from "../../src/core/task";
import {
  addTaskDependency,
  removeTaskDependency,
  listTaskDependencies,
  getFeatureDependencyMap,
} from "../../src/core/dependency";

// ── Shared setup ──────────────────────────────────────────────────────────────

async function setup() {
  const db = await createTestDb();
  const featureId = await createFeature(db, "CLI Test Feature");
  const phase1 = await addPhase(db, featureId, "Phase 1");
  const phase2 = await addPhase(db, featureId, "Phase 2");
  const taskA = await addTask(db, featureId, phase1.id, "Task A");
  const taskB = await addTask(db, featureId, phase1.id, "Task B");
  const taskC = await addTask(db, featureId, phase2.id, "Task C");
  return { db, featureId, phase1, phase2, taskA, taskB, taskC };
}

// ── getFeatureDependencyMap ───────────────────────────────────────────────────

describe("getFeatureDependencyMap", () => {
  it("returns empty maps when no dependencies exist", async () => {
    const { db, taskA, taskB, taskC } = await setup();
    const { blockedBy, blocks } = await getFeatureDependencyMap(db, [
      taskA.id,
      taskB.id,
      taskC.id,
    ]);
    expect(blockedBy.size).toBe(0);
    expect(blocks.size).toBe(0);
  });

  it("returns empty maps for an empty task list", async () => {
    const { db } = await setup();
    const { blockedBy, blocks } = await getFeatureDependencyMap(db, []);
    expect(blockedBy.size).toBe(0);
    expect(blocks.size).toBe(0);
  });

  it("correctly maps blockedBy for a simple A→B chain", async () => {
    const { db, featureId, taskA, taskB, taskC } = await setup();
    // B is blocked by A
    await addTaskDependency(db, featureId, taskB.id, taskA.id);

    const { blockedBy, blocks } = await getFeatureDependencyMap(db, [
      taskA.id,
      taskB.id,
      taskC.id,
    ]);

    expect(blockedBy.has(taskB.id)).toBe(true);
    expect(blockedBy.get(taskB.id)!.map((t) => t.id)).toContain(taskA.id);
    expect(blockedBy.has(taskA.id)).toBe(false);

    expect(blocks.has(taskA.id)).toBe(true);
    expect(blocks.get(taskA.id)!.map((t) => t.id)).toContain(taskB.id);
    expect(blocks.has(taskB.id)).toBe(false);
  });

  it("handles multiple blockers for a single task", async () => {
    const { db, featureId, phase1, taskA, taskB, taskC } = await setup();
    const taskD = await addTask(db, featureId, phase1.id, "Task D");
    // C blocked by A and by B
    await addTaskDependency(db, featureId, taskC.id, taskA.id);
    await addTaskDependency(db, featureId, taskC.id, taskB.id);

    const { blockedBy } = await getFeatureDependencyMap(db, [
      taskA.id,
      taskB.id,
      taskC.id,
      taskD.id,
    ]);

    expect(blockedBy.get(taskC.id)!).toHaveLength(2);
    const blockerIds = blockedBy.get(taskC.id)!.map((t) => t.id);
    expect(blockerIds).toContain(taskA.id);
    expect(blockerIds).toContain(taskB.id);
  });

  it("returns correct data for a chain: A→B→C", async () => {
    const { db, featureId, taskA, taskB, taskC } = await setup();
    await addTaskDependency(db, featureId, taskB.id, taskA.id); // B blocked by A
    await addTaskDependency(db, featureId, taskC.id, taskB.id); // C blocked by B

    const { blockedBy, blocks } = await getFeatureDependencyMap(db, [
      taskA.id,
      taskB.id,
      taskC.id,
    ]);

    // A blocks B
    expect(blocks.get(taskA.id)!.map((t) => t.id)).toContain(taskB.id);
    // B blocked by A, B blocks C
    expect(blockedBy.get(taskB.id)!.map((t) => t.id)).toContain(taskA.id);
    expect(blocks.get(taskB.id)!.map((t) => t.id)).toContain(taskC.id);
    // C blocked by B
    expect(blockedBy.get(taskC.id)!.map((t) => t.id)).toContain(taskB.id);
  });

  it("only includes tasks from the provided ID list in the result keys", async () => {
    const { db, featureId, taskA, taskB, taskC } = await setup();
    await addTaskDependency(db, featureId, taskB.id, taskA.id);
    await addTaskDependency(db, featureId, taskC.id, taskB.id);

    // Only provide taskB in the list — only taskB's relationships should appear as keys
    const { blockedBy, blocks } = await getFeatureDependencyMap(db, [taskB.id]);

    // taskB is blocked by taskA (cross-list reference still resolved)
    expect(blockedBy.get(taskB.id)!.map((t) => t.id)).toContain(taskA.id);
    // taskB blocks taskC (cross-list reference still resolved)
    expect(blocks.get(taskB.id)!.map((t) => t.id)).toContain(taskC.id);
  });
});

// ── task add + --blocked-by combo ─────────────────────────────────────────────

describe("task add with blocked-by (CLI --blocked-by scenario)", () => {
  it("adding a task then a dependency produces correct state", async () => {
    const { db, featureId, phase1, taskA } = await setup();

    // Simulate: chip task add my-feature 1 "New Task" --blocked-by taskA.id
    const newTask = await addTask(db, featureId, phase1.id, "New Task");
    await addTaskDependency(db, featureId, newTask.id, taskA.id);

    const { blockedBy } = await listTaskDependencies(db, featureId, newTask.id);
    expect(blockedBy).toHaveLength(1);
    expect(blockedBy[0].id).toBe(taskA.id);
  });

  it("task created with dependency is immediately blocked", async () => {
    const { db, featureId, phase1, taskA } = await setup();

    const newTask = await addTask(db, featureId, phase1.id, "Blocked From Start");
    await addTaskDependency(db, featureId, newTask.id, taskA.id);

    // Cannot start until taskA is done
    await expect(
      updateTaskStatus(db, featureId, phase1.id, newTask.id, "in-progress"),
    ).rejects.toThrow(`Task ${newTask.id} is blocked by:`);
  });
});

// ── dep add / remove error paths ──────────────────────────────────────────────

describe("dep add error paths (CLI-facing)", () => {
  it("dep add on nonexistent feature throws feature-not-found", async () => {
    const { db, taskA, taskB } = await setup();
    await expect(
      addTaskDependency(db, "no-such-feature", taskB.id, taskA.id),
    ).rejects.toThrow("Feature not found: no-such-feature");
  });

  it("dep add cycle throws cycle error message", async () => {
    const { db, featureId, taskA, taskB } = await setup();
    await addTaskDependency(db, featureId, taskB.id, taskA.id);

    await expect(
      addTaskDependency(db, featureId, taskA.id, taskB.id),
    ).rejects.toThrow("Adding dependency would create a cycle");
  });

  it("dep remove nonexistent dep throws not-found error", async () => {
    const { db, featureId, taskA, taskB } = await setup();
    await expect(
      removeTaskDependency(db, featureId, taskB.id, taskA.id),
    ).rejects.toThrow(`Dependency not found`);
  });
});

// ── task status --force / --reason (CLI flag validation at core layer) ────────

describe("task status --force / --reason (CLI guards)", () => {
  it("blocked task → error without force", async () => {
    const { db, featureId, phase1, taskA, taskB } = await setup();
    await addTaskDependency(db, featureId, taskB.id, taskA.id);

    await expect(
      updateTaskStatus(db, featureId, phase1.id, taskB.id, "in-progress"),
    ).rejects.toThrow(`Task ${taskB.id} is blocked by:`);
  });

  it("--force without --reason → error at core", async () => {
    const { db, featureId, phase1, taskA, taskB } = await setup();
    await addTaskDependency(db, featureId, taskB.id, taskA.id);

    await expect(
      updateTaskStatus(db, featureId, phase1.id, taskB.id, "in-progress", { force: true }),
    ).rejects.toThrow("A reason is required when forcing");
  });

  it("--force with --reason succeeds", async () => {
    const { db, featureId, phase1, taskA, taskB } = await setup();
    await addTaskDependency(db, featureId, taskB.id, taskA.id);

    const task = await updateTaskStatus(
      db,
      featureId,
      phase1.id,
      taskB.id,
      "in-progress",
      { force: true, reason: "urgent" },
    );
    expect(task.status).toBe("in-progress");
  });

  it("unblocked task needs no force", async () => {
    const { db, featureId, phase1, taskA, taskB } = await setup();
    await addTaskDependency(db, featureId, taskB.id, taskA.id);
    // Mark A done first
    await updateTaskStatus(db, featureId, phase1.id, taskA.id, "done");

    const task = await updateTaskStatus(db, featureId, phase1.id, taskB.id, "in-progress");
    expect(task.status).toBe("in-progress");
  });
});
