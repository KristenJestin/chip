import { describe, it, expect } from "vitest";
import { createTestDb } from "../helpers/db";
import { createFeature, updateFeatureStage } from "../../src/core/feature";
import { addPhase } from "../../src/core/phase";
import { addTask, updateTaskStatus } from "../../src/core/task";
import {
  addTaskDependency,
  removeTaskDependency,
  listTaskDependencies,
  checkDependenciesSatisfied,
  checkPhaseOrderingSatisfied,
  detectCycle,
} from "../../src/core/dependency";

// ── Setup helper ──────────────────────────────────────────────────────────────

async function setup() {
  const db = await createTestDb();
  const featureId = await createFeature(db, "Test Feature");
  const phase1 = await addPhase(db, featureId, "Phase 1");
  const phase2 = await addPhase(db, featureId, "Phase 2");
  const taskA = await addTask(db, featureId, phase1.id, "Task A");
  const taskB = await addTask(db, featureId, phase1.id, "Task B");
  const taskC = await addTask(db, featureId, phase2.id, "Task C");
  return { db, featureId, phase1, phase2, taskA, taskB, taskC };
}

// ── addTaskDependency ─────────────────────────────────────────────────────────

describe("addTaskDependency", () => {
  it("creates a dependency and returns it", async () => {
    const { db, featureId, taskA, taskB } = await setup();

    // B is blocked by A (A must finish before B)
    const dep = await addTaskDependency(db, featureId, taskB.id, taskA.id);

    expect(dep.taskId).toBe(taskB.id);
    expect(dep.blocksTaskId).toBe(taskA.id);
    expect(dep.createdAt).toBeTypeOf("number");
  });

  it("throws when feature does not exist", async () => {
    const { db, taskA, taskB } = await setup();

    await expect(
      addTaskDependency(db, "nonexistent", taskB.id, taskA.id),
    ).rejects.toThrow("Feature not found: nonexistent");
  });

  it("throws when taskId does not belong to feature", async () => {
    const { db, featureId, taskA } = await setup();
    const otherFeatureId = await createFeature(db, "Other Feature");
    const otherPhase = await addPhase(db, otherFeatureId, "Phase 1");
    const otherTask = await addTask(db, otherFeatureId, otherPhase.id, "Other Task");

    await expect(
      addTaskDependency(db, featureId, otherTask.id, taskA.id),
    ).rejects.toThrow(`Task ${otherTask.id} does not belong to feature ${featureId}`);
  });

  it("throws when blockingTaskId does not belong to feature", async () => {
    const { db, featureId, taskA } = await setup();
    const otherFeatureId = await createFeature(db, "Other Feature");
    const otherPhase = await addPhase(db, otherFeatureId, "Phase 1");
    const otherTask = await addTask(db, otherFeatureId, otherPhase.id, "Other Task");

    await expect(
      addTaskDependency(db, featureId, taskA.id, otherTask.id),
    ).rejects.toThrow(`Task ${otherTask.id} does not belong to feature ${featureId}`);
  });

  it("throws when task depends on itself", async () => {
    const { db, featureId, taskA } = await setup();

    await expect(
      addTaskDependency(db, featureId, taskA.id, taskA.id),
    ).rejects.toThrow("A task cannot depend on itself");
  });

  it("throws when duplicate dependency is added", async () => {
    const { db, featureId, taskA, taskB } = await setup();
    await addTaskDependency(db, featureId, taskB.id, taskA.id);

    await expect(
      addTaskDependency(db, featureId, taskB.id, taskA.id),
    ).rejects.toThrow(`Dependency already exists: task ${taskB.id} is already blocked by task ${taskA.id}`);
  });

  // Regression: addTaskDependency must enforce the planning stage restriction.
  // Before this fix the stage was never checked, allowing dep mutations in development.
  it("throws when feature is not in planning stage", async () => {
    const { db, featureId, taskA, taskB } = await setup();
    await updateFeatureStage(db, featureId, "development");

    await expect(
      addTaskDependency(db, featureId, taskB.id, taskA.id),
    ).rejects.toThrow(`not in planning stage`);
  });
});

// ── detectCycle ───────────────────────────────────────────────────────────────

describe("detectCycle", () => {
  it("returns false when there is no cycle", async () => {
    const { db, featureId, taskA, taskB, taskC } = await setup();
    // A → B (B is blocked by A)
    await addTaskDependency(db, featureId, taskB.id, taskA.id);

    // Adding C blocked by B — no cycle
    const hasCycle = await detectCycle(db, taskC.id, taskB.id);
    expect(hasCycle).toBe(false);
  });

  it("detects a direct cycle (A blocked by B, B blocked by A)", async () => {
    const { db, featureId, taskA, taskB } = await setup();
    // B is blocked by A
    await addTaskDependency(db, featureId, taskB.id, taskA.id);

    // Would adding A blocked by B create a cycle? Yes: A→B→A
    const hasCycle = await detectCycle(db, taskA.id, taskB.id);
    expect(hasCycle).toBe(true);
  });

  it("detects a transitive cycle T1→T2→T3→T1", async () => {
    const { db, featureId, phase1 } = await setup();
    const t1 = await addTask(db, featureId, phase1.id, "T1");
    const t2 = await addTask(db, featureId, phase1.id, "T2");
    const t3 = await addTask(db, featureId, phase1.id, "T3");

    // T2 blocked by T1
    await addTaskDependency(db, featureId, t2.id, t1.id);
    // T3 blocked by T2
    await addTaskDependency(db, featureId, t3.id, t2.id);

    // Would adding T1 blocked by T3 create a cycle? Yes: T1→T3→T2→T1
    const hasCycle = await detectCycle(db, t1.id, t3.id);
    expect(hasCycle).toBe(true);
  });

  it("addTaskDependency throws when cycle is detected", async () => {
    const { db, featureId, taskA, taskB } = await setup();
    await addTaskDependency(db, featureId, taskB.id, taskA.id);

    await expect(
      addTaskDependency(db, featureId, taskA.id, taskB.id),
    ).rejects.toThrow("Adding dependency would create a cycle");
  });
});

// ── removeTaskDependency ──────────────────────────────────────────────────────

describe("removeTaskDependency", () => {
  it("removes an existing dependency", async () => {
    const { db, featureId, taskA, taskB } = await setup();
    await addTaskDependency(db, featureId, taskB.id, taskA.id);

    await removeTaskDependency(db, featureId, taskB.id, taskA.id);

    const { blockedBy } = await listTaskDependencies(db, featureId, taskB.id);
    expect(blockedBy).toHaveLength(0);
  });

  it("throws when dependency does not exist", async () => {
    const { db, featureId, taskA, taskB } = await setup();

    await expect(
      removeTaskDependency(db, featureId, taskB.id, taskA.id),
    ).rejects.toThrow(`Dependency not found: task ${taskB.id} is not blocked by task ${taskA.id}`);
  });

  it("throws when feature does not exist", async () => {
    const { db, taskA, taskB } = await setup();

    await expect(
      removeTaskDependency(db, "nonexistent", taskB.id, taskA.id),
    ).rejects.toThrow("Feature not found: nonexistent");
  });

  // Regression: removeTaskDependency must enforce the planning stage restriction.
  // Before this fix the stage was never checked, allowing dep removal in development/review.
  it("throws when feature is not in planning stage", async () => {
    const { db, featureId, taskA, taskB } = await setup();
    // Add the dep first (while still in planning)
    await addTaskDependency(db, featureId, taskB.id, taskA.id);
    // Advance to development
    await updateFeatureStage(db, featureId, "development");

    await expect(
      removeTaskDependency(db, featureId, taskB.id, taskA.id),
    ).rejects.toThrow(`not in planning stage`);
  });
});

// ── listTaskDependencies ──────────────────────────────────────────────────────

describe("listTaskDependencies", () => {
  it("returns blockedBy and blocks lists", async () => {
    const { db, featureId, taskA, taskB, taskC } = await setup();
    // B blocked by A; C blocked by B
    await addTaskDependency(db, featureId, taskB.id, taskA.id);
    await addTaskDependency(db, featureId, taskC.id, taskB.id);

    const result = await listTaskDependencies(db, featureId, taskB.id);
    expect(result.blockedBy).toHaveLength(1);
    expect(result.blockedBy[0].id).toBe(taskA.id);
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].id).toBe(taskC.id);
  });

  it("returns empty lists when no dependencies", async () => {
    const { db, featureId, taskA } = await setup();

    const result = await listTaskDependencies(db, featureId, taskA.id);
    expect(result.blockedBy).toHaveLength(0);
    expect(result.blocks).toHaveLength(0);
  });

  it("removing a dependency unblocks the task", async () => {
    const { db, featureId, taskA, taskB } = await setup();
    await addTaskDependency(db, featureId, taskB.id, taskA.id);
    await removeTaskDependency(db, featureId, taskB.id, taskA.id);

    const result = await listTaskDependencies(db, featureId, taskB.id);
    expect(result.blockedBy).toHaveLength(0);
  });
});

// ── checkDependenciesSatisfied ────────────────────────────────────────────────

describe("checkDependenciesSatisfied", () => {
  it("returns blocked=false when no dependencies", async () => {
    const { db, taskA } = await setup();

    const result = await checkDependenciesSatisfied(db, taskA.id);
    expect(result.blocked).toBe(false);
    expect(result.blockers).toHaveLength(0);
  });

  it("returns blocked=true when blocker is not done", async () => {
    const { db, featureId, taskA, taskB } = await setup();
    await addTaskDependency(db, featureId, taskB.id, taskA.id);

    const result = await checkDependenciesSatisfied(db, taskB.id);
    expect(result.blocked).toBe(true);
    expect(result.blockers).toHaveLength(1);
    expect(result.blockers[0].id).toBe(taskA.id);
  });

  it("returns blocked=false when all blockers are done", async () => {
    const { db, featureId, phase1, taskA, taskB } = await setup();
    await addTaskDependency(db, featureId, taskB.id, taskA.id);
    // Mark A as done
    await updateTaskStatus(db, featureId, phase1.id, taskA.id, "done");

    const result = await checkDependenciesSatisfied(db, taskB.id);
    expect(result.blocked).toBe(false);
    expect(result.blockers).toHaveLength(0);
  });

  it("lists all undone blockers when multiple dependencies", async () => {
    const { db, featureId, phase1, taskA, taskB } = await setup();
    const taskD = await addTask(db, featureId, phase1.id, "Task D");
    // taskB blocked by A and D
    await addTaskDependency(db, featureId, taskB.id, taskA.id);
    await addTaskDependency(db, featureId, taskB.id, taskD.id);

    const result = await checkDependenciesSatisfied(db, taskB.id);
    expect(result.blocked).toBe(true);
    expect(result.blockers).toHaveLength(2);
  });
});

// ── checkPhaseOrderingSatisfied ───────────────────────────────────────────────

describe("checkPhaseOrderingSatisfied", () => {
  it("returns blocked=false for the first phase", async () => {
    const { db, phase1 } = await setup();

    const result = await checkPhaseOrderingSatisfied(db, phase1.id);
    expect(result.blocked).toBe(false);
    expect(result.incompleteTasks).toHaveLength(0);
  });

  it("returns blocked=true when previous phase has incomplete tasks", async () => {
    const { db, phase2, taskA, taskB } = await setup();
    // phase1 has taskA and taskB, both todo — phase2 is blocked

    const result = await checkPhaseOrderingSatisfied(db, phase2.id);
    expect(result.blocked).toBe(true);
    expect(result.incompleteTasks.map((t) => t.id)).toContain(taskA.id);
    expect(result.incompleteTasks.map((t) => t.id)).toContain(taskB.id);
  });

  it("returns blocked=false when all previous phase tasks are done", async () => {
    const { db, featureId, phase1, phase2, taskA, taskB } = await setup();
    await updateTaskStatus(db, featureId, phase1.id, taskA.id, "done");
    await updateTaskStatus(db, featureId, phase1.id, taskB.id, "done");

    const result = await checkPhaseOrderingSatisfied(db, phase2.id);
    expect(result.blocked).toBe(false);
    expect(result.incompleteTasks).toHaveLength(0);
  });

  it("returns blocked=false for phase2 when previous phase is empty", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "Feature");
    const p1 = await addPhase(db, featureId, "Phase 1"); // no tasks
    const p2 = await addPhase(db, featureId, "Phase 2");

    // Phase 1 has no tasks — effectively considered complete
    const result = await checkPhaseOrderingSatisfied(db, p2.id);
    expect(result.blocked).toBe(false);
    // p1 has no tasks so incompleteTasks is empty
    expect(result.incompleteTasks).toHaveLength(0);
    // suppress unused var warning
    void p1;
  });
});

// ── updateTaskStatus enforcement ──────────────────────────────────────────────

describe("updateTaskStatus — blocking enforcement", () => {
  it("blocks transition to in-progress when dependency not done", async () => {
    const { db, featureId, phase1, taskA, taskB } = await setup();
    // B is blocked by A (A must be done first)
    await addTaskDependency(db, featureId, taskB.id, taskA.id);

    await expect(
      updateTaskStatus(db, featureId, phase1.id, taskB.id, "in-progress"),
    ).rejects.toThrow(`Task ${taskB.id} is blocked by:`);
  });

  it("blocks transition to done when dependency not done", async () => {
    const { db, featureId, phase1, taskA, taskB } = await setup();
    await addTaskDependency(db, featureId, taskB.id, taskA.id);

    await expect(
      updateTaskStatus(db, featureId, phase1.id, taskB.id, "done"),
    ).rejects.toThrow(`Task ${taskB.id} is blocked by:`);
  });

  it("allows transition to todo even when blocked (no enforcement on todo)", async () => {
    const { db, featureId, phase1, taskA, taskB } = await setup();
    await addTaskDependency(db, featureId, taskB.id, taskA.id);
    // Set B to in-progress via force first
    await updateTaskStatus(db, featureId, phase1.id, taskB.id, "in-progress", {
      force: true,
      reason: "test setup",
    });

    // Moving back to todo must succeed even when blocked
    const result = await updateTaskStatus(db, featureId, phase1.id, taskB.id, "todo");
    expect(result.status).toBe("todo");
  });

  it("allows transition when dependency is done", async () => {
    const { db, featureId, phase1, taskA, taskB } = await setup();
    await addTaskDependency(db, featureId, taskB.id, taskA.id);
    await updateTaskStatus(db, featureId, phase1.id, taskA.id, "done");

    const result = await updateTaskStatus(db, featureId, phase1.id, taskB.id, "in-progress");
    expect(result.status).toBe("in-progress");
  });

  it("blocks task in phase 2 when phase 1 has incomplete tasks", async () => {
    const { db, featureId, phase2, taskC } = await setup();
    // phase1 has taskA, taskB both todo — phase2 task is blocked

    await expect(
      updateTaskStatus(db, featureId, phase2.id, taskC.id, "in-progress"),
    ).rejects.toThrow(`Task ${taskC.id} is blocked by:`);
  });

  it("allows task in phase 2 when phase 1 is all done", async () => {
    const { db, featureId, phase1, phase2, taskA, taskB, taskC } = await setup();
    await updateTaskStatus(db, featureId, phase1.id, taskA.id, "done");
    await updateTaskStatus(db, featureId, phase1.id, taskB.id, "done");

    const result = await updateTaskStatus(db, featureId, phase2.id, taskC.id, "in-progress");
    expect(result.status).toBe("in-progress");
  });

  it("force without reason throws an error", async () => {
    const { db, featureId, phase1, taskA, taskB } = await setup();
    await addTaskDependency(db, featureId, taskB.id, taskA.id);

    await expect(
      updateTaskStatus(db, featureId, phase1.id, taskB.id, "in-progress", { force: true }),
    ).rejects.toThrow("A reason is required when forcing a blocked task status transition");
  });

  it("force with reason succeeds and creates a critical finding", async () => {
    const { db, featureId, phase1, taskA, taskB } = await setup();
    await addTaskDependency(db, featureId, taskB.id, taskA.id);

    const result = await updateTaskStatus(
      db,
      featureId,
      phase1.id,
      taskB.id,
      "in-progress",
      { force: true, reason: "urgent deadline" },
    );
    expect(result.status).toBe("in-progress");

    // Verify critical finding was created
    const allFindings = await db.query.findings.findMany({ where: { featureId } });
    expect(allFindings).toHaveLength(1);
    expect(allFindings[0].severity).toBe("critical");
    expect(allFindings[0].pass).toBe("technical");
    expect(allFindings[0].category).toBe("correctness");
    expect(allFindings[0].description).toContain("urgent deadline");
  });

  it("force with reason — finding description mentions the task id and target status", async () => {
    const { db, featureId, phase1, taskA, taskB } = await setup();
    await addTaskDependency(db, featureId, taskB.id, taskA.id);

    await updateTaskStatus(db, featureId, phase1.id, taskB.id, "done", {
      force: true,
      reason: "critical hotfix",
    });

    const allFindings = await db.query.findings.findMany({ where: { featureId } });
    expect(allFindings[0].description).toContain(String(taskB.id));
    expect(allFindings[0].description).toContain("done");
    expect(allFindings[0].description).toContain("critical hotfix");
  });

  // Regression: before enforcement, updateTaskStatus accepted any status transition
  // without checking blocking dependencies. This test documents the blocked behavior.
  it("error message lists blocking task names", async () => {
    const { db, featureId, phase1, taskA, taskB } = await setup();
    await addTaskDependency(db, featureId, taskB.id, taskA.id);

    await expect(
      updateTaskStatus(db, featureId, phase1.id, taskB.id, "in-progress"),
    ).rejects.toThrow(`"${taskA.title}"`);
  });
});
