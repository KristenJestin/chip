import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("die", () => {
  beforeEach(() => {
    vi.spyOn(process, "exit").mockImplementation((_code?: string | number | null | undefined) => {
      throw new Error("process.exit");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls process.exit(1)", async () => {
    // Arrange
    const { die } = await import("../../src/utils/die");

    // Act & Assert
    expect(() => die("something went wrong")).toThrow("process.exit");
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("writes to stderr via console.error", async () => {
    // Arrange
    const { die } = await import("../../src/utils/die");

    // Act & Assert (exit throws, so we must wrap)
    try {
      die("bad input");
    } catch {
      // swallow the fake exit throw
    }
    expect(console.error).toHaveBeenCalledOnce();
    const arg = (console.error as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(arg).toContain("bad input");
  });

  it("prefixes the message with 'error:'", async () => {
    // Arrange
    const { die } = await import("../../src/utils/die");

    // Act
    try {
      die("oops");
    } catch {
      // swallow
    }

    // Assert
    const arg = (console.error as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(arg).toContain("error:");
  });
});
