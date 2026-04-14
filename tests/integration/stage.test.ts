import { describe, it, expect } from "vitest";
import { createTestDb } from "../helpers/db";
import { createFeature } from "../../src/core/feature";
import { addPhase } from "../../src/core/phase";
import { addTask, updateTaskStatus } from "../../src/core/task";
import { updateFeatureStage } from "../../src/core/feature";

describe("updateFeatureStage — validation", () => {
  it("throws when featureId is empty", async () => {
    const db = await createTestDb();
    await expect(updateFeatureStage(db, "", "development")).rejects.toThrow();
  });

  it("throws when stage is invalid", async () => {
    const db = await createTestDb();
    // @ts-expect-error intentional invalid input
    await expect(updateFeatureStage(db, "some-feature", "in-flight")).rejects.toThrow();
  });
});

describe("updateFeatureStage", () => {
  it("sets stage to development on a new feature", async () => {
    const db = await createTestDb();
    const id = await createFeature(db, "My Feature");

    const updated = await updateFeatureStage(db, id, "development");

    expect(updated.id).toBe(id);
    expect(updated.stage).toBe("development");
  });

  it("defaults to planning stage on feature creation", async () => {
    const db = await createTestDb();
    const id = await createFeature(db, "Fresh Feature");

    const features = await db.query.features.findFirst({ where: { id } });
    expect(features!.stage).toBe("planning");
  });

  it("advances through stages in order", async () => {
    const db = await createTestDb();
    const id = await createFeature(db, "My Feature");

    await updateFeatureStage(db, id, "development");
    await updateFeatureStage(db, id, "review");
    const final = await updateFeatureStage(db, id, "documentation");

    expect(final.stage).toBe("documentation");
  });

  it("throws when going backwards without --force", async () => {
    const db = await createTestDb();
    const id = await createFeature(db, "My Feature");
    await updateFeatureStage(db, id, "development");

    await expect(updateFeatureStage(db, id, "planning")).rejects.toThrow(
      'Cannot go backwards from "development" to "planning" without --force',
    );
  });

  it("allows going backwards with force=true", async () => {
    const db = await createTestDb();
    const id = await createFeature(db, "My Feature");
    await updateFeatureStage(db, id, "development");

    const updated = await updateFeatureStage(db, id, "planning", true);
    expect(updated.stage).toBe("planning");
  });

  it("throws when transitioning to review with unfinished tasks", async () => {
    const db = await createTestDb();
    const id = await createFeature(db, "My Feature");
    await updateFeatureStage(db, id, "development");
    const phase = await addPhase(db, id, "Phase 1");
    await addTask(db, id, phase.id, "Unfinished task");

    await expect(updateFeatureStage(db, id, "review")).rejects.toThrow(
      "Cannot transition to review: there are unfinished tasks",
    );
  });

  it("allows transitioning to review when all tasks are done", async () => {
    const db = await createTestDb();
    const id = await createFeature(db, "My Feature");
    await updateFeatureStage(db, id, "development");
    const phase = await addPhase(db, id, "Phase 1");
    const task = await addTask(db, id, phase.id, "Done task");
    await updateTaskStatus(db, id, phase.id, task.id, "done");

    const updated = await updateFeatureStage(db, id, "review");
    expect(updated.stage).toBe("review");
  });

  it("allows transitioning to review with unfinished tasks when force=true", async () => {
    const db = await createTestDb();
    const id = await createFeature(db, "My Feature");
    await updateFeatureStage(db, id, "development");
    const phase = await addPhase(db, id, "Phase 1");
    await addTask(db, id, phase.id, "Unfinished task");

    const updated = await updateFeatureStage(db, id, "review", true);
    expect(updated.stage).toBe("review");
  });

  it("throws when the feature does not exist", async () => {
    const db = await createTestDb();
    await expect(updateFeatureStage(db, "nonexistent", "development")).rejects.toThrow(
      "Feature not found: nonexistent",
    );
  });
});
