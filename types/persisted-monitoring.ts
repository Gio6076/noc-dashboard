import type { AgentEndpointName } from "./monitored-device";

export type PersistedDataFreshness = "fresh" | "stale" | "unavailable";

export interface PersistedFreshness {
  status: PersistedDataFreshness;
  ageSeconds: number | null;
}

export interface PersistedSystemSample {
  observedAt: string;
  freshness: PersistedFreshness;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  memoryUsedBytes: string | null;
  memoryTotalBytes: string | null;
  diskUsagePercent: number;
  diskUsedBytes: string | null;
  diskTotalBytes: string | null;
  uptimeSeconds: string;
}

export interface PersistedNetworkSample {
  observedAt: string;
  freshness: PersistedFreshness;
  inboundBytesPerSecond: number | null;
  outboundBytesPerSecond: number | null;
  bytesReceived: string;
  bytesSent: string;
}

export interface PersistedServiceState {
  stableKey: string;
  displayName: string;
  type: "tcp" | "http" | "https";
  enabled: boolean;
  latestObservation: {
    status: "up" | "down";
    checkedAt: string;
    responseTimeMs: number | null;
    httpStatusCode: number | null;
  } | null;
}

export interface PersistedActiveAlert {
  id: string;
  conditionKey: string;
  serviceStableKey: string | null;
  category: "agent" | "endpoint" | "service" | "system";
  severity: "warning" | "critical";
  title: string;
  message: string;
  firstObservedAt: string;
  lastObservedAt: string;
  observationCount: number;
  currentValue: number | null;
  threshold: number | null;
}

export interface PersistedDeviceCurrentState {
  device: {
    id: string;
    stableKey: string;
    displayName: string;
    operationalState: "monitored" | "maintenance" | "disabled";
    monitoringType: "agent";
  };
  latestObservation: {
    availability: "online" | "partial" | "unreachable" | "not-fetched";
    observedAt: string;
    unavailableEndpoints: readonly AgentEndpointName[];
    collectionRunId: string | null;
  } | null;
  system: PersistedSystemSample | null;
  network: PersistedNetworkSample | null;
  services: readonly PersistedServiceState[];
  alerts: readonly PersistedActiveAlert[];
}

export interface PersistedMonitoringState {
  collection: {
    latestCollectionAt: string | null;
    freshness: PersistedFreshness;
  };
  devices: readonly PersistedDeviceCurrentState[];
}
