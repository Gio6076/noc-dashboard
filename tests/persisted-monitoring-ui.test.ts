import assert from "node:assert/strict";
import test from "node:test";
import { mockNetworkDevices } from "../data/mock-devices.ts";
import { formatBytes, formatUptime } from "../lib/formatters.ts";
import {
  collectionFreshnessLabel,
  persistedActiveAlerts,
  persistedDevicePresentation,
  retainLastGoodPersistedMonitoringData,
} from "../lib/persisted-monitoring-ui.ts";
import type { PersistedDeviceCurrentState, PersistedMonitoringState } from "../types/persisted-monitoring.ts";

function device(overrides: Partial<PersistedDeviceCurrentState> = {}): PersistedDeviceCurrentState {
  return {
    device: { id: "database-id", stableKey: "device-one", displayName: "Device One", operationalState: "monitored", monitoringType: "agent" },
    latestObservation: { availability: "online", observedAt: "2026-08-31T12:00:00.000Z", unavailableEndpoints: [], collectionRunId: "run" },
    system: { observedAt: "2026-08-31T12:00:00.000Z", freshness: { status: "fresh", ageSeconds: 12 }, cpuUsagePercent: 31, memoryUsagePercent: 48, memoryUsedBytes: null, memoryTotalBytes: null, diskUsagePercent: 62, diskUsedBytes: null, diskTotalBytes: null, uptimeSeconds: "9007199254740993" },
    network: null,
    services: [],
    alerts: [],
    ...overrides,
  };
}

test("fresh online persisted device is presented as current", () => {
  const presentation = persistedDevicePresentation(device());
  assert.equal(presentation.availabilityLabel, "AGENT ONLINE");
  assert.equal(presentation.systemTelemetryLabel, "Current sample · 12s ago");
});

test("unreachable device retains explicitly stale last-known telemetry", () => {
  const value = device({
    latestObservation: { availability: "unreachable", observedAt: "2026-08-31T12:04:00.000Z", unavailableEndpoints: ["system"], collectionRunId: "later" },
    system: { ...device().system!, freshness: { status: "stale", ageSeconds: 240 } },
  });
  const presentation = persistedDevicePresentation(value);
  assert.equal(presentation.availabilityLabel, "AGENT UNREACHABLE");
  assert.equal(presentation.systemTelemetryLabel, "Last known telemetry · 4m ago");
  assert.equal(value.system?.cpuUsagePercent, 31);
});

test("no historical telemetry is explicit and maintenance remains distinct from unreachable", () => {
  const value = device({ device: { ...device().device, operationalState: "maintenance" }, latestObservation: { availability: "unreachable", observedAt: "2026-08-31T12:00:00.000Z", unavailableEndpoints: [], collectionRunId: null }, system: null });
  const presentation = persistedDevicePresentation(value);
  assert.equal(presentation.operationalState, "maintenance");
  assert.equal(presentation.availability, "unreachable");
  assert.equal(presentation.systemTelemetryLabel, "Telemetry unavailable");
});

test("collection labels distinguish stale and unavailable", () => {
  assert.equal(collectionFreshnessLabel({ collection: { latestCollectionAt: "2026-08-31T12:00:00.000Z", freshness: { status: "stale", ageSeconds: 241 } }, devices: [] }), "Monitoring data stale · last updated 4m ago");
  assert.equal(collectionFreshnessLabel({ collection: { latestCollectionAt: null, freshness: { status: "unavailable", ageSeconds: null } }, devices: [] }), "No persisted collection data");
});

test("active persisted alerts include device presentation and empty state stays empty", () => {
  const alert = { id: "alert", conditionKey: "condition", serviceStableKey: null, category: "system" as const, severity: "warning" as const, title: "CPU", message: "High", firstObservedAt: "2026-08-31T12:00:00.000Z", lastObservedAt: "2026-08-31T12:01:00.000Z", observationCount: 3, currentValue: 95, threshold: 90 };
  assert.deepEqual(persistedActiveAlerts([device({ alerts: [alert] })]).map(({ id, deviceName }) => ({ id, deviceName })), [{ id: "alert", deviceName: "Device One" }]);
  assert.deepEqual(persistedActiveAlerts([device()]), []);
});

test("temporary API failure retains the last successful persisted response", () => {
  const data: PersistedMonitoringState = { collection: { latestCollectionAt: null, freshness: { status: "unavailable", ageSeconds: null } }, devices: [device()] };
  assert.deepEqual(retainLastGoodPersistedMonitoringData({ data, refreshError: false }, null), { data, refreshError: true });
});

test("decimal bigint formatting never narrows through Number", () => {
  assert.equal(formatBytes("9007199254740993"), "8.0 PB");
  assert.equal(formatUptime("9007199254740993"), "104249991374d 7h");
});

test("demo inventory remains a separate unchanged fixture", () => {
  assert.ok(mockNetworkDevices.length > 0);
  assert.equal(mockNetworkDevices.some((entry) => String(entry.id) === "database-id"), false);
});
