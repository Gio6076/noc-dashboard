import assert from "node:assert/strict";
import test from "node:test";
import {
  alertOverlapsMonitoringWindow,
  assembleMonitoringHistory,
} from "../lib/monitoring-history-read-model.ts";
import {
  createMonitoringHistoryWindow,
  DEFAULT_MONITORING_HISTORY_HOURS,
  InvalidMonitoringHistoryWindowError,
  parseMonitoringHistoryHours,
} from "../lib/monitoring-history-window.ts";
import type { MonitoringHistoryRows } from "../lib/server/repositories/monitoring-history-repository.ts";

const now = new Date("2026-08-31T12:00:00.000Z");
const window = createMonitoringHistoryWindow(24, now);

function rows(overrides: Partial<MonitoringHistoryRows> = {}): MonitoringHistoryRows {
  return {
    device: {
      id: "device-internal-id",
      stableKey: "macbook-air",
      displayName: "MacBook Air",
      monitoringType: "agent",
      operationalState: "monitored",
    },
    systemSamples: [],
    networkSamples: [],
    services: [],
    serviceObservations: [],
    alerts: [],
    ...overrides,
  } as MonitoringHistoryRows;
}

test("history window defaults to 24 hours and accepts a bounded custom value", () => {
  assert.equal(parseMonitoringHistoryHours(null), DEFAULT_MONITORING_HISTORY_HOURS);
  assert.equal(parseMonitoringHistoryHours("48.5"), 48.5);
  assert.deepEqual(createMonitoringHistoryWindow(24, now), {
    from: new Date("2026-08-30T12:00:00.000Z"),
    to: now,
    durationSeconds: 86_400,
  });
});

test("history window rejects below-minimum, above-maximum, and non-finite input", () => {
  for (const value of ["0.99", "168.01", "NaN", "Infinity", "-Infinity", "", "not-a-number"]) {
    assert.throws(() => parseMonitoringHistoryHours(value), InvalidMonitoringHistoryWindowError);
  }
});

test("an unknown stable device key produces a null/not-found read model", () => {
  const result = assembleMonitoringHistory(rows({ device: null }), window);
  assert.equal(result, null);
});

test("system and network samples are chronological, deterministic on ties, and never fabricated", () => {
  const tie = new Date("2026-08-31T11:00:00.000Z");
  const history = assembleMonitoringHistory(rows({
    systemSamples: [
      { id: "b", observedAt: tie, cpuUsagePercent: "2", memoryUsagePercent: "20", diskUsagePercent: "30", uptimeSeconds: BigInt(2) },
      { id: "c", observedAt: new Date("2026-08-31T11:30:00.000Z"), cpuUsagePercent: "3", memoryUsagePercent: "20", diskUsagePercent: "30", uptimeSeconds: BigInt(3) },
      { id: "a", observedAt: tie, cpuUsagePercent: "1", memoryUsagePercent: "20", diskUsagePercent: "30", uptimeSeconds: BigInt(1) },
    ],
    networkSamples: [
      { id: "network-new", observedAt: new Date("2026-08-31T11:30:00.000Z"), inboundBytesPerSecond: 3, outboundBytesPerSecond: 4, bytesReceived: BigInt("9007199254740995"), bytesSent: BigInt("9007199254740997") },
      { id: "network-old", observedAt: tie, inboundBytesPerSecond: null, outboundBytesPerSecond: null, bytesReceived: BigInt("9007199254740993"), bytesSent: BigInt("9007199254740994") },
    ],
  }), window);

  assert.ok(history);
  assert.deepEqual(history.system.map((sample) => sample.cpuUsagePercent), [1, 2, 3]);
  assert.deepEqual(history.network.map((sample) => sample.sampledAt), [tie.toISOString(), "2026-08-31T11:30:00.000Z"]);
  assert.equal(history.system.length, 3);
  assert.equal(history.network.length, 2);
  assert.equal(history.network[0].inboundBytesPerSecond, null);
  assert.equal(history.network[0].totalBytesReceived, "9007199254740993");
  assert.equal(history.network[1].totalBytesSent, "9007199254740997");
  assert.doesNotThrow(() => JSON.stringify(history));
});

test("empty telemetry remains empty and services without observations remain represented", () => {
  const history = assembleMonitoringHistory(rows({
    services: [
      { id: "service-empty", stableKey: "tcp:empty:1", name: "Empty", type: "tcp" },
      { id: "service-web", stableKey: "https:web:443:/", name: "Web", type: "https" },
    ],
    serviceObservations: [
      { id: "z", serviceId: "service-web", observedAt: new Date("2026-08-31T11:30:00.000Z"), status: "up", responseTimeMs: 10, httpStatusCode: 200 },
      { id: "a", serviceId: "service-web", observedAt: new Date("2026-08-31T11:00:00.000Z"), status: "down", responseTimeMs: 50, httpStatusCode: 503 },
    ],
  }), window);

  assert.ok(history);
  assert.deepEqual(history.system, []);
  assert.deepEqual(history.network, []);
  assert.deepEqual(history.services[0].observations, []);
  assert.deepEqual(history.services[1].observations.map((value) => value.status), ["down", "up"]);
  assert.equal("target" in history.services[1], false);
});

test("alert overlap includes recovered and active occurrences intersecting the window", () => {
  const cases = [
    { name: "recovered inside", firstObservedAt: new Date("2026-08-31T01:00:00Z"), recoveredAt: new Date("2026-08-31T02:00:00Z"), expected: true },
    { name: "active inside", firstObservedAt: new Date("2026-08-31T03:00:00Z"), recoveredAt: null, expected: true },
    { name: "began before and active", firstObservedAt: new Date("2026-08-29T03:00:00Z"), recoveredAt: null, expected: true },
    { name: "ended before", firstObservedAt: new Date("2026-08-29T03:00:00Z"), recoveredAt: new Date("2026-08-30T11:59:59Z"), expected: false },
    { name: "begins after", firstObservedAt: new Date("2026-08-31T12:00:01Z"), recoveredAt: null, expected: false },
  ];
  for (const value of cases) {
    assert.equal(alertOverlapsMonitoringWindow(value, window), value.expected, value.name);
  }
});

test("history filters non-overlapping alerts and preserves lifecycle fields", () => {
  const base = {
    conditionKey: "service:web",
    category: "service" as const,
    severity: "critical" as const,
    lastObservedAt: new Date("2026-08-31T02:00:00Z"),
    observationCount: 4,
  };
  const history = assembleMonitoringHistory(rows({ alerts: [
    { ...base, id: "included", status: "recovered", firstObservedAt: new Date("2026-08-31T01:00:00Z"), recoveredAt: new Date("2026-08-31T02:00:00Z") },
    { ...base, id: "excluded", status: "recovered", firstObservedAt: new Date("2026-08-29T01:00:00Z"), recoveredAt: new Date("2026-08-30T11:00:00Z") },
  ] }), window);
  assert.ok(history);
  assert.deepEqual(history.alerts.map((alert) => alert.id), ["included"]);
  assert.equal(history.alerts[0].recoveredAt, "2026-08-31T02:00:00.000Z");
  assert.equal(history.alerts[0].status, "recovered");
});
