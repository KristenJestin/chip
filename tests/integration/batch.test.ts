import { describe, it, expect } from "vitest";
import { createTestDb } from "../helpers/db";
import { createFeature } from "../../src/core/feature";
import { executeBatch } from "../../src/core/batch";

describe("executeBatch — validation", () => {
  it("throws when featureId is empty", async () => {
    const db = await createTestDb();
    await expect(
      executeBatch(db, "", { phases: [{ title: "Phase 1", tasks: [] }] }),
    ).rejects.toThrow();
  });

  it("throws when feature does not exist", async () => {
    const db = await createTestDb();
    await expect(
      executeBatch(db, "missing", { phases: [{ title: "Phase 1", tasks: [] }] }),
    ).rejects.toThrow("Feature not found: missing");
  });

  it("throws when payload has no phases", async () => {
    const db = await createTestDb();
    const id = await createFeature(db, "My Feature");
    await expect(executeBatch(db, id, { phases: [] })).rejects.toThrow();
  });

  it("throws when payload is not an object", async () => {
    const db = await createTestDb();
    const id = await createFeature(db, "My Feature");
    await expect(executeBatch(db, id, "not-an-object")).rejects.toThrow();
  });
});

describe("executeBatch — happy path", () => {
  it("creates phases and tasks and returns counts", async () => {
    const db = await createTestDb();
    const id = await createFeature(db, "My Feature");

    const result = await executeBatch(db, id, {
      phases: [
        {
          title: "Phase 1",
          description: "First phase",
          tasks: [
            { title: "Task A" },
            { title: "Task B", type: "fix" },
          ],
        },
        {
          title: "Phase 2",
          tasks: [{ title: "Task C", type: "docs" }],
        },
      ],
    });

    expect(result.phasesCreated).toBe(2);
    expect(result.tasksCreated).toBe(3);
  });

  it("creates phases with correct order", async () => {
    const db = await createTestDb();
    const id = await createFeature(db, "My Feature");

    await executeBatch(db, id, {
      phases: [
        { title: "Alpha", tasks: [] },
        { title: "Beta", tasks: [{ title: "Do something" }] },
      ],
    });

    const phases = await db.query.phases.findMany({
      where: { featureId: id },
      orderBy: { order: "asc" },
    });

    expect(phases).toHaveLength(2);
    expect(phases[0].title).toBe("Alpha");
    expect(phases[0].order).toBe(1);
    expect(phases[1].title).toBe("Beta");
    expect(phases[1].order).toBe(2);
  });

  it("creates tasks with correct type and order", async () => {
    const db = await createTestDb();
    const id = await createFeature(db, "My Feature");

    await executeBatch(db, id, {
      phases: [
        {
          title: "Phase 1",
          tasks: [
            { title: "Feature task" },
            { title: "Fix task", type: "fix" },
            { title: "Test task", type: "test" },
          ],
        },
      ],
    });

    const phase = await db.query.phases.findFirst({ where: { featureId: id } });
    expect(phase).toBeDefined();

    const phaseTasks = await db.query.tasks.findMany({
      where: { phaseId: phase!.id },
      orderBy: { order: "asc" },
    });

    expect(phaseTasks).toHaveLength(3);
    expect(phaseTasks[0].title).toBe("Feature task");
    expect(phaseTasks[0].type).toBe("feature");
    expect(phaseTasks[1].type).toBe("fix");
    expect(phaseTasks[2].type).toBe("test");
  });

  it("works with empty tasks array in a phase", async () => {
    const db = await createTestDb();
    const id = await createFeature(db, "My Feature");

    const result = await executeBatch(db, id, {
      phases: [{ title: "Phase with no tasks", tasks: [] }],
    });

    expect(result.phasesCreated).toBe(1);
    expect(result.tasksCreated).toBe(0);
  });

  it("appends to existing phases correctly", async () => {
    const db = await createTestDb();
    const id = await createFeature(db, "My Feature");

    // First batch
    await executeBatch(db, id, { phases: [{ title: "Existing Phase", tasks: [] }] });

    // Second batch
    const result = await executeBatch(db, id, {
      phases: [{ title: "New Phase", tasks: [{ title: "New Task" }] }],
    });

    expect(result.phasesCreated).toBe(1);

    const allPhases = await db.query.phases.findMany({
      where: { featureId: id },
      orderBy: { order: "asc" },
    });
    expect(allPhases).toHaveLength(2);
    expect(allPhases[1].title).toBe("New Phase");
    expect(allPhases[1].order).toBe(2);
  });
});
