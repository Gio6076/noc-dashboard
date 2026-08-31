import { loadEnvConfig } from "@next/env";

import {
  parseCollectionIntervalSeconds,
  runCollectorLoop,
} from "../lib/monitoring-collector.ts";
import {
  collectorFailureCategory,
  serializeCollectorEvent,
} from "../lib/collector-logger.ts";
import { acquireCollectorProcessLock } from "../lib/collector-process-lock.ts";
import { CollectorRuntimeState } from "../lib/collector-runtime-state.ts";

loadEnvConfig(process.cwd());

async function main() {
  const runtimeState = new CollectorRuntimeState();

  let intervalSeconds: number;
  try {
    intervalSeconds = parseCollectionIntervalSeconds(
      process.env.NOC_COLLECTION_INTERVAL_SECONDS,
    );
  } catch {
    console.error(serializeCollectorEvent({
      event: "collector_startup_failed",
      timestamp: new Date().toISOString(),
      category: "configuration_error",
    }));
    process.exitCode = 1;
    return;
  }
  const intervalMilliseconds = intervalSeconds * 1_000;
  const processLock = await acquireCollectorProcessLock();
  if (!processLock) {
    console.error(serializeCollectorEvent({
      event: "collector_lock_unavailable",
      timestamp: new Date().toISOString(),
      category: "lock_unavailable",
    }));
    process.exitCode = 1;
    return;
  }

  console.log(serializeCollectorEvent({
    event: "collector_starting",
    timestamp: new Date().toISOString(),
    processStartedAt: runtimeState.snapshot().processStartedAt,
    collectionIntervalSeconds: intervalSeconds,
    pid: process.pid,
    runtime: `node-${process.versions.node}`,
    platform: process.platform,
    architecture: process.arch,
  }));

  const shutdownController = new AbortController();
  const requestShutdown = (signal: "SIGINT" | "SIGTERM") => {
    if (shutdownController.signal.aborted) return;
    runtimeState.markStopping();
    console.log(serializeCollectorEvent({
      event: "collector_shutdown_requested",
      timestamp: new Date().toISOString(),
      signal,
    }));
    shutdownController.abort();
  };
  const onSigint = () => requestShutdown("SIGINT");
  const onSigterm = () => requestShutdown("SIGTERM");
  process.on("SIGINT", onSigint);
  process.on("SIGTERM", onSigterm);

  runtimeState.markRunning();
  let databasePool: { end(): Promise<void> } | undefined;

  try {
    const { getDatabasePool } = await import("../lib/server/db/client.ts");
    databasePool = getDatabasePool();
    const { runPersistedMonitoringCycle } = await import(
      "../lib/server/monitoring/run-persisted-cycle.ts"
    );
    await runCollectorLoop({
      intervalMilliseconds,
      signal: shutdownController.signal,
      runCycle: runPersistedMonitoringCycle,
      onCycleStart: (startedAt) => {
        runtimeState.cycleStarted(startedAt);
        console.log(serializeCollectorEvent({
          event: "collection_cycle_started",
          startedAt: startedAt.toISOString(),
        }));
      },
      onCycleComplete: (result, durationMs, startedAt, completedAt) => {
        runtimeState.cycleCompleted(result.status, completedAt);
        console.log(serializeCollectorEvent({
          event: "collection_cycle_completed",
          runId: result.collectionRunId,
          status: result.status,
          startedAt: startedAt.toISOString(),
          completedAt: completedAt.toISOString(),
          durationMs,
          devicesAttempted: result.devicesAttempted,
          devicesSucceeded: result.devicesSucceeded,
          devicesFailed: Math.max(0, result.devicesAttempted - result.devicesSucceeded),
          alertsDetected: result.alertsDetected,
        }));
      },
      onCycleFailure: (error, durationMs, startedAt, completedAt) => {
        runtimeState.cycleFailed(completedAt);
        console.error(serializeCollectorEvent({
          event: "collection_cycle_failed",
          category: collectorFailureCategory(error),
          timestamp: completedAt.toISOString(),
          startedAt: startedAt.toISOString(),
          completedAt: completedAt.toISOString(),
          durationMs,
          retry: true,
          nextRetryDelayMs: intervalMilliseconds,
        }));
      },
    });
  } finally {
    process.off("SIGINT", onSigint);
    process.off("SIGTERM", onSigterm);
    if (runtimeState.snapshot().lifecycle === "running") runtimeState.markStopping();
    await databasePool?.end();
    await processLock.release();
    runtimeState.markStopped();
    console.log(serializeCollectorEvent({
      event: "collector_stopped",
      timestamp: new Date().toISOString(),
      totalCyclesCompleted: runtimeState.snapshot().totalCyclesCompleted,
    }));
  }
}

main().catch(() => {
  console.error(serializeCollectorEvent({
    event: "collector_startup_failed",
    timestamp: new Date().toISOString(),
    category: "startup_error",
  }));
  process.exitCode = 1;
});
