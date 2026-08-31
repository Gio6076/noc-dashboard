import assert from "node:assert/strict";
import test from "node:test";
import { mockNetworkDevices } from "../data/mock-devices.ts";
import {
  evaluatePersistedMonitoringCapability,
  monitoringCapabilityPresentation,
  monitoringCapabilityApiError,
  parsePersistedMonitoringFlag,
  resolvePersistedMonitoringConfiguration,
} from "../lib/monitoring-capability.ts";
import { applyPersistedMonitoringRefresh, persistedActiveAlerts } from "../lib/persisted-monitoring-ui.ts";
import type { PersistedMonitoringState } from "../types/persisted-monitoring.ts";

const emptyPersistedState: PersistedMonitoringState = {
  collection: { latestCollectionAt: null, freshness: { status: "unavailable", ageSeconds: null } },
  devices: [],
};

test("persisted monitoring is enabled only by the exact true value", () => {
  assert.equal(parsePersistedMonitoringFlag("true"), "enabled");
  assert.equal(resolvePersistedMonitoringConfiguration("true", "postgresql://configured").status, "enabled");
});

test("explicit false, missing, and invalid flags use the safe disabled default", () => {
  for (const value of ["false", undefined, "TRUE", "1", "invalid"]) {
    assert.equal(resolvePersistedMonitoringConfiguration(value, "postgresql://configured").status, "disabled");
  }
});

test("disabled monitoring never evaluates or requires a database URL", async () => {
  let reads = 0;
  const result = await evaluatePersistedMonitoringCapability(
    resolvePersistedMonitoringConfiguration("false", undefined),
    async () => { reads += 1; return emptyPersistedState; },
  );
  assert.deepEqual(result, { status: "disabled" });
  assert.equal(reads, 0);
});

test("enabled monitoring without DATABASE_URL is unavailable without reading", async () => {
  let reads = 0;
  const result = await evaluatePersistedMonitoringCapability(
    resolvePersistedMonitoringConfiguration("true", undefined),
    async () => { reads += 1; return emptyPersistedState; },
  );
  assert.deepEqual(result, { status: "unavailable" });
  assert.equal(reads, 0);
});

test("database failure maps to sanitized backend unavailability, not device or alert state", async () => {
  const result = await evaluatePersistedMonitoringCapability(
    resolvePersistedMonitoringConfiguration("true", "postgresql://private:secret@internal/db"),
    async () => { throw new Error("connect ECONNREFUSED postgresql://private:secret@internal/db SQL SELECT"); },
  );
  assert.deepEqual(result, { status: "unavailable" });
  assert.doesNotMatch(JSON.stringify(result), /postgres|private|secret|SQL|unreachable/);
  assert.equal("data" in result, false);
});

test("successful local read preserves the existing persisted contract", async () => {
  const result = await evaluatePersistedMonitoringCapability(
    resolvePersistedMonitoringConfiguration("true", "postgresql://configured"),
    async () => emptyPersistedState,
  );
  assert.deepEqual(result, { status: "available", data: emptyPersistedState });
  assert.deepEqual(persistedActiveAlerts(result.status === "available" ? result.data.devices : []), []);
});

test("disabled and unavailable presentations are intentional and keep demo content viable", () => {
  assert.match(monitoringCapabilityPresentation.disabled.description, /private monitoring lab/i);
  assert.match(monitoringCapabilityPresentation.disabled.description, /demo NOC below remains fully interactive/i);
  assert.match(monitoringCapabilityPresentation.unavailable.description, /temporarily unavailable/i);
  assert.ok(mockNetworkDevices.length > 0);
});

test("a client without prior success shows unavailable and fabricates no data", () => {
  assert.deepEqual(applyPersistedMonitoringRefresh({ data: null, capability: "unavailable", refreshError: false }, null), {
    data: null, capability: "unavailable", refreshError: true,
  });
});

test("a client with prior success retains previous data after refresh failure", () => {
  const result = applyPersistedMonitoringRefresh({ data: emptyPersistedState, capability: "available", refreshError: false }, null);
  assert.strictEqual(result.data, emptyPersistedState);
  assert.equal(result.refreshError, true);
});

test("current, history, and reliability APIs have sanitized disabled and unavailable contracts", () => {
  for (const surface of ["current", "history", "reliability"] as const) {
    for (const status of ["disabled", "unavailable"] as const) {
      const response = monitoringCapabilityApiError(status, surface);
      assert.equal(response.capability, status);
      assert.doesNotMatch(JSON.stringify(response), /DATABASE_URL|postgres|SQL|localhost|192\.168|stack|credential/i);
      assert.notEqual(response.error, "");
    }
  }
});
