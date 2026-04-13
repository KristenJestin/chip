import fs from "fs";
import path from "path";

const CHIP_DIR = ".chip";
const DB_FILENAME = "chip.db";

export function getChipDir(): string {
  return path.join(process.cwd(), CHIP_DIR);
}

export function getDbPath(): string {
  return path.join(getChipDir(), DB_FILENAME);
}

let initialized = false;

/** Resets the init flag. For use in tests only. */
export function _resetForTesting(): void {
  initialized = false;
}

/**
 * Ensures .chip/ directory exists. On first creation, proposes adding it
 * to .gitignore (auto-adds if .gitignore exists without the entry).
 */
export function ensureInit(): void {
  if (initialized) return;
  initialized = true;

  const chipDir = getChipDir();
  const isNew = !fs.existsSync(chipDir);

  if (isNew) {
    fs.mkdirSync(chipDir, { recursive: true });
    console.log(`Initialized .chip/ in ${process.cwd()}`);
    handleGitignore();
  }
}

function handleGitignore(): void {
  const gitignorePath = path.join(process.cwd(), ".gitignore");
  if (!fs.existsSync(gitignorePath)) return;

  const content = fs.readFileSync(gitignorePath, "utf-8");
  const already = content.split("\n").some((l) => l.trim() === ".chip/" || l.trim() === ".chip");

  if (already) return;

  const append = content.endsWith("\n") ? ".chip/\n" : "\n.chip/\n";
  fs.appendFileSync(gitignorePath, append);
  console.log("Added .chip/ to .gitignore");
}
