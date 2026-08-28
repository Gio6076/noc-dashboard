import type { NetworkIncident } from "@/types/network";

export interface IncidentSummary {
  total: number;
  active: number;
  critical: number;
  investigating: number;
  resolved: number;
}

export function summarizeIncidents(
  incidents: readonly NetworkIncident[],
): IncidentSummary {
  return {
    total: incidents.length,
    active: incidents.filter((incident) => incident.status === "active").length,
    critical: incidents.filter((incident) => incident.severity === "critical")
      .length,
    investigating: incidents.filter(
      (incident) => incident.status === "investigating",
    ).length,
    resolved: incidents.filter((incident) => incident.status === "resolved")
      .length,
  };
}

export function calculateIncidentDurationSeconds(
  incident: NetworkIncident,
  referenceTime: string,
): number {
  const endTime = incident.resolvedAt ?? referenceTime;
  return Math.max(
    0,
    Math.floor((Date.parse(endTime) - Date.parse(incident.startedAt)) / 1_000),
  );
}
