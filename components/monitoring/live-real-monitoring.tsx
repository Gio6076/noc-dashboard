"use client";

import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { RealMonitoredDevices } from "@/components/agent/real-monitored-devices";
import { RealMonitoringAlerts } from "@/components/alerts/real-monitoring-alerts";
import { retainLastGoodMonitoringData } from "@/lib/live-monitoring";
import type { LiveMonitoringResponse } from "@/types/live-monitoring";

export const LIVE_MONITORING_POLL_INTERVAL_MS = 10_000;

interface LiveRealMonitoringProps {
  initialData: LiveMonitoringResponse;
  showDevices?: boolean;
  showAlerts?: boolean;
  compactAlerts?: boolean;
}

function isLiveMonitoringResponse(value: unknown): value is LiveMonitoringResponse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<LiveMonitoringResponse>;
  return (
    Array.isArray(candidate.snapshots) &&
    Array.isArray(candidate.alerts) &&
    typeof candidate.fetchedAt === "string"
  );
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
      const response = await fetch("/api/monitoring/snapshots", {
        cache: "no-store",
      });
      const result: unknown = response.ok ? await response.json() : null;
      if (!mounted.current) return;
      setState((current) =>
        retainLastGoodMonitoringData(
          current,
          isLiveMonitoringResponse(result) ? result : null,
        ),
      );
    } catch {
      if (mounted.current) {
        setState((current) => retainLastGoodMonitoringData(current, null));
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
      <div className="flex flex-wrap items-center justify-end gap-3 text-[11px] text-foreground-muted" aria-live="polite">
        <span>
          {state.refreshError
            ? "Refresh failed · showing last successful data"
            : isRefreshing
              ? "Refreshing…"
              : `Last updated: ${new Date(state.data.fetchedAt).toLocaleTimeString()}`}
        </span>
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
      {showDevices && <RealMonitoredDevices snapshots={state.data.snapshots} alerts={state.data.alerts} />}
      {showAlerts && <RealMonitoringAlerts alerts={state.data.alerts} compact={compactAlerts} />}
    </div>
  );
}
