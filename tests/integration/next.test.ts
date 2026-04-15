import { describe, it, expect } from "vitest";
import { createTestDb } from "../helpers/db";
import { createFeature } from "../../src/core/feature";
import { addPhase } from "../../src/core/phase";
import { addTask, updateTaskStatus } from "../../src/core/task";
import { addFinding, resolveFinding } from "../../src/core/finding";
import { addCriterion, checkCriterion } from "../../src/core/criterion";
import { startSession } from "../../src/core/session";
import { updateFeatureStage } from "../../src/core/feature";
import { getNext } from "../../src/core/next";
import { addTaskDependency } from "../../src/core/dependency";

describe("getNext — validation", () => {
  it("throws when featureId is empty", async () => {
    const db = await createTestDb();
    await expect(getNext(db, "")).rejects.toThrow();
  });

  it("throws when feature does not exist", async () => {
    const db = await createTestDb();
    await expect(getNext(db, "missing")).rejects.toThrow("Feature not found: missing");
  });
});

describe("getNext — planning stage", () => {
  it("suggests adding phases when feature has no phases", async () => {
    const db = await createTestDb();
    const id = await createFeature(db, "My Feature");

    const diag = await getNext(db, id);
    expect(diag.stage).toBe("planning");
    expect(diag.nextAction).toContain("Add phases");
    expect(diag.pendingTasks).toHaveLength(0);
    expect(diag.activeSession).toBeNull();
  });

  it("suggests moving to development when phases exist", async () => {
    const db = await createTestDb();
    const id = await createFeature(db, "My Feature");
    await addPhase(db, id, "Phase 1");

    const diag = await getNext(db, id);
    expect(diag.nextAction).toContain("development");
  });
});

describe("getNext — development stage", () => {
  it("lists pending tasks when there are incomplete tasks", async () => {
    const db = await createTestDb();
    const id = await createFeature(db, "Dev Feature");
    const phase = await addPhase(db, id, "Phase 1");
    await addTask(db, id, phase.id, "Task A");
    await addTask(db, id, phase.id, "Task B");
    // Force stage
    await updateFeatureStage(db, id, "development");

    const diag = await getNext(db, id);
    expect(diag.stage).toBe("development");
    expect(diag.pendingTasks).toHaveLength(2);
    expect(diag.nextAction).toContain("2 pending task");
  });

  it("suggests moving to review when all tasks are done", async () => {
    const db = await createTestDb();
    const id = await createFeature(db, "Dev Feature");
    const phase = await addPhase(db, id, "Phase 1");
    const task = await addTask(db, id, phase.id, "Task A");
    await updateTaskStatus(db, id, phase.id, task.id, "done");
    await updateFeatureStage(db, id, "development");

    const diag = await getNext(db, id);
    expect(diag.pendingTasks).toHaveLength(0);
    expect(diag.nextAction).toContain("review");
  });
});

describe("getNext — review stage", () => {
  it("suggests resolving findings when unresolved findings exist", async () => {
    const db = await createTestDb();
    const id = await createFeature(db, "Review Feature");
    const phase = await addPhase(db, id, "Phase 1");
    const task = await addTask(db, id, phase.id, "Task A");
    await updateTaskStatus(db, id, phase.id, task.id, "done");
    await updateFeatureStage(db, id, "development");
    await updateFeatureStage(db, id, "review");
    await addFinding(db, id, "Bug found", { pass: "technical", severity: "major" });

    const diag = await getNext(db, id);
    expect(diag.unresolvedFindings).toHaveLength(1);
    expect(diag.nextAction).toContain("Resolve 1 unresolved finding");
  });

  it("suggests satisfying criteria when findings are resolved but criteria remain", async () => {
    const db = await createTestDb();
    const id = await createFeature(db, "Review Feature");
    const phase = await addPhase(db, id, "Phase 1");
    const task = await addTask(db, id, phase.id, "Task A");
    await updateTaskStatus(db, id, phase.id, task.id, "done");
    await updateFeatureStage(db, id, "development");
    await updateFeatureStage(db, id, "review");
    const finding = await addFinding(db, id, "Fixed bug", { pass: "technical", severity: "minor" });
    await resolveFinding(db, finding.id, "fixed");
    await addCriterion(db, id, "All tests pass", { force: true });

    const diag = await getNext(db, id);
    expect(diag.unresolvedFindings).toHaveLength(0);
    expect(diag.unsatisfiedCriteria).toHaveLength(1);
    expect(diag.nextAction).toContain("criteria");
  });

  it("suggests moving to documentation when all findings resolved and criteria satisfied", async () => {
    const db = await createTestDb();
    const id = await createFeature(db, "Review Feature");
    const phase = await addPhase(db, id, "Phase 1");
    const task = await addTask(db, id, phase.id, "Task A");
    await updateTaskStatus(db, id, phase.id, task.id, "done");
    await updateFeatureStage(db, id, "development");
    await updateFeatureStage(db, id, "review");
    const criterion = await addCriterion(db, id, "All tests pass", { force: true });
    await checkCriterion(db, criterion.id);

    const diag = await getNext(db, id);
    expect(diag.nextAction).toContain("documentation");
  });
});

describe("getNext — active session takes priority", () => {
  it("suggests continuing the active session first", async () => {
    const db = await createTestDb();
    const id = await createFeature(db, "Session Feature");

    await startSession(db, id, "prd");

    const diag = await getNext(db, id);
    expect(diag.activeSession).not.toBeNull();
    expect(diag.nextAction).toContain("Continue session");
  });
});

describe("getNext — blocked task annotation", () => {
  it("annotates a pending task with its active blockers", async () => {
    const db = await createTestDb();
    const id = await createFeature(db, "Blocked Feature");
    const phase = await addPhase(db, id, "Phase 1");
    const taskA = await addTask(db, id, phase.id, "Task A");
    const taskB = await addTask(db, id, phase.id, "Task B");
    // B is blocked by A
    await addTaskDependency(db, id, taskB.id, taskA.id);

    const diag = await getNext(db, id);

    const pendingA = diag.pendingTasks.find((t) => t.id === taskA.id);
    const pendingB = diag.pendingTasks.find((t) => t.id === taskB.id);
    expect(pendingA).toBeDefined();
    expect(pendingA!.blockedBy).toHaveLength(0); // A has no blockers

    // B is blocked by A (A is not done)
    expect(pendingB).toBeDefined();
    expect(pendingB!.blockedBy).toHaveLength(1);
    expect(pendingB!.blockedBy[0].id).toBe(taskA.id);
    expect(pendingB!.blockedBy[0].title).toBe("Task A");
  });

  it("does not list a blocker once it is done", async () => {
    const db = await createTestDb();
    const id = await createFeature(db, "Completed Blocker");
    const phase = await addPhase(db, id, "Phase 1");
    const taskA = await addTask(db, id, phase.id, "Task A");
    const taskB = await addTask(db, id, phase.id, "Task B");
    await addTaskDependency(db, id, taskB.id, taskA.id);
    // Complete task A (the blocker) — stage guard allows this
    await updateFeatureStage(db, id, "development");
    await updateTaskStatus(db, id, phase.id, taskA.id, "done");
    // Re-check (feature is now in development)
    const diag = await getNext(db, id);

    // Task A is done — no longer pending, Task B should have empty blockedBy
    const pendingB = diag.pendingTasks.find((t) => t.id === taskB.id);
    expect(pendingB).toBeDefined();
    // A is done, so it must NOT appear as an active blocker
    expect(pendingB!.blockedBy).toHaveLength(0);
  });

  it("returns empty blockedBy array for tasks with no dependencies", async () => {
    const db = await createTestDb();
    const id = await createFeature(db, "No Deps");
    const phase = await addPhase(db, id, "Phase 1");
    await addTask(db, id, phase.id, "Task A");

    const diag = await getNext(db, id);
    expect(diag.pendingTasks).toHaveLength(1);
    expect(diag.pendingTasks[0].blockedBy).toEqual([]);
  });
});
