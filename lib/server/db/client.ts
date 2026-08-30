import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/lib/server/db/schema";

const globalForDatabase = globalThis as typeof globalThis & {
  nocDatabasePool?: Pool;
};

function databaseUrl(): string {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) throw new Error("DATABASE_URL is required for persistence");
  return value;
}

export const databasePool =
  globalForDatabase.nocDatabasePool ??
  new Pool({ connectionString: databaseUrl(), max: 10 });

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.nocDatabasePool = databasePool;
}

export const db = drizzle(databasePool, { schema });
export type Database = typeof db;
