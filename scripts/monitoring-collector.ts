import { loadEnvConfig } from "@next/env";

import {
  parseCollectionIntervalSeconds,
  runCollectorLoop,
  sanitizedErrorName,
} from "../lib/monitoring-collector.ts";

loadEnvConfig(process.cwd());

async function main() {
  console.log("Monitoring collector starting");

  let intervalSeconds: number;
  try {
    intervalSeconds = parseCollectionIntervalSeconds(
      process.env.NOC_COLLECTION_INTERVAL_SECONDS,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Invalid collection interval");
    process.exitCode = 1;
    return;
  }
  const intervalMilliseconds = intervalSeconds * 1_000;
  console.log(`Collection interval configured: ${intervalSeconds} seconds`);
  console.log("Run only one authoritative monitoring collector process at a time");

  const shutdownController = new AbortController();
  const requestShutdown = (signal: NodeJS.Signals) => {
    if (shutdownController.signal.aborted) return;
    console.log(`Shutdown requested (${signal}); finishing the current cycle if one is running`);
    shutdownController.abort();
  };
  const onSigint = () => requestShutdown("SIGINT");
  const onSigterm = () => requestShutdown("SIGTERM");
  process.on("SIGINT", onSigint);
  process.on("SIGTERM", onSigterm);

  const { databasePool } = await import("../lib/server/db/client.ts");
  const { runPersistedMonitoringCycle } = await import(
    "../lib/server/monitoring/run-persisted-cycle.ts"
  );

  try {
    await runCollectorLoop({
      intervalMilliseconds,
      signal: shutdownController.signal,
      runCycle: runPersistedMonitoringCycle,
      onCycleStart: () => console.log("Monitoring cycle started"),
      onCycleComplete: (result, durationMilliseconds) => {
        console.log(
          `Monitoring cycle completed: runId=${result.collectionRunId} status=completed durationMs=${durationMilliseconds} devicesAttempted=${result.devicesAttempted} devicesSucceeded=${result.devicesSucceeded} alertsDetected=${result.alertsDetected}`,
        );
      },
      onCycleFailure: (error, durationMilliseconds) => {
        console.error(
          `Monitoring cycle failed: errorType=${sanitizedErrorName(error)} durationMs=${durationMilliseconds}`,
        );
      },
    });
  } finally {
    process.off("SIGINT", onSigint);
    process.off("SIGTERM", onSigterm);
    await databasePool.end();
    console.log("Monitoring collector stopped");
  }
}

main().catch((error: unknown) => {
  console.error(`Monitoring collector failed to start: errorType=${sanitizedErrorName(error)}`);
  process.exitCode = 1;
});
