import { describe, it, expect } from "vitest";
import { createTestDb } from "../helpers/db";
import { createFeature } from "../../src/core/feature";
import { startSession } from "../../src/core/session";
import { addFinding, listFindings, resolveFinding } from "../../src/core/finding";

describe("addFinding — validation", () => {
  it("throws when featureId is empty", async () => {
    const db = await createTestDb();
    await expect(
      addFinding(db, "", "Some issue", { pass: "technical", severity: "major" }),
    ).rejects.toThrow();
  });

  it("throws when description is empty", async () => {
    const db = await createTestDb();
    await expect(
      addFinding(db, "some-feature", "", { pass: "technical", severity: "major" }),
    ).rejects.toThrow();
  });

  it("throws when pass is invalid", async () => {
    const db = await createTestDb();
    await expect(
      // @ts-expect-error intentional invalid input
      addFinding(db, "some-feature", "desc", { pass: "invalid", severity: "major" }),
    ).rejects.toThrow();
  });

  it("throws when severity is invalid", async () => {
    const db = await createTestDb();
    await expect(
      // @ts-expect-error intentional invalid input
      addFinding(db, "some-feature", "desc", { pass: "technical", severity: "blocker" }),
    ).rejects.toThrow();
  });
});

describe("resolveFinding — validation", () => {
  it("throws when findingId is not positive", async () => {
    const db = await createTestDb();
    await expect(resolveFinding(db, 0, "fixed")).rejects.toThrow();
  });

  it("throws when resolution is invalid", async () => {
    const db = await createTestDb();
    // @ts-expect-error intentional invalid input
    await expect(resolveFinding(db, 1, "ignored")).rejects.toThrow();
  });
});

describe("addFinding", () => {
  it("inserts a finding and returns it", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");

    const finding = await addFinding(db, featureId, "Missing auth check", {
      pass: "technical",
      severity: "critical",
    });

    expect(finding.featureId).toBe(featureId);
    expect(finding.description).toBe("Missing auth check");
    expect(finding.pass).toBe("technical");
    expect(finding.severity).toBe("critical");
    expect(finding.resolution).toBeNull();
    expect(finding.taskId).toBeNull();
    expect(finding.createdAt).toBeTypeOf("number");
  });

  it("stores optional category and sessionId", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const session = await startSession(db, featureId, "review");

    const finding = await addFinding(db, featureId, "Tests missing", {
      pass: "technical",
      severity: "minor",
      category: "test",
      sessionId: session.id,
    });

    expect(finding.category).toBe("test");
    expect(finding.sessionId).toBe(session.id);
  });

  it("throws when feature does not exist", async () => {
    const db = await createTestDb();
    await expect(
      addFinding(db, "nonexistent", "Issue", { pass: "business", severity: "major" }),
    ).rejects.toThrow("Feature not found: nonexistent");
  });
});

describe("listFindings", () => {
  it("returns an empty array when no findings", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");

    const rows = await listFindings(db, featureId);
    expect(rows).toEqual([]);
  });

  it("returns findings in chronological order", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const f1 = await addFinding(db, featureId, "First", { pass: "technical", severity: "minor" });
    const f2 = await addFinding(db, featureId, "Second", { pass: "business", severity: "major" });

    const rows = await listFindings(db, featureId);
    expect(rows.map((r) => r.id)).toEqual([f1.id, f2.id]);
  });

  it("filters by unresolved", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const f1 = await addFinding(db, featureId, "Unresolved", {
      pass: "technical",
      severity: "minor",
    });
    const f2 = await addFinding(db, featureId, "Resolved", {
      pass: "technical",
      severity: "major",
    });
    await resolveFinding(db, f2.id, "fixed");

    const rows = await listFindings(db, featureId, { unresolved: true });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe(f1.id);
  });

  it("filters by pass", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    await addFinding(db, featureId, "Technical", { pass: "technical", severity: "minor" });
    const f2 = await addFinding(db, featureId, "Business", { pass: "business", severity: "minor" });

    const rows = await listFindings(db, featureId, { pass: "business" });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe(f2.id);
  });

  it("filters by severity", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const f1 = await addFinding(db, featureId, "Critical", { pass: "technical", severity: "critical" });
    await addFinding(db, featureId, "Minor", { pass: "technical", severity: "minor" });

    const rows = await listFindings(db, featureId, { severity: "critical" });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe(f1.id);
  });

  it("returns only findings for the given feature", async () => {
    const db = await createTestDb();
    const id1 = await createFeature(db, "Feature 1");
    const id2 = await createFeature(db, "Feature 2");
    await addFinding(db, id1, "F1 finding", { pass: "technical", severity: "minor" });
    await addFinding(db, id2, "F2 finding", { pass: "technical", severity: "minor" });

    const rows = await listFindings(db, id1);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.featureId).toBe(id1);
  });

  it("throws when feature does not exist", async () => {
    const db = await createTestDb();
    await expect(listFindings(db, "nonexistent")).rejects.toThrow(
      "Feature not found: nonexistent",
    );
  });
});

describe("resolveFinding", () => {
  it("marks a finding as resolved", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const finding = await addFinding(db, featureId, "Issue", {
      pass: "technical",
      severity: "major",
    });

    const resolved = await resolveFinding(db, finding.id, "fixed");

    expect(resolved.resolution).toBe("fixed");
  });

  it("stores an optional taskId when resolving", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const finding = await addFinding(db, featureId, "Issue", {
      pass: "technical",
      severity: "major",
    });

    const resolved = await resolveFinding(db, finding.id, "fixed", 42);
    expect(resolved.taskId).toBe(42);
  });

  it("throws when finding does not exist", async () => {
    const db = await createTestDb();
    await expect(resolveFinding(db, 9999, "fixed")).rejects.toThrow("Finding not found: 9999");
  });

  it("throws when finding is already resolved", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const finding = await addFinding(db, featureId, "Issue", {
      pass: "technical",
      severity: "major",
    });
    await resolveFinding(db, finding.id, "fixed");

    await expect(resolveFinding(db, finding.id, "wontfix")).rejects.toThrow(
      `Finding ${finding.id} is already resolved as fixed`,
    );
  });
});
