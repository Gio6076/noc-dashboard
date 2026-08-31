import type { MonitoringHistory } from "../types/monitoring-history.ts";
import type { MonitoringHistoryRows } from "./server/repositories/monitoring-history-repository.ts";
import { serializeMonitoringHistoryWindow } from "./monitoring-history-window.ts";

type TimestampedRow = { id: string; observedAt: Date };

function chronological<T extends TimestampedRow>(rows: readonly T[]): T[] {
  return [...rows].sort((left, right) =>
    left.observedAt.getTime() - right.observedAt.getTime() || left.id.localeCompare(right.id));
}

export function alertOverlapsMonitoringWindow(
  alert: { firstObservedAt: Date; recoveredAt: Date | null },
  window: { from: Date; to: Date },
): boolean {
  return alert.firstObservedAt <= window.to &&
    (alert.recoveredAt === null || alert.recoveredAt >= window.from);
}

export function assembleMonitoringHistory(
  rows: MonitoringHistoryRows,
  window: { from: Date; to: Date; durationSeconds: number },
): MonitoringHistory | null {
  if (!rows.device) return null;

  const observationsByService = new Map<string, typeof rows.serviceObservations>();
  for (const observation of chronological(rows.serviceObservations)) {
    observationsByService.set(observation.serviceId, [
      ...(observationsByService.get(observation.serviceId) ?? []),
      observation,
    ]);
  }

  return {
    device: {
      stableKey: rows.device.stableKey,
      displayName: rows.device.displayName,
      operationalState: rows.device.operationalState,
      monitoringType: rows.device.monitoringType,
    },
    window: serializeMonitoringHistoryWindow(window),
    system: chronological(rows.systemSamples).map((sample) => ({
      sampledAt: sample.observedAt.toISOString(),
      cpuUsagePercent: Number(sample.cpuUsagePercent),
      memoryUsagePercent: Number(sample.memoryUsagePercent),
      diskUsagePercent: Number(sample.diskUsagePercent),
      uptimeSeconds: sample.uptimeSeconds.toString(),
    })),
    network: chronological(rows.networkSamples).map((sample) => ({
      sampledAt: sample.observedAt.toISOString(),
      inboundBytesPerSecond: sample.inboundBytesPerSecond,
      outboundBytesPerSecond: sample.outboundBytesPerSecond,
      totalBytesReceived: sample.bytesReceived.toString(),
      totalBytesSent: sample.bytesSent.toString(),
    })),
    services: rows.services.map((service) => ({
      stableKey: service.stableKey,
      displayName: service.name,
      type: service.type,
      observations: (observationsByService.get(service.id) ?? []).map((observation) => ({
        status: observation.status,
        checkedAt: observation.observedAt.toISOString(),
        responseTimeMs: observation.responseTimeMs,
        httpStatusCode: observation.httpStatusCode,
      })),
    })),
    alerts: rows.alerts.filter((alert) => alertOverlapsMonitoringWindow(alert, window))
      .sort((left, right) => left.firstObservedAt.getTime() - right.firstObservedAt.getTime() || left.id.localeCompare(right.id))
      .map((alert) => ({
        id: alert.id,
        conditionKey: alert.conditionKey,
        category: alert.category,
        severity: alert.severity,
        status: alert.status,
        firstObservedAt: alert.firstObservedAt.toISOString(),
        lastObservedAt: alert.lastObservedAt.toISOString(),
        recoveredAt: alert.recoveredAt?.toISOString() ?? null,
        observationCount: alert.observationCount,
      })),
  };
}
