import type {
  MonitoringHistory,
  MonitoringHistoryAlert,
  MonitoringHistoryNetworkSample,
  MonitoringHistoryService,
  MonitoringHistorySystemSample,
} from "../types/monitoring-history.ts";

export const HISTORY_WINDOWS = [
  { label: "1h", hours: 1 },
  { label: "6h", hours: 6 },
  { label: "24h", hours: 24 },
  { label: "7d", hours: 168 },
] as const;

export type HistoryWindowHours = (typeof HISTORY_WINDOWS)[number]["hours"];
export const DEFAULT_HISTORY_WINDOW_HOURS: HistoryWindowHours = 24;

export function monitoringHistoryUrl(
  deviceKey: string,
  hours: HistoryWindowHours,
): string {
  return `/api/monitoring/history/${encodeURIComponent(deviceKey)}?hours=${hours}`;
}

function withGapMarkers<T extends { timestamp: string }>(
  points: readonly T[],
  maxGapSeconds?: number,
): (T | ({ timestamp: string } & Record<Exclude<keyof T, "timestamp">, null>))[] {
  if (!maxGapSeconds || points.length < 2) return [...points];
  const result: (T | ({ timestamp: string } & Record<Exclude<keyof T, "timestamp">, null>))[] = [];
  for (const point of points) {
    const previous = result.at(-1);
    if (previous && Date.parse(point.timestamp) - Date.parse(previous.timestamp) > maxGapSeconds * 1_000) {
      const marker = Object.fromEntries(Object.keys(point).map((key) => [key, key === "timestamp" ? new Date((Date.parse(previous.timestamp) + Date.parse(point.timestamp)) / 2).toISOString() : null]));
      result.push(marker as { timestamp: string } & Record<Exclude<keyof T, "timestamp">, null>);
    }
    result.push(point);
  }
  return result;
}

export function systemChartData(
  samples: readonly MonitoringHistorySystemSample[],
  maxGapSeconds?: number,
) {
  return withGapMarkers(samples.map((sample) => ({
    timestamp: sample.sampledAt,
    cpu: sample.cpuUsagePercent,
    memory: sample.memoryUsagePercent,
    disk: sample.diskUsagePercent,
  })), maxGapSeconds);
}

export function networkChartData(
  samples: readonly MonitoringHistoryNetworkSample[],
  maxGapSeconds?: number,
) {
  return withGapMarkers(samples.map((sample) => ({
    timestamp: sample.sampledAt,
    inbound: sample.inboundBytesPerSecond,
    outbound: sample.outboundBytesPerSecond,
  })), maxGapSeconds);
}

export function serviceHistoryPresentation(service: MonitoringHistoryService) {
  const latest = service.observations.at(-1) ?? null;
  return {
    ...service,
    latest,
    stateLabel: latest ? latest.status.toUpperCase() : "NO DATA",
  };
}

export function alertHistoryPresentation(
  alert: MonitoringHistoryAlert,
  windowEnd: string,
) {
  const end = alert.recoveredAt ?? windowEnd;
  const durationSeconds = Math.max(
    0,
    Math.floor((Date.parse(end) - Date.parse(alert.firstObservedAt)) / 1_000),
  );
  return {
    ...alert,
    active: alert.status === "active",
    durationSeconds,
  };
}

export interface HistoryClientState {
  data: MonitoringHistory | null;
  refreshError: boolean;
}

export function retainLastGoodHistory(
  state: HistoryClientState,
  result: MonitoringHistory | null,
): HistoryClientState {
  return result
    ? { data: result, refreshError: false }
    : { data: state.data, refreshError: true };
}

export function isMonitoringHistory(value: unknown): value is MonitoringHistory {
  if (!value || typeof value !== "object") return false;
  const history = value as Partial<MonitoringHistory>;
  return Boolean(
    history.device &&
      history.window &&
      Array.isArray(history.system) &&
      Array.isArray(history.network) &&
      Array.isArray(history.services) &&
      Array.isArray(history.alerts),
  );
}
