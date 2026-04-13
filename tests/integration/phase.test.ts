import { describe, it, expect } from "vitest";
import { createTestDb } from "../helpers/db";
import { createFeature } from "../../src/commands/feature";
import { addPhase } from "../../src/commands/phase";

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
      "Feature not found: nonexistent"
    );
  });
});
