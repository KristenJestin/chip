import { describe, it, expect } from "vitest";
import { createTestDb } from "../helpers/db";
import { createFeature } from "../../src/core/feature";
import { addPhase } from "../../src/core/phase";
import { addTask, updateTaskStatus } from "../../src/core/task";
import { addFinding, resolveFinding } from "../../src/core/finding";
import { addCriterion, checkCriterion } from "../../src/core/criterion";
import { startSession, endSession } from "../../src/core/session";
import { getSummary } from "../../src/core/summary";

describe("getSummary — validation", () => {
  it("throws when featureId is empty", async () => {
    const db = await createTestDb();
    await expect(getSummary(db, "")).rejects.toThrow();
  });

  it("throws when feature does not exist", async () => {
    const db = await createTestDb();
    await expect(getSummary(db, "missing")).rejects.toThrow("Feature not found: missing");
  });
});

describe("getSummary — empty feature", () => {
  it("returns zero progress for a feature with no tasks", async () => {
    const db = await createTestDb();
    const id = await createFeature(db, "Empty Feature");

    const s = await getSummary(db, id);
    expect(s.featureId).toBe(id);
    expect(s.title).toBe("Empty Feature");
    expect(s.stage).toBe("planning");
    expect(s.progress).toBe(0);
    expect(s.totalTasks).toBe(0);
    expect(s.taskStats).toEqual({ todo: 0, "in-progress": 0, review: 0, done: 0 });
    expect(s.typeStats).toEqual({ feature: 0, fix: 0, docs: 0, test: 0 });
    expect(s.findingsResolved).toBe(0);
    expect(s.findingsUnresolved).toBe(0);
    expect(s.criteriaSatisfied).toBe(0);
    expect(s.criteriaTotal).toBe(0);
    expect(s.sessionCount).toBe(0);
  });
});

describe("getSummary — task stats", () => {
  it("computes correct progress percentage", async () => {
    const db = await createTestDb();
    const id = await createFeature(db, "Progress Feature");
    const phase = await addPhase(db, id, "Phase 1");
    const t1 = await addTask(db, id, phase.id, "Task A");
    const t2 = await addTask(db, id, phase.id, "Task B");
    await addTask(db, id, phase.id, "Task C");
    await updateTaskStatus(db, id, phase.id, t1.id, "done");
    await updateTaskStatus(db, id, phase.id, t2.id, "done");

    const s = await getSummary(db, id);
    // 2/3 done = 67%
    expect(s.totalTasks).toBe(3);
    expect(s.taskStats.done).toBe(2);
    expect(s.taskStats.todo).toBe(1);
    expect(s.progress).toBe(67);
  });

  it("tracks tasks by type", async () => {
    const db = await createTestDb();
    const id = await createFeature(db, "Typed Feature");
    const phase = await addPhase(db, id, "Phase 1");
    await addTask(db, id, phase.id, "Feature task");
    await addTask(db, id, phase.id, "Fix task", undefined, { type: "fix" });
    await addTask(db, id, phase.id, "Docs task", undefined, { type: "docs" });

    const s = await getSummary(db, id);
    expect(s.typeStats.feature).toBe(1);
    expect(s.typeStats.fix).toBe(1);
    expect(s.typeStats.docs).toBe(1);
    expect(s.typeStats.test).toBe(0);
  });
});

describe("getSummary — findings", () => {
  it("counts resolved and unresolved findings", async () => {
    const db = await createTestDb();
    const id = await createFeature(db, "Finding Feature");
    const f1 = await addFinding(db, id, "Bug A", { pass: "technical", severity: "major" });
    await addFinding(db, id, "Bug B", { pass: "business", severity: "minor" });
    await resolveFinding(db, f1.id, "fixed");

    const s = await getSummary(db, id);
    expect(s.findingsResolved).toBe(1);
    expect(s.findingsUnresolved).toBe(1);
  });
});

describe("getSummary — criteria", () => {
  it("counts satisfied and total criteria", async () => {
    const db = await createTestDb();
    const id = await createFeature(db, "Criteria Feature");
    const c1 = await addCriterion(db, id, "Must handle errors");
    await addCriterion(db, id, "Must be fast");
    await checkCriterion(db, c1.id);

    const s = await getSummary(db, id);
    expect(s.criteriaTotal).toBe(2);
    expect(s.criteriaSatisfied).toBe(1);
  });
});

describe("getSummary — sessions", () => {
  it("counts sessions correctly", async () => {
    const db = await createTestDb();
    const id = await createFeature(db, "Session Feature");
    const s1 = await startSession(db, id, "prd");
    await endSession(db, { sessionId: s1.id, summary: "Done planning" });
    await startSession(db, id, "dev");

    const s = await getSummary(db, id);
    expect(s.sessionCount).toBe(2);
  });
});
