import type {
  AlertSeverity,
  DeviceType,
  NetworkAlert,
  NetworkDevice,
} from "@/types/network";

export type NetworkHealthStatus = "healthy" | "warning" | "critical";

export interface DeviceUtilizationSummary {
  id: NetworkDevice["id"];
  hostname: NetworkDevice["hostname"];
  utilizationPercent: number;
}

export interface DashboardMetrics {
  totalDevices: number;
  onlineDevices: number;
  degradedDevices: number;
  offlineDevices: number;
  activeAlerts: number;
  criticalAlerts: number;
  averageLatencyMs: number;
  averageBandwidthUtilizationPercent: number;
  averageUptimeSeconds: number;
  overallHealth: NetworkHealthStatus;
  deviceCountsByType: Record<DeviceType, number>;
  alertCountsBySeverity: Record<AlertSeverity, number>;
  highestUtilizationDevices: readonly DeviceUtilizationSummary[];
}

function average(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export function determineNetworkHealth(
  devices: readonly NetworkDevice[],
  alerts: readonly NetworkAlert[],
): NetworkHealthStatus {
  const activeAlerts = alerts.filter((alert) => !alert.acknowledged);
  const hasCriticalCondition =
    devices.some((device) => device.status === "offline") ||
    activeAlerts.some((alert) => alert.severity === "critical");

  if (hasCriticalCondition) return "critical";

  const hasWarningCondition =
    devices.some((device) => device.status === "degraded") ||
    activeAlerts.some((alert) => alert.severity === "warning");

  return hasWarningCondition ? "warning" : "healthy";
}

export function calculateDashboardMetrics(
  devices: readonly NetworkDevice[],
  alerts: readonly NetworkAlert[],
): DashboardMetrics {
  const activeAlerts = alerts.filter((alert) => !alert.acknowledged);
  const respondingDevices = devices.filter(
    (device) => device.status !== "offline",
  );

  const deviceCountsByType: Record<DeviceType, number> = {
    "core-router": 0,
    firewall: 0,
    "distribution-switch": 0,
    "access-switch": 0,
    "access-point": 0,
    server: 0,
    "database-server": 0,
    workstation: 0,
  };

  for (const device of devices) deviceCountsByType[device.type] += 1;

  const alertCountsBySeverity: Record<AlertSeverity, number> = {
    informational: 0,
    warning: 0,
    critical: 0,
  };

  for (const alert of alerts) alertCountsBySeverity[alert.severity] += 1;

  const highestUtilizationDevices = respondingDevices
    .toSorted(
      (first, second) =>
        second.bandwidthUtilizationPercent -
        first.bandwidthUtilizationPercent,
    )
    .slice(0, 3)
    .map((device) => ({
      id: device.id,
      hostname: device.hostname,
      utilizationPercent: device.bandwidthUtilizationPercent,
    }));

  return {
    totalDevices: devices.length,
    onlineDevices: devices.filter((device) => device.status === "online").length,
    degradedDevices: devices.filter((device) => device.status === "degraded")
      .length,
    offlineDevices: devices.filter((device) => device.status === "offline").length,
    activeAlerts: activeAlerts.length,
    criticalAlerts: activeAlerts.filter(
      (alert) => alert.severity === "critical",
    ).length,
    averageLatencyMs: roundToOneDecimal(
      average(respondingDevices.map((device) => device.latencyMs)),
    ),
    averageBandwidthUtilizationPercent: roundToOneDecimal(
      average(
        respondingDevices.map(
          (device) => device.bandwidthUtilizationPercent,
        ),
      ),
    ),
    averageUptimeSeconds: Math.round(
      average(respondingDevices.map((device) => device.uptimeSeconds)),
    ),
    overallHealth: determineNetworkHealth(devices, alerts),
    deviceCountsByType,
    alertCountsBySeverity,
    highestUtilizationDevices,
  };
}
