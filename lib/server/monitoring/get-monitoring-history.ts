import "server-only";

import { assembleMonitoringHistory } from "@/lib/monitoring-history-read-model";
import { createMonitoringHistoryWindow } from "@/lib/monitoring-history-window";
import { readMonitoringHistoryRows } from "@/lib/server/repositories/monitoring-history-repository";
import type { MonitoringHistory } from "@/types/monitoring-history";

export async function getMonitoringHistory(
  deviceKey: string,
  hours: number,
  now = new Date(),
): Promise<MonitoringHistory | null> {
  const window = createMonitoringHistoryWindow(hours, now);
  const rows = await readMonitoringHistoryRows(deviceKey, window);
  return assembleMonitoringHistory(rows, window);
}
