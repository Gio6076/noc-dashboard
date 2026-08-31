import assert from "node:assert/strict";
import test from "node:test";

import { collectorFailureCategory, serializeCollectorEvent } from "../lib/collector-logger.ts";

const timestamp = "2026-08-31T00:00:00.000Z";

test("startup event serializes safe operational configuration", () => {
  const event = JSON.parse(serializeCollectorEvent({
    event: "collector_starting",
    timestamp,
    processStartedAt: timestamp,
    collectionIntervalSeconds: 20,
    pid: 123,
    runtime: "node-22.0.0",
    platform: "linux",
    architecture: "x64",
  }));
  assert.deepEqual(event, {
    event: "collector_starting", timestamp, processStartedAt: timestamp,
    collectionIntervalSeconds: 20, pid: 123, runtime: "node-22.0.0",
    platform: "linux", architecture: "x64",
  });
});

test("successful and partial cycle events preserve counts and persisted status", () => {
  const base = {
    event: "collection_cycle_completed" as const,
    runId: "run-id", startedAt: timestamp, completedAt: timestamp, durationMs: 3021,
    devicesAttempted: 2, devicesSucceeded: 1, devicesFailed: 1, alertsDetected: 0,
  };
  assert.equal(JSON.parse(serializeCollectorEvent({ ...base, status: "completed" })).status, "completed");
  const partial = JSON.parse(serializeCollectorEvent({ ...base, status: "partial" }));
  assert.equal(partial.status, "partial");
  assert.equal(partial.devicesFailed, 1);
});

test("failure event contains a safe category and omits raw exception text", () => {
  const serialized = serializeCollectorEvent({
    event: "collection_cycle_failed", category: "database_error", timestamp,
    startedAt: timestamp, completedAt: timestamp, durationMs: 4,
    retry: true, nextRetryDelayMs: 20_000,
    rawError: "password=secret at postgresql://admin@db.internal" as never,
  } as Parameters<typeof serializeCollectorEvent>[0]);
  assert.match(serialized, /"category":"database_error"/);
  assert.doesNotMatch(serialized, /password|postgresql|db\.internal|rawError/);
});

test("database connection aggregates map to a safe database category", () => {
  const cause = Object.assign(new Error("connect ECONNREFUSED postgresql://secret@db"), {
    code: "ECONNREFUSED",
  });
  assert.equal(collectorFailureCategory(new AggregateError([cause], "connection failed")), "database_error");
});

test("shutdown requested and stopped events serialize", () => {
  assert.deepEqual(JSON.parse(serializeCollectorEvent({
    event: "collector_shutdown_requested", timestamp, signal: "SIGTERM",
  })), { event: "collector_shutdown_requested", timestamp, signal: "SIGTERM" });
  assert.deepEqual(JSON.parse(serializeCollectorEvent({
    event: "collector_stopped", timestamp, totalCyclesCompleted: 2,
  })), { event: "collector_stopped", timestamp, totalCyclesCompleted: 2 });
});

test("serializer allowlist excludes database and target URLs", () => {
  const serialized = serializeCollectorEvent({
    event: "collector_stopped", timestamp, totalCyclesCompleted: 2,
    DATABASE_URL: "postgresql://user:secret@database.internal/noc",
    agentUrl: "http://secret-agent.internal:8000",
    serviceTarget: "https://private-service.internal/health",
  } as Parameters<typeof serializeCollectorEvent>[0]);
  assert.doesNotMatch(serialized, /secret|database\.internal|agent|private-service|DATABASE_URL|Target/);
});
