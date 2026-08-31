import type {
  PersistedDeviceCurrentState,
  PersistedDataFreshness,
  PersistedMonitoringState,
} from "../types/persisted-monitoring.ts";
import type { MonitoringCapabilityStatus } from "./monitoring-capability.ts";

export function persistedDevicePresentation(state: PersistedDeviceCurrentState) {
  const availability = state.latestObservation?.availability ?? "not-fetched";
  return {
    operationalState: state.device.operationalState,
    availability,
    availabilityLabel: availability === "online" ? "AGENT ONLINE"
      : availability === "partial" ? "AGENT PARTIAL"
        : availability === "unreachable" ? "AGENT UNREACHABLE" : "NOT FETCHED",
    systemTelemetryLabel: state.system
      ? freshnessLabel(state.system.freshness.status, state.system.freshness.ageSeconds)
      : "Telemetry unavailable",
    networkTelemetryLabel: state.network
      ? freshnessLabel(state.network.freshness.status, state.network.freshness.ageSeconds)
      : "Telemetry unavailable",
  };
}

export function persistedActiveAlerts(devices: readonly PersistedDeviceCurrentState[]) {
  return devices.flatMap((state) => state.alerts.map((alert) => ({
    ...alert,
    deviceName: state.device.displayName,
  }))).toSorted((first, second) =>
    Date.parse(second.lastObservedAt) - Date.parse(first.lastObservedAt));
}

export interface PersistedMonitoringClientState {
  data: PersistedMonitoringState;
  refreshError: boolean;
}

export interface CapabilityAwareMonitoringClientState {
  data: PersistedMonitoringState | null;
  capability: MonitoringCapabilityStatus;
  refreshError: boolean;
}

export function applyPersistedMonitoringRefresh(
  state: CapabilityAwareMonitoringClientState,
  result: PersistedMonitoringState | null,
): CapabilityAwareMonitoringClientState {
  return result
    ? { data: result, capability: "available", refreshError: false }
    : {
        ...state,
        capability: state.data ? state.capability : "unavailable",
        refreshError: true,
      };
}

export function retainLastGoodPersistedMonitoringData(
  state: PersistedMonitoringClientState,
  result: PersistedMonitoringState | null,
): PersistedMonitoringClientState {
  return result
    ? { data: result, refreshError: false }
    : { data: state.data, refreshError: true };
}

export function formatMonitoringAge(ageSeconds: number | null): string {
  if (ageSeconds === null) return "unknown";
  if (ageSeconds < 60) return `${ageSeconds}s ago`;
  const minutes = Math.floor(ageSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function collectionFreshnessLabel(state: PersistedMonitoringState): string {
  const { freshness } = state.collection;
  if (freshness.status === "unavailable") return "No persisted collection data";
  const age = formatMonitoringAge(freshness.ageSeconds);
  return freshness.status === "fresh"
    ? `Updated ${age}`
    : `Monitoring data stale · last updated ${age}`;
}

export function freshnessLabel(
  status: PersistedDataFreshness,
  ageSeconds: number | null,
): string {
  if (status === "unavailable") return "Telemetry unavailable";
  return status === "fresh"
    ? `Current sample · ${formatMonitoringAge(ageSeconds)}`
    : `Last known telemetry · ${formatMonitoringAge(ageSeconds)}`;
}

export function isPersistedMonitoringState(value: unknown): value is PersistedMonitoringState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PersistedMonitoringState>;
  return Boolean(
    candidate.collection &&
    typeof candidate.collection === "object" &&
    Array.isArray(candidate.devices),
  );
}
