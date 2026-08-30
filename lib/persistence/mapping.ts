import type { AgentDeviceSnapshot } from "@/types/monitored-device";
import { normalizeServiceUrl, serviceStableKey } from "./identity.ts";

const toBigInt = (value: number | undefined) =>
  value === undefined ? null : BigInt(Math.trunc(value));

export function mapSnapshotForPersistence(snapshot: AgentDeviceSnapshot) {
  const observedAt = new Date(snapshot.fetchedAt);
  return {
    observation: {
      observedAt,
      availability: snapshot.availability,
      operationalState: snapshot.device.operationalState,
      unavailableEndpoints: [...snapshot.unavailableEndpoints].sort(),
    },
    inventory:
      (snapshot.health?.hostname ?? snapshot.system?.hostname) &&
      (snapshot.health?.platform ?? snapshot.system?.platform) &&
      (snapshot.health?.architecture ?? snapshot.system?.architecture)
        ? {
            hostname: (snapshot.health?.hostname ?? snapshot.system?.hostname)!,
            platform: (snapshot.health?.platform ?? snapshot.system?.platform)!,
            platformRelease: snapshot.health?.platformRelease ?? null,
            architecture: (snapshot.health?.architecture ?? snapshot.system?.architecture)!,
            logicalCpuCount: snapshot.system?.logicalCpuCount ?? null,
            observedAt,
          }
        : null,
    system: snapshot.system
      ? {
          observedAt,
          cpuUsagePercent: snapshot.system.cpuUsagePercent.toString(),
          memoryUsagePercent: snapshot.system.memoryUsagePercent.toString(),
          memoryUsedBytes: toBigInt(snapshot.system.memoryUsedBytes),
          memoryTotalBytes: toBigInt(snapshot.system.memoryTotalBytes),
          diskUsagePercent: snapshot.system.diskUsagePercent.toString(),
          diskUsedBytes: toBigInt(snapshot.system.diskUsedBytes),
          diskTotalBytes: toBigInt(snapshot.system.diskTotalBytes),
          uptimeSeconds: BigInt(Math.trunc(snapshot.system.uptimeSeconds)),
        }
      : null,
    network: snapshot.network
      ? {
          observedAt,
          inboundBytesPerSecond: snapshot.network.inboundBytesPerSecond,
          outboundBytesPerSecond: snapshot.network.outboundBytesPerSecond,
          bytesReceived: BigInt(Math.trunc(snapshot.network.totalBytesReceived)),
          bytesSent: BigInt(Math.trunc(snapshot.network.totalBytesSent)),
        }
      : null,
    services: (snapshot.services?.services ?? []).map((service) => ({
      definition: {
        stableKey: serviceStableKey(service),
        name: service.name,
        type: service.type,
        enabled: true,
        host: service.type === "tcp" ? service.host.trim().toLowerCase() : null,
        port: service.type === "tcp" ? service.port : null,
        url: service.type === "tcp" ? null : normalizeServiceUrl(service.url),
      },
      observation: {
        observedAt: new Date(service.checkedAt),
        status: service.status,
        responseTimeMs: service.responseTimeMs,
        httpStatusCode: service.type === "tcp" ? null : service.httpStatusCode,
      },
    })),
  };
}
