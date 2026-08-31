import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/lib/server/db/schema";

const globalForDatabase = globalThis as typeof globalThis & {
  nocDatabasePool?: Pool;
};

function databaseUrl(configuredUrl?: string): string {
  const value = configuredUrl?.trim() || process.env.DATABASE_URL?.trim();
  if (!value) throw new Error("DATABASE_URL is required for persistence");
  return value;
}

export function getDatabasePool(configuredUrl?: string): Pool {
  const pool = globalForDatabase.nocDatabasePool ?? new Pool({
    connectionString: databaseUrl(configuredUrl),
    max: 10,
  });
  if (process.env.NODE_ENV !== "production") globalForDatabase.nocDatabasePool = pool;
  return pool;
}

export function getDatabase(configuredUrl?: string) {
  return drizzle(getDatabasePool(configuredUrl), { schema });
}

export type Database = ReturnType<typeof getDatabase>;
