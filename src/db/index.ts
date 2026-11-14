import "server-only";

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";

type Database = NodePgDatabase<typeof schema>;
type DatabaseGlobal = typeof globalThis & {
  resourcePool?: Pool;
  resourceDb?: Database;
};

const databaseGlobal = globalThis as DatabaseGlobal;

export function getDb(): Database {
  if (databaseGlobal.resourceDb) return databaseGlobal.resourceDb;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured. Copy .env.example to .env.local.");
  }

  const pool =
    databaseGlobal.resourcePool ??
    new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });

  const database = drizzle(pool, { schema });
  if (process.env.NODE_ENV !== "production") {
    databaseGlobal.resourcePool = pool;
    databaseGlobal.resourceDb = database;
  }

  return database;
}
