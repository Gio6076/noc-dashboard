import "server-only";

import { connection } from "next/server";
import type {
  AgentHealth,
  AgentNetworkTelemetry,
  AgentSystemTelemetry,
} from "@/types/agent";
import { getEnabledMonitoredDevices } from "@/data/monitored-devices";
import type {
  AgentDeviceSnapshot,
  AgentEndpointName,
  MonitoredDevice,
} from "@/types/monitored-device";

const REQUEST_TIMEOUT_MS = 3_000;

type JsonObject = Record<string, unknown>;
function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nestedObject(value: JsonObject, key: string): JsonObject | undefined {
  return isObject(value[key]) ? value[key] : undefined;
}

function firstString(
  objects: readonly (JsonObject | undefined)[],
  keys: readonly string[],
): string | undefined {
  for (const object of objects) {
    for (const key of keys) {
      const value = object?.[key];
      if (typeof value === "string" && value.trim()) return value;
    }
  }
}

function firstNumber(
  objects: readonly (JsonObject | undefined)[],
  keys: readonly string[],
): number | undefined {
  for (const object of objects) {
    for (const key of keys) {
      const value = object?.[key];
      if (typeof value === "number" && Number.isFinite(value)) return value;
    }
  }
}

function requiredNumber(
  objects: readonly (JsonObject | undefined)[],
  keys: readonly string[],
): number {
  const value = firstNumber(objects, keys);
  if (value === undefined) throw new Error("Invalid agent response");
  return value;
}

function normalizeHealth(value: unknown): AgentHealth {
  if (!isObject(value)) throw new Error("Invalid agent response");

  const identity = nestedObject(value, "identity");
  const status = firstString([value], ["status", "health"]);
  if (!status) throw new Error("Invalid agent response");

  return {
    status,
    hostname: firstString([value, identity], ["hostname", "host_name"]),
    platform: firstString([value, identity], ["platform", "system", "os"]),
    architecture: firstString([value, identity], ["architecture", "arch", "machine"]),
  };
}

function normalizeSystem(value: unknown): AgentSystemTelemetry {
  if (!isObject(value)) throw new Error("Invalid agent response");

  const cpu = nestedObject(value, "cpu");
  const memory = nestedObject(value, "memory");
  const disk = nestedObject(value, "disk");
  const identity = nestedObject(value, "identity");

  return {
    hostname: firstString([value, identity], ["hostname", "host_name"]),
    platform: firstString([value, identity], ["platform", "system", "os"]),
    architecture: firstString([value, identity], ["architecture", "arch", "machine"]),
    cpuUsagePercent: requiredNumber([value, cpu], ["cpuUsagePercent", "cpu_usage_percent", "cpu_percent", "usage_percent", "percent"]),
    memoryUsagePercent: requiredNumber([value, memory], ["memoryUsagePercent", "memory_usage_percent", "memory_percent", "usage_percent", "percent"]),
    diskUsagePercent: requiredNumber([value, disk], ["diskUsagePercent", "disk_usage_percent", "disk_percent", "usage_percent", "percent"]),
    uptimeSeconds: requiredNumber([value], ["uptimeSeconds", "uptime_seconds", "uptime"]),
    logicalCpuCount: requiredNumber([value, cpu], ["cpuLogicalCount", "logicalCpuCount", "logical_cpu_count", "cpu_count_logical", "logical_count", "count"]),
  };
}

function normalizeNetwork(value: unknown): AgentNetworkTelemetry {
  if (!isObject(value)) throw new Error("Invalid agent response");

  const throughput = nestedObject(value, "throughput");
  const totals = nestedObject(value, "totals");
  const interfaces = nestedObject(value, "interfaces");
  const interfaceList = Array.isArray(value.interfaces)
    ? value.interfaces.filter(isObject)
    : [];
  const activeInterfaces = interfaceList.filter(
    (networkInterface) => networkInterface.isUp === true,
  );
  const primaryIpv4Address = activeInterfaces
    .flatMap((networkInterface) =>
      Array.isArray(networkInterface.ipv4Addresses)
        ? networkInterface.ipv4Addresses
        : [],
    )
    .find((address): address is string => typeof address === "string");

  return {
    inboundBytesPerSecond: requiredNumber([value, throughput], ["inboundBytesPerSecond", "inbound_bytes_per_second", "bytes_received_per_second", "bytes_recv_per_sec", "download_bytes_per_second", "inbound_bps"]),
    outboundBytesPerSecond: requiredNumber([value, throughput], ["outboundBytesPerSecond", "outbound_bytes_per_second", "bytes_sent_per_second", "bytes_sent_per_sec", "upload_bytes_per_second", "outbound_bps"]),
    totalBytesReceived: requiredNumber([value, totals], ["totalBytesReceived", "total_bytes_received", "bytes_received", "bytes_recv"]),
    totalBytesSent: requiredNumber([value, totals], ["totalBytesSent", "total_bytes_sent", "bytes_sent"]),
    primaryIpv4Address: firstString([value, interfaces], ["primaryIpv4Address", "primary_ipv4_address", "primary_ipv4", "ipv4_address", "ip_address"]) ?? primaryIpv4Address,
    activeInterfaceCount: firstNumber([value, interfaces], ["activeInterfaceCount", "active_interface_count", "active_interfaces_count", "active_count"]) ?? (interfaceList.length > 0 ? activeInterfaces.length : undefined),
  };
}

async function fetchEndpoint<T>(
  baseUrl: string,
  path: string,
  normalize: (value: unknown) => T,
): Promise<T | undefined> {
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) return undefined;
    return normalize(await response.json());
  } catch {
    return undefined;
  }
}

export async function fetchAgentSnapshot(
  device: MonitoredDevice,
): Promise<AgentDeviceSnapshot> {
  const [health, system, network] = await Promise.all([
    fetchEndpoint(device.agentUrl, "/health", normalizeHealth),
    fetchEndpoint(device.agentUrl, "/api/system", normalizeSystem),
    fetchEndpoint(device.agentUrl, "/api/network", normalizeNetwork),
  ]);
  const endpointAvailability = {
    health: health !== undefined,
    system: system !== undefined,
    network: network !== undefined,
  } satisfies Record<AgentEndpointName, boolean>;
  const unavailableEndpoints = (
    Object.entries(endpointAvailability) as [AgentEndpointName, boolean][]
  )
    .filter(([, available]) => !available)
    .map(([endpoint]) => endpoint);
  const availableEndpointCount = 3 - unavailableEndpoints.length;

  return {
    device,
    availability:
      availableEndpointCount === 0
        ? "unreachable"
        : availableEndpointCount === 3
          ? "online"
          : "partial",
    health,
    system,
    network,
    endpointAvailability,
    unavailableEndpoints,
    fetchedAt: new Date().toISOString(),
  };
}

export async function getMonitoredDeviceSnapshots(): Promise<
  readonly AgentDeviceSnapshot[]
> {
  await connection();

  return Promise.all(getEnabledMonitoredDevices().map(fetchAgentSnapshot));
}
