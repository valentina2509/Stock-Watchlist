import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";

const DB_PATH = path.join(process.cwd(), "conviction.db");

// Singleton for Next.js dev hot-reload
const globalForDb = global as unknown as { _db: ReturnType<typeof makeDb> };

function makeDb() {
  return drizzle(new Database(DB_PATH), { schema });
}

export const db = globalForDb._db ?? makeDb();

if (process.env.NODE_ENV !== "production") globalForDb._db = db;
