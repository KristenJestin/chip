import { describe, it, expect, vi, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { getChipDir, getDbPath, ensureInit, _resetForTesting } from "../../src/utils/init";

afterEach(() => {
  _resetForTesting();
  vi.restoreAllMocks();
});

describe("getChipDir", () => {
  it("returns .chip/ inside cwd", () => {
    // Arrange
    vi.spyOn(process, "cwd").mockReturnValue("/some/project");

    // Act
    const result = getChipDir();

    // Assert
    expect(result).toBe("/some/project/.chip");
  });
});

describe("getDbPath", () => {
  it("returns the db path inside .chip/", () => {
    // Arrange
    vi.spyOn(process, "cwd").mockReturnValue("/some/project");

    // Act
    const result = getDbPath();

    // Assert
    expect(result).toBe("/some/project/.chip/chip.db");
  });
});

describe("ensureInit", () => {
  it("creates .chip/ directory when it does not exist", () => {
    // Arrange
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "chip-init-test-"));
    vi.spyOn(process, "cwd").mockReturnValue(tmpDir);

    // Act
    ensureInit();

    // Assert
    expect(fs.existsSync(path.join(tmpDir, ".chip"))).toBe(true);

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true });
  });

  it("is idempotent — second call does not throw or re-create", () => {
    // Arrange
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "chip-init-test-"));
    vi.spyOn(process, "cwd").mockReturnValue(tmpDir);

    // Act
    ensureInit();
    ensureInit(); // second call — must be no-op

    // Assert
    expect(fs.existsSync(path.join(tmpDir, ".chip"))).toBe(true);

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true });
  });

  it("appends .chip/ to .gitignore when the file exists without the entry", () => {
    // Arrange
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "chip-init-test-"));
    vi.spyOn(process, "cwd").mockReturnValue(tmpDir);
    fs.writeFileSync(path.join(tmpDir, ".gitignore"), "node_modules/\n");

    // Act
    ensureInit();

    // Assert
    const content = fs.readFileSync(path.join(tmpDir, ".gitignore"), "utf-8");
    expect(content).toContain(".chip/");

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true });
  });

  it("does not duplicate .chip/ in .gitignore when entry already present", () => {
    // Arrange
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "chip-init-test-"));
    vi.spyOn(process, "cwd").mockReturnValue(tmpDir);
    fs.writeFileSync(path.join(tmpDir, ".gitignore"), "node_modules/\n.chip/\n");
    fs.mkdirSync(path.join(tmpDir, ".chip")); // pre-create so ensureInit won't add it

    // Act
    ensureInit();

    // Assert
    const content = fs.readFileSync(path.join(tmpDir, ".gitignore"), "utf-8");
    const count = (content.match(/\.chip\//g) ?? []).length;
    expect(count).toBe(1);

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true });
  });
});
