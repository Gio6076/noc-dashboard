import assert from "node:assert/strict";
import test from "node:test";
import { planAlertLifecycle, type ActiveAlertState } from "../lib/persistence/alert-lifecycle.ts";
import { evaluateMonitoringAlerts } from "../lib/monitoring-alerts.ts";
import type { AgentServiceCheck } from "../types/agent.ts";
import type { AgentDeviceSnapshot } from "../types/monitored-device.ts";

const observedAt = "2026-08-29T04:00:00.000Z";
const service = (status: "up" | "down"): AgentServiceCheck => ({
  name: "Local SSH", type: "tcp", status, host: "127.0.0.1", port: 22,
  responseTimeMs: status === "up" ? 2 : 0, checkedAt: observedAt,
});
function snapshot(overrides: Partial<AgentDeviceSnapshot> = {}): AgentDeviceSnapshot {
  return {
    device: { id: "device-one", displayName: "Device One", monitoringType: "agent", agentUrl: "http://127.0.0.1:8000", operationalState: "monitored", environment: "local" },
    availability: "online",
    health: { status: "ok" },
    system: { cpuUsagePercent: 10, memoryUsagePercent: 20, diskUsagePercent: 30, uptimeSeconds: 100, logicalCpuCount: 4 },
    network: { inboundBytesPerSecond: 1, outboundBytesPerSecond: 1, totalBytesReceived: 10, totalBytesSent: 10 },
    services: { collectedAt: observedAt, totalServices: 1, servicesUp: 1, servicesDown: 0, services: [service("up")] },
    endpointAvailability: { health: true, system: true, network: true, services: true },
    unavailableEndpoints: [], fetchedAt: observedAt, ...overrides,
  };
}
const active = (conditionKey: string): ActiveAlertState => ({ id: "occurrence-one", conditionKey, deviceStableKey: "device-one" });

test("clear to active opens once and repeated evidence updates the same instance", () => {
  const failing = snapshot({ services: { collectedAt: observedAt, totalServices: 1, servicesUp: 0, servicesDown: 1, services: [service("down")] } });
  const alerts = evaluateMonitoringAlerts([failing]);
  const first = planAlertLifecycle([], alerts, [failing]);
  assert.equal(first.open.length, 1);
  const repeated = planAlertLifecycle([active(alerts[0].id)], alerts, [failing]);
  assert.equal(repeated.open.length, 0);
  assert.equal(repeated.update[0].active.id, "occurrence-one");
});

test("service DOWN to UP recovers and a repeat outage opens a new occurrence", () => {
  const down = snapshot({ services: { collectedAt: observedAt, totalServices: 1, servicesUp: 0, servicesDown: 1, services: [service("down")] } });
  const condition = evaluateMonitoringAlerts([down])[0].id;
  const recovery = planAlertLifecycle([active(condition)], [], [snapshot()]);
  assert.deepEqual(recovery.recover.map((item) => item.id), ["occurrence-one"]);
  const repeated = planAlertLifecycle([], evaluateMonitoringAlerts([down]), [down]);
  assert.equal(repeated.open[0].id, condition);
});

test("missing service telemetry does not recover a service alert", () => {
  const condition = "service:device-one:tcp:127.0.0.1:22:down";
  const missing = snapshot({ availability: "partial", services: undefined, endpointAvailability: { health: true, system: true, network: true, services: false }, unavailableEndpoints: ["services"] });
  assert.equal(planAlertLifecycle([active(condition)], [], [missing]).recover.length, 0);
});

test("maintenance and disabled suppression do not prove recovery", () => {
  const condition = "agent:device-one:unreachable";
  for (const operationalState of ["maintenance", "disabled"] as const) {
    const suppressed = snapshot({ device: { ...snapshot().device, operationalState }, availability: operationalState === "disabled" ? "not-fetched" : "online" });
    assert.equal(planAlertLifecycle([active(condition)], [], [suppressed]).recover.length, 0);
  }
});

test("agent unreachable recovers only with a reachable observation", () => {
  const condition = "agent:device-one:unreachable";
  assert.equal(planAlertLifecycle([active(condition)], [], [snapshot()]).recover.length, 1);
  const unreachable = snapshot({ availability: "unreachable", health: undefined, system: undefined, network: undefined, services: undefined, endpointAvailability: { health: false, system: false, network: false, services: false }, unavailableEndpoints: ["health", "system", "network", "services"] });
  assert.equal(planAlertLifecycle([active(condition)], evaluateMonitoringAlerts([unreachable]), [unreachable]).recover.length, 0);
});

test("high thresholds recover only after successful normal system telemetry", () => {
  for (const [name, metric] of [["cpu", "cpuUsagePercent"], ["memory", "memoryUsagePercent"], ["disk", "diskUsagePercent"]] as const) {
    const condition = `system:device-one:${name}:high`;
    assert.equal(planAlertLifecycle([active(condition)], [], [snapshot()]).recover.length, 1);
    const missing = snapshot({ system: undefined, endpointAvailability: { health: true, system: false, network: true, services: true }, availability: "partial", unavailableEndpoints: ["system"] });
    assert.equal(planAlertLifecycle([active(condition)], [], [missing]).recover.length, 0, metric);
  }
});

test("partial telemetry recovers only when every endpoint is healthy", () => {
  const condition = "agent:device-one:partial-telemetry";
  const stillPartial = snapshot({ availability: "partial", network: undefined, endpointAvailability: { health: true, system: true, network: false, services: true }, unavailableEndpoints: ["network"] });
  assert.equal(planAlertLifecycle([active(condition)], evaluateMonitoringAlerts([stillPartial]), [stillPartial]).recover.length, 0);
  assert.equal(planAlertLifecycle([active(condition)], [], [snapshot()]).recover.length, 1);
});
