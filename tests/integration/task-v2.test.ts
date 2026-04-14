import { describe, it, expect } from "vitest";
import { createTestDb } from "../helpers/db";
import { createFeature } from "../../src/core/feature";
import { addPhase } from "../../src/core/phase";
import { addTask } from "../../src/core/task";

describe("addTask — type and parentTaskId (v2)", () => {
  it("defaults to type 'feature'", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase = await addPhase(db, featureId, "Phase 1");

    const task = await addTask(db, featureId, phase.id, "My Task");
    expect(task.type).toBe("feature");
    expect(task.parentTaskId).toBeNull();
  });

  it("stores a custom type", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase = await addPhase(db, featureId, "Phase 1");

    const task = await addTask(db, featureId, phase.id, "Fix Bug", undefined, { type: "fix" });
    expect(task.type).toBe("fix");
  });

  it("stores a parentTaskId", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase = await addPhase(db, featureId, "Phase 1");
    const parent = await addTask(db, featureId, phase.id, "Parent Task");

    const child = await addTask(db, featureId, phase.id, "Fix for parent", undefined, {
      type: "fix",
      parentTaskId: parent.id,
    });
    expect(child.parentTaskId).toBe(parent.id);
  });

  it("throws when type is invalid", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase = await addPhase(db, featureId, "Phase 1");

    await expect(
      // @ts-expect-error intentional invalid input
      addTask(db, featureId, phase.id, "Task", undefined, { type: "invalid" }),
    ).rejects.toThrow();
  });

  it("throws when parentTaskId is not positive", async () => {
    const db = await createTestDb();
    const featureId = await createFeature(db, "My Feature");
    const phase = await addPhase(db, featureId, "Phase 1");

    await expect(
      addTask(db, featureId, phase.id, "Task", undefined, { parentTaskId: -1 }),
    ).rejects.toThrow();
  });
});
