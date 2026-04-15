import { describe, it, expect, vi } from "vitest";
import { createTestDb } from "../helpers/db";
import { createFeature } from "../../src/core/feature";
import { addPhase } from "../../src/core/phase";
import { addTask } from "../../src/core/task";
import { resolvePhaseId } from "../../src/cli/phase";
import { resolveTaskId } from "../../src/cli/task";

// die() calls process.exit(1) — mock it so tests can assert on the behavior
// without actually exiting. We spy on process.exit and console.error.
vi.spyOn(process, "exit").mockImplementation((_code) => {
  throw new Error("process.exit called");
});

describe("resolvePhaseId — ordinal resolution", () => {
  it("resolves ordinal 1 to the first phase by order", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const p1 = await addPhase(db, featureId, "Phase 1");
    await addPhase(db, featureId, "Phase 2");

    const resolved = await resolvePhaseId(db, featureId, "1");

    // Ordinal 1 → first phase
    expect(resolved).toBe(p1.id);
  });

  it("resolves ordinal 2 to the second phase by order", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    await addPhase(db, featureId, "Phase 1");
    const p2 = await addPhase(db, featureId, "Phase 2");
    const p3 = await addPhase(db, featureId, "Phase 3");

    const resolved2 = await resolvePhaseId(db, featureId, "2");
    const resolved3 = await resolvePhaseId(db, featureId, "3");

    expect(resolved2).toBe(p2.id);
    expect(resolved3).toBe(p3.id);
  });

  it("resolves exact DB id when a phase with that id exists", async () => {
    // Regression: exact ID lookup must take priority over ordinal lookup.
    // Previously, passing an ID equal to the DB's autoincrement value would
    // incorrectly be treated as an ordinal in some implementations.
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const p1 = await addPhase(db, featureId, "Phase 1");
    const p2 = await addPhase(db, featureId, "Phase 2");

    // p1.id is the actual DB id (e.g. 1). Passing it should return p1.id (exact match).
    const resolved = await resolvePhaseId(db, featureId, String(p1.id));

    expect(resolved).toBe(p1.id);

    // Same for p2
    const resolved2 = await resolvePhaseId(db, featureId, String(p2.id));
    expect(resolved2).toBe(p2.id);
  });

  it("falls back to ordinal when no phase has the given id as DB id", async () => {
    // Regression: if the numeric value is not a valid DB id for this feature,
    // it should be treated as a 1-based ordinal. The old code would die here.
    const db = await createTestDb();
    // Create another feature first to consume some IDs
    const featureA = await createFeature(db, "Feature A");
    await addPhase(db, featureA, "Phase A1"); // id = 1
    await addPhase(db, featureA, "Phase A2"); // id = 2

    const featureId = await createFeature(db, "Feature B");
    const p1 = await addPhase(db, featureId, "Phase B1"); // id = 3
    const p2 = await addPhase(db, featureId, "Phase B2"); // id = 4

    // Ordinal "1" — phase at position 1 for featureId (id=3), NOT the global id 1
    const resolvedOrdinal1 = await resolvePhaseId(db, featureId, "1");
    expect(resolvedOrdinal1).toBe(p1.id);

    // Ordinal "2" — phase at position 2 for featureId (id=4)
    const resolvedOrdinal2 = await resolvePhaseId(db, featureId, "2");
    expect(resolvedOrdinal2).toBe(p2.id);
  });

  it("dies when the identifier is out of range (ordinal too large)", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    await addPhase(db, featureId, "Phase 1");

    // Ordinal 2 doesn't exist (only 1 phase)
    await expect(resolvePhaseId(db, featureId, "2")).rejects.toThrow("process.exit called");
  });

  it("dies when the identifier is not a positive integer", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");

    await expect(resolvePhaseId(db, featureId, "abc")).rejects.toThrow("process.exit called");
    await expect(resolvePhaseId(db, featureId, "0")).rejects.toThrow("process.exit called");
  });
});

describe("resolveTaskId — ordinal resolution", () => {
  it("resolves ordinal 1 to the first task by order", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase = await addPhase(db, featureId, "Phase 1");
    const t1 = await addTask(db, featureId, phase.id, "Task A");
    await addTask(db, featureId, phase.id, "Task B");

    const resolved = await resolveTaskId(db, phase.id, "1");

    expect(resolved).toBe(t1.id);
  });

  it("resolves ordinal 2 to the second task by order", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase = await addPhase(db, featureId, "Phase 1");
    await addTask(db, featureId, phase.id, "Task A");
    const t2 = await addTask(db, featureId, phase.id, "Task B");
    const t3 = await addTask(db, featureId, phase.id, "Task C");

    const resolved2 = await resolveTaskId(db, phase.id, "2");
    const resolved3 = await resolveTaskId(db, phase.id, "3");

    expect(resolved2).toBe(t2.id);
    expect(resolved3).toBe(t3.id);
  });

  it("resolves exact DB id when a task with that id exists in the phase", async () => {
    // Regression: exact ID lookup must take priority over ordinal lookup.
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase = await addPhase(db, featureId, "Phase 1");
    const t1 = await addTask(db, featureId, phase.id, "Task A");
    const t2 = await addTask(db, featureId, phase.id, "Task B");

    const resolved1 = await resolveTaskId(db, phase.id, String(t1.id));
    const resolved2 = await resolveTaskId(db, phase.id, String(t2.id));

    expect(resolved1).toBe(t1.id);
    expect(resolved2).toBe(t2.id);
  });

  it("falls back to ordinal when no task has the given id as DB id in that phase", async () => {
    // Regression: if the numeric value is not a valid DB id for this phase,
    // it should be treated as a 1-based ordinal.
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phaseA = await addPhase(db, featureId, "Phase A");
    await addTask(db, featureId, phaseA.id, "Task A1"); // id = 1
    await addTask(db, featureId, phaseA.id, "Task A2"); // id = 2

    const phaseB = await addPhase(db, featureId, "Phase B");
    const tb1 = await addTask(db, featureId, phaseB.id, "Task B1"); // id = 3
    const tb2 = await addTask(db, featureId, phaseB.id, "Task B2"); // id = 4

    // Ordinal "1" for phaseB → task at position 1 (id=3), NOT global id 1
    const resolvedOrdinal1 = await resolveTaskId(db, phaseB.id, "1");
    expect(resolvedOrdinal1).toBe(tb1.id);

    // Ordinal "2" for phaseB → task at position 2 (id=4)
    const resolvedOrdinal2 = await resolveTaskId(db, phaseB.id, "2");
    expect(resolvedOrdinal2).toBe(tb2.id);
  });

  it("dies when the identifier is out of range (ordinal too large)", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase = await addPhase(db, featureId, "Phase 1");
    await addTask(db, featureId, phase.id, "Task A");

    // Ordinal 2 doesn't exist (only 1 task)
    await expect(resolveTaskId(db, phase.id, "2")).rejects.toThrow("process.exit called");
  });

  it("dies when the identifier is not a positive integer", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase = await addPhase(db, featureId, "Phase 1");

    await expect(resolveTaskId(db, phase.id, "xyz")).rejects.toThrow("process.exit called");
    await expect(resolveTaskId(db, phase.id, "0")).rejects.toThrow("process.exit called");
  });
});

describe("resolvePhaseId + resolveTaskId — end-to-end ordinal workflow", () => {
  it("can update a phase status using ordinal 1, then update a task using ordinal 1", async () => {
    // This simulates the full workflow: user passes ordinal identifiers for both
    // phase and task, and the resolvers correctly translate them to DB IDs.
    const db = await createTestDb();
    const featureId = await createFeature(db, "End-to-end Feature");
    const phase = await addPhase(db, featureId, "Phase 1");
    const task = await addTask(db, featureId, phase.id, "Task 1");

    const resolvedPhaseId = await resolvePhaseId(db, featureId, "1");
    const resolvedTaskId = await resolveTaskId(db, resolvedPhaseId, "1");

    expect(resolvedPhaseId).toBe(phase.id);
    expect(resolvedTaskId).toBe(task.id);
  });
});
