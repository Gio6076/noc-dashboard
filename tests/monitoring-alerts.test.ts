import assert from "node:assert/strict";
import test from "node:test";
import { evaluateMonitoringAlerts } from "../lib/monitoring-alerts.ts";
import type { AgentServiceCheck } from "../types/agent.ts";
import type { AgentDeviceSnapshot } from "../types/monitored-device.ts";

const observedAt = "2026-08-29T04:00:00.000Z";

function service(name: string, status: "up" | "down"): AgentServiceCheck {
  return {
    name,
    type: "tcp",
    status,
    host: "127.0.0.1",
    port: 22,
    responseTimeMs: status === "up" ? 4 : 0,
    checkedAt: observedAt,
  };
}

function snapshot(
  overrides: Partial<AgentDeviceSnapshot> = {},
): AgentDeviceSnapshot {
  return {
    device: {
      id: "device-one",
      displayName: "Device One",
      monitoringType: "agent",
      agentUrl: "http://127.0.0.1:8000",
      operationalState: "monitored",
      environment: "local",
    },
    availability: "online",
    health: { status: "ok" },
    system: {
      cpuUsagePercent: 20,
      memoryUsagePercent: 30,
      diskUsagePercent: 40,
      uptimeSeconds: 1_000,
      logicalCpuCount: 8,
    },
    network: {
      inboundBytesPerSecond: 10,
      outboundBytesPerSecond: 10,
      totalBytesReceived: 100,
      totalBytesSent: 100,
    },
    services: {
      collectedAt: observedAt,
      totalServices: 1,
      servicesUp: 1,
      servicesDown: 0,
      services: [service("Healthy Service", "up")],
    },
    endpointAvailability: {
      health: true,
      system: true,
      network: true,
      services: true,
    },
    unavailableEndpoints: [],
    fetchedAt: observedAt,
    ...overrides,
  };
}

test("healthy online device produces no alerts", () => {
  assert.deepEqual(evaluateMonitoringAlerts([snapshot()]), []);
});

test("unreachable device produces exactly one critical agent alert", () => {
  const alerts = evaluateMonitoringAlerts([
    snapshot({ availability: "unreachable" }),
  ]);
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].category, "agent");
  assert.equal(alerts[0].severity, "critical");
});

test("maintenance and availability remain separate state dimensions", () => {
  const maintenanceSnapshot = snapshot({
    device: {
      ...snapshot().device,
      operationalState: "maintenance",
    },
    availability: "unreachable",
  });

  assert.equal(maintenanceSnapshot.device.operationalState, "maintenance");
  assert.equal(maintenanceSnapshot.availability, "unreachable");
  assert.deepEqual(evaluateMonitoringAlerts([maintenanceSnapshot]), []);
});

test("maintenance suppresses down service alerts", () => {
  const alerts = evaluateMonitoringAlerts([
    snapshot({
      device: { ...snapshot().device, operationalState: "maintenance" },
      services: { collectedAt: observedAt, totalServices: 1, servicesUp: 0, servicesDown: 1, services: [service("SSH", "down")] },
    }),
  ]);
  assert.deepEqual(alerts, []);
});

test("maintenance suppresses CPU warnings", () => {
  const alerts = evaluateMonitoringAlerts([
    snapshot({
      device: { ...snapshot().device, operationalState: "maintenance" },
      system: { ...snapshot().system!, cpuUsagePercent: 90 },
    }),
  ]);
  assert.deepEqual(alerts, []);
});

test("disabled not-fetched device produces no alerts", () => {
  const alerts = evaluateMonitoringAlerts([
    snapshot({
      device: { ...snapshot().device, operationalState: "disabled" },
      availability: "not-fetched",
      health: undefined,
      system: undefined,
      network: undefined,
      services: undefined,
    }),
  ]);
  assert.deepEqual(alerts, []);
});

test("partial device produces one aggregate warning", () => {
  const alerts = evaluateMonitoringAlerts([
    snapshot({
      availability: "partial",
      network: undefined,
      endpointAvailability: { health: true, system: true, network: false, services: true },
      unavailableEndpoints: ["network"],
    }),
  ]);
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].category, "endpoint");
  assert.match(alerts[0].message, /network unavailable/);
});

test("one down service produces one critical service alert", () => {
  const alerts = evaluateMonitoringAlerts([
    snapshot({ services: { collectedAt: observedAt, totalServices: 1, servicesUp: 0, servicesDown: 1, services: [service("SSH", "down")] } }),
  ]);
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].severity, "critical");
  assert.equal(alerts[0].serviceName, "SSH");
});

test("multiple down services produce one alert per service", () => {
  const alerts = evaluateMonitoringAlerts([
    snapshot({ services: { collectedAt: observedAt, totalServices: 2, servicesUp: 0, servicesDown: 2, services: [service("SSH", "down"), service("Database", "down")] } }),
  ]);
  assert.equal(alerts.length, 2);
  assert.deepEqual(alerts.map((alert) => alert.serviceName), ["SSH", "Database"]);
});

test("CPU exactly 90 percent produces a warning", () => {
  const alerts = evaluateMonitoringAlerts([
    snapshot({ system: { ...snapshot().system!, cpuUsagePercent: 90 } }),
  ]);
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].metric, "cpuUsagePercent");
  assert.equal(alerts[0].severity, "warning");
});

test("CPU at 89.9 percent produces no CPU warning", () => {
  const alerts = evaluateMonitoringAlerts([
    snapshot({ system: { ...snapshot().system!, cpuUsagePercent: 89.9 } }),
  ]);
  assert.equal(alerts.some((alert) => alert.metric === "cpuUsagePercent"), false);
});

test("memory at or above 90 percent produces a warning", () => {
  const alerts = evaluateMonitoringAlerts([
    snapshot({ system: { ...snapshot().system!, memoryUsagePercent: 91 } }),
  ]);
  assert.equal(alerts[0].metric, "memoryUsagePercent");
  assert.equal(alerts[0].severity, "warning");
});

test("disk at or above 90 percent produces a critical alert", () => {
  const alerts = evaluateMonitoringAlerts([
    snapshot({ system: { ...snapshot().system!, diskUsagePercent: 90 } }),
  ]);
  assert.equal(alerts[0].metric, "diskUsagePercent");
  assert.equal(alerts[0].severity, "critical");
});

test("unreachable device suppresses endpoint, service, and metric alert storms", () => {
  const alerts = evaluateMonitoringAlerts([
    snapshot({
      availability: "unreachable",
      unavailableEndpoints: ["health", "system", "network", "services"],
      services: { collectedAt: observedAt, totalServices: 1, servicesUp: 0, servicesDown: 1, services: [service("SSH", "down")] },
      system: { ...snapshot().system!, cpuUsagePercent: 99, memoryUsagePercent: 99, diskUsagePercent: 99 },
    }),
  ]);
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].id, "agent:device-one:unreachable");
});

test("partial device with a down service produces both alerts", () => {
  const alerts = evaluateMonitoringAlerts([
    snapshot({
      availability: "partial",
      network: undefined,
      endpointAvailability: { health: true, system: true, network: false, services: true },
      unavailableEndpoints: ["network"],
      services: { collectedAt: observedAt, totalServices: 1, servicesUp: 0, servicesDown: 1, services: [service("SSH", "down")] },
    }),
  ]);
  assert.deepEqual(alerts.map((alert) => alert.category), ["endpoint", "service"]);
});

test("the same current condition produces a deterministic alert ID", () => {
  const first = evaluateMonitoringAlerts([snapshot({ availability: "unreachable" })]);
  const second = evaluateMonitoringAlerts([snapshot({ availability: "unreachable", fetchedAt: "2026-08-29T05:00:00.000Z" })]);
  assert.equal(first[0].id, second[0].id);
});
