import type { MonitoredDeviceOperationalState } from "@/types/monitored-device";

export const monitoredDeviceOperationalStates = {
  "macbook-air": "monitored",
  "linux-mint-acer": "maintenance",
} as const satisfies Record<string, MonitoredDeviceOperationalState>;
