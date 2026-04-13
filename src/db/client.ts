import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import path from "node:path";
import * as schema from "./schema";
import { getDbPath, ensureInit } from "../utils/init";

function makeDb(url: string) {
  return drizzle({ connection: { url }, schema });
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

/** Returns the production DB singleton, initialising it on first call. */
export async function getDb(): Promise<Db> {
  if (_db) return _db;

  ensureInit();
  const dbPath = getDbPath();
  _db = await openDb(`file:${dbPath}`, path.join(__dirname, "migrations"));
  return _db;
}
