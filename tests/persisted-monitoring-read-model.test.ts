import assert from "node:assert/strict";
import test from "node:test";
import {
  assemblePersistedMonitoringState,
  getPersistedFreshness,
  selectLatestByIdentity,
} from "../lib/persistence/persisted-monitoring-read-model.ts";
import type { PersistedMonitoringRows } from "../lib/server/repositories/monitoring-read-repository.ts";

const now = new Date("2026-08-31T12:01:01.000Z");

test("freshness has explicit inclusive boundary and unavailable state", () => {
  assert.deepEqual(getPersistedFreshness(new Date("2026-08-31T12:00:01.000Z"), now), {
    status: "fresh", ageSeconds: 60,
  });
  assert.deepEqual(getPersistedFreshness(new Date("2026-08-31T12:00:00.000Z"), now), {
    status: "stale", ageSeconds: 61,
  });
  assert.deepEqual(getPersistedFreshness(null, now), { status: "unavailable", ageSeconds: null });
});

test("timestamp ties select the lexically greatest stable row id", () => {
  const observedAt = new Date("2026-08-31T12:00:00.000Z");
  const selected = selectLatestByIdentity([
    { id: "observation-a", deviceId: "device", observedAt, value: "online" },
    { id: "observation-b", deviceId: "device", observedAt, value: "unreachable" },
  ], (row) => row.deviceId);
  assert.equal(selected.get("device")?.value, "unreachable");
});

test("assembles current observations independently from last-known telemetry and lifecycle state", () => {
  const rows = {
    devices: [{
      id: "device-1", stableKey: "linux-mint-acer", displayName: "Linux Mint Acer",
      monitoringType: "agent", operationalState: "maintenance", expectedHostname: null,
      environment: "local", createdAt: now, updatedAt: now,
    }],
    latestObservations: [
      { id: "obs-old", deviceId: "device-1", collectionRunId: "run-old", observedAt: new Date("2026-08-31T12:00:00.000Z"), availability: "online", operationalState: "maintenance", unavailableEndpoints: [] },
      { id: "obs-new", deviceId: "device-1", collectionRunId: "run-new", observedAt: new Date("2026-08-31T12:01:00.000Z"), availability: "unreachable", operationalState: "maintenance", unavailableEndpoints: ["health", "system", "network", "services"] },
    ],
    latestSystemSamples: [{
      id: "system-1", deviceId: "device-1", collectionRunId: "run-old", observedAt: new Date("2026-08-31T11:59:00.000Z"),
      cpuUsagePercent: "10.000", memoryUsagePercent: "20.000", memoryUsedBytes: BigInt("9007199254740993"),
      memoryTotalBytes: BigInt("18014398509481986"), diskUsagePercent: "30.000", diskUsedBytes: null,
      diskTotalBytes: null, uptimeSeconds: BigInt("9999999999999999"),
    }],
    latestNetworkSamples: [{
      id: "network-1", deviceId: "device-1", collectionRunId: "run-old", observedAt: new Date("2026-08-31T12:00:30.000Z"),
      inboundBytesPerSecond: 12, outboundBytesPerSecond: 8, bytesReceived: BigInt("9007199254740993"),
      bytesSent: BigInt("9007199254740995"),
    }],
    services: [
      { id: "service-empty", deviceId: "device-1", stableKey: "tcp:empty:1", name: "Never checked", type: "tcp", enabled: true, observedAt: null, status: null, responseTimeMs: null, httpStatusCode: null },
      { id: "service-web", deviceId: "device-1", stableKey: "https:web:443:/", name: "Web", type: "https", enabled: true, observedAt: new Date("2026-08-31T12:00:00.000Z"), status: "down", responseTimeMs: 50, httpStatusCode: 503 },
      { id: "service-web", deviceId: "device-1", stableKey: "https:web:443:/", name: "Web", type: "https", enabled: true, observedAt: new Date("2026-08-31T12:00:30.000Z"), status: "up", responseTimeMs: 20, httpStatusCode: 200 },
    ],
    activeAlerts: [
      { id: "alert-active", conditionKey: "device:agent", deviceId: "device-1", serviceStableKey: null, category: "agent", severity: "critical", title: "Unreachable", message: "Agent unreachable", status: "active", firstObservedAt: now, lastObservedAt: now, observationCount: 2, currentValue: null, threshold: null },
      { id: "alert-recovered", conditionKey: "device:old", deviceId: "device-1", serviceStableKey: null, category: "system", severity: "warning", title: "Old", message: "Recovered", status: "recovered", firstObservedAt: now, lastObservedAt: now, observationCount: 1, currentValue: null, threshold: null },
    ],
    latestCollectionAt: new Date("2026-08-31T12:00:30.000Z"),
  } as unknown as PersistedMonitoringRows;

  const state = assemblePersistedMonitoringState(rows, now);
  const device = state.devices[0];
  assert.equal(device.device.operationalState, "maintenance");
  assert.equal(device.latestObservation?.availability, "unreachable");
  assert.equal(device.latestObservation?.observedAt, "2026-08-31T12:01:00.000Z");
  assert.equal(device.system?.observedAt, "2026-08-31T11:59:00.000Z");
  assert.equal(device.system?.freshness.status, "stale");
  assert.equal(device.network?.freshness.status, "fresh");
  assert.equal(device.services.find((service) => service.stableKey === "tcp:empty:1")?.latestObservation, null);
  assert.equal(device.services.find((service) => service.stableKey === "https:web:443:/")?.latestObservation?.status, "up");
  assert.deepEqual(device.alerts.map((alert) => alert.id), ["alert-active"]);
  assert.deepEqual(state.collection.freshness, { status: "fresh", ageSeconds: 31 });
  assert.doesNotThrow(() => JSON.stringify(state));
  assert.match(JSON.stringify(state), /9007199254740993/);
});

test("collection freshness is unavailable before any successful or partial run", () => {
  const rows = {
    devices: [], latestObservations: [], latestSystemSamples: [], latestNetworkSamples: [],
    services: [], activeAlerts: [], latestCollectionAt: null,
  } as unknown as PersistedMonitoringRows;
  assert.deepEqual(assemblePersistedMonitoringState(rows, now).collection, {
    latestCollectionAt: null,
    freshness: { status: "unavailable", ageSeconds: null },
  });
});
