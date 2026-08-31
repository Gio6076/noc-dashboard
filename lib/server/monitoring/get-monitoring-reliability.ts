import "server-only";

import { assembleReliabilityAnalytics } from "@/lib/reliability-analytics";
import { createMonitoringHistoryWindow } from "@/lib/monitoring-history-window";
import { readMonitoringReliabilityRows } from "@/lib/server/repositories/monitoring-reliability-repository";
import type { ReliabilityAnalytics } from "@/types/reliability-analytics";

export async function getMonitoringReliability(
  deviceKey: string,
  hours: number,
  now = new Date(),
): Promise<ReliabilityAnalytics | null> {
  const window = createMonitoringHistoryWindow(hours, now);
  return assembleReliabilityAnalytics(
    await readMonitoringReliabilityRows(deviceKey, window),
    window,
  );
}
