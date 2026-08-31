import type { ReliabilityAnalytics, ServiceReliabilityAnalytics } from "../types/reliability-analytics.ts";
import { serializeMonitoringHistoryWindow } from "./monitoring-history-window.ts";

/** An observation can establish evidence for at most this long. */
export const MAXIMUM_RELIABILITY_EVIDENCE_GAP_MS = 60_000;
export const MAXIMUM_RELIABILITY_EVIDENCE_GAP_SECONDS =
  MAXIMUM_RELIABILITY_EVIDENCE_GAP_MS / 1_000;

type Window = { from: Date; to: Date; durationSeconds: number };
type TimedState<T extends string> = { id: string; observedAt: Date; state: T };

export interface ReliabilityRows {
  device: null | {
    id: string;
    stableKey: string;
    displayName: string;
    monitoringType: "agent";
    operationalState: "monitored" | "maintenance" | "disabled";
  };
  deviceObservations: readonly {
    id: string;
    observedAt: Date;
    availability: "online" | "partial" | "unreachable" | "not-fetched";
  }[];
  services: readonly {
    id: string;
    stableKey: string;
    name: string;
    type: "tcp" | "http" | "https";
  }[];
  serviceObservations: readonly {
    id: string;
    serviceId: string;
    observedAt: Date;
    status: "up" | "down";
  }[];
  serviceAlerts: readonly {
    id: string;
    serviceId: string | null;
    status: "active" | "recovered";
    firstObservedAt: Date;
    recoveredAt: Date | null;
  }[];
}

function roundPercent(numeratorMs: number, denominatorMs: number): number | null {
  if (denominatorMs <= 0) return null;
  return Number(((numeratorMs / denominatorMs) * 100).toFixed(6));
}

function toSeconds(milliseconds: number): number {
  return milliseconds / 1_000;
}

/**
 * Each observation owns [observedAt, min(next observedAt, observedAt + maxGap)).
 * Intervals are clipped to [window.from, window.to]. Unknown states create no
 * evidence, and every uncovered part of the window is therefore unknown.
 */
export function aggregateObservedStates<T extends string>(
  observations: readonly TimedState<T>[],
  knownStates: readonly T[],
  window: Window,
  maximumGapMs = MAXIMUM_RELIABILITY_EVIDENCE_GAP_MS,
): { byStateMs: Record<T, number>; observedMs: number; unknownMs: number } {
  const fromMs = window.from.getTime();
  const toMs = window.to.getTime();
  const windowMs = Math.max(0, toMs - fromMs);
  const known = new Set(knownStates);
  const byStateMs = Object.fromEntries(knownStates.map((state) => [state, 0])) as Record<T, number>;
  const ordered = [...observations]
    .filter((value) => Number.isFinite(value.observedAt.getTime()) && value.observedAt.getTime() <= toMs)
    .sort((a, b) => a.observedAt.getTime() - b.observedAt.getTime() || a.id.localeCompare(b.id));

  for (let index = 0; index < ordered.length; index += 1) {
    const current = ordered[index];
    if (!known.has(current.state)) continue;
    const startMs = Math.max(fromMs, current.observedAt.getTime());
    const nextMs = ordered[index + 1]?.observedAt.getTime() ?? Number.POSITIVE_INFINITY;
    const endMs = Math.min(toMs, nextMs, current.observedAt.getTime() + maximumGapMs);
    if (endMs > startMs) byStateMs[current.state] += endMs - startMs;
  }

  const observedMs = Math.min(
    windowMs,
    knownStates.reduce((sum, state) => sum + byStateMs[state], 0),
  );
  return { byStateMs, observedMs, unknownMs: windowMs - observedMs };
}

export function calculateServiceOutages(
  alerts: ReliabilityRows["serviceAlerts"],
  window: Window,
) {
  const fromMs = window.from.getTime();
  const toMs = window.to.getTime();
  const overlapping = alerts.filter((alert) =>
    alert.firstObservedAt.getTime() <= toMs &&
    (alert.recoveredAt === null || alert.recoveredAt.getTime() >= fromMs));
  const recovered = overlapping.filter((alert) =>
    alert.status === "recovered" && alert.recoveredAt !== null);
  const actualDurationsMs = recovered.map((alert) =>
    Math.max(0, alert.recoveredAt!.getTime() - alert.firstObservedAt.getTime()));
  const clippedDurationsMs = recovered.map((alert) => Math.max(
    0,
    Math.min(toMs, alert.recoveredAt!.getTime()) - Math.max(fromMs, alert.firstObservedAt.getTime()),
  ));

  return {
    outageCount: overlapping.length,
    recoveredOutageCount: recovered.length,
    activeOutageCount: overlapping.filter((alert) => alert.status === "active").length,
    totalRecoveredDowntimeSeconds: toSeconds(clippedDurationsMs.reduce((sum, value) => sum + value, 0)),
    longestRecoveredOutageSeconds: actualDurationsMs.length
      ? toSeconds(Math.max(...actualDurationsMs))
      : null,
    meanTimeToRecoverySeconds: actualDurationsMs.length
      ? toSeconds(actualDurationsMs.reduce((sum, value) => sum + value, 0) / actualDurationsMs.length)
      : null,
  };
}

export function assembleReliabilityAnalytics(
  rows: ReliabilityRows,
  window: Window,
): ReliabilityAnalytics | null {
  if (!rows.device) return null;
  const windowMs = Math.max(0, window.to.getTime() - window.from.getTime());
  const device = aggregateObservedStates(
    rows.deviceObservations.map((value) => ({ ...value, state: value.availability })),
    ["online", "partial", "unreachable"] as const,
    window,
  );
  const availableMs = device.byStateMs.online;
  const degradedMs = device.byStateMs.partial;
  const unavailableMs = device.byStateMs.unreachable;

  const services: ServiceReliabilityAnalytics[] = rows.services.map((service) => {
    const observed = aggregateObservedStates(
      rows.serviceObservations.filter((value) => value.serviceId === service.id)
        .map((value) => ({ ...value, state: value.status })),
      ["up", "down"] as const,
      window,
    );
    return {
      stableKey: service.stableKey,
      displayName: service.name,
      type: service.type,
      observedUpSeconds: toSeconds(observed.byStateMs.up),
      observedDownSeconds: toSeconds(observed.byStateMs.down),
      unknownSeconds: toSeconds(observed.unknownMs),
      observedSeconds: toSeconds(observed.observedMs),
      coveragePercent: roundPercent(observed.observedMs, windowMs) ?? 0,
      observedAvailabilityPercent: roundPercent(observed.byStateMs.up, observed.observedMs),
      ...calculateServiceOutages(
        rows.serviceAlerts.filter((alert) => alert.serviceId === service.id),
        window,
      ),
    };
  });

  return {
    device: {
      stableKey: rows.device.stableKey,
      displayName: rows.device.displayName,
      operationalState: rows.device.operationalState,
      monitoringType: rows.device.monitoringType,
    },
    window: serializeMonitoringHistoryWindow(window),
    evidencePolicy: { maximumGapSeconds: MAXIMUM_RELIABILITY_EVIDENCE_GAP_SECONDS },
    monitoringCoverage: {
      observedSeconds: toSeconds(device.observedMs),
      unknownSeconds: toSeconds(device.unknownMs),
      coveragePercent: roundPercent(device.observedMs, windowMs) ?? 0,
    },
    deviceAvailability: {
      availableSeconds: toSeconds(availableMs),
      degradedSeconds: toSeconds(degradedMs),
      unavailableSeconds: toSeconds(unavailableMs),
      unknownSeconds: toSeconds(device.unknownMs),
      observedAvailabilityPercent: roundPercent(availableMs + degradedMs, device.observedMs),
    },
    services,
  };
}
