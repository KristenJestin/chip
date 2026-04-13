import { describe, it, expect } from "vitest";
import { createTestDb } from "../helpers/db";
import { createFeature } from "../../src/commands/feature";
import { addPhase, updatePhaseStatus } from "../../src/commands/phase";

describe("addPhase", () => {
  it("inserts a phase and returns it", async () => {
    // Arrange
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");

    // Act
    const phase = await addPhase(db, featureId, "Setup");

    // Assert
    expect(phase.featureId).toBe(featureId);
    expect(phase.title).toBe("Setup");
    expect(phase.status).toBe("todo");
    expect(phase.order).toBe(1);
  });

  it("increments order for each new phase", async () => {
    // Arrange
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");

    // Act
    const p1 = await addPhase(db, featureId, "Phase 1");
    const p2 = await addPhase(db, featureId, "Phase 2");
    const p3 = await addPhase(db, featureId, "Phase 3");

    // Assert
    expect(p1.order).toBe(1);
    expect(p2.order).toBe(2);
    expect(p3.order).toBe(3);
  });

  it("stores an optional description", async () => {
    // Arrange
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");

    // Act
    const phase = await addPhase(db, featureId, "Setup", "Initial setup steps");

    // Assert
    expect(phase.description).toBe("Initial setup steps");
  });

  it("throws when the feature does not exist", async () => {
    // Arrange
    const db = await createTestDb();

    // Act & Assert
    await expect(addPhase(db, "nonexistent", "Phase")).rejects.toThrow(
      "Feature not found: nonexistent",
    );
  });
});

describe("updatePhaseStatus", () => {
  it("updates the status and returns the updated phase", async () => {
    // Arrange
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase = await addPhase(db, featureId, "Phase 1");

    // Act
    const updated = await updatePhaseStatus(db, featureId, phase.id, "in-progress");

    // Assert
    expect(updated.id).toBe(phase.id);
    expect(updated.status).toBe("in-progress");
  });

  it("sets startedAt when transitioning to in-progress", async () => {
    // Arrange
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase = await addPhase(db, featureId, "Phase 1");
    expect(phase.startedAt).toBeNull();

    // Act
    const updated = await updatePhaseStatus(db, featureId, phase.id, "in-progress");

    // Assert
    expect(updated.startedAt).toBeTypeOf("number");
    expect(updated.startedAt).toBeGreaterThan(0);
  });

  it("does not overwrite startedAt if already set", async () => {
    // Arrange
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase = await addPhase(db, featureId, "Phase 1");
    const first = await updatePhaseStatus(db, featureId, phase.id, "in-progress");
    const originalStartedAt = first.startedAt;

    // Act — transition back then to in-progress again
    await updatePhaseStatus(db, featureId, phase.id, "review");
    const second = await updatePhaseStatus(db, featureId, phase.id, "in-progress");

    // Assert
    expect(second.startedAt).toBe(originalStartedAt);
  });

  it("sets completedAt when transitioning to done", async () => {
    // Arrange
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase = await addPhase(db, featureId, "Phase 1");
    expect(phase.completedAt).toBeNull();

    // Act
    const updated = await updatePhaseStatus(db, featureId, phase.id, "done");

    // Assert
    expect(updated.completedAt).toBeTypeOf("number");
    expect(updated.completedAt).toBeGreaterThan(0);
  });

  it("does not set completedAt for non-done statuses", async () => {
    // Arrange
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase = await addPhase(db, featureId, "Phase 1");

    // Act
    const updated = await updatePhaseStatus(db, featureId, phase.id, "review");

    // Assert
    expect(updated.completedAt).toBeNull();
  });

  it("throws when the feature does not exist", async () => {
    // Arrange
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase = await addPhase(db, featureId, "Phase 1");

    // Act & Assert
    await expect(updatePhaseStatus(db, "nonexistent", phase.id, "done")).rejects.toThrow(
      "Feature not found: nonexistent",
    );
  });

  it("throws when the phase does not exist", async () => {
    // Arrange
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");

    // Act & Assert
    await expect(updatePhaseStatus(db, featureId, 9999, "done")).rejects.toThrow(
      "Phase not found: 9999",
    );
  });

  it("throws when the phase belongs to a different feature", async () => {
    // Arrange
    const db = await createTestDb();
    const featureId1 = await createFeature(db, "Feature 1");
    const featureId2 = await createFeature(db, "Feature 2");
    const phase = await addPhase(db, featureId1, "Phase 1");

    // Act & Assert
    await expect(updatePhaseStatus(db, featureId2, phase.id, "done")).rejects.toThrow(
      `Phase ${phase.id} does not belong to feature ${featureId2}`,
    );
  });
});
