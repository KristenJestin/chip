import { describe, it, expect } from "vitest";
import { createTestDb } from "../helpers/db";
import { createFeature, updateFeatureStage } from "../../src/core/feature";
import { addPhase } from "../../src/core/phase";
import { addTask } from "../../src/core/task";
import { addCriterion } from "../../src/core/criterion";

// ── addPhase stage guard ──────────────────────────────────────────────────────

describe("addPhase — stage guard", () => {
  it("throws when feature is in 'review' stage", async () => {
    // Regression: addPhase must block structural changes on features in advanced stages.
    // Previously it would succeed regardless of stage — now it must throw.
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    await updateFeatureStage(db, featureId, "review");

    await expect(addPhase(db, featureId, "New Phase")).rejects.toThrow(
      "Cannot add phase: feature is in 'review' stage. Use --force to override.",
    );
  });

  it("throws when feature is in 'documentation' stage", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    await updateFeatureStage(db, featureId, "documentation");

    await expect(addPhase(db, featureId, "New Phase")).rejects.toThrow(
      "Cannot add phase: feature is in 'documentation' stage. Use --force to override.",
    );
  });

  it("throws when feature is in 'released' stage", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    await updateFeatureStage(db, featureId, "released");

    await expect(addPhase(db, featureId, "New Phase")).rejects.toThrow(
      "Cannot add phase: feature is in 'released' stage. Use --force to override.",
    );
  });

  it("succeeds with force=true when feature is in 'review' stage", async () => {
    // Regression: force=true must bypass the stage guard.
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    await updateFeatureStage(db, featureId, "review");

    const phase = await addPhase(db, featureId, "Forced Phase", undefined, { force: true });
    expect(phase.featureId).toBe(featureId);
    expect(phase.title).toBe("Forced Phase");
  });

  it("succeeds with force=true when feature is in 'released' stage", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    await updateFeatureStage(db, featureId, "released");

    const phase = await addPhase(db, featureId, "Forced Phase", undefined, { force: true });
    expect(phase.featureId).toBe(featureId);
  });

  it("succeeds normally when feature is in 'planning' stage", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    // planning is default stage

    const phase = await addPhase(db, featureId, "Planning Phase");
    expect(phase.featureId).toBe(featureId);
  });

  it("succeeds normally when feature is in 'development' stage", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    await updateFeatureStage(db, featureId, "development");

    const phase = await addPhase(db, featureId, "Dev Phase");
    expect(phase.featureId).toBe(featureId);
  });
});

// ── addTask stage guard ───────────────────────────────────────────────────────

describe("addTask — stage guard", () => {
  it("throws when feature is in 'documentation' stage", async () => {
    // Regression: addTask must block structural changes on features in advanced stages.
    // Previously it would succeed regardless of stage — now it must throw.
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    // Add phase while still in planning so the guard doesn't block it
    const phase = await addPhase(db, featureId, "Phase 1");
    await updateFeatureStage(db, featureId, "documentation");

    await expect(addTask(db, featureId, phase.id, "New Task")).rejects.toThrow(
      "Cannot add task: feature is in 'documentation' stage. Use --force to override.",
    );
  });

  it("throws when feature is in 'review' stage", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase = await addPhase(db, featureId, "Phase 1");
    await updateFeatureStage(db, featureId, "review");

    await expect(addTask(db, featureId, phase.id, "New Task")).rejects.toThrow(
      "Cannot add task: feature is in 'review' stage. Use --force to override.",
    );
  });

  it("throws when feature is in 'released' stage", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase = await addPhase(db, featureId, "Phase 1");
    await updateFeatureStage(db, featureId, "released");

    await expect(addTask(db, featureId, phase.id, "New Task")).rejects.toThrow(
      "Cannot add task: feature is in 'released' stage. Use --force to override.",
    );
  });

  it("succeeds with force=true when feature is in 'review' stage", async () => {
    // Regression: force=true must bypass the stage guard.
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase = await addPhase(db, featureId, "Phase 1");
    await updateFeatureStage(db, featureId, "review");

    const task = await addTask(db, featureId, phase.id, "Forced Task", undefined, { force: true });
    expect(task.phaseId).toBe(phase.id);
    expect(task.title).toBe("Forced Task");
  });

  it("succeeds normally when feature is in 'planning' stage", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase = await addPhase(db, featureId, "Phase 1");

    const task = await addTask(db, featureId, phase.id, "Planning Task");
    expect(task.phaseId).toBe(phase.id);
  });

  it("succeeds normally when feature is in 'development' stage", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase = await addPhase(db, featureId, "Phase 1");
    await updateFeatureStage(db, featureId, "development");

    const task = await addTask(db, featureId, phase.id, "Dev Task");
    expect(task.phaseId).toBe(phase.id);
  });
});

// ── addCriterion stage guard ──────────────────────────────────────────────────

describe("addCriterion — stage guard", () => {
  it("throws when feature is in 'released' stage", async () => {
    // Regression: addCriterion must block structural changes on features in advanced stages.
    // Previously it would succeed regardless of stage — now it must throw.
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    await updateFeatureStage(db, featureId, "released");

    await expect(addCriterion(db, featureId, "All tests pass")).rejects.toThrow(
      "Cannot add criterion: feature is in 'released' stage. Use --force to override.",
    );
  });

  it("throws when feature is in 'review' stage", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    await updateFeatureStage(db, featureId, "review");

    await expect(addCriterion(db, featureId, "All tests pass")).rejects.toThrow(
      "Cannot add criterion: feature is in 'review' stage. Use --force to override.",
    );
  });

  it("throws when feature is in 'documentation' stage", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    await updateFeatureStage(db, featureId, "documentation");

    await expect(addCriterion(db, featureId, "All tests pass")).rejects.toThrow(
      "Cannot add criterion: feature is in 'documentation' stage. Use --force to override.",
    );
  });

  it("succeeds with force=true when feature is in 'released' stage", async () => {
    // Regression: force=true must bypass the stage guard.
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    await updateFeatureStage(db, featureId, "released");

    const criterion = await addCriterion(db, featureId, "Forced criterion", { force: true });
    expect(criterion.featureId).toBe(featureId);
    expect(criterion.description).toBe("Forced criterion");
  });

  it("succeeds with force=true when feature is in 'review' stage", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    await updateFeatureStage(db, featureId, "review");

    const criterion = await addCriterion(db, featureId, "Forced criterion", { force: true });
    expect(criterion.featureId).toBe(featureId);
  });

  it("succeeds normally when feature is in 'planning' stage", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");

    const criterion = await addCriterion(db, featureId, "Planning criterion");
    expect(criterion.featureId).toBe(featureId);
  });

  it("succeeds normally when feature is in 'development' stage", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    await updateFeatureStage(db, featureId, "development");

    const criterion = await addCriterion(db, featureId, "Dev criterion");
    expect(criterion.featureId).toBe(featureId);
  });
});
