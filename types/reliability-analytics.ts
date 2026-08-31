import type { MonitoringHistoryWindow } from "./monitoring-history.ts";

export interface ReliabilityAnalytics {
  device: {
    stableKey: string;
    displayName: string;
    operationalState: "monitored" | "maintenance" | "disabled";
    monitoringType: "agent";
  };
  window: MonitoringHistoryWindow;
  evidencePolicy: { maximumGapSeconds: number };
  monitoringCoverage: {
    observedSeconds: number;
    unknownSeconds: number;
    coveragePercent: number;
  };
  deviceAvailability: {
    availableSeconds: number;
    degradedSeconds: number;
    unavailableSeconds: number;
    unknownSeconds: number;
    observedAvailabilityPercent: number | null;
  };
  services: readonly ServiceReliabilityAnalytics[];
}

export interface ServiceReliabilityAnalytics {
  stableKey: string;
  displayName: string;
  type: "tcp" | "http" | "https";
  observedUpSeconds: number;
  observedDownSeconds: number;
  unknownSeconds: number;
  observedSeconds: number;
  coveragePercent: number;
  observedAvailabilityPercent: number | null;
  outageCount: number;
  recoveredOutageCount: number;
  activeOutageCount: number;
  totalRecoveredDowntimeSeconds: number;
  longestRecoveredOutageSeconds: number | null;
  meanTimeToRecoverySeconds: number | null;
}
