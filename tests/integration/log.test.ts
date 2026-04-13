import { describe, it, expect } from "vitest";
import { createTestDb } from "../helpers/db";
import { createFeature } from "../../src/commands/feature";
import { addPhase } from "../../src/commands/phase";
import { addTask } from "../../src/commands/task";
import { addLog, listLogs } from "../../src/commands/log";

describe("addLog", () => {
  it("inserts a log and returns it", async () => {
    // Arrange
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");

    // Act
    const log = await addLog(db, featureId, "Something happened");

    // Assert
    expect(log.featureId).toBe(featureId);
    expect(log.message).toBe("Something happened");
    expect(log.phaseId).toBeNull();
    expect(log.taskId).toBeNull();
    expect(log.source).toBeNull();
    expect(log.createdAt).toBeTypeOf("number");
    expect(log.createdAt).toBeGreaterThan(0);
  });

  it("stores optional phaseId, taskId, and source", async () => {
    // Arrange
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase = await addPhase(db, featureId, "Phase 1");
    const task = await addTask(db, featureId, phase.id, "Task A");

    // Act
    const log = await addLog(db, featureId, "Task started", {
      phaseId: phase.id,
      taskId: task.id,
      source: "/dev",
    });

    // Assert
    expect(log.phaseId).toBe(phase.id);
    expect(log.taskId).toBe(task.id);
    expect(log.source).toBe("/dev");
  });

  it("throws when the feature does not exist", async () => {
    // Arrange
    const db = await createTestDb();

    // Act & Assert
    await expect(addLog(db, "nonexistent", "A message")).rejects.toThrow(
      "Feature not found: nonexistent",
    );
  });
});

describe("listLogs", () => {
  it("returns an empty array when there are no logs", async () => {
    // Arrange
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");

    // Act
    const entries = await listLogs(db, featureId);

    // Assert
    expect(entries).toEqual([]);
  });

  it("returns logs in chronological order", async () => {
    // Arrange
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const l1 = await addLog(db, featureId, "First");
    const l2 = await addLog(db, featureId, "Second");
    const l3 = await addLog(db, featureId, "Third");

    // Act
    const entries = await listLogs(db, featureId);

    // Assert
    expect(entries.map((e) => e.id)).toEqual([l1.id, l2.id, l3.id]);
  });

  it("filters by phaseId when provided", async () => {
    // Arrange
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase1 = await addPhase(db, featureId, "Phase 1");
    const phase2 = await addPhase(db, featureId, "Phase 2");
    const l1 = await addLog(db, featureId, "Phase 1 log", { phaseId: phase1.id });
    await addLog(db, featureId, "Phase 2 log", { phaseId: phase2.id });
    await addLog(db, featureId, "No phase log");

    // Act
    const entries = await listLogs(db, featureId, { phaseId: phase1.id });

    // Assert
    expect(entries).toHaveLength(1);
    expect(entries[0]!.id).toBe(l1.id);
  });

  it("filters by taskId when provided", async () => {
    // Arrange
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase = await addPhase(db, featureId, "Phase 1");
    const task1 = await addTask(db, featureId, phase.id, "Task A");
    const task2 = await addTask(db, featureId, phase.id, "Task B");
    const l1 = await addLog(db, featureId, "Task 1 log", { taskId: task1.id });
    await addLog(db, featureId, "Task 2 log", { taskId: task2.id });

    // Act
    const entries = await listLogs(db, featureId, { taskId: task1.id });

    // Assert
    expect(entries).toHaveLength(1);
    expect(entries[0]!.id).toBe(l1.id);
  });

  it("returns only logs for the given feature", async () => {
    // Arrange
    const db = await createTestDb();
    const featureId1 = await createFeature(db, "Feature 1");
    const featureId2 = await createFeature(db, "Feature 2");
    await addLog(db, featureId1, "Log for feature 1");
    await addLog(db, featureId2, "Log for feature 2");

    // Act
    const entries = await listLogs(db, featureId1);

    // Assert
    expect(entries).toHaveLength(1);
    expect(entries[0]!.featureId).toBe(featureId1);
  });

  it("throws when the feature does not exist", async () => {
    // Arrange
    const db = await createTestDb();

    // Act & Assert
    await expect(listLogs(db, "nonexistent")).rejects.toThrow("Feature not found: nonexistent");
  });
});
