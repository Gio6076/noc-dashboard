import type { AgentServiceType } from "@/types/agent";
import type { MonitoredDevice } from "@/types/monitored-device";

export type RealMonitoringAlertCategory =
  | "agent"
  | "endpoint"
  | "service"
  | "system";

export type RealMonitoringAlertSeverity = "warning" | "critical";

export type RealMonitoringMetric =
  | "cpuUsagePercent"
  | "memoryUsagePercent"
  | "diskUsagePercent";

export interface RealMonitoringAlert {
  id: string;
  deviceId: MonitoredDevice["id"];
  deviceName: string;
  category: RealMonitoringAlertCategory;
  severity: RealMonitoringAlertSeverity;
  title: string;
  message: string;
  observedAt: string;
  source: "agent-snapshot-evaluator";
  serviceName?: string;
  serviceType?: AgentServiceType;
  metric?: RealMonitoringMetric;
  currentValue?: number;
  threshold?: number;
}
