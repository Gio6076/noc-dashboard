import type {
  AgentHealth,
  AgentNetworkTelemetry,
  AgentServiceStatus,
  AgentServiceType,
  AgentSystemTelemetry,
} from "@/types/agent";
import type {
  AgentEndpointName,
  MonitoredDevice,
  MonitoredDeviceAvailability,
} from "@/types/monitored-device";
import type { RealMonitoringAlert } from "@/types/monitoring-alert";

export type BrowserMonitoredDevice = Omit<MonitoredDevice, "agentUrl">;

export interface BrowserAgentServiceCheck {
  name: string;
  type: AgentServiceType;
  status: AgentServiceStatus;
  responseTimeMs: number;
  checkedAt: string;
  httpStatusCode?: number | null;
}

export interface BrowserAgentServicesTelemetry {
  collectedAt: string;
  totalServices: number;
  servicesUp: number;
  servicesDown: number;
  services: readonly BrowserAgentServiceCheck[];
}

export interface BrowserAgentDeviceSnapshot {
  device: BrowserMonitoredDevice;
  availability: MonitoredDeviceAvailability;
  health?: AgentHealth;
  system?: AgentSystemTelemetry;
  network?: AgentNetworkTelemetry;
  services?: BrowserAgentServicesTelemetry;
  endpointAvailability: Record<AgentEndpointName, boolean>;
  unavailableEndpoints: readonly AgentEndpointName[];
  fetchedAt: string;
}

export interface LiveMonitoringResponse {
  snapshots: readonly BrowserAgentDeviceSnapshot[];
  alerts: readonly RealMonitoringAlert[];
  fetchedAt: string;
}
