import "server-only";

import { assemblePersistedMonitoringState } from "@/lib/persistence/persisted-monitoring-read-model";
import { readPersistedMonitoringRows } from "@/lib/server/repositories/monitoring-read-repository";
import type { PersistedMonitoringState } from "@/types/persisted-monitoring";

export async function getPersistedMonitoringState(): Promise<PersistedMonitoringState> {
  return assemblePersistedMonitoringState(await readPersistedMonitoringRows(), new Date());
}
