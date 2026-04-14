import os from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { openDb, type Db } from "../../src/db/client";

const MIGRATIONS_FOLDER = path.resolve(process.cwd(), "drizzle");

/**
 * Creates a fresh in-memory (or temp-file) SQLite DB with all migrations applied.
 * Each call returns an isolated DB instance — never shares state between tests.
 */
export async function createTestDb(): Promise<Db> {
  const id = randomBytes(8).toString("hex");
  const tmpFile = path.join(os.tmpdir(), `chip-test-${id}.db`);
  return openDb(`file:${tmpFile}`, MIGRATIONS_FOLDER);
}
