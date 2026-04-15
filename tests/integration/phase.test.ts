import { describe, it, expect } from "vitest";
import { createTestDb } from "../helpers/db";
import { createFeature, updateFeatureStage } from "../../src/core/feature";
import { addPhase, updatePhaseStatus } from "../../src/core/phase";

describe("addPhase — validation", () => {
  it("throws when featureId is empty", async () => {
    const db = await createTestDb();
    await expect(addPhase(db, "", "Phase 1")).rejects.toThrow();
  });

  it("throws when title is empty", async () => {
    const db = await createTestDb();
    await expect(addPhase(db, "some-feature", "")).rejects.toThrow();
  });

  it("throws when featureId is not a string", async () => {
    const db = await createTestDb();
    // @ts-expect-error intentional invalid input
    await expect(addPhase(db, 42, "Phase 1")).rejects.toThrow();
  });
});

describe("updatePhaseStatus — validation", () => {
  it("throws when featureId is empty", async () => {
    const db = await createTestDb();
    await expect(updatePhaseStatus(db, "", 1, "done")).rejects.toThrow();
  });

  it("throws when phaseId is not a positive integer", async () => {
    const db = await createTestDb();
    await expect(updatePhaseStatus(db, "some-feature", 0, "done")).rejects.toThrow();
  });

  it("throws when phaseId is negative", async () => {
    const db = await createTestDb();
    await expect(updatePhaseStatus(db, "some-feature", -1, "done")).rejects.toThrow();
  });

  it("throws when status is invalid", async () => {
    const db = await createTestDb();
    // @ts-expect-error intentional invalid input
    await expect(updatePhaseStatus(db, "some-feature", 1, "invalid-status")).rejects.toThrow();
  });
});

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
    const result = await updatePhaseStatus(db, featureId, phase.id, "in-progress");

    // Assert
    expect(result.phase.id).toBe(phase.id);
    expect(result.phase.status).toBe("in-progress");
  });

  it("sets startedAt when transitioning to in-progress", async () => {
    // Arrange
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase = await addPhase(db, featureId, "Phase 1");
    expect(phase.startedAt).toBeNull();

    // Act
    const result = await updatePhaseStatus(db, featureId, phase.id, "in-progress");

    // Assert
    expect(result.phase.startedAt).toBeTypeOf("number");
    expect(result.phase.startedAt).toBeGreaterThan(0);
  });

  it("does not overwrite startedAt if already set", async () => {
    // Arrange
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase = await addPhase(db, featureId, "Phase 1");
    const first = await updatePhaseStatus(db, featureId, phase.id, "in-progress");
    const originalStartedAt = first.phase.startedAt;

    // Act — transition back then to in-progress again
    await updatePhaseStatus(db, featureId, phase.id, "review");
    const second = await updatePhaseStatus(db, featureId, phase.id, "in-progress");

    // Assert
    expect(second.phase.startedAt).toBe(originalStartedAt);
  });

  it("sets completedAt when transitioning to done", async () => {
    // Arrange
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase = await addPhase(db, featureId, "Phase 1");
    expect(phase.completedAt).toBeNull();

    // Act
    const result = await updatePhaseStatus(db, featureId, phase.id, "done");

    // Assert
    expect(result.phase.completedAt).toBeTypeOf("number");
    expect(result.phase.completedAt).toBeGreaterThan(0);
  });

  it("does not set completedAt for non-done statuses", async () => {
    // Arrange
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase = await addPhase(db, featureId, "Phase 1");

    // Act
    const result = await updatePhaseStatus(db, featureId, phase.id, "review");

    // Assert
    expect(result.phase.completedAt).toBeNull();
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

describe("updatePhaseStatus — auto-advance stage development→review", () => {
  it("advances feature stage to review when last phase is marked done in development", async () => {
    // Regression: previously updatePhaseStatus did not auto-advance the feature stage.
    // It should advance from 'development' to 'review' when all phases are done.
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    await updateFeatureStage(db, featureId, "development");
    const phase = await addPhase(db, featureId, "Phase 1");

    const result = await updatePhaseStatus(db, featureId, phase.id, "done");

    expect(result.stageAdvanced).toBe(true);
    const feature = await db.query.features.findFirst({ where: { id: featureId } });
    expect(feature!.stage).toBe("review");
  });

  it("returns stageAdvanced=false when marking a non-last phase done", async () => {
    // Regression: should not advance when there are still non-done phases.
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    await updateFeatureStage(db, featureId, "development");
    const phase1 = await addPhase(db, featureId, "Phase 1");
    await addPhase(db, featureId, "Phase 2");

    const result = await updatePhaseStatus(db, featureId, phase1.id, "done");

    expect(result.stageAdvanced).toBe(false);
    const feature = await db.query.features.findFirst({ where: { id: featureId } });
    expect(feature!.stage).toBe("development");
  });

  it("does not re-advance when feature is already in review", async () => {
    // Regression: should not advance when feature stage is already 'review' (not 'development').
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    await updateFeatureStage(db, featureId, "development");
    const phase1 = await addPhase(db, featureId, "Phase 1");
    const phase2 = await addPhase(db, featureId, "Phase 2");
    // Advance to review by marking all phases done
    await updatePhaseStatus(db, featureId, phase1.id, "done");
    await updatePhaseStatus(db, featureId, phase2.id, "done");
    // Now feature is in review; reset phase2 back to in-progress then done again
    await updatePhaseStatus(db, featureId, phase2.id, "in-progress");

    const result = await updatePhaseStatus(db, featureId, phase2.id, "done");

    // Feature is already in review, not development, so stageAdvanced must be false
    expect(result.stageAdvanced).toBe(false);
    const feature = await db.query.features.findFirst({ where: { id: featureId } });
    expect(feature!.stage).toBe("review");
  });

  it("does not advance when feature stage is planning (not development)", async () => {
    // Regression: auto-advance should only trigger from 'development', not from other stages.
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    // Feature starts in 'planning'
    const phase = await addPhase(db, featureId, "Phase 1");

    const result = await updatePhaseStatus(db, featureId, phase.id, "done");

    expect(result.stageAdvanced).toBe(false);
    const feature = await db.query.features.findFirst({ where: { id: featureId } });
    expect(feature!.stage).toBe("planning");
  });
});
