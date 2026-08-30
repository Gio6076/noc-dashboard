import type { AgentDeviceSnapshot } from "@/types/monitored-device";
import type { RealMonitoringAlert } from "@/types/monitoring-alert";
import { serviceAlertConditionKey } from "./identity.ts";

export interface ActiveAlertState {
  id: string;
  conditionKey: string;
  deviceStableKey: string;
}

export interface AlertLifecyclePlan {
  open: RealMonitoringAlert[];
  update: Array<{ active: ActiveAlertState; alert: RealMonitoringAlert }>;
  recover: ActiveAlertState[];
}

function snapshotFor(
  alert: ActiveAlertState,
  snapshots: readonly AgentDeviceSnapshot[],
): AgentDeviceSnapshot | undefined {
  return snapshots.find((snapshot) => snapshot.device.id === alert.deviceStableKey);
}

export function hasRecoveryEvidence(
  alert: ActiveAlertState,
  snapshots: readonly AgentDeviceSnapshot[],
): boolean {
  const snapshot = snapshotFor(alert, snapshots);
  if (!snapshot || snapshot.device.operationalState !== "monitored") return false;

  if (alert.conditionKey === `agent:${alert.deviceStableKey}:unreachable`) {
    return snapshot.availability === "online" || snapshot.availability === "partial";
  }

  if (
    alert.conditionKey === `agent:${alert.deviceStableKey}:partial-telemetry` ||
    alert.conditionKey === `agent:${alert.deviceStableKey}:partial`
  ) {
    return snapshot.availability === "online";
  }

  if (alert.conditionKey.startsWith(`service:${alert.deviceStableKey}:`)) {
    if (!snapshot.endpointAvailability.services || !snapshot.services) return false;
    const matchingService = snapshot.services.services.find(
      (service) => serviceAlertConditionKey(alert.deviceStableKey, service) === alert.conditionKey,
    );
    return matchingService?.status === "up";
  }

  const metricRules = [
    ["cpu", "cpuUsagePercent", 90],
    ["memory", "memoryUsagePercent", 90],
    ["disk", "diskUsagePercent", 90],
  ] as const;
  for (const [condition, metric, threshold] of metricRules) {
    if (alert.conditionKey !== `system:${alert.deviceStableKey}:${condition}:high`) continue;
    return snapshot.endpointAvailability.system && snapshot.system !== undefined
      ? snapshot.system[metric] < threshold
      : false;
  }

  return false;
}

export function planAlertLifecycle(
  activeAlerts: readonly ActiveAlertState[],
  currentAlerts: readonly RealMonitoringAlert[],
  snapshots: readonly AgentDeviceSnapshot[],
): AlertLifecyclePlan {
  const activeByCondition = new Map(activeAlerts.map((alert) => [alert.conditionKey, alert]));
  const currentByCondition = new Map(currentAlerts.map((alert) => [alert.id, alert]));
  const open: RealMonitoringAlert[] = [];
  const update: AlertLifecyclePlan["update"] = [];

  for (const alert of currentByCondition.values()) {
    const active = activeByCondition.get(alert.id);
    if (active) update.push({ active, alert });
    else open.push(alert);
  }

  return {
    open,
    update,
    recover: activeAlerts.filter(
      (active) => !currentByCondition.has(active.conditionKey) && hasRecoveryEvidence(active, snapshots),
    ),
  };
}
