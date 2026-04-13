import { describe, it, expect } from "vitest";
import { createTestDb } from "../helpers/db";
import { createFeature } from "../../src/commands/feature";
import { addPhase } from "../../src/commands/phase";
import { addTask } from "../../src/commands/task";

describe("addTask", () => {
  it("inserts a task and returns it", async () => {
    // Arrange
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase = await addPhase(db, featureId, "Phase 1");

    // Act
    const task = await addTask(db, featureId, phase.id, "Write tests");

    // Assert
    expect(task.phaseId).toBe(phase.id);
    expect(task.title).toBe("Write tests");
    expect(task.status).toBe("todo");
    expect(task.order).toBe(1);
  });

  it("increments order for each new task in the same phase", async () => {
    // Arrange
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase = await addPhase(db, featureId, "Phase 1");

    // Act
    const t1 = await addTask(db, featureId, phase.id, "Task A");
    const t2 = await addTask(db, featureId, phase.id, "Task B");

    // Assert
    expect(t1.order).toBe(1);
    expect(t2.order).toBe(2);
  });

  it("stores an optional description", async () => {
    // Arrange
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase = await addPhase(db, featureId, "Phase 1");

    // Act
    const task = await addTask(db, featureId, phase.id, "Setup", "Initial setup");

    // Assert
    expect(task.description).toBe("Initial setup");
  });

  it("throws when the feature does not exist", async () => {
    // Arrange
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase = await addPhase(db, featureId, "Phase 1");

    // Act & Assert
    await expect(addTask(db, "nonexistent", phase.id, "Task")).rejects.toThrow(
      "Feature not found: nonexistent"
    );
  });

  it("throws when the phase does not exist", async () => {
    // Arrange
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");

    // Act & Assert
    await expect(addTask(db, featureId, 9999, "Task")).rejects.toThrow(
      "Phase not found: 9999"
    );
  });

  it("throws when the phase belongs to a different feature", async () => {
    // Arrange
    const db = await createTestDb();
    const featureId1 = await createFeature(db, "Feature 1");
    const featureId2 = await createFeature(db, "Feature 2");
    const phase = await addPhase(db, featureId1, "Phase 1");

    // Act & Assert
    await expect(addTask(db, featureId2, phase.id, "Task")).rejects.toThrow(
      `Phase ${phase.id} does not belong to feature ${featureId2}`
    );
  });
});
