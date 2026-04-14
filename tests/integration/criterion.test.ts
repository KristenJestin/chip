import { describe, it, expect } from "vitest";
import { createTestDb } from "../helpers/db";
import { createFeature } from "../../src/core/feature";
import { addPhase } from "../../src/core/phase";
import { addCriterion, checkCriterion, listCriteria } from "../../src/core/criterion";

describe("addCriterion — validation", () => {
  it("throws when featureId is empty", async () => {
    const db = await createTestDb();
    await expect(addCriterion(db, "", "Some criterion")).rejects.toThrow();
  });

  it("throws when description is empty", async () => {
    const db = await createTestDb();
    await expect(addCriterion(db, "some-feature", "")).rejects.toThrow();
  });

  it("throws when phaseId is not positive", async () => {
    const db = await createTestDb();
    await expect(addCriterion(db, "some-feature", "desc", { phaseId: 0 })).rejects.toThrow();
  });
});

describe("checkCriterion — validation", () => {
  it("throws when criterionId is not positive", async () => {
    const db = await createTestDb();
    await expect(checkCriterion(db, 0)).rejects.toThrow();
  });
});

describe("listCriteria — validation", () => {
  it("throws when featureId is empty", async () => {
    const db = await createTestDb();
    await expect(listCriteria(db, "")).rejects.toThrow();
  });
});

describe("addCriterion", () => {
  it("inserts a criterion and returns it", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");

    const criterion = await addCriterion(db, featureId, "All tests pass");

    expect(criterion.featureId).toBe(featureId);
    expect(criterion.description).toBe("All tests pass");
    expect(criterion.satisfied).toBe(0);
    expect(criterion.satisfiedAt).toBeNull();
    expect(criterion.phaseId).toBeNull();
    expect(criterion.createdAt).toBeTypeOf("number");
  });

  it("stores an optional phaseId", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase = await addPhase(db, featureId, "Phase 1");

    const criterion = await addCriterion(db, featureId, "Phase done", { phaseId: phase.id });
    expect(criterion.phaseId).toBe(phase.id);
  });

  it("throws when feature does not exist", async () => {
    const db = await createTestDb();
    await expect(addCriterion(db, "nonexistent", "Criterion")).rejects.toThrow(
      "Feature not found: nonexistent",
    );
  });
});

describe("checkCriterion", () => {
  it("marks a criterion as satisfied", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const criterion = await addCriterion(db, featureId, "All tests pass");

    const checked = await checkCriterion(db, criterion.id);

    expect(checked.satisfied).toBe(1);
    expect(checked.satisfiedAt).toBeTypeOf("number");
    expect(checked.satisfiedAt).toBeGreaterThan(0);
  });

  it("stores the source when provided", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const criterion = await addCriterion(db, featureId, "Docs written");

    const checked = await checkCriterion(db, criterion.id, { source: "/docs-session" });
    expect(checked.verifiedBy).toBe("/docs-session");
  });

  it("throws when criterion does not exist", async () => {
    const db = await createTestDb();
    await expect(checkCriterion(db, 9999)).rejects.toThrow("Criterion not found: 9999");
  });

  it("throws when criterion is already satisfied", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const criterion = await addCriterion(db, featureId, "Done");
    await checkCriterion(db, criterion.id);

    await expect(checkCriterion(db, criterion.id)).rejects.toThrow(
      `Criterion ${criterion.id} is already satisfied`,
    );
  });
});

describe("listCriteria", () => {
  it("returns an empty array when no criteria", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");

    const rows = await listCriteria(db, featureId);
    expect(rows).toEqual([]);
  });

  it("returns criteria in chronological order", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const c1 = await addCriterion(db, featureId, "First");
    const c2 = await addCriterion(db, featureId, "Second");

    const rows = await listCriteria(db, featureId);
    expect(rows.map((r) => r.id)).toEqual([c1.id, c2.id]);
  });

  it("filters by pending (unsatisfied only)", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const c1 = await addCriterion(db, featureId, "Pending");
    const c2 = await addCriterion(db, featureId, "Done");
    await checkCriterion(db, c2.id);

    const rows = await listCriteria(db, featureId, { pending: true });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe(c1.id);
  });

  it("filters by phaseId", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase1 = await addPhase(db, featureId, "Phase 1");
    const phase2 = await addPhase(db, featureId, "Phase 2");
    const c1 = await addCriterion(db, featureId, "Phase 1 criterion", { phaseId: phase1.id });
    await addCriterion(db, featureId, "Phase 2 criterion", { phaseId: phase2.id });

    const rows = await listCriteria(db, featureId, { phaseId: phase1.id });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe(c1.id);
  });

  it("returns only criteria for the given feature", async () => {
    const db = await createTestDb();
    const id1 = await createFeature(db, "Feature 1");
    const id2 = await createFeature(db, "Feature 2");
    await addCriterion(db, id1, "F1 criterion");
    await addCriterion(db, id2, "F2 criterion");

    const rows = await listCriteria(db, id1);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.featureId).toBe(id1);
  });

  it("throws when feature does not exist", async () => {
    const db = await createTestDb();
    await expect(listCriteria(db, "nonexistent")).rejects.toThrow(
      "Feature not found: nonexistent",
    );
  });
});
