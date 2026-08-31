export const PERSISTED_MONITORING_FLAG = "NOC_PERSISTED_MONITORING_ENABLED";

export type MonitoringCapabilityStatus = "available" | "disabled" | "unavailable";

export type MonitoringCapabilityResult<T> =
  | { status: "available"; data: T }
  | { status: "disabled" }
  | { status: "unavailable" };

export function parsePersistedMonitoringFlag(
  value: string | undefined,
): "enabled" | "disabled" {
  return value?.trim() === "true" ? "enabled" : "disabled";
}

export type PersistedMonitoringConfiguration =
  | { status: "enabled"; databaseUrl: string }
  | { status: "disabled" }
  | { status: "unavailable" };

export function resolvePersistedMonitoringConfiguration(
  flag: string | undefined,
  databaseUrl: string | undefined,
): PersistedMonitoringConfiguration {
  if (parsePersistedMonitoringFlag(flag) === "disabled") return { status: "disabled" };
  const normalizedUrl = databaseUrl?.trim();
  return normalizedUrl
    ? { status: "enabled", databaseUrl: normalizedUrl }
    : { status: "unavailable" };
}

export async function evaluatePersistedMonitoringCapability<T>(
  configuration: PersistedMonitoringConfiguration,
  read: (databaseUrl: string) => Promise<T>,
): Promise<MonitoringCapabilityResult<T>> {
  if (configuration.status !== "enabled") return configuration;
  try {
    return { status: "available", data: await read(configuration.databaseUrl) };
  } catch {
    return { status: "unavailable" };
  }
}

export const monitoringCapabilityPresentation = {
  disabled: {
    title: "Real monitoring unavailable",
    description:
      "This section connects to the private monitoring lab when its persisted backend is available. The demo NOC below remains fully interactive.",
    detail: "Local monitoring backend not configured for this deployment.",
  },
  unavailable: {
    title: "Real monitoring unavailable",
    description:
      "Persisted monitoring is temporarily unavailable. The demo NOC below remains fully interactive.",
    detail: "No device or alert state is inferred while the backend is unavailable.",
  },
} as const;

export type MonitoringApiSurface = "current" | "history" | "reliability";

export function monitoringCapabilityApiError(
  status: Exclude<MonitoringCapabilityStatus, "available">,
  surface: MonitoringApiSurface,
) {
  const unavailableMessage = {
    current: "Persisted monitoring data is temporarily unavailable.",
    history: "Historical monitoring data is temporarily unavailable.",
    reliability: "Reliability analytics are temporarily unavailable.",
  }[surface];
  return {
    error: status === "disabled"
      ? "Persisted monitoring is not enabled for this deployment."
      : unavailableMessage,
    capability: status,
  } as const;
}
