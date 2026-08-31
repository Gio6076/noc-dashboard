import assert from "node:assert/strict";
import test from "node:test";
import { mockNetworkDevices } from "../data/mock-devices.ts";
import {
  alertHistoryPresentation,
  DEFAULT_HISTORY_WINDOW_HOURS,
  HISTORY_WINDOWS,
  monitoringHistoryUrl,
  networkChartData,
  retainLastGoodHistory,
  serviceHistoryPresentation,
  systemChartData,
} from "../lib/monitoring-history-ui.ts";
import type {
  MonitoringHistory,
  MonitoringHistoryAlert,
  MonitoringHistoryService,
} from "../types/monitoring-history.ts";

const history: MonitoringHistory = {
  device: { stableKey: "macbook-air", displayName: "MacBook Air", operationalState: "monitored", monitoringType: "agent" },
  window: { from: "2026-08-30T12:00:00.000Z", to: "2026-08-31T12:00:00.000Z", durationSeconds: 86_400 },
  system: [],
  network: [],
  services: [],
  alerts: [],
};

const recoveredAlert: MonitoringHistoryAlert = {
  id: "alert-recovered",
  conditionKey: "service:macbook-air:web",
  category: "service",
  severity: "critical",
  title: "Web unavailable",
  message: "HTTP checks were down.",
  status: "recovered",
  firstObservedAt: "2026-08-31T10:00:00.000Z",
  lastObservedAt: "2026-08-31T10:20:00.000Z",
  recoveredAt: "2026-08-31T10:30:00.000Z",
  observationCount: 3,
};

test("history UI defaults to the fixed 24h window", () => {
  assert.equal(DEFAULT_HISTORY_WINDOW_HOURS, 24);
});

test("fixed window labels map to 1, 6, 24, and 168 API hours", () => {
  assert.deepEqual(HISTORY_WINDOWS.map(({ label, hours }) => [label, hours]), [["1h", 1], ["6h", 6], ["24h", 24], ["7d", 168]]);
});

test("device history URL encodes the real stable key and selected hours", () => {
  assert.equal(monitoringHistoryUrl("real device/one", 168), "/api/monitoring/history/real%20device%2Fone?hours=168");
});

test("sparse system telemetry preserves only actual chronological samples", () => {
  const data = systemChartData([
    { sampledAt: "2026-08-31T10:00:00.000Z", cpuUsagePercent: 12, memoryUsagePercent: 34, diskUsagePercent: 56, uptimeSeconds: "1" },
    { sampledAt: "2026-08-31T11:45:00.000Z", cpuUsagePercent: 13, memoryUsagePercent: 35, diskUsagePercent: 56, uptimeSeconds: "2" },
  ], 900);
  assert.deepEqual(data.map(({ timestamp, cpu }) => [timestamp, cpu]), [["2026-08-31T10:00:00.000Z", 12], ["2026-08-31T10:52:30.000Z", null], ["2026-08-31T11:45:00.000Z", 13]]);
  assert.equal(data.filter(({ cpu }) => cpu !== null).length, 2);
});

test("no system data produces no chart points", () => {
  assert.deepEqual(systemChartData([]), []);
});

test("network chart maps persisted inbound and outbound rates without totals", () => {
  assert.deepEqual(networkChartData([{ sampledAt: "2026-08-31T11:00:00.000Z", inboundBytesPerSecond: 1024, outboundBytesPerSecond: null, totalBytesReceived: "9007199254740993", totalBytesSent: "9007199254740994" }]), [{ timestamp: "2026-08-31T11:00:00.000Z", inbound: 1024, outbound: null }]);
});

test("service with observations exposes the latest state and chronological history", () => {
  const service: MonitoringHistoryService = { stableKey: "web", displayName: "Web", type: "http", observations: [{ status: "down", checkedAt: "2026-08-31T10:00:00.000Z", responseTimeMs: 50, httpStatusCode: 503 }, { status: "up", checkedAt: "2026-08-31T11:00:00.000Z", responseTimeMs: 12, httpStatusCode: 200 }] };
  const result = serviceHistoryPresentation(service);
  assert.equal(result.stateLabel, "UP");
  assert.deepEqual(result.observations.map(({ status }) => status), ["down", "up"]);
  assert.equal(result.latest?.responseTimeMs, 12);
});

test("service without observations remains represented as no data", () => {
  const result = serviceHistoryPresentation({ stableKey: "empty", displayName: "Empty", type: "https", observations: [] });
  assert.equal(result.stateLabel, "NO DATA");
  assert.equal(result.latest, null);
});

test("recovered alert presentation uses recovered time for duration", () => {
  const result = alertHistoryPresentation(recoveredAlert, history.window.to);
  assert.equal(result.active, false);
  assert.equal(result.durationSeconds, 1_800);
  assert.equal(result.status, "recovered");
});

test("active alert presentation measures through the response window end", () => {
  const result = alertHistoryPresentation({ ...recoveredAlert, id: "active", status: "active", recoveredAt: null }, "2026-08-31T12:00:00.000Z");
  assert.equal(result.active, true);
  assert.equal(result.durationSeconds, 7_200);
});

test("empty alert history remains empty", () => {
  assert.deepEqual(history.alerts, []);
});

test("failed history refresh retains the last successful response", () => {
  assert.deepEqual(retainLastGoodHistory({ data: history, refreshError: false }, null), { data: history, refreshError: true });
});

test("real persisted history remains separate from demo inventory", () => {
  assert.equal(mockNetworkDevices.some((device) => String(device.id) === history.device.stableKey), false);
  assert.equal(history.device.stableKey, "macbook-air");
});
