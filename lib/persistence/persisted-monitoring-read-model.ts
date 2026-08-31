import type {
  PersistedDataFreshness,
  PersistedFreshness,
  PersistedMonitoringState,
} from "../../types/persisted-monitoring.ts";
import type { PersistedMonitoringRows } from "../server/repositories/monitoring-read-repository.ts";
import type { AgentEndpointName } from "../../types/monitored-device.ts";

export const PERSISTED_MONITORING_FRESHNESS_SECONDS = 60;

export function getPersistedFreshness(
  sampledAt: Date | null,
  now: Date,
): PersistedFreshness {
  if (!sampledAt) return { status: "unavailable", ageSeconds: null };
  const ageSeconds = Math.max(0, Math.floor((now.getTime() - sampledAt.getTime()) / 1_000));
  const status: PersistedDataFreshness =
    ageSeconds <= PERSISTED_MONITORING_FRESHNESS_SECONDS ? "fresh" : "stale";
  return { status, ageSeconds };
}

const iso = (value: Date) => value.toISOString();
const bigintString = (value: bigint | null) => value === null ? null : value.toString();
const endpointNames = new Set<AgentEndpointName>(["health", "system", "network", "services"]);

export function selectLatestByIdentity<T extends { id: string; observedAt: Date }, K>(
  values: readonly T[],
  identity: (value: T) => K,
): Map<K, T> {
  const latest = new Map<K, T>();
  for (const value of values) {
    const current = latest.get(identity(value));
    if (!current || value.observedAt > current.observedAt ||
      (value.observedAt.getTime() === current.observedAt.getTime() && value.id > current.id)) {
      latest.set(identity(value), value);
    }
  }
  return latest;
}

export function assemblePersistedMonitoringState(
  rows: PersistedMonitoringRows,
  now = new Date(),
): PersistedMonitoringState {
  const observations = selectLatestByIdentity(rows.latestObservations, (row) => row.deviceId);
  const systems = selectLatestByIdentity(rows.latestSystemSamples, (row) => row.deviceId);
  const networks = selectLatestByIdentity(rows.latestNetworkSamples, (row) => row.deviceId);
  const services = new Map<string, typeof rows.services>();
  const alerts = new Map<string, typeof rows.activeAlerts>();

  const latestServices = selectLatestByIdentity(
    rows.services.filter((row): row is typeof row & { observedAt: Date } => row.observedAt !== null),
    (row) => row.id,
  );
  for (const row of rows.services) {
    const selected = row.observedAt ? latestServices.get(row.id) : row;
    if (selected !== row) continue;
    services.set(row.deviceId, [...(services.get(row.deviceId) ?? []), row]);
  }
  for (const row of rows.activeAlerts) {
    if (row.status !== "active") continue;
    alerts.set(row.deviceId, [...(alerts.get(row.deviceId) ?? []), row]);
  }

  return {
    collection: {
      latestCollectionAt: rows.latestCollectionAt ? iso(rows.latestCollectionAt) : null,
      freshness: getPersistedFreshness(rows.latestCollectionAt, now),
    },
    devices: rows.devices.map((device) => {
      const observation = observations.get(device.id);
      const system = systems.get(device.id);
      const network = networks.get(device.id);
      return {
        device: {
          id: device.id,
          stableKey: device.stableKey,
          displayName: device.displayName,
          operationalState: device.operationalState,
          monitoringType: device.monitoringType,
        },
        latestObservation: observation ? {
          availability: observation.availability,
          observedAt: iso(observation.observedAt),
          unavailableEndpoints: observation.unavailableEndpoints.filter(
            (name): name is AgentEndpointName => endpointNames.has(name as AgentEndpointName),
          ),
          collectionRunId: observation.collectionRunId,
        } : null,
        system: system ? {
          observedAt: iso(system.observedAt),
          freshness: getPersistedFreshness(system.observedAt, now),
          cpuUsagePercent: Number(system.cpuUsagePercent),
          memoryUsagePercent: Number(system.memoryUsagePercent),
          memoryUsedBytes: bigintString(system.memoryUsedBytes),
          memoryTotalBytes: bigintString(system.memoryTotalBytes),
          diskUsagePercent: Number(system.diskUsagePercent),
          diskUsedBytes: bigintString(system.diskUsedBytes),
          diskTotalBytes: bigintString(system.diskTotalBytes),
          uptimeSeconds: system.uptimeSeconds.toString(),
        } : null,
        network: network ? {
          observedAt: iso(network.observedAt),
          freshness: getPersistedFreshness(network.observedAt, now),
          inboundBytesPerSecond: network.inboundBytesPerSecond,
          outboundBytesPerSecond: network.outboundBytesPerSecond,
          bytesReceived: network.bytesReceived.toString(),
          bytesSent: network.bytesSent.toString(),
        } : null,
        services: (services.get(device.id) ?? []).map((service) => ({
          stableKey: service.stableKey,
          displayName: service.name,
          type: service.type,
          enabled: service.enabled,
          latestObservation: service.observedAt && service.status ? {
            status: service.status,
            checkedAt: iso(service.observedAt),
            responseTimeMs: service.responseTimeMs,
            httpStatusCode: service.httpStatusCode,
          } : null,
        })),
        alerts: (alerts.get(device.id) ?? []).map((alert) => ({
          id: alert.id,
          conditionKey: alert.conditionKey,
          serviceStableKey: alert.serviceStableKey,
          category: alert.category,
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          firstObservedAt: iso(alert.firstObservedAt),
          lastObservedAt: iso(alert.lastObservedAt),
          observationCount: alert.observationCount,
          currentValue: alert.currentValue,
          threshold: alert.threshold,
        })),
      };
    }),
  };
}
