import { describe, it, expect } from "vitest";
import { createTestDb } from "../helpers/db";
import { createFeature } from "../../src/core/feature";
import { addPhase } from "../../src/core/phase";
import { addTask } from "../../src/core/task";
import { startSession } from "../../src/core/session";
import { addEvent, listEvents } from "../../src/core/event";

// ── addEvent — validation ─────────────────────────────────────────────────────

describe("addEvent — validation", () => {
  it("throws when featureId is empty", async () => {
    const db = await createTestDb();
    await expect(
      addEvent(db, "", "task_result", {
        files: { created: [], modified: [], deleted: [] },
        decisions: [],
        issues: [],
        test_result: { passed: true, count: 0 },
      }),
    ).rejects.toThrow();
  });

  it("throws when kind is invalid", async () => {
    const db = await createTestDb();
    await expect(
      // @ts-expect-error intentional invalid kind
      addEvent(db, "some-feature", "unknown_kind", {}),
    ).rejects.toThrow();
  });

  it("throws when data does not match the kind schema", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");

    // task_result requires files, decisions, issues, test_result
    await expect(addEvent(db, featureId, "task_result", { wrong: "field" })).rejects.toThrow(
      /Invalid data for event kind "task_result"/,
    );
  });

  it("throws when correction data has empty root_cause", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");

    await expect(
      addEvent(db, featureId, "correction", { root_cause: "", fix: "Applied fix", files: [] }),
    ).rejects.toThrow(/Invalid data for event kind "correction"/);
  });
});

// ── addEvent — nominal ────────────────────────────────────────────────────────

describe("addEvent", () => {
  it("inserts a task_result event and returns it", async () => {
    // Arrange
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase = await addPhase(db, featureId, "Phase 1");
    const task = await addTask(db, featureId, phase.id, "Task A");

    const data = {
      files: { created: ["src/foo.ts"], modified: [], deleted: [] },
      decisions: ["Used approach X"],
      issues: [],
      test_result: { passed: true, count: 42 },
    };

    // Act
    const event = await addEvent(db, featureId, "task_result", data, {
      phaseId: phase.id,
      taskId: task.id,
      source: "chip_dev_subagent",
    });

    // Assert
    expect(event.featureId).toBe(featureId);
    expect(event.kind).toBe("task_result");
    expect(event.phaseId).toBe(phase.id);
    expect(event.taskId).toBe(task.id);
    expect(event.source).toBe("chip_dev_subagent");
    expect(event.createdAt).toBeTypeOf("number");
    expect(event.createdAt).toBeGreaterThan(0);

    // data is stored as serialized JSON
    const parsed = JSON.parse(event.data);
    expect(parsed.files.created).toEqual(["src/foo.ts"]);
    expect(parsed.test_result.passed).toBe(true);
    expect(parsed.test_result.count).toBe(42);
  });

  it("inserts a correction event with root_cause, fix, and files", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");

    const data = {
      root_cause: "Missing null check on input",
      fix: "Added guard clause before processing",
      files: ["src/core/foo.ts"],
    };

    const event = await addEvent(db, featureId, "correction", data, {
      source: "chip_review",
    });

    expect(event.kind).toBe("correction");
    const parsed = JSON.parse(event.data);
    expect(parsed.root_cause).toBe("Missing null check on input");
    expect(parsed.files).toEqual(["src/core/foo.ts"]);
  });

  it("inserts a decision event with all required fields", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");

    const data = {
      context: "Choosing an ORM for the events table",
      options: ["Drizzle", "Prisma", "raw SQL"],
      chosen: "Drizzle",
      rationale: "Already used in the project",
    };

    const event = await addEvent(db, featureId, "decision", data);
    expect(event.kind).toBe("decision");
    const parsed = JSON.parse(event.data);
    expect(parsed.chosen).toBe("Drizzle");
  });

  it("inserts a phase_summary event with verdict and risks", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");

    const data = {
      delivered: ["events table", "event CLI"],
      coverage_verdict: "SUFFICIENT" as const,
      risks: [],
    };

    const event = await addEvent(db, featureId, "phase_summary", data);
    expect(event.kind).toBe("phase_summary");
    const parsed = JSON.parse(event.data);
    expect(parsed.coverage_verdict).toBe("SUFFICIENT");
  });

  it("stores optional sessionId and findingId", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const session = await startSession(db, featureId, "dev");

    const event = await addEvent(
      db,
      featureId,
      "task_result",
      {
        files: { created: [], modified: [], deleted: [] },
        decisions: [],
        issues: [],
        test_result: { passed: true, count: 0 },
      },
      { sessionId: session.id, findingId: 99 },
    );

    expect(event.sessionId).toBe(session.id);
    expect(event.findingId).toBe(99);
  });

  it("throws when feature does not exist", async () => {
    const db = await createTestDb();

    await expect(
      addEvent(db, "nonexistent", "task_result", {
        files: { created: [], modified: [], deleted: [] },
        decisions: [],
        issues: [],
        test_result: { passed: true, count: 0 },
      }),
    ).rejects.toThrow("Feature not found: nonexistent");
  });
});

// ── listEvents — nominal ──────────────────────────────────────────────────────

describe("listEvents", () => {
  it("returns an empty array when no events exist", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");

    const result = await listEvents(db, featureId);
    expect(result).toEqual([]);
  });

  it("returns events in chronological order", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");

    const taskData = {
      files: { created: [], modified: [], deleted: [] },
      decisions: [],
      issues: [],
      test_result: { passed: true, count: 1 },
    };

    const e1 = await addEvent(db, featureId, "task_result", taskData);
    const e2 = await addEvent(db, featureId, "task_result", taskData);
    const e3 = await addEvent(db, featureId, "task_result", taskData);

    const result = await listEvents(db, featureId);
    expect(result.map((e) => e.id)).toEqual([e1.id, e2.id, e3.id]);
  });

  it("filters by kind", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");

    await addEvent(db, featureId, "task_result", {
      files: { created: [], modified: [], deleted: [] },
      decisions: [],
      issues: [],
      test_result: { passed: true, count: 0 },
    });
    const correction = await addEvent(db, featureId, "correction", {
      root_cause: "Bug",
      fix: "Fixed it",
      files: [],
    });

    const result = await listEvents(db, featureId, { kind: "correction" });
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe(correction.id);
  });

  it("filters by taskId", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase = await addPhase(db, featureId, "Phase 1");
    const task1 = await addTask(db, featureId, phase.id, "Task A");
    const task2 = await addTask(db, featureId, phase.id, "Task B");

    const taskData = {
      files: { created: [], modified: [], deleted: [] },
      decisions: [],
      issues: [],
      test_result: { passed: true, count: 0 },
    };

    const e1 = await addEvent(db, featureId, "task_result", taskData, { taskId: task1.id });
    await addEvent(db, featureId, "task_result", taskData, { taskId: task2.id });

    const result = await listEvents(db, featureId, { taskId: task1.id });
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe(e1.id);
  });

  it("filters by findingId", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");

    const corrData = { root_cause: "Root", fix: "Fix", files: [] };
    const e1 = await addEvent(db, featureId, "correction", corrData, { findingId: 10 });
    await addEvent(db, featureId, "correction", corrData, { findingId: 20 });

    const result = await listEvents(db, featureId, { findingId: 10 });
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe(e1.id);
  });

  it("returns only events for the given feature", async () => {
    const db = await createTestDb();
    const id1 = await createFeature(db, "Feature 1");
    const id2 = await createFeature(db, "Feature 2");

    const taskData = {
      files: { created: [], modified: [], deleted: [] },
      decisions: [],
      issues: [],
      test_result: { passed: true, count: 0 },
    };

    await addEvent(db, id1, "task_result", taskData);
    await addEvent(db, id2, "task_result", taskData);

    const result = await listEvents(db, id1);
    expect(result).toHaveLength(1);
    expect(result[0]!.featureId).toBe(id1);
  });

  it("throws when feature does not exist", async () => {
    const db = await createTestDb();
    await expect(listEvents(db, "nonexistent")).rejects.toThrow("Feature not found: nonexistent");
  });

  it("throws when featureId is empty", async () => {
    const db = await createTestDb();
    await expect(listEvents(db, "")).rejects.toThrow();
  });
});
