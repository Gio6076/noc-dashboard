import type { ReliabilityAnalytics } from "../types/reliability-analytics.ts";

export const RELIABILITY_WINDOWS = [
  { label: "1h", hours: 1 }, { label: "6h", hours: 6 },
  { label: "24h", hours: 24 }, { label: "7d", hours: 168 },
] as const;
export type ReliabilityWindowHours = (typeof RELIABILITY_WINDOWS)[number]["hours"];
export type EvidenceCoverageLevel = "high" | "moderate" | "low" | "none";
export interface ReliabilityClientState { data: ReliabilityAnalytics | null; refreshError: boolean; }

export function evidenceCoveragePresentation(coveragePercent: number) {
  const level: EvidenceCoverageLevel = coveragePercent >= 90 ? "high" : coveragePercent >= 50 ? "moderate" : coveragePercent > 0 ? "low" : "none";
  return {
    level,
    label: level === "high" ? "HIGH COVERAGE" : level === "moderate" ? "MODERATE COVERAGE" : level === "low" ? "LOW COVERAGE" : "NO COVERAGE",
    explanation: level === "none" ? "No availability estimate is available because no monitoring evidence was recorded in this window." : level === "low" ? "Availability is based on limited observed monitoring time." : level === "moderate" ? "Availability is based on a partially observed monitoring window." : "Availability is supported by monitoring evidence across most of this window.",
  } as const;
}

export function formatReliabilityPercentage(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "Not measurable";
  return `${value.toFixed(value > 0 && value < 1 ? 2 : 1).replace(/\.0$/, "")}%`;
}

export function formatReliabilityDuration(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const seconds = Math.max(0, value);
  if (seconds < 60) return `${seconds.toFixed(Number.isInteger(seconds) ? 0 : 1)}s`;
  const wholeSeconds = Math.round(seconds);
  const days = Math.floor(wholeSeconds / 86_400);
  const hours = Math.floor((wholeSeconds % 86_400) / 3_600);
  const minutes = Math.floor((wholeSeconds % 3_600) / 60);
  const remainder = wholeSeconds % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m ${remainder}s`;
  if (hours > 0) return `${hours}h ${minutes}m ${remainder}s`;
  return `${minutes}m ${remainder}s`;
}

export function reliabilityRequestPath(deviceKey: string, hours: ReliabilityWindowHours): string {
  return `/api/monitoring/reliability/${encodeURIComponent(deviceKey)}?hours=${hours}`;
}
export function retainLastGoodReliabilityData(state: ReliabilityClientState, result: ReliabilityAnalytics | null): ReliabilityClientState {
  return result ? { data: result, refreshError: false } : { ...state, refreshError: true };
}
export function isReliabilityAnalytics(value: unknown): value is ReliabilityAnalytics {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ReliabilityAnalytics>;
  return Boolean(candidate.device && candidate.window && candidate.monitoringCoverage && candidate.deviceAvailability && Array.isArray(candidate.services));
}
