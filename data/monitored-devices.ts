import "server-only";

import type { MonitoredDevice } from "@/types/monitored-device";

function agentUrl(environmentValue: string | undefined, fallback: string) {
  return (environmentValue?.trim() || fallback).replace(/\/$/, "");
}

export const monitoredDevices: readonly MonitoredDevice[] = [
  {
    id: "macbook-air",
    displayName: "MacBook Air",
    monitoringType: "agent",
    agentUrl: agentUrl(
      process.env.NOC_MAC_AGENT_API_URL,
      "http://127.0.0.1:8000",
    ),
    enabled: true,
    environment: "local",
    description: "Primary local development workstation",
  },
  {
    id: "linux-mint-acer",
    displayName: "Linux Mint Acer",
    monitoringType: "agent",
    agentUrl: agentUrl(
      process.env.NOC_LINUX_AGENT_API_URL,
      "http://192.168.254.116:8000",
    ),
    enabled: true,
    environment: "local",
    description: "Linux workstation on the local network",
  },
] as const;

export function getEnabledMonitoredDevices(): readonly MonitoredDevice[] {
  return monitoredDevices.filter((device) => device.enabled);
}
