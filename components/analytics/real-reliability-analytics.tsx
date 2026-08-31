"use client";

import { Database, RefreshCw, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { evidenceCoveragePresentation, formatReliabilityDuration, formatReliabilityPercentage, isReliabilityAnalytics, RELIABILITY_WINDOWS, reliabilityRequestPath, retainLastGoodReliabilityData, type ReliabilityWindowHours } from "@/lib/reliability-presentation";
import type { ReliabilityAnalytics, ServiceReliabilityAnalytics } from "@/types/reliability-analytics";

export interface ReliabilityDeviceOption { stableKey: string; displayName: string; operationalState: "monitored" | "maintenance" | "disabled"; }
interface Props { devices: readonly ReliabilityDeviceOption[]; initialData: ReliabilityAnalytics | null; }
const coverageClasses = { high: "border-healthy/25 bg-healthy-muted text-healthy", moderate: "border-warning/25 bg-warning-muted text-warning", low: "border-critical/25 bg-critical-muted text-critical", none: "border-border-strong bg-surface-raised text-foreground-muted" } as const;

function CoverageBadge({ percent }: { percent: number }) {
  const coverage = evidenceCoveragePresentation(percent);
  return <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold tracking-wide ${coverageClasses[coverage.level]}`}>{coverage.label}</span>;
}
function EvidenceMetric({ label, seconds }: { label: string; seconds: number }) {
  return <div className="rounded-md border bg-background/45 p-3"><p className="text-[10px] font-medium uppercase tracking-wide text-foreground-subtle">{label}</p><p className="mt-1 font-mono text-sm font-semibold">{formatReliabilityDuration(seconds)}</p></div>;
}
function EvidenceBreakdown({ data }: { data: ReliabilityAnalytics }) {
  const values = [
    { label: "Observed available", seconds: data.deviceAvailability.availableSeconds, className: "bg-healthy" },
    { label: "Observed degraded", seconds: data.deviceAvailability.degradedSeconds, className: "bg-warning" },
    { label: "Observed unavailable", seconds: data.deviceAvailability.unavailableSeconds, className: "bg-critical" },
    { label: "Unknown / unobserved", seconds: data.deviceAvailability.unknownSeconds, className: "bg-foreground-subtle" },
  ];
  return <Panel title="Device Evidence Breakdown" description={`Aggregate evidence under the ${data.evidencePolicy.maximumGapSeconds}-second maximum evidence-gap policy. Unknown time is never treated as uptime.`}>
    <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-overlay" role="img" aria-label={values.map(({ label, seconds }) => `${label}: ${formatReliabilityDuration(seconds)}`).join("; ")}>
      {values.map((item) => <span key={item.label} className={item.className} style={{ width: `${data.window.durationSeconds > 0 ? (item.seconds / data.window.durationSeconds) * 100 : 0}%` }} />)}
    </div>
    <div className="mt-3 grid gap-3 min-[30rem]:grid-cols-2 xl:grid-cols-4">{values.map(({ label, seconds }) => <EvidenceMetric key={label} label={label} seconds={seconds} />)}</div>
  </Panel>;
}
function ServiceCard({ service }: { service: ServiceReliabilityAnalytics }) {
  const coverage = evidenceCoveragePresentation(service.coveragePercent);
  const metrics = [
    ["Observed UP time", formatReliabilityDuration(service.observedUpSeconds)], ["Observed DOWN evidence", formatReliabilityDuration(service.observedDownSeconds)],
    ["Unknown / unobserved time", formatReliabilityDuration(service.unknownSeconds)], ["Outage occurrences", String(service.outageCount)],
    ["Recovered outages", String(service.recoveredOutageCount)], ["Active outages", String(service.activeOutageCount)],
    ["Recovered outage duration in window", service.recoveredOutageCount > 0 ? formatReliabilityDuration(service.totalRecoveredDowntimeSeconds) : "—"],
    ["Longest recovered outage", formatReliabilityDuration(service.longestRecoveredOutageSeconds)], ["Mean Time to Recovery (MTTR)", formatReliabilityDuration(service.meanTimeToRecoverySeconds)],
  ] as const;
  return <article className="rounded-md border bg-background/45 p-4">
    <header className="flex flex-wrap items-start justify-between gap-3 border-b pb-3"><div><h4 className="text-sm font-semibold">{service.displayName}</h4><p className="mt-1 font-mono text-[10px] text-foreground-subtle">{service.type.toUpperCase()}</p></div><div className="text-right"><p className="font-mono text-xl font-semibold">{formatReliabilityPercentage(service.observedAvailabilityPercent)}</p><p className="text-[10px] text-foreground-muted">of observed service time</p></div></header>
    <div className="mt-3 flex flex-wrap items-center gap-2"><span className="font-mono text-xs">{formatReliabilityPercentage(service.coveragePercent)} monitored</span><CoverageBadge percent={service.coveragePercent} /></div><p className="mt-2 text-xs text-foreground-muted">{coverage.explanation}</p>
    <dl className="mt-4 grid gap-x-5 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">{metrics.map(([label, value]) => <div key={label}><dt className="text-[10px] uppercase tracking-wide text-foreground-subtle">{label}</dt><dd className="mt-1 font-mono text-xs font-semibold">{value}</dd></div>)}</dl>
  </article>;
}

export function ReliabilityAnalyticsView({ data }: { data: ReliabilityAnalytics }) {
  const coverage = evidenceCoveragePresentation(data.monitoringCoverage.coveragePercent);
  const operationalTone = data.device.operationalState === "monitored" ? "informational" : data.device.operationalState === "maintenance" ? "maintenance" : "neutral";
  return <div className="space-y-4">
    <div className="rounded-md border bg-surface-raised p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-3"><div><p className="text-[10px] uppercase tracking-wide text-foreground-subtle">Operational state</p><div className="mt-1"><StatusBadge status={operationalTone} label={data.device.operationalState.toUpperCase()} compact /></div></div><p className="max-w-md text-right text-[11px] text-foreground-muted">Operational state is configuration context. Availability below comes only from persisted observations and is not caused by maintenance state.</p></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-md border border-informational/25 bg-informational-muted p-4"><div className="flex items-center gap-2 text-informational"><ShieldCheck aria-hidden="true" size={16} /><p className="text-xs font-semibold">Observed Availability</p></div><p className="mt-3 font-mono text-3xl font-semibold">{formatReliabilityPercentage(data.deviceAvailability.observedAvailabilityPercent)}</p><p className="mt-1 text-xs text-foreground-muted">of observed time</p></div><div className="rounded-md border bg-background/45 p-4"><div className="flex items-center gap-2"><Database aria-hidden="true" size={16} /><p className="text-xs font-semibold">Monitoring Coverage</p></div><p className="mt-3 font-mono text-3xl font-semibold">{formatReliabilityPercentage(data.monitoringCoverage.coveragePercent)}</p><div className="mt-2"><CoverageBadge percent={data.monitoringCoverage.coveragePercent} /></div><p className="mt-2 text-xs text-foreground-muted">{coverage.explanation}</p></div></div>
    </div>
    <EvidenceBreakdown data={data} />
    <Panel title="Service Reliability" description="Availability and evidence completeness for every persisted configured service. Outage counts come from persistent alert occurrences, not repeated DOWN samples.">
      <p className="mb-4 rounded-md border border-informational/25 bg-informational-muted px-3 py-2 text-xs text-foreground-muted"><strong className="text-foreground">Observed DOWN evidence</strong> uses service samples with valid monitoring evidence. <strong className="text-foreground">Recovered outage duration</strong> uses persistent alert occurrence timestamps. MTTR is the average full duration of recovered occurrences and excludes active outages.</p>
      {data.services.length === 0 ? <p className="text-xs text-foreground-muted">No persisted service definitions are configured for this device.</p> : <div className="grid gap-3">{data.services.map((service) => <ServiceCard key={service.stableKey} service={service} />)}</div>}
    </Panel>
  </div>;
}

export function RealReliabilityAnalytics({ devices, initialData }: Props) {
  const [deviceKey, setDeviceKey] = useState(initialData?.device.stableKey ?? devices[0]?.stableKey ?? "");
  const [hours, setHours] = useState<ReliabilityWindowHours>(24);
  const [state, setState] = useState({ data: initialData, refreshError: false });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const requestSequence = useRef(0);
  const refresh = useCallback(async (nextDeviceKey: string, nextHours: ReliabilityWindowHours) => {
    if (!nextDeviceKey) return;
    controller.current?.abort();
    const requestController = new AbortController(); controller.current = requestController;
    const sequence = ++requestSequence.current; setIsRefreshing(true);
    try {
      const response = await fetch(reliabilityRequestPath(nextDeviceKey, nextHours), { cache: "no-store", signal: requestController.signal });
      const result: unknown = response.ok ? await response.json() : null;
      if (sequence === requestSequence.current) setState((current) => retainLastGoodReliabilityData(current, isReliabilityAnalytics(result) ? result : null));
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (sequence === requestSequence.current) setState((current) => retainLastGoodReliabilityData(current, null));
    } finally { if (sequence === requestSequence.current) setIsRefreshing(false); }
  }, []);
  useEffect(() => () => controller.current?.abort(), []);
  function selectDevice(next: string) { setDeviceKey(next); void refresh(next, hours); }
  function selectWindow(next: ReliabilityWindowHours) { setHours(next); void refresh(deviceKey, next); }
  return <section aria-labelledby="real-reliability-heading" className="space-y-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 id="real-reliability-heading" className="text-sm font-semibold">Real Monitoring Reliability</h2><p className="mt-1 text-xs leading-5 text-foreground-muted">PostgreSQL-backed analytics from actual persisted monitoring evidence. These are monitoring analytics, not contractual SLA/SLO calculations.</p></div><StatusBadge status="informational" label="Persisted evidence" compact /></div>
    <div className="flex flex-col gap-3 rounded-md border bg-surface p-3 sm:flex-row sm:flex-wrap sm:items-end"><label className="flex min-w-48 flex-1 flex-col gap-1 text-[10px] font-medium uppercase tracking-wide text-foreground-muted">Real monitored device<select aria-label="Real monitored device" value={deviceKey} onChange={(event) => selectDevice(event.target.value)} disabled={devices.length === 0} className="rounded-md border bg-surface-raised px-3 py-2 text-xs normal-case text-foreground"><option value="" disabled>Select a persisted device</option>{devices.map((device) => <option key={device.stableKey} value={device.stableKey}>{device.displayName}</option>)}</select></label><fieldset><legend className="mb-1 text-[10px] font-medium uppercase tracking-wide text-foreground-muted">Analysis window</legend><div className="flex rounded-md border bg-surface-raised p-1">{RELIABILITY_WINDOWS.map((window) => <button key={window.hours} type="button" aria-pressed={hours === window.hours} onClick={() => selectWindow(window.hours)} className={`rounded px-2.5 py-1.5 text-xs font-medium ${hours === window.hours ? "bg-informational-muted text-informational" : "text-foreground-muted hover:text-foreground"}`}>{window.label}</button>)}</div></fieldset><button type="button" aria-label="Refresh real reliability analytics" onClick={() => void refresh(deviceKey, hours)} disabled={!deviceKey || isRefreshing} className="inline-flex items-center justify-center gap-2 rounded-md border bg-surface-raised px-3 py-2 text-xs font-medium hover:bg-surface-overlay disabled:cursor-not-allowed disabled:opacity-60"><RefreshCw aria-hidden="true" size={13} className={isRefreshing ? "animate-spin" : ""} />Refresh</button></div>
    <div aria-live="polite">{state.refreshError && <p className="mb-3 rounded-md border border-warning/25 bg-warning-muted px-3 py-2 text-xs text-warning">Refresh failed · showing the last successful reliability result.</p>}{isRefreshing && state.data && <p className="mb-3 text-xs text-foreground-muted">Loading updated persisted evidence…</p>}{state.data ? <ReliabilityAnalyticsView data={state.data} /> : <Panel><p className="text-xs text-foreground-muted">{devices.length === 0 ? "No persisted monitored devices are registered." : isRefreshing ? "Loading reliability analytics…" : "Reliability analytics are unavailable."}</p></Panel>}</div>
  </section>;
}
