import { describe, it, expect } from "vitest";
import { createTestDb } from "../helpers/db";
import { features, phases, tasks, logs } from "../../src/db/schema";

describe("openDb / createTestDb", () => {
  it("creates all four tables successfully", async () => {
    // Arrange & Act
    const db = await createTestDb();

    // Assert — inserting into each table should not throw
    const now = Math.floor(Date.now() / 1000);

    await db
      .insert(features)
      .values({
        id: "test-feature",
        title: "Test",
        description: null,
        status: "active",
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const [phase] = await db
      .insert(phases)
      .values({
        featureId: "test-feature",
        order: 1,
        title: "Phase 1",
        description: null,
        status: "todo",
        createdAt: now,
        startedAt: null,
        completedAt: null,
      })
      .returning()
      .all();

    const [task] = await db
      .insert(tasks)
      .values({
        phaseId: phase.id,
        order: 1,
        title: "Task 1",
        description: null,
        status: "todo",
        createdAt: now,
        startedAt: null,
        completedAt: null,
      })
      .returning()
      .all();

    await db
      .insert(logs)
      .values({
        featureId: "test-feature",
        phaseId: phase.id,
        taskId: task.id,
        source: "test",
        message: "hello",
        createdAt: now,
      })
      .run();

    const featureRows = await db.query.features.findMany();
    expect(featureRows).toHaveLength(1);

    const phaseRows = await db.query.phases.findMany();
    expect(phaseRows).toHaveLength(1);

    const taskRows = await db.query.tasks.findMany();
    expect(taskRows).toHaveLength(1);

    const logRows = await db.query.logs.findMany();
    expect(logRows).toHaveLength(1);
  });

  it("each call returns a fully isolated DB", async () => {
    // Arrange
    const db1 = await createTestDb();
    const db2 = await createTestDb();
    const now = Math.floor(Date.now() / 1000);

    // Act — insert into db1 only
    await db1
      .insert(features)
      .values({
        id: "feat-a",
        title: "A",
        description: null,
        status: "active",
        createdAt: now,
        updatedAt: now,
      })
      .run();

    // Assert — db2 is unaffected
    const rows = await db2.query.features.findMany();
    expect(rows).toHaveLength(0);
  });
});
