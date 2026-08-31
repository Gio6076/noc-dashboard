import "server-only";

import { assemblePersistedMonitoringState } from "@/lib/persistence/persisted-monitoring-read-model";
import { readPersistedMonitoringRows } from "@/lib/server/repositories/monitoring-read-repository";
import type { PersistedMonitoringState } from "@/types/persisted-monitoring";
import { readPersistedMonitoringCapability } from "@/lib/server/monitoring/monitoring-capability";
import type { MonitoringCapabilityResult } from "@/lib/monitoring-capability";

export async function getPersistedMonitoringState(): Promise<PersistedMonitoringState> {
  return assemblePersistedMonitoringState(await readPersistedMonitoringRows(), new Date());
}

export function getPersistedMonitoringCapability(): Promise<MonitoringCapabilityResult<PersistedMonitoringState>> {
  return readPersistedMonitoringCapability(async () => getPersistedMonitoringState());
}
