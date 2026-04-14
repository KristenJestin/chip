import { describe, it, expect } from "vitest";
import { createTestDb } from "../helpers/db";
import { createFeature } from "../../src/core/feature";
import { executeBatch } from "../../src/core/batch";
import { listTaskDependencies } from "../../src/core/dependency";

describe("executeBatch — ref/blockedBy dependencies", () => {
  it("creates dependencies when refs and blockedBy are provided", async () => {
    const db = await createTestDb();
    const id = await createFeature(db, "My Feature");

    const result = await executeBatch(db, id, {
      phases: [
        {
          title: "Phase 1",
          tasks: [
            { title: "Task A", ref: "a" },
            { title: "Task B", ref: "b", blockedBy: ["a"] },
          ],
        },
      ],
    });

    expect(result.phasesCreated).toBe(1);
    expect(result.tasksCreated).toBe(2);
    expect(result.depsCreated).toBe(1);

    // Find the inserted tasks
    const phase = await db.query.phases.findFirst({ where: { featureId: id } });
    expect(phase).toBeDefined();
    const allTasks = await db.query.tasks.findMany({
      where: { phaseId: phase!.id },
      orderBy: { order: "asc" },
    });
    expect(allTasks).toHaveLength(2);

    const taskA = allTasks[0];
    const taskB = allTasks[1];
    expect(taskA.title).toBe("Task A");
    expect(taskB.title).toBe("Task B");

    // Task B should be blocked by task A
    const deps = await listTaskDependencies(db, id, taskB.id);
    expect(deps.blockedBy).toHaveLength(1);
    expect(deps.blockedBy[0].id).toBe(taskA.id);
    expect(deps.blocks).toHaveLength(0);

    // Task A should block task B
    const depsA = await listTaskDependencies(db, id, taskA.id);
    expect(depsA.blocks).toHaveLength(1);
    expect(depsA.blocks[0].id).toBe(taskB.id);
    expect(depsA.blockedBy).toHaveLength(0);
  });

  it("handles multiple blockedBy deps on a single task", async () => {
    const db = await createTestDb();
    const id = await createFeature(db, "My Feature");

    const result = await executeBatch(db, id, {
      phases: [
        {
          title: "Phase 1",
          tasks: [
            { title: "Task A", ref: "a" },
            { title: "Task B", ref: "b" },
            { title: "Task C", ref: "c", blockedBy: ["a", "b"] },
          ],
        },
      ],
    });

    expect(result.depsCreated).toBe(2);

    const phase = await db.query.phases.findFirst({ where: { featureId: id } });
    const allTasks = await db.query.tasks.findMany({
      where: { phaseId: phase!.id },
      orderBy: { order: "asc" },
    });
    const taskC = allTasks[2];

    const deps = await listTaskDependencies(db, id, taskC.id);
    expect(deps.blockedBy).toHaveLength(2);
  });

  it("supports deps across phases in the same batch", async () => {
    const db = await createTestDb();
    const id = await createFeature(db, "My Feature");

    const result = await executeBatch(db, id, {
      phases: [
        {
          title: "Phase 1",
          tasks: [{ title: "Task A", ref: "a" }],
        },
        {
          title: "Phase 2",
          tasks: [{ title: "Task B", ref: "b", blockedBy: ["a"] }],
        },
      ],
    });

    expect(result.phasesCreated).toBe(2);
    expect(result.tasksCreated).toBe(2);
    expect(result.depsCreated).toBe(1);
  });

  it("returns depsCreated: 0 when no blockedBy is specified (non-regression)", async () => {
    const db = await createTestDb();
    const id = await createFeature(db, "My Feature");

    const result = await executeBatch(db, id, {
      phases: [
        {
          title: "Phase 1",
          tasks: [
            { title: "Task A" },
            { title: "Task B" },
          ],
        },
      ],
    });

    expect(result.phasesCreated).toBe(1);
    expect(result.tasksCreated).toBe(2);
    // No blockedBy — previous behavior is preserved and depsCreated is 0
    expect(result.depsCreated).toBe(0);
  });

  it("throws on unknown ref in blockedBy", async () => {
    const db = await createTestDb();
    const id = await createFeature(db, "My Feature");

    await expect(
      executeBatch(db, id, {
        phases: [
          {
            title: "Phase 1",
            tasks: [{ title: "Task B", ref: "b", blockedBy: ["does-not-exist"] }],
          },
        ],
      }),
    ).rejects.toThrow('Unknown ref in blockedBy: "does-not-exist"');
  });

  it("throws on duplicate refs", async () => {
    const db = await createTestDb();
    const id = await createFeature(db, "My Feature");

    await expect(
      executeBatch(db, id, {
        phases: [
          {
            title: "Phase 1",
            tasks: [
              { title: "Task A", ref: "dup" },
              { title: "Task B", ref: "dup" },
            ],
          },
        ],
      }),
    ).rejects.toThrow('Duplicate ref in batch: "dup"');
  });

  it("throws on a direct cycle (A blocked by B, B blocked by A)", async () => {
    const db = await createTestDb();
    const id = await createFeature(db, "My Feature");

    await expect(
      executeBatch(db, id, {
        phases: [
          {
            title: "Phase 1",
            tasks: [
              { title: "Task A", ref: "a", blockedBy: ["b"] },
              { title: "Task B", ref: "b", blockedBy: ["a"] },
            ],
          },
        ],
      }),
    ).rejects.toThrow("Cyclic dependency detected in batch");
  });

  it("throws on a transitive cycle (A→B→C→A)", async () => {
    const db = await createTestDb();
    const id = await createFeature(db, "My Feature");

    await expect(
      executeBatch(db, id, {
        phases: [
          {
            title: "Phase 1",
            tasks: [
              { title: "Task A", ref: "a", blockedBy: ["c"] },
              { title: "Task B", ref: "b", blockedBy: ["a"] },
              { title: "Task C", ref: "c", blockedBy: ["b"] },
            ],
          },
        ],
      }),
    ).rejects.toThrow("Cyclic dependency detected in batch");
  });

  it("does not insert any tasks or phases when ref validation fails (no partial state)", async () => {
    const db = await createTestDb();
    const id = await createFeature(db, "My Feature");

    await expect(
      executeBatch(db, id, {
        phases: [
          {
            title: "Phase 1",
            tasks: [{ title: "Task A", blockedBy: ["ghost"] }],
          },
        ],
      }),
    ).rejects.toThrow();

    // Nothing should have been inserted
    const dbPhases = await db.query.phases.findMany({ where: { featureId: id } });
    expect(dbPhases).toHaveLength(0);
  });
});
