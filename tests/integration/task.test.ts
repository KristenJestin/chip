import { describe, it, expect } from "vitest";
import { createTestDb } from "../helpers/db";
import { createFeature } from "../../src/core/feature";
import { addPhase } from "../../src/core/phase";
import { addTask, updateTaskStatus } from "../../src/core/task";

describe("addTask — validation", () => {
  it("throws when featureId is empty", async () => {
    const db = await createTestDb();
    await expect(addTask(db, "", 1, "Task A")).rejects.toThrow();
  });

  it("throws when phaseId is not a positive integer", async () => {
    const db = await createTestDb();
    await expect(addTask(db, "some-feature", 0, "Task A")).rejects.toThrow();
  });

  it("throws when phaseId is negative", async () => {
    const db = await createTestDb();
    await expect(addTask(db, "some-feature", -5, "Task A")).rejects.toThrow();
  });

  it("throws when title is empty", async () => {
    const db = await createTestDb();
    await expect(addTask(db, "some-feature", 1, "")).rejects.toThrow();
  });
});

describe("updateTaskStatus — validation", () => {
  it("throws when featureId is empty", async () => {
    const db = await createTestDb();
    await expect(updateTaskStatus(db, "", 1, 1, "done")).rejects.toThrow();
  });

  it("throws when phaseId is not positive", async () => {
    const db = await createTestDb();
    await expect(updateTaskStatus(db, "some-feature", 0, 1, "done")).rejects.toThrow();
  });

  it("throws when taskId is not positive", async () => {
    const db = await createTestDb();
    await expect(updateTaskStatus(db, "some-feature", 1, -1, "done")).rejects.toThrow();
  });

  it("throws when status is invalid", async () => {
    const db = await createTestDb();
    // @ts-expect-error intentional invalid input
    await expect(updateTaskStatus(db, "some-feature", 1, 1, "bad")).rejects.toThrow();
  });
});

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
      "Feature not found: nonexistent",
    );
  });

  it("throws when the phase does not exist", async () => {
    // Arrange
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");

    // Act & Assert
    await expect(addTask(db, featureId, 9999, "Task")).rejects.toThrow("Phase not found: 9999");
  });

  it("throws when the phase belongs to a different feature", async () => {
    // Arrange
    const db = await createTestDb();
    const featureId1 = await createFeature(db, "Feature 1");
    const featureId2 = await createFeature(db, "Feature 2");
    const phase = await addPhase(db, featureId1, "Phase 1");

    // Act & Assert
    await expect(addTask(db, featureId2, phase.id, "Task")).rejects.toThrow(
      `Phase ${phase.id} does not belong to feature ${featureId2}`,
    );
  });
});

describe("updateTaskStatus", () => {
  it("updates the status and returns the updated task", async () => {
    // Arrange
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase = await addPhase(db, featureId, "Phase 1");
    const task = await addTask(db, featureId, phase.id, "Task A");

    // Act
    const updated = await updateTaskStatus(db, featureId, phase.id, task.id, "in-progress");

    // Assert
    expect(updated.id).toBe(task.id);
    expect(updated.status).toBe("in-progress");
  });

  it("sets startedAt when transitioning to in-progress", async () => {
    // Arrange
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase = await addPhase(db, featureId, "Phase 1");
    const task = await addTask(db, featureId, phase.id, "Task A");
    expect(task.startedAt).toBeNull();

    // Act
    const updated = await updateTaskStatus(db, featureId, phase.id, task.id, "in-progress");

    // Assert
    expect(updated.startedAt).toBeTypeOf("number");
    expect(updated.startedAt).toBeGreaterThan(0);
  });

  it("does not overwrite startedAt if already set", async () => {
    // Arrange
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase = await addPhase(db, featureId, "Phase 1");
    const task = await addTask(db, featureId, phase.id, "Task A");
    const first = await updateTaskStatus(db, featureId, phase.id, task.id, "in-progress");
    const originalStartedAt = first.startedAt;

    // Act
    await updateTaskStatus(db, featureId, phase.id, task.id, "review");
    const second = await updateTaskStatus(db, featureId, phase.id, task.id, "in-progress");

    // Assert
    expect(second.startedAt).toBe(originalStartedAt);
  });

  it("sets completedAt when transitioning to done", async () => {
    // Arrange
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase = await addPhase(db, featureId, "Phase 1");
    const task = await addTask(db, featureId, phase.id, "Task A");
    expect(task.completedAt).toBeNull();

    // Act
    const updated = await updateTaskStatus(db, featureId, phase.id, task.id, "done");

    // Assert
    expect(updated.completedAt).toBeTypeOf("number");
    expect(updated.completedAt).toBeGreaterThan(0);
  });

  it("does not set completedAt for non-done statuses", async () => {
    // Arrange
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase = await addPhase(db, featureId, "Phase 1");
    const task = await addTask(db, featureId, phase.id, "Task A");

    // Act
    const updated = await updateTaskStatus(db, featureId, phase.id, task.id, "review");

    // Assert
    expect(updated.completedAt).toBeNull();
  });

  it("throws when the feature does not exist", async () => {
    // Arrange
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase = await addPhase(db, featureId, "Phase 1");
    const task = await addTask(db, featureId, phase.id, "Task A");

    // Act & Assert
    await expect(
      updateTaskStatus(db, "nonexistent", phase.id, task.id, "done"),
    ).rejects.toThrow("Feature not found: nonexistent");
  });

  it("throws when the phase does not exist", async () => {
    // Arrange
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");

    // Act & Assert
    await expect(updateTaskStatus(db, featureId, 9999, 1, "done")).rejects.toThrow(
      "Phase not found: 9999",
    );
  });

  it("throws when the task does not exist", async () => {
    // Arrange
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase = await addPhase(db, featureId, "Phase 1");

    // Act & Assert
    await expect(updateTaskStatus(db, featureId, phase.id, 9999, "done")).rejects.toThrow(
      "Task not found: 9999",
    );
  });

  it("throws when the task belongs to a different phase", async () => {
    // Arrange
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase1 = await addPhase(db, featureId, "Phase 1");
    const phase2 = await addPhase(db, featureId, "Phase 2");
    const task = await addTask(db, featureId, phase1.id, "Task A");

    // Act & Assert
    await expect(updateTaskStatus(db, featureId, phase2.id, task.id, "done")).rejects.toThrow(
      `Task ${task.id} does not belong to phase ${phase2.id}`,
    );
  });
});
