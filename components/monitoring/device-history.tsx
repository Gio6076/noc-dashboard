"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock3,
  RefreshCw,
  ServerCog,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatBytes, formatDateTime, formatDuration, formatThroughput } from "@/lib/formatters";
import {
  alertHistoryPresentation,
  DEFAULT_HISTORY_WINDOW_HOURS,
  HISTORY_WINDOWS,
  type HistoryWindowHours,
  isMonitoringHistory,
  monitoringHistoryUrl,
  networkChartData,
  retainLastGoodHistory,
  serviceHistoryPresentation,
  systemChartData,
} from "@/lib/monitoring-history-ui";
import type { MonitoringHistory } from "@/types/monitoring-history";

const axisColor = "#626f80";
const gridColor = "#202938";
const tooltipStyle = {
  background: "#131922",
  border: "1px solid #303b4d",
  borderRadius: "8px",
  color: "#e7edf5",
  fontSize: "12px",
};

function localChartTime(timestamp: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function localTooltipTime(timestamp: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(timestamp));
}

function SystemHistory({ history }: { history: MonitoringHistory }) {
  const data = systemChartData(history.system, Math.max(900, history.window.durationSeconds / 10));
  const description = `CPU, memory, and disk samples persisted for ${history.device.displayName}`;

  return (
    <section className="rounded-md border bg-background/45 p-4" aria-labelledby={`system-history-${history.device.stableKey}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 id={`system-history-${history.device.stableKey}`} className="text-xs font-semibold">System telemetry</h4>
          <p className="mt-1 text-[10px] text-foreground-subtle">Actual persisted samples · no smoothing</p>
        </div>
        <span className="font-mono text-[10px] text-foreground-muted">{history.system.length} sample{history.system.length === 1 ? "" : "s"}</span>
      </div>
      {data.length === 0 ? (
        <div className="mt-4"><EmptyState title="No telemetry recorded in this window" description="CPU, memory, and disk history will appear after persisted samples overlap this window." icon={Activity} compact /></div>
      ) : (
        <figure className="mt-3" aria-label={description}>
          <div className="mb-2 flex flex-wrap gap-4 text-[10px] text-foreground-muted">
            <span><i className="mr-1.5 inline-block size-2 rounded-full bg-informational" />CPU</span>
            <span><i className="mr-1.5 inline-block size-2 rounded-full bg-warning" />Memory</span>
            <span><i className="mr-1.5 inline-block size-2 rounded-full bg-healthy" />Disk</span>
            <span className="ml-auto font-mono">%</span>
          </div>
          <div className="h-56 min-w-0" role="img" aria-label={description}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }} accessibilityLayer>
                <CartesianGrid stroke={gridColor} strokeDasharray="3 5" vertical={false} />
                <XAxis dataKey="timestamp" tickFormatter={localChartTime} tick={{ fill: axisColor, fontSize: 10 }} tickLine={false} axisLine={{ stroke: gridColor }} minTickGap={28} />
                <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} unit="%" tick={{ fill: axisColor, fontSize: 10 }} tickLine={false} axisLine={false} width={48} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#8c99aa", marginBottom: "6px" }} labelFormatter={(label) => localTooltipTime(String(label))} formatter={(value, name) => [`${Number(value).toFixed(1)}%`, name === "cpu" ? "CPU" : name === "memory" ? "Memory" : "Disk"]} />
                <Line type="linear" dataKey="cpu" stroke="#38bdf8" strokeWidth={1.75} dot={data.length <= 12 ? { r: 2.5, fill: "#38bdf8", strokeWidth: 0 } : false} connectNulls={false} isAnimationActive={false} />
                <Line type="linear" dataKey="memory" stroke="#fbbf24" strokeWidth={1.75} dot={data.length <= 12 ? { r: 2.5, fill: "#fbbf24", strokeWidth: 0 } : false} connectNulls={false} isAnimationActive={false} />
                <Line type="linear" dataKey="disk" stroke="#34d399" strokeWidth={1.75} dot={data.length <= 12 ? { r: 2.5, fill: "#34d399", strokeWidth: 0 } : false} connectNulls={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </figure>
      )}
    </section>
  );
}

function NetworkHistory({ history }: { history: MonitoringHistory }) {
  const data = networkChartData(history.network, Math.max(900, history.window.durationSeconds / 10));
  const latest = history.network.at(-1);
  const description = `Persisted inbound and outbound throughput for ${history.device.displayName}`;

  return (
    <section className="rounded-md border bg-background/45 p-4" aria-labelledby={`network-history-${history.device.stableKey}`}>
      <div className="flex items-center justify-between gap-3">
        <div><h4 id={`network-history-${history.device.stableKey}`} className="text-xs font-semibold">Network throughput</h4><p className="mt-1 text-[10px] text-foreground-subtle">Rates only · null readings remain gaps</p></div>
        <span className="font-mono text-[10px] text-foreground-muted">{history.network.length} sample{history.network.length === 1 ? "" : "s"}</span>
      </div>
      {data.length === 0 ? (
        <div className="mt-4"><EmptyState title="No network telemetry recorded" description="No persisted inbound or outbound samples overlap this window." icon={Activity} compact /></div>
      ) : (
        <>
          <figure className="mt-3" aria-label={description}>
            <div className="mb-2 flex flex-wrap gap-4 text-[10px] text-foreground-muted"><span><i className="mr-1.5 inline-block size-2 rounded-full bg-informational" />Inbound</span><span><i className="mr-1.5 inline-block size-2 rounded-full bg-healthy" />Outbound</span><span className="ml-auto">Auto-scaled bytes/s</span></div>
            <div className="h-56 min-w-0" role="img" aria-label={description}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 2 }} accessibilityLayer>
                  <CartesianGrid stroke={gridColor} strokeDasharray="3 5" vertical={false} />
                  <XAxis dataKey="timestamp" tickFormatter={localChartTime} tick={{ fill: axisColor, fontSize: 10 }} tickLine={false} axisLine={{ stroke: gridColor }} minTickGap={28} />
                  <YAxis tickFormatter={(value) => formatBytes(Number(value))} tick={{ fill: axisColor, fontSize: 10 }} tickLine={false} axisLine={false} width={60} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#8c99aa", marginBottom: "6px" }} labelFormatter={(label) => localTooltipTime(String(label))} formatter={(value, name) => [value === null ? "No data" : formatThroughput(Number(value)), name === "inbound" ? "Inbound" : "Outbound"]} />
                  <Line type="linear" dataKey="inbound" stroke="#38bdf8" strokeWidth={1.75} dot={data.length <= 12 ? { r: 2.5, fill: "#38bdf8", strokeWidth: 0 } : false} connectNulls={false} isAnimationActive={false} />
                  <Line type="linear" dataKey="outbound" stroke="#34d399" strokeWidth={1.75} dot={data.length <= 12 ? { r: 2.5, fill: "#34d399", strokeWidth: 0 } : false} connectNulls={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </figure>
          {latest && <dl className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-md border bg-border text-[10px]"><div className="bg-surface-raised p-2.5"><dt className="uppercase tracking-wide text-foreground-subtle">Latest total received</dt><dd className="mt-1 font-mono text-foreground-muted">{formatBytes(latest.totalBytesReceived)}</dd></div><div className="bg-surface-raised p-2.5"><dt className="uppercase tracking-wide text-foreground-subtle">Latest total sent</dt><dd className="mt-1 font-mono text-foreground-muted">{formatBytes(latest.totalBytesSent)}</dd></div></dl>}
        </>
      )}
    </section>
  );
}

function ServiceHistory({ history }: { history: MonitoringHistory }) {
  return (
    <section className="rounded-md border bg-background/45 p-4" aria-labelledby={`service-history-${history.device.stableKey}`}>
      <div className="flex items-center justify-between gap-3"><div><h4 id={`service-history-${history.device.stableKey}`} className="text-xs font-semibold">Service history</h4><p className="mt-1 text-[10px] text-foreground-subtle">Persisted definitions and chronological observations</p></div><span className="font-mono text-[10px] text-foreground-muted">{history.services.length} service{history.services.length === 1 ? "" : "s"}</span></div>
      {history.services.length === 0 ? <div className="mt-4"><EmptyState title="No persisted service definitions" description="No services are configured for this real monitored device." icon={ServerCog} compact /></div> : (
        <div className="mt-3 grid gap-3">{history.services.map((service) => {
          const presentation = serviceHistoryPresentation(service);
          return <article key={service.stableKey} className="rounded-md border bg-surface-raised p-3">
            <header className="flex flex-wrap items-start justify-between gap-2"><div><h5 className="text-xs font-medium">{service.displayName}</h5><p className="mt-0.5 font-mono text-[10px] text-foreground-subtle">{service.type.toUpperCase()}</p></div>{presentation.latest ? <StatusBadge status={presentation.latest.status === "up" ? "online" : "offline"} label={presentation.stateLabel} compact /> : <StatusBadge status="neutral" label="NO DATA" compact />}</header>
            {service.observations.length === 0 ? <p className="mt-3 rounded-md border border-dashed px-3 py-2 text-[11px] text-foreground-muted">No observations in this window</p> : <ol className="mt-3 space-y-1.5">{service.observations.map((observation, index) => <li key={`${observation.checkedAt}-${index}`} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded border bg-background/55 px-2.5 py-2 text-[10px]"><span className={`size-2 rounded-full ${observation.status === "up" ? "bg-healthy" : "bg-critical"}`} aria-hidden="true" /><span><strong className={observation.status === "up" ? "text-healthy" : "text-critical"}>{observation.status.toUpperCase()}</strong><time dateTime={observation.checkedAt} className="ml-2 font-mono text-foreground-muted">{formatDateTime(observation.checkedAt)}</time></span><span className="font-mono text-foreground-muted">{observation.responseTimeMs === null ? "No response time" : `${Math.round(observation.responseTimeMs)} ms`}</span></li>)}</ol>}
          </article>;
        })}</div>
      )}
    </section>
  );
}

function AlertHistory({ history }: { history: MonitoringHistory }) {
  return (
    <section className="rounded-md border bg-background/45 p-4" aria-labelledby={`alert-history-${history.device.stableKey}`}>
      <div className="flex items-center justify-between gap-3"><div><h4 id={`alert-history-${history.device.stableKey}`} className="text-xs font-semibold">Alert / outage history</h4><p className="mt-1 text-[10px] text-foreground-subtle">Occurrences overlapping the selected window</p></div><span className="font-mono text-[10px] text-foreground-muted">{history.alerts.length} occurrence{history.alerts.length === 1 ? "" : "s"}</span></div>
      {history.alerts.length === 0 ? <div className="mt-4"><EmptyState title="No alert history in this window" description="No persisted alert or outage occurrences overlap this period." icon={AlertTriangle} compact /></div> : <div className="mt-3 grid gap-3">{history.alerts.map((alert) => {
        const item = alertHistoryPresentation(alert, history.window.to);
        return <article key={alert.id} className="rounded-md border bg-surface-raised p-3">
          <header className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><StatusBadge status={alert.severity} label={alert.severity.toUpperCase()} compact /><span className="text-[10px] uppercase tracking-wide text-foreground-subtle">{alert.category}</span></div><h5 className="mt-2 text-xs font-semibold">{alert.title}</h5><p className="mt-1 text-[11px] leading-4 text-foreground-muted">{alert.message}</p></div><StatusBadge status={item.active ? "critical" : "healthy"} label={item.active ? "ACTIVE" : "RECOVERED"} compact /></header>
          <dl className="mt-3 grid gap-2 text-[10px] sm:grid-cols-2 xl:grid-cols-3"><div><dt className="text-foreground-subtle">First observed</dt><dd className="mt-0.5 font-mono text-foreground-muted">{formatDateTime(alert.firstObservedAt)}</dd></div><div><dt className="text-foreground-subtle">Last observed</dt><dd className="mt-0.5 font-mono text-foreground-muted">{formatDateTime(alert.lastObservedAt)}</dd></div><div><dt className="text-foreground-subtle">Recovered</dt><dd className="mt-0.5 font-mono text-foreground-muted">{alert.recoveredAt ? formatDateTime(alert.recoveredAt) : "Still active"}</dd></div><div><dt className="text-foreground-subtle">Duration</dt><dd className="mt-0.5 font-mono text-foreground-muted">{formatDuration(item.durationSeconds)}{item.active ? " through window end" : ""}</dd></div><div><dt className="text-foreground-subtle">Observations</dt><dd className="mt-0.5 font-mono text-foreground-muted">{alert.observationCount}</dd></div></dl>
        </article>;
      })}</div>}
    </section>
  );
}

export function DeviceHistory({ deviceKey, deviceName }: { deviceKey: string; deviceName: string }) {
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState<HistoryWindowHours>(DEFAULT_HISTORY_WINDOW_HOURS);
  const [state, setState] = useState<{ data: MonitoringHistory | null; refreshError: boolean }>({ data: null, refreshError: false });
  const [isFetching, setIsFetching] = useState(false);
  const requestRef = useRef<AbortController | null>(null);

  const fetchHistory = useCallback(async (selectedHours: HistoryWindowHours) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setIsFetching(true);
    try {
      const response = await fetch(monitoringHistoryUrl(deviceKey, selectedHours), { cache: "no-store", signal: controller.signal });
      const result: unknown = response.ok ? await response.json() : null;
      setState((current) => retainLastGoodHistory(current, isMonitoringHistory(result) ? result : null));
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) setState((current) => retainLastGoodHistory(current, null));
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setIsFetching(false);
      }
    }
  }, [deviceKey]);

  useEffect(() => () => requestRef.current?.abort(), []);

  return (
    <section className="mt-4 border-t pt-4" aria-label={`${deviceName} persisted history`}>
      <button type="button" aria-expanded={open} onClick={() => {
        const nextOpen = !open;
        setOpen(nextOpen);
        if (nextOpen) void fetchHistory(hours);
        else requestRef.current?.abort();
      }} className="flex w-full items-center justify-between gap-3 rounded-md border bg-background/45 px-3 py-2.5 text-left hover:bg-surface-overlay">
        <span><span className="block text-xs font-semibold">Persisted monitoring history</span><span className="mt-0.5 block text-[10px] text-foreground-subtle">Real PostgreSQL telemetry · fetched on demand</span></span>
        {open ? <ChevronUp aria-hidden="true" size={16} /> : <ChevronDown aria-hidden="true" size={16} />}
      </button>
      {open && <div className="mt-3 rounded-md border bg-surface p-3 sm:p-4">
        <div className="flex flex-col gap-3 border-b pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div><h3 className="text-sm font-semibold">History · {deviceName}</h3>{state.data && <p className="mt-1 text-[10px] text-foreground-muted"><Clock3 className="mr-1 inline" size={11} aria-hidden="true" />{formatDateTime(state.data.window.from)} — {formatDateTime(state.data.window.to)}</p>}{state.refreshError && <p className="mt-1 text-[10px] text-warning" role="status">History refresh failed · showing last successful data</p>}{isFetching && <p className="mt-1 text-[10px] text-foreground-muted" role="status">Loading persisted history…</p>}</div>
          <div className="flex flex-wrap items-center gap-2"><fieldset className="flex rounded-md border bg-background p-0.5"><legend className="sr-only">History window</legend>{HISTORY_WINDOWS.map((window) => <button key={window.hours} type="button" aria-pressed={hours === window.hours} onClick={() => {
            if (hours === window.hours) return;
            setHours(window.hours);
            void fetchHistory(window.hours);
          }} className={`rounded px-2.5 py-1.5 text-[10px] font-medium ${hours === window.hours ? "bg-informational-muted text-informational" : "text-foreground-muted hover:text-foreground"}`}>{window.label}</button>)}</fieldset><button type="button" disabled={isFetching} onClick={() => void fetchHistory(hours)} className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-[10px] font-medium text-foreground-muted hover:bg-surface-overlay hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"><RefreshCw aria-hidden="true" size={12} className={isFetching ? "animate-spin" : ""} />Refresh</button></div>
        </div>
        {!state.data && !isFetching ? <div className="py-4"><EmptyState title="Historical data unavailable" description="Persisted history could not be loaded. Use Refresh to try again." icon={Activity} compact /></div> : state.data && <div className="mt-4 grid gap-4 xl:grid-cols-2"><SystemHistory history={state.data} /><NetworkHistory history={state.data} /><div className="xl:col-span-2"><ServiceHistory history={state.data} /></div><div className="xl:col-span-2"><AlertHistory history={state.data} /></div></div>}
      </div>}
    </section>
  );
}
