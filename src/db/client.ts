import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import path from "node:path";
import * as schema from "./schema";
import { getDbPath, ensureInit } from "../utils/init";

function makeDb(url: string) {
  return drizzle({ connection: { url }, schema });
}

type Db = ReturnType<typeof makeDb>;

let _db: Db | null = null;

export async function getDb(): Promise<Db> {
  if (_db) return _db;

  ensureInit();
  const dbPath = getDbPath();
  _db = makeDb(`file:${dbPath}`);

  await migrate(_db, {
    migrationsFolder: path.join(__dirname, "migrations"),
  });

  return _db;
}
