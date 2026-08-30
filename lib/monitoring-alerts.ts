import type { AgentDeviceSnapshot } from "@/types/monitored-device";
import type {
  RealMonitoringAlert,
  RealMonitoringMetric,
  RealMonitoringAlertSeverity,
} from "@/types/monitoring-alert";
import { serviceAlertConditionKey } from "./persistence/identity.ts";

export const MONITORING_ALERT_THRESHOLDS = {
  cpuWarningPercent: 90,
  memoryWarningPercent: 90,
  diskCriticalPercent: 90,
} as const;

const SOURCE = "agent-snapshot-evaluator" as const;

function metricAlert(
  snapshot: AgentDeviceSnapshot,
  config: {
    id: string;
    metric: RealMonitoringMetric;
    label: string;
    severity: RealMonitoringAlertSeverity;
    currentValue: number;
    threshold: number;
  },
): RealMonitoringAlert {
  const { device, fetchedAt } = snapshot;
  const formattedValue = `${config.currentValue.toFixed(1)}%`;

  return {
    id: `system:${device.id}:${config.id}:high`,
    deviceId: device.id,
    deviceName: device.displayName,
    category: "system",
    severity: config.severity,
    title: `High ${config.label.toLowerCase()} usage on ${device.displayName}`,
    message: `Current ${config.label.toLowerCase()} usage is ${formattedValue}, at or above the ${config.threshold}% threshold.`,
    observedAt: fetchedAt,
    source: SOURCE,
    metric: config.metric,
    currentValue: config.currentValue,
    threshold: config.threshold,
  };
}

export function evaluateMonitoringAlerts(
  snapshots: readonly AgentDeviceSnapshot[],
): RealMonitoringAlert[] {
  const alerts: RealMonitoringAlert[] = [];

  for (const snapshot of snapshots) {
    const { device } = snapshot;

    if (device.operationalState !== "monitored") continue;

    if (snapshot.availability === "unreachable") {
      alerts.push({
        id: `agent:${device.id}:unreachable`,
        deviceId: device.id,
        deviceName: device.displayName,
        category: "agent",
        severity: "critical",
        title: "Monitoring agent is unreachable",
        message: `${device.displayName} monitoring agent is unreachable.`,
        observedAt: snapshot.fetchedAt,
        source: SOURCE,
      });
      continue;
    }

    if (snapshot.availability === "partial") {
      const endpointList = snapshot.unavailableEndpoints.join(", ");
      alerts.push({
        id: `agent:${device.id}:partial-telemetry`,
        deviceId: device.id,
        deviceName: device.displayName,
        category: "endpoint",
        severity: "warning",
        title: "Partial monitoring telemetry",
        message: `${device.displayName} has partial monitoring telemetry: ${endpointList} unavailable.`,
        observedAt: snapshot.fetchedAt,
        source: SOURCE,
      });
    }

    for (const service of snapshot.services?.services ?? []) {
      if (service.status !== "down") continue;

      alerts.push({
        id: serviceAlertConditionKey(device.id, service),
        deviceId: device.id,
        deviceName: device.displayName,
        category: "service",
        severity: "critical",
        title: `${service.name} is DOWN`,
        message: `${service.name} (${service.type.toUpperCase()}) is DOWN on ${device.displayName}.`,
        observedAt: service.checkedAt,
        source: SOURCE,
        serviceName: service.name,
        serviceType: service.type,
        currentValue: service.responseTimeMs,
      });
    }

    if (!snapshot.system) continue;

    const metricConfigs = [
      {
        id: "cpu",
        metric: "cpuUsagePercent",
        label: "CPU",
        severity: "warning",
        currentValue: snapshot.system.cpuUsagePercent,
        threshold: MONITORING_ALERT_THRESHOLDS.cpuWarningPercent,
      },
      {
        id: "memory",
        metric: "memoryUsagePercent",
        label: "Memory",
        severity: "warning",
        currentValue: snapshot.system.memoryUsagePercent,
        threshold: MONITORING_ALERT_THRESHOLDS.memoryWarningPercent,
      },
      {
        id: "disk",
        metric: "diskUsagePercent",
        label: "Disk",
        severity: "critical",
        currentValue: snapshot.system.diskUsagePercent,
        threshold: MONITORING_ALERT_THRESHOLDS.diskCriticalPercent,
      },
    ] as const;

    for (const config of metricConfigs) {
      if (config.currentValue >= config.threshold) {
        alerts.push(metricAlert(snapshot, config));
      }
    }
  }

  return alerts;
}
