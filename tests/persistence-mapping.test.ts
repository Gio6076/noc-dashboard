import assert from "node:assert/strict";
import test from "node:test";
import { mapSnapshotForPersistence } from "../lib/persistence/mapping.ts";
import type { AgentDeviceSnapshot } from "../types/monitored-device.ts";

test("maps an agent snapshot without unsafe byte-counter narrowing", () => {
  const snapshot: AgentDeviceSnapshot = {
    device: { id: "device-one", displayName: "Device One", monitoringType: "agent", agentUrl: "http://127.0.0.1:8000", operationalState: "monitored", environment: "local" },
    availability: "partial",
    health: { status: "ok", hostname: "device-one", platform: "linux", platformRelease: "22", architecture: "x86_64" },
    system: { cpuUsagePercent: 10, memoryUsagePercent: 20, diskUsagePercent: 30, uptimeSeconds: 1000, logicalCpuCount: 8, memoryUsedBytes: 5_000_000_000, memoryTotalBytes: 10_000_000_000, diskUsedBytes: 20_000_000_000, diskTotalBytes: 40_000_000_000 },
    network: { inboundBytesPerSecond: 12.5, outboundBytesPerSecond: 8.5, totalBytesReceived: 9_000_000_000, totalBytesSent: 8_000_000_000 },
    endpointAvailability: { health: true, system: true, network: true, services: false },
    unavailableEndpoints: ["services"],
    fetchedAt: "2026-08-29T04:00:00.000Z",
  };
  const mapped = mapSnapshotForPersistence(snapshot);

  assert.equal(mapped.inventory?.platformRelease, "22");
  assert.equal(mapped.system?.memoryUsedBytes, BigInt(5_000_000_000));
  assert.equal(mapped.network?.bytesReceived, BigInt(9_000_000_000));
  assert.deepEqual(mapped.observation.unavailableEndpoints, ["services"]);
});
