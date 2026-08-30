import assert from "node:assert/strict";
import test from "node:test";
import {
  createLiveMonitoringResponse,
  retainLastGoodMonitoringData,
} from "../lib/live-monitoring.ts";
import type { AgentDeviceSnapshot } from "../types/monitored-device.ts";
import type { RealMonitoringAlert } from "../types/monitoring-alert.ts";

const fetchedAt = "2026-08-29T04:00:00.000Z";
const snapshot: AgentDeviceSnapshot = {
  device: {
    id: "macbook-air",
    displayName: "MacBook Air",
    monitoringType: "agent",
    agentUrl: "http://secret-agent.local:8000",
    operationalState: "monitored",
    environment: "local",
  },
  availability: "online",
  services: {
    collectedAt: fetchedAt,
    totalServices: 1,
    servicesUp: 0,
    servicesDown: 1,
    services: [{
      name: "Local SSH",
      type: "tcp",
      status: "down",
      host: "192.168.1.10",
      port: 22,
      responseTimeMs: 0,
      checkedAt: fetchedAt,
    }],
  },
  endpointAvailability: { health: true, system: true, network: true, services: true },
  unavailableEndpoints: [],
  fetchedAt,
};
const alert: RealMonitoringAlert = {
  id: "service:macbook-air:tcp:local-ssh:down",
  deviceId: "macbook-air",
  deviceName: "MacBook Air",
  category: "service",
  severity: "critical",
  title: "Local SSH is DOWN",
  message: "Local SSH is DOWN on MacBook Air.",
  observedAt: fetchedAt,
  source: "agent-snapshot-evaluator",
};

test("live response strips agent and service target addresses", () => {
  const response = createLiveMonitoringResponse([snapshot], [alert], fetchedAt);
  const serialized = JSON.stringify(response);

  assert.equal(response.fetchedAt, fetchedAt);
  assert.equal(response.alerts[0].id, alert.id);
  assert.doesNotMatch(serialized, /secret-agent|192\.168\.1\.10|agentUrl|host|port/);
});

test("failed refresh retains the last successful response and marks it stale", () => {
  const data = createLiveMonitoringResponse([snapshot], [alert], fetchedAt);
  const state = retainLastGoodMonitoringData({ data, refreshError: false }, null);

  assert.strictEqual(state.data, data);
  assert.equal(state.refreshError, true);
});

test("successful refresh replaces stale data and clears the error", () => {
  const previous = createLiveMonitoringResponse([snapshot], [alert], fetchedAt);
  const next = createLiveMonitoringResponse([], [], "2026-08-29T04:00:10.000Z");
  const state = retainLastGoodMonitoringData(
    { data: previous, refreshError: true },
    next,
  );

  assert.strictEqual(state.data, next);
  assert.equal(state.refreshError, false);
});
