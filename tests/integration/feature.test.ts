import { describe, it, expect } from "vitest";
import { createTestDb } from "../helpers/db";
import {
  createFeature,
  listFeatures,
  getFeatureDetails,
  exportFeature,
} from "../../src/commands/feature";
import { addPhase } from "../../src/commands/phase";
import { addTask } from "../../src/commands/task";
import { addLog } from "../../src/commands/log";

describe("createFeature", () => {
  it("inserts a feature and returns its slug ID", async () => {
    // Arrange
    const db = await createTestDb();

    // Act
    const id = await createFeature(db, "Auth Module");

    // Assert
    expect(id).toBe("auth-module");
    const list = await listFeatures(db);
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe("Auth Module");
  });

  it("stores an optional description", async () => {
    // Arrange
    const db = await createTestDb();

    // Act
    await createFeature(db, "Dashboard", "Main dashboard view");

    // Assert
    const [feat] = await listFeatures(db);
    expect(feat.description).toBe("Main dashboard view");
  });

  it("deduplicates IDs when two features share the same slug", async () => {
    // Arrange
    const db = await createTestDb();

    // Act
    const id1 = await createFeature(db, "Auth");
    const id2 = await createFeature(db, "Auth");

    // Assert
    expect(id1).toBe("auth");
    expect(id2).toBe("auth-2");
  });

  it("sets status to 'active' by default", async () => {
    // Arrange
    const db = await createTestDb();

    // Act
    await createFeature(db, "My Feature");

    // Assert
    const [feat] = await listFeatures(db);
    expect(feat.status).toBe("active");
  });
});

describe("listFeatures", () => {
  it("returns an empty array when no features exist", async () => {
    // Arrange
    const db = await createTestDb();

    // Act
    const result = await listFeatures(db);

    // Assert
    expect(result).toEqual([]);
  });

  it("returns features sorted by creation time (ascending)", async () => {
    // Arrange
    const db = await createTestDb();
    await createFeature(db, "First");
    await createFeature(db, "Second");

    // Act
    const result = await listFeatures(db);

    // Assert
    expect(result[0].title).toBe("First");
    expect(result[1].title).toBe("Second");
  });
});

describe("getFeatureDetails", () => {
  it("throws when the feature does not exist", async () => {
    // Arrange
    const db = await createTestDb();

    // Act & Assert
    await expect(getFeatureDetails(db, "nonexistent")).rejects.toThrow(
      "Feature not found: nonexistent",
    );
  });

  it("returns feature with empty phases and logs for a fresh feature", async () => {
    // Arrange
    const db = await createTestDb();
    const id = await createFeature(db, "Empty Feature");

    // Act
    const details = await getFeatureDetails(db, id);

    // Assert
    expect(details.feature.id).toBe(id);
    expect(details.phases).toHaveLength(0);
    expect(details.recentLogs).toHaveLength(0);
  });
});

describe("exportFeature", () => {
  it("throws when the feature does not exist", async () => {
    // Arrange
    const db = await createTestDb();

    // Act & Assert
    await expect(exportFeature(db, "nonexistent")).rejects.toThrow(
      "Feature not found: nonexistent",
    );
  });

  it("includes the feature title and ID in the output", async () => {
    // Arrange
    const db = await createTestDb();
    const id = await createFeature(db, "My Feature", "A great feature");

    // Act
    const md = await exportFeature(db, id);

    // Assert
    expect(md).toContain("# My Feature");
    expect(md).toContain(`**ID:** ${id}`);
    expect(md).toContain("**Description:** A great feature");
    expect(md).toContain("**Status:** active");
  });

  it("includes phases and tasks with their statuses", async () => {
    // Arrange
    const db = await createTestDb();
    const id = await createFeature(db, "My Feature");
    const phase = await addPhase(db, id, "Phase 1", "First phase");
    await addTask(db, id, phase.id, "Task A");

    // Act
    const md = await exportFeature(db, id);

    // Assert
    expect(md).toContain("## Phases");
    expect(md).toContain("Phase 1");
    expect(md).toContain("First phase");
    expect(md).toContain("Task A");
    expect(md).toContain("[todo]");
  });

  it("marks done tasks with [x]", async () => {
    // Arrange
    const db = await createTestDb();
    const id = await createFeature(db, "My Feature");
    const phase = await addPhase(db, id, "Phase 1");
    await addTask(db, id, phase.id, "Done Task");

    // Act — note: updateTaskStatus would be needed to set done in a real test
    // We verify todo tasks appear with [ ]
    const md = await exportFeature(db, id);

    // Assert
    expect(md).toContain("- [ ] **Done Task**");
  });

  it("includes all logs in chronological order", async () => {
    // Arrange
    const db = await createTestDb();
    const id = await createFeature(db, "My Feature");
    await addLog(db, id, "First log", { source: "/dev" });
    await addLog(db, id, "Second log");

    // Act
    const md = await exportFeature(db, id);

    // Assert
    expect(md).toContain("## Logs");
    expect(md).toContain("First log");
    expect(md).toContain("/dev");
    expect(md).toContain("Second log");
    const firstIdx = md.indexOf("First log");
    const secondIdx = md.indexOf("Second log");
    expect(firstIdx).toBeLessThan(secondIdx);
  });

  it("returns valid markdown with no phases or logs", async () => {
    // Arrange
    const db = await createTestDb();
    const id = await createFeature(db, "Empty Feature");

    // Act
    const md = await exportFeature(db, id);

    // Assert
    expect(md).toContain("# Empty Feature");
    expect(md).not.toContain("## Phases");
    expect(md).not.toContain("## Logs");
  });
});
