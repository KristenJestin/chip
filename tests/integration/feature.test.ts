import { describe, it, expect } from "vitest";
import { createTestDb } from "../helpers/db";
import { createFeature, listFeatures, getFeatureDetails } from "../../src/commands/feature";

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
