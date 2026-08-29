import type {
  AgentHealth,
  AgentNetworkTelemetry,
  AgentSystemTelemetry,
} from "@/types/agent";

export type MonitoringType = "agent";
export type MonitoredDeviceEnvironment = "local";
export type AgentEndpointName = "health" | "system" | "network";
export type MonitoredDeviceAvailability =
  | "online"
  | "partial"
  | "unreachable";

export interface MonitoredDevice {
  id: string;
  displayName: string;
  monitoringType: MonitoringType;
  agentUrl: string;
  enabled: boolean;
  environment: MonitoredDeviceEnvironment;
  expectedHostname?: string;
  description?: string;
}

export interface AgentDeviceSnapshot {
  device: MonitoredDevice;
  availability: MonitoredDeviceAvailability;
  health?: AgentHealth;
  system?: AgentSystemTelemetry;
  network?: AgentNetworkTelemetry;
  endpointAvailability: Record<AgentEndpointName, boolean>;
  unavailableEndpoints: readonly AgentEndpointName[];
  fetchedAt: string;
}
