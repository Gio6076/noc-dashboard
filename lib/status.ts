import type {
  AlertSeverity,
  DeviceStatus,
  IncidentStatus,
} from "@/types/network";
import type { NetworkHealthStatus } from "@/lib/dashboard";

export type SemanticTone =
  | "neutral"
  | "healthy"
  | "warning"
  | "critical"
  | "informational";

export type StatusKind =
  | SemanticTone
  | DeviceStatus
  | AlertSeverity
  | IncidentStatus
  | NetworkHealthStatus
  | "acknowledged";

const STATUS_LABELS: Record<StatusKind, string> = {
  neutral: "Neutral",
  healthy: "Healthy",
  warning: "Warning",
  critical: "Critical",
  informational: "Informational",
  online: "Online",
  degraded: "Degraded",
  offline: "Offline",
  maintenance: "Maintenance",
  acknowledged: "Acknowledged",
  active: "Active",
  investigating: "Investigating",
  resolved: "Resolved",
};

export function getStatusLabel(status: StatusKind): string {
  return STATUS_LABELS[status];
}

export function getStatusTone(status: StatusKind): SemanticTone {
  switch (status) {
    case "healthy":
    case "online":
      return "healthy";
    case "warning":
    case "degraded":
    case "maintenance":
    case "active":
      return "warning";
    case "critical":
    case "offline":
      return "critical";
    case "informational":
    case "investigating":
      return "informational";
    case "resolved":
      return "healthy";
    case "acknowledged":
    case "neutral":
      return "neutral";
  }
}

export function getUtilizationTone(
  value: number,
  warningThreshold = 75,
  criticalThreshold = 90,
): SemanticTone {
  if (value >= criticalThreshold) return "critical";
  if (value >= warningThreshold) return "warning";
  return "healthy";
}
