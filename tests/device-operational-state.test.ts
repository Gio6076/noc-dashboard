import assert from "node:assert/strict";
import test from "node:test";
import { monitoredDeviceOperationalStates } from "../data/monitored-device-operational-states.ts";
import { shouldFetchMonitoredDevice } from "../lib/device-operational-state.ts";
import type {
  MonitoredDevice,
  MonitoredDeviceOperationalState,
} from "../types/monitored-device.ts";

function device(
  operationalState: MonitoredDeviceOperationalState,
): MonitoredDevice {
  return {
    id: `device-${operationalState}`,
    displayName: `Device ${operationalState}`,
    monitoringType: "agent",
    agentUrl: "http://127.0.0.1:8000",
    operationalState,
    environment: "local",
  };
}

test("monitored and maintenance devices are fetched", () => {
  assert.equal(shouldFetchMonitoredDevice(device("monitored")), true);
  assert.equal(shouldFetchMonitoredDevice(device("maintenance")), true);
});

test("disabled devices skip agent fetching", () => {
  let fetchAttempts = 0;
  const disabled = device("disabled");

  if (shouldFetchMonitoredDevice(disabled)) fetchAttempts += 1;

  assert.equal(fetchAttempts, 0);
});

test("current Mac remains monitored and Acer is in maintenance", () => {
  assert.equal(monitoredDeviceOperationalStates["macbook-air"], "monitored");
  assert.equal(
    monitoredDeviceOperationalStates["linux-mint-acer"],
    "maintenance",
  );
});
