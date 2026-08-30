import type { MonitoredDevice } from "@/types/monitored-device";

export function shouldFetchMonitoredDevice(device: MonitoredDevice): boolean {
  return device.operationalState !== "disabled";
}
