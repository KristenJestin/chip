import { describe, it, expect } from "vitest";
import { createTestDb } from "../helpers/db";
import { createFeature } from "../../src/core/feature";
import { addPhase } from "../../src/core/phase";
import {
  startSession,
  endSession,
  listSessions,
  getCurrentSession,
} from "../../src/core/session";

describe("startSession — validation", () => {
  it("throws when featureId is empty", async () => {
    const db = await createTestDb();
    await expect(startSession(db, "", "dev")).rejects.toThrow();
  });

  it("throws when type is invalid", async () => {
    const db = await createTestDb();
    // @ts-expect-error intentional invalid input
    await expect(startSession(db, "some-feature", "invalid")).rejects.toThrow();
  });

  it("throws when phaseId is not positive", async () => {
    const db = await createTestDb();
    await expect(startSession(db, "some-feature", "dev", 0)).rejects.toThrow();
  });
});

describe("endSession — validation", () => {
  it("throws when sessionId is not positive", async () => {
    const db = await createTestDb();
    await expect(endSession(db, { sessionId: 0 })).rejects.toThrow();
  });

  it("throws when featureId is empty string", async () => {
    const db = await createTestDb();
    await expect(endSession(db, { featureId: "" })).rejects.toThrow();
  });
});

describe("listSessions — validation", () => {
  it("throws when featureId is empty", async () => {
    const db = await createTestDb();
    await expect(listSessions(db, "")).rejects.toThrow();
  });
});

describe("startSession", () => {
  it("inserts a session and returns it", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");

    const session = await startSession(db, featureId, "dev");

    expect(session.featureId).toBe(featureId);
    expect(session.type).toBe("dev");
    expect(session.status).toBe("active");
    expect(session.phaseId).toBeNull();
    expect(session.createdAt).toBeTypeOf("number");
    expect(session.completedAt).toBeNull();
  });

  it("stores an optional phaseId", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase = await addPhase(db, featureId, "Phase 1");

    const session = await startSession(db, featureId, "dev", phase.id);

    expect(session.phaseId).toBe(phase.id);
  });

  it("throws when the feature does not exist", async () => {
    const db = await createTestDb();
    await expect(startSession(db, "nonexistent", "dev")).rejects.toThrow(
      "Feature not found: nonexistent",
    );
  });

  it("can create multiple active sessions", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");

    const s1 = await startSession(db, featureId, "dev");
    const s2 = await startSession(db, featureId, "review");

    expect(s1.id).not.toBe(s2.id);
    expect(s1.status).toBe("active");
    expect(s2.status).toBe("active");
  });
});

describe("endSession", () => {
  it("ends a session by sessionId", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const session = await startSession(db, featureId, "dev");

    const ended = await endSession(db, { sessionId: session.id });

    expect(ended.id).toBe(session.id);
    expect(ended.status).toBe("completed");
    expect(ended.completedAt).toBeTypeOf("number");
  });

  it("ends a session by featureId (most recent active)", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const session = await startSession(db, featureId, "dev");

    const ended = await endSession(db, { featureId });

    expect(ended.id).toBe(session.id);
    expect(ended.status).toBe("completed");
  });

  it("stores the summary when provided", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const session = await startSession(db, featureId, "dev");

    const ended = await endSession(db, {
      sessionId: session.id,
      summary: "All tasks done",
    });

    expect(ended.summary).toBe("All tasks done");
  });

  it("throws when the session does not exist", async () => {
    const db = await createTestDb();
    await expect(endSession(db, { sessionId: 9999 })).rejects.toThrow("Session not found: 9999");
  });

  it("throws when no active session for feature", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");

    await expect(endSession(db, { featureId })).rejects.toThrow(
      `No active session for feature: ${featureId}`,
    );
  });

  it("throws when no active session at all", async () => {
    const db = await createTestDb();
    await expect(endSession(db, {})).rejects.toThrow("No active session found");
  });

  it("throws when trying to end an already-completed session", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const session = await startSession(db, featureId, "dev");
    await endSession(db, { sessionId: session.id });

    await expect(endSession(db, { sessionId: session.id })).rejects.toThrow(
      `Session ${session.id} is already completed`,
    );
  });
});

describe("listSessions", () => {
  it("returns an empty array when no sessions", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");

    const rows = await listSessions(db, featureId);
    expect(rows).toEqual([]);
  });

  it("returns sessions in chronological order", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const s1 = await startSession(db, featureId, "prd");
    const s2 = await startSession(db, featureId, "dev");

    const rows = await listSessions(db, featureId);
    expect(rows.map((r) => r.id)).toEqual([s1.id, s2.id]);
  });

  it("filters by type", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    await startSession(db, featureId, "prd");
    const dev = await startSession(db, featureId, "dev");

    const rows = await listSessions(db, featureId, { type: "dev" });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe(dev.id);
  });

  it("filters by status", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const s1 = await startSession(db, featureId, "dev");
    await startSession(db, featureId, "review");
    await endSession(db, { sessionId: s1.id });

    const active = await listSessions(db, featureId, { status: "active" });
    expect(active).toHaveLength(1);
    expect(active[0]!.type).toBe("review");
  });

  it("returns only sessions for the given feature", async () => {
    const db = await createTestDb();
    const id1 = await createFeature(db, "Feature 1");
    const id2 = await createFeature(db, "Feature 2");
    await startSession(db, id1, "dev");
    await startSession(db, id2, "dev");

    const rows = await listSessions(db, id1);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.featureId).toBe(id1);
  });

  it("throws when the feature does not exist", async () => {
    const db = await createTestDb();
    await expect(listSessions(db, "nonexistent")).rejects.toThrow(
      "Feature not found: nonexistent",
    );
  });
});

describe("getCurrentSession", () => {
  it("returns the active session", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const session = await startSession(db, featureId, "dev");

    const current = await getCurrentSession(db, featureId);
    expect(current.id).toBe(session.id);
  });

  it("returns some active session when no featureId given", async () => {
    const db = await createTestDb();
    const id1 = await createFeature(db, "Feature 1");
    const id2 = await createFeature(db, "Feature 2");
    const s1 = await startSession(db, id1, "dev");
    const s2 = await startSession(db, id2, "review");

    const current = await getCurrentSession(db);
    expect([s1.id, s2.id]).toContain(current.id);
  });

  it("throws when no active session for the feature", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");

    await expect(getCurrentSession(db, featureId)).rejects.toThrow(
      `No active session for feature: ${featureId}`,
    );
  });

  it("throws when no active session at all", async () => {
    const db = await createTestDb();
    await expect(getCurrentSession(db)).rejects.toThrow("No active session found");
  });
});
