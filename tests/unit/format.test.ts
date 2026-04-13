import { describe, it, expect } from "vitest";
import { formatDate, formatDateTime, statusBadge, sep, pad } from "../../src/utils/format";

// NO_COLOR=1 is set in vitest.config.ts — chalk returns plain strings.

describe("formatDate", () => {
  it("formats a unix timestamp as YYYY-MM-DD", () => {
    // Arrange
    const ts = 1700000000; // 2023-11-14T22:13:20Z

    // Act
    const result = formatDate(ts);

    // Assert
    expect(result).toBe("2023-11-14");
  });

  it("returns em-dash for null", () => {
    // Arrange / Act / Assert
    expect(formatDate(null)).toBe("—");
  });

  it("returns em-dash for undefined", () => {
    // Arrange / Act / Assert
    expect(formatDate(undefined)).toBe("—");
  });
});

describe("formatDateTime", () => {
  it("formats a unix timestamp as YYYY-MM-DD HH:MM", () => {
    // Arrange
    const ts = 1700000000; // 2023-11-14T22:13:20Z

    // Act
    const result = formatDateTime(ts);

    // Assert
    expect(result).toBe("2023-11-14 22:13");
  });

  it("returns em-dash for null", () => {
    // Arrange / Act / Assert
    expect(formatDateTime(null)).toBe("—");
  });

  it("returns em-dash for undefined", () => {
    // Arrange / Act / Assert
    expect(formatDateTime(undefined)).toBe("—");
  });
});

describe("statusBadge", () => {
  it("wraps the status in brackets", () => {
    // Arrange / Act / Assert
    expect(statusBadge("todo")).toBe("[todo]");
    expect(statusBadge("in-progress")).toBe("[in-progress]");
    expect(statusBadge("review")).toBe("[review]");
    expect(statusBadge("done")).toBe("[done]");
    expect(statusBadge("active")).toBe("[active]");
    expect(statusBadge("archived")).toBe("[archived]");
  });

  it("returns a plain bracketed string for unknown status", () => {
    // Arrange / Act / Assert
    expect(statusBadge("unknown")).toBe("[unknown]");
  });
});

describe("sep", () => {
  it("returns 56 dashes by default", () => {
    // Arrange / Act
    const result = sep();

    // Assert
    expect(result).toHaveLength(56);
    expect(result).toMatch(/^─+$/);
  });

  it("respects a custom width", () => {
    // Arrange / Act
    const result = sep(10);

    // Assert
    expect(result).toHaveLength(10);
  });
});

describe("pad", () => {
  it("pads a string to the given width with spaces", () => {
    // Arrange / Act
    const result = pad("hi", 6);

    // Assert
    expect(result).toBe("hi    ");
  });

  it("does not truncate strings longer than the width", () => {
    // Arrange / Act
    const result = pad("toolong", 3);

    // Assert
    expect(result).toBe("toolong");
  });

  it("returns the string unchanged when it exactly matches the width", () => {
    // Arrange / Act
    const result = pad("exact", 5);

    // Assert
    expect(result).toBe("exact");
  });
});
