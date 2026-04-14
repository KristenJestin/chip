import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import path from "node:path";
import fs from "node:fs";
import { relations } from "./relations";
import { getDbPath, ensureInit } from "../utils/init";

function makeDb(url: string) {
  return drizzle({ connection: { url }, relations });
}

export type Db = ReturnType<typeof makeDb>;

let _db: Db | null = null;

/**
 * Creates and migrates a DB at the given URL.
 * Does NOT affect the production singleton — intended for testing.
 */
export async function openDb(url: string, migrationsFolder: string): Promise<Db> {
  const db = makeDb(url);
  await migrate(db, { migrationsFolder });
  return db;
}

/**
 * Opens a DB rooted at the given project directory.
 * Creates .chip/ if it does not exist. Intended for the OpenCode plugin.
 */
export async function openDbForProject(
  projectDir: string,
  migrationsFolder: string,
): Promise<Db> {
  const chipDir = path.join(projectDir, ".chip");
  if (!fs.existsSync(chipDir)) {
    fs.mkdirSync(chipDir, { recursive: true });
  }
  const dbPath = path.join(chipDir, "chip.db");
  return openDb(`file:${dbPath}`, migrationsFolder);
}

/** Returns the production DB singleton, initialising it on first call. */
export async function getDb(): Promise<Db> {
  if (_db) return _db;

  ensureInit();
  const dbPath = getDbPath();
  _db = await openDb(`file:${dbPath}`, path.join(__dirname, "migrations"));
  return _db;
}
