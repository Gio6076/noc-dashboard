export interface MonitoringHistoryWindow {
  from: string;
  to: string;
  durationSeconds: number;
}

export interface MonitoringHistorySystemSample {
  sampledAt: string;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  diskUsagePercent: number;
  uptimeSeconds: string;
}

export interface MonitoringHistoryNetworkSample {
  sampledAt: string;
  inboundBytesPerSecond: number | null;
  outboundBytesPerSecond: number | null;
  totalBytesReceived: string;
  totalBytesSent: string;
}

export interface MonitoringHistoryService {
  stableKey: string;
  displayName: string;
  type: "tcp" | "http" | "https";
  observations: readonly {
    status: "up" | "down";
    checkedAt: string;
    responseTimeMs: number | null;
    httpStatusCode: number | null;
  }[];
}

export interface MonitoringHistoryAlert {
  id: string;
  conditionKey: string;
  category: "agent" | "endpoint" | "service" | "system";
  severity: "warning" | "critical";
  status: "active" | "recovered";
  firstObservedAt: string;
  lastObservedAt: string;
  recoveredAt: string | null;
  observationCount: number;
}

export interface MonitoringHistory {
  device: {
    stableKey: string;
    displayName: string;
    operationalState: "monitored" | "maintenance" | "disabled";
    monitoringType: "agent";
  };
  window: MonitoringHistoryWindow;
  system: readonly MonitoringHistorySystemSample[];
  network: readonly MonitoringHistoryNetworkSample[];
  services: readonly MonitoringHistoryService[];
  alerts: readonly MonitoringHistoryAlert[];
}
