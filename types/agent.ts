export interface AgentHealth {
  status: string;
  hostname?: string;
  platform?: string;
  architecture?: string;
  platformRelease?: string;
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
  memoryUsedBytes?: number;
  memoryTotalBytes?: number;
  diskUsedBytes?: number;
  diskTotalBytes?: number;
}

export interface AgentNetworkTelemetry {
  inboundBytesPerSecond: number;
  outboundBytesPerSecond: number;
  totalBytesReceived: number;
  totalBytesSent: number;
  primaryIpv4Address?: string;
  activeInterfaceCount?: number;
}

export type AgentServiceType = "tcp" | "http" | "https";
export type AgentServiceStatus = "up" | "down";

interface AgentServiceCheckBase {
  name: string;
  status: AgentServiceStatus;
  responseTimeMs: number;
  checkedAt: string;
}

export interface AgentTcpServiceCheck extends AgentServiceCheckBase {
  type: "tcp";
  host: string;
  port: number;
}

export interface AgentHttpServiceCheck extends AgentServiceCheckBase {
  type: "http" | "https";
  url: string;
  httpStatusCode: number | null;
}

export type AgentServiceCheck =
  | AgentTcpServiceCheck
  | AgentHttpServiceCheck;

export interface AgentServicesTelemetry {
  collectedAt: string;
  totalServices: number;
  servicesUp: number;
  servicesDown: number;
  services: readonly AgentServiceCheck[];
}
