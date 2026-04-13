import { describe, it, expect } from "vitest";
import { toSlug, uniqueSlug } from "../../src/utils/slug";

describe("toSlug", () => {
  it("converts a title to kebab-case", () => {
    // Arrange
    const title = "My Feature Title";

    // Act
    const result = toSlug(title);

    // Assert
    expect(result).toBe("my-feature-title");
  });

  it("strips diacritics", () => {
    // Arrange
    const title = "Café élève naïf";

    // Act
    const result = toSlug(title);

    // Assert
    expect(result).toBe("cafe-eleve-naif");
  });

  it("replaces non-alphanumeric characters with dashes", () => {
    // Arrange
    const title = "foo & bar (baz)!";

    // Act
    const result = toSlug(title);

    // Assert
    expect(result).toBe("foo-bar-baz");
  });

  it("trims leading and trailing dashes", () => {
    // Arrange
    const title = "  ---hello---  ";

    // Act
    const result = toSlug(title);

    // Assert
    expect(result).toBe("hello");
  });

  it("truncates to 64 characters", () => {
    // Arrange
    const title = "a".repeat(100);

    // Act
    const result = toSlug(title);

    // Assert
    expect(result).toHaveLength(64);
  });

  it("handles numbers in the title", () => {
    // Arrange
    const title = "Phase 2 Setup";

    // Act
    const result = toSlug(title);

    // Assert
    expect(result).toBe("phase-2-setup");
  });

  it("collapses multiple consecutive non-alphanum chars into one dash", () => {
    // Arrange
    const title = "foo   ---   bar";

    // Act
    const result = toSlug(title);

    // Assert
    expect(result).toBe("foo-bar");
  });
});

describe("uniqueSlug", () => {
  it("returns the base slug if it does not exist", () => {
    // Arrange
    const base = "my-feature";
    const existing: string[] = [];

    // Act
    const result = uniqueSlug(base, existing);

    // Assert
    expect(result).toBe("my-feature");
  });

  it("appends -2 when the base is already taken", () => {
    // Arrange
    const base = "my-feature";
    const existing = ["my-feature"];

    // Act
    const result = uniqueSlug(base, existing);

    // Assert
    expect(result).toBe("my-feature-2");
  });

  it("increments the suffix until a free slot is found", () => {
    // Arrange
    const base = "my-feature";
    const existing = ["my-feature", "my-feature-2", "my-feature-3"];

    // Act
    const result = uniqueSlug(base, existing);

    // Assert
    expect(result).toBe("my-feature-4");
  });

  it("does not collide with unrelated entries", () => {
    // Arrange
    const base = "auth";
    const existing = ["dashboard", "settings"];

    // Act
    const result = uniqueSlug(base, existing);

    // Assert
    expect(result).toBe("auth");
  });
});
