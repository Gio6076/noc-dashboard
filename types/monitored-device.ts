import type {
  AgentHealth,
  AgentNetworkTelemetry,
  AgentServicesTelemetry,
  AgentSystemTelemetry,
} from "@/types/agent";

export type MonitoringType = "agent";
export type MonitoredDeviceEnvironment = "local";
export type MonitoredDeviceOperationalState =
  | "monitored"
  | "maintenance"
  | "disabled";
export type AgentEndpointName = "health" | "system" | "network" | "services";
export type MonitoredDeviceAvailability =
  | "online"
  | "partial"
  | "unreachable"
  | "not-fetched";

export interface MonitoredDevice {
  id: string;
  displayName: string;
  monitoringType: MonitoringType;
  agentUrl: string;
  operationalState: MonitoredDeviceOperationalState;
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
  services?: AgentServicesTelemetry;
  endpointAvailability: Record<AgentEndpointName, boolean>;
  unavailableEndpoints: readonly AgentEndpointName[];
  fetchedAt: string;
}
