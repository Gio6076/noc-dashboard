export type CollectorFailureCategory =
  | "configuration_error"
  | "database_error"
  | "collection_error"
  | "lock_unavailable"
  | "startup_error";

type CollectorLogEvent =
  | {
      event: "collector_starting";
      timestamp: string;
      processStartedAt: string;
      collectionIntervalSeconds: number;
      pid: number;
      runtime: string;
      platform: NodeJS.Platform;
      architecture: string;
    }
  | { event: "collection_cycle_started"; startedAt: string }
  | {
      event: "collection_cycle_completed";
      runId: string;
      status: "completed" | "partial";
      startedAt: string;
      completedAt: string;
      durationMs: number;
      devicesAttempted: number;
      devicesSucceeded: number;
      devicesFailed: number;
      alertsDetected: number;
    }
  | {
      event: "collection_cycle_failed";
      category: CollectorFailureCategory;
      timestamp: string;
      startedAt: string;
      completedAt: string;
      durationMs: number;
      retry: true;
      nextRetryDelayMs: number;
    }
  | { event: "collector_shutdown_requested"; timestamp: string; signal: "SIGINT" | "SIGTERM" }
  | { event: "collector_stopped"; timestamp: string; totalCyclesCompleted: number }
  | { event: "collector_lock_unavailable"; timestamp: string; category: "lock_unavailable" }
  | { event: "collector_startup_failed"; timestamp: string; category: CollectorFailureCategory };

export function serializeCollectorEvent(event: CollectorLogEvent): string {
  const allowedFields: Record<CollectorLogEvent["event"], readonly string[]> = {
    collector_starting: ["event", "timestamp", "processStartedAt", "collectionIntervalSeconds", "pid", "runtime", "platform", "architecture"],
    collection_cycle_started: ["event", "startedAt"],
    collection_cycle_completed: ["event", "runId", "status", "startedAt", "completedAt", "durationMs", "devicesAttempted", "devicesSucceeded", "devicesFailed", "alertsDetected"],
    collection_cycle_failed: ["event", "category", "timestamp", "startedAt", "completedAt", "durationMs", "retry", "nextRetryDelayMs"],
    collector_shutdown_requested: ["event", "timestamp", "signal"],
    collector_stopped: ["event", "timestamp", "totalCyclesCompleted"],
    collector_lock_unavailable: ["event", "timestamp", "category"],
    collector_startup_failed: ["event", "timestamp", "category"],
  };
  const source = event as unknown as Record<string, unknown>;
  return JSON.stringify(Object.fromEntries(allowedFields[event.event].map((key) => [key, source[key]])));
}

export function collectorFailureCategory(error: unknown): CollectorFailureCategory {
  if (!(error instanceof Error)) return "collection_error";
  const name = error.name.toLowerCase();
  if (name.includes("postgres") || name.includes("database") || name.includes("drizzle")) {
    return "database_error";
  }
  const code = (error as NodeJS.ErrnoException).code;
  if (code === "ECONNREFUSED" || (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code))) {
    return "database_error";
  }
  if (error instanceof AggregateError) {
    const nested = Array.from(error.errors as Iterable<unknown>);
    if (nested.some((cause) => collectorFailureCategory(cause) === "database_error")) {
      return "database_error";
    }
  }
  return "collection_error";
}
