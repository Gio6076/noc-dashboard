import type { MonitoringHistoryWindow } from "../types/monitoring-history.ts";

export const DEFAULT_MONITORING_HISTORY_HOURS = 24;
export const MIN_MONITORING_HISTORY_HOURS = 1;
export const MAX_MONITORING_HISTORY_HOURS = 168;

export class InvalidMonitoringHistoryWindowError extends Error {
  constructor() {
    super(`hours must be a finite number between ${MIN_MONITORING_HISTORY_HOURS} and ${MAX_MONITORING_HISTORY_HOURS}`);
    this.name = "InvalidMonitoringHistoryWindowError";
  }
}

export function parseMonitoringHistoryHours(value: string | null): number {
  if (value === null) return DEFAULT_MONITORING_HISTORY_HOURS;
  if (value.trim() === "") throw new InvalidMonitoringHistoryWindowError();
  const hours = Number(value);
  if (!Number.isFinite(hours) || hours < MIN_MONITORING_HISTORY_HOURS || hours > MAX_MONITORING_HISTORY_HOURS) {
    throw new InvalidMonitoringHistoryWindowError();
  }
  return hours;
}

export function createMonitoringHistoryWindow(
  hours: number,
  now = new Date(),
): { from: Date; to: Date; durationSeconds: number } {
  if (!Number.isFinite(hours) || hours < MIN_MONITORING_HISTORY_HOURS || hours > MAX_MONITORING_HISTORY_HOURS) {
    throw new InvalidMonitoringHistoryWindowError();
  }
  const durationSeconds = hours * 60 * 60;
  return {
    from: new Date(now.getTime() - durationSeconds * 1_000),
    to: new Date(now),
    durationSeconds,
  };
}

export function serializeMonitoringHistoryWindow(
  window: { from: Date; to: Date; durationSeconds: number },
): MonitoringHistoryWindow {
  return {
    from: window.from.toISOString(),
    to: window.to.toISOString(),
    durationSeconds: window.durationSeconds,
  };
}
