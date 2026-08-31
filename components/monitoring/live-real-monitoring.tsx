"use client";

import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { RealMonitoredDevices } from "@/components/agent/real-monitored-devices";
import { RealMonitoringAlerts } from "@/components/alerts/real-monitoring-alerts";
import {
  collectionFreshnessLabel,
  isPersistedMonitoringState,
  retainLastGoodPersistedMonitoringData,
} from "@/lib/persisted-monitoring-ui";
import type { PersistedMonitoringState } from "@/types/persisted-monitoring";

export const LIVE_MONITORING_POLL_INTERVAL_MS = 10_000;

interface LiveRealMonitoringProps {
  initialData: PersistedMonitoringState;
  showDevices?: boolean;
  showAlerts?: boolean;
  compactAlerts?: boolean;
}

export function LiveRealMonitoring({
  initialData,
  showDevices = false,
  showAlerts = false,
  compactAlerts = false,
}: LiveRealMonitoringProps) {
  const [state, setState] = useState({ data: initialData, refreshError: false });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const requestInFlight = useRef(false);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setIsRefreshing(true);

    try {
      const response = await fetch("/api/monitoring/persisted", {
        cache: "no-store",
      });
      const result: unknown = response.ok ? await response.json() : null;
      if (!mounted.current) return;
      setState((current) =>
        retainLastGoodPersistedMonitoringData(
          current,
          isPersistedMonitoringState(result) ? result : null,
        ),
      );
    } catch {
      if (mounted.current) {
        setState((current) => retainLastGoodPersistedMonitoringData(current, null));
      }
    } finally {
      requestInFlight.current = false;
      if (mounted.current) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    const timer = window.setInterval(() => void refresh(), LIVE_MONITORING_POLL_INTERVAL_MS);
    return () => {
      mounted.current = false;
      window.clearInterval(timer);
    };
  }, [refresh]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-surface-raised px-3 py-2 text-[11px] text-foreground-muted" aria-live="polite">
        <div>
          <p className={state.data.collection.freshness.status === "stale" ? "font-medium text-warning" : state.data.collection.freshness.status === "unavailable" ? "font-medium text-foreground-muted" : "font-medium text-healthy"}>
            {collectionFreshnessLabel(state.data)}
          </p>
          {state.refreshError && <p className="mt-0.5 text-warning">Refresh failed · showing last successful persisted data</p>}
          {isRefreshing && <p className="mt-0.5">Checking PostgreSQL for updates…</p>}
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 rounded-md border bg-surface-raised px-2.5 py-1.5 font-medium text-foreground transition-colors hover:bg-surface-overlay disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw aria-hidden="true" size={12} className={isRefreshing ? "animate-spin" : ""} />
          Refresh now
        </button>
      </div>
      {showDevices && <RealMonitoredDevices devices={state.data.devices} />}
      {showAlerts && <RealMonitoringAlerts devices={state.data.devices} compact={compactAlerts} />}
    </div>
  );
}
