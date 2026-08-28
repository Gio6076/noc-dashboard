import { calculateDashboardMetrics } from "@/lib/dashboard";
import type { NetworkAlert, NetworkDevice } from "@/types/network";

export interface AnalyticsSummary {
  averageUptimeSeconds: number;
  averageLatencyMs: number;
  averageBandwidthUtilizationPercent: number;
  availabilityPercent: number;
  activeAlertRatePercent: number;
  degradedOrOfflinePercent: number;
  exceptionDevices: number;
}

function percentage(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 1_000) / 10;
}

export function calculateAnalyticsSummary(
  devices: readonly NetworkDevice[],
  alerts: readonly NetworkAlert[],
): AnalyticsSummary {
  const metrics = calculateDashboardMetrics(devices, alerts);
  const respondingDevices = metrics.onlineDevices + metrics.degradedDevices;
  const exceptionDevices = metrics.degradedDevices + metrics.offlineDevices;

  return {
    averageUptimeSeconds: metrics.averageUptimeSeconds,
    averageLatencyMs: metrics.averageLatencyMs,
    averageBandwidthUtilizationPercent:
      metrics.averageBandwidthUtilizationPercent,
    availabilityPercent: percentage(respondingDevices, metrics.totalDevices),
    activeAlertRatePercent: percentage(metrics.activeAlerts, alerts.length),
    degradedOrOfflinePercent: percentage(
      exceptionDevices,
      metrics.totalDevices,
    ),
    exceptionDevices,
  };
}
