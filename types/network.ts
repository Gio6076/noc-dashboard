export type DeviceStatus = "online" | "degraded" | "offline" | "maintenance";

export type DeviceType =
  | "core-router"
  | "firewall"
  | "distribution-switch"
  | "access-switch"
  | "access-point"
  | "server"
  | "database-server"
  | "workstation";

export type AlertSeverity = "informational" | "warning" | "critical";

export type IncidentStatus = "active" | "investigating" | "resolved";

export interface NetworkDevice {
  id: string;
  hostname: string;
  ipAddress: string;
  type: DeviceType;
  status: DeviceStatus;
  latencyMs: number;
  uptimeSeconds: number;
  bandwidthUsageMbps: number;
  bandwidthUtilizationPercent: number;
  lastSeenAt: string;
}

export interface NetworkAlert {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  occurredAt: string;
  deviceId?: NetworkDevice["id"];
  acknowledged: boolean;
}

export interface NetworkActivity {
  id: string;
  description: string;
  occurredAt: string;
  deviceId?: NetworkDevice["id"];
  actor?: string;
}

export interface NetworkMetric {
  id: string;
  label: string;
  value: number;
  unit: string;
  changePercent?: number;
}

export interface TimeSeriesDataPoint {
  timestamp: string;
  value: number;
}

export interface NetworkIncident {
  id: string;
  title: string;
  severity: AlertSeverity;
  status: IncidentStatus;
  affectedDeviceIds: readonly NetworkDevice["id"][];
  startedAt: string;
  resolvedAt?: string;
  summary: string;
  rootCause?: string;
  relatedAlertIds: readonly NetworkAlert["id"][];
  assignedTeam: string;
}
