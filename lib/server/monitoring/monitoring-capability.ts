import "server-only";

import {
  evaluatePersistedMonitoringCapability,
  resolvePersistedMonitoringConfiguration,
  type MonitoringCapabilityResult,
} from "@/lib/monitoring-capability";

export function persistedMonitoringConfiguration():
  | { status: "enabled"; databaseUrl: string }
  | { status: "disabled" }
  | { status: "unavailable" } {
  return resolvePersistedMonitoringConfiguration(
    process.env.NOC_PERSISTED_MONITORING_ENABLED,
    process.env.DATABASE_URL,
  );
}

export async function readPersistedMonitoringCapability<T>(
  read: (databaseUrl: string) => Promise<T>,
): Promise<MonitoringCapabilityResult<T>> {
  return evaluatePersistedMonitoringCapability(persistedMonitoringConfiguration(), read);
}
