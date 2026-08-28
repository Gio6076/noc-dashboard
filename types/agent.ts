export interface AgentHealth {
  status: string;
  hostname?: string;
  platform?: string;
  architecture?: string;
}

export interface AgentSystemTelemetry {
  hostname?: string;
  platform?: string;
  architecture?: string;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  diskUsagePercent: number;
  uptimeSeconds: number;
  logicalCpuCount: number;
}

export interface AgentNetworkTelemetry {
  inboundBytesPerSecond: number;
  outboundBytesPerSecond: number;
  totalBytesReceived: number;
  totalBytesSent: number;
  primaryIpv4Address?: string;
  activeInterfaceCount?: number;
}

export interface AgentTelemetry {
  health?: AgentHealth;
  system?: AgentSystemTelemetry;
  network?: AgentNetworkTelemetry;
  unavailableEndpoints: readonly ("health" | "system" | "network")[];
}
