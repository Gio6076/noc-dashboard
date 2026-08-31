import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const { getDatabasePool } = await import("../lib/server/db/client.ts");
  const databasePool = getDatabasePool();
  const { runPersistedMonitoringCycle } = await import(
    "../lib/server/monitoring/run-persisted-cycle.ts"
  );
  try {
    const result = await runPersistedMonitoringCycle();
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await databasePool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Persisted monitoring cycle failed");
  process.exitCode = 1;
});
