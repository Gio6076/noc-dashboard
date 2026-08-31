import { ArrowDownToLine, ArrowUpFromLine, Database, MemoryStick, MonitorCog } from "lucide-react";
import { MetricCard } from "@/components/ui/metric-card";
import { Panel } from "@/components/ui/panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatBytes, formatDateTime, formatThroughput, formatUptime } from "@/lib/formatters";
import { freshnessLabel, persistedDevicePresentation } from "@/lib/persisted-monitoring-ui";
import type { PersistedDeviceCurrentState } from "@/types/persisted-monitoring";

interface RealMonitoredDevicesProps { devices: readonly PersistedDeviceCurrentState[]; }

function ServicesSection({ state }: { state: PersistedDeviceCurrentState }) {
  const healthy = state.services.filter((service) => service.latestObservation?.status === "up").length;
  const observed = state.services.filter((service) => service.latestObservation).length;
  return (
    <section className="mt-4 rounded-md border bg-background/45 p-4" aria-label={`${state.device.displayName} services`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold">Persisted service state</p>
        {state.services.length > 0 && <span className="font-mono text-[10px] text-foreground-muted">{healthy}/{state.services.length} healthy · {observed} observed</span>}
      </div>
      {state.services.length === 0 ? <p className="mt-3 text-xs text-foreground-muted">No persisted service definitions</p> : (
        <ul className="mt-3 divide-y divide-border">{state.services.map((service) => (
          <li className="grid items-center gap-2 py-2 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto_auto]" key={service.stableKey}>
            <div className="min-w-0"><p className="truncate text-xs font-medium text-foreground">{service.displayName}</p><p className="mt-0.5 font-mono text-[10px] text-foreground-subtle">{service.type.toUpperCase()}{service.latestObservation?.httpStatusCode !== null && service.latestObservation?.httpStatusCode !== undefined ? ` · HTTP ${service.latestObservation.httpStatusCode}` : ""}</p></div>
            {service.latestObservation ? <StatusBadge status={service.latestObservation.status === "up" ? "online" : "offline"} label={service.latestObservation.status.toUpperCase()} compact /> : <StatusBadge status="neutral" label="NO OBSERVATION" compact />}
            <span className="text-right font-mono text-[10px] text-foreground-muted">{service.latestObservation ? `${service.latestObservation.responseTimeMs === null ? "—" : `${Math.round(service.latestObservation.responseTimeMs)} ms`} · ${formatDateTime(service.latestObservation.checkedAt)}` : "Unavailable"}</span>
          </li>
        ))}</ul>
      )}
    </section>
  );
}

function DeviceCard({ state }: { state: PersistedDeviceCurrentState }) {
  const { device, latestObservation, system, network } = state;
  const presentation = persistedDevicePresentation(state);
  const availability = presentation.availability;
  const availabilityTone = availability === "online" ? "online" : availability === "partial" ? "warning" : availability === "unreachable" ? "offline" : "neutral";
  const availabilityLabel = presentation.availabilityLabel;
  return (
    <article className="rounded-md border bg-surface-raised p-4">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div className="flex min-w-0 items-start gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-background text-informational"><MonitorCog aria-hidden="true" size={17} /></span><div className="min-w-0"><h3 className="font-mono text-sm font-semibold">{device.displayName}</h3><p className="mt-1 text-xs text-foreground-muted">Latest observation: {latestObservation ? formatDateTime(latestObservation.observedAt) : "Unavailable"}</p></div></div>
        <div className="flex flex-wrap justify-end gap-2"><StatusBadge status={device.operationalState === "monitored" ? "informational" : device.operationalState === "maintenance" ? "maintenance" : "neutral"} label={device.operationalState.toUpperCase()} compact /><StatusBadge status={availabilityTone} label={availabilityLabel} compact /></div>
      </header>
      {device.operationalState === "maintenance" && <p className="mt-3 rounded-md border border-warning/25 bg-warning-muted px-3 py-2 text-xs text-warning">Maintenance is an operational state; persisted availability remains shown separately.</p>}
      {state.alerts.length > 0 && <p className="mt-3 font-mono text-[10px] font-medium uppercase tracking-wide text-critical">{state.alerts.length} active persistent alert{state.alerts.length === 1 ? "" : "s"}</p>}
      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <div className="space-y-4 rounded-md border bg-background/45 p-4 xl:col-span-5">
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold">System</p><span className={`text-[10px] ${system?.freshness.status === "stale" ? "text-warning" : "text-foreground-muted"}`}>{system ? freshnessLabel(system.freshness.status, system.freshness.ageSeconds) : "Telemetry unavailable"}</span></div>
          {system ? <><ProgressBar value={system.cpuUsagePercent} label="CPU usage" /><ProgressBar value={system.memoryUsagePercent} label="Memory usage" /><ProgressBar value={system.diskUsagePercent} label="Disk usage" /><div className="grid gap-2 pt-1 text-xs sm:grid-cols-2"><span><span className="text-foreground-subtle">Uptime</span><strong className="ml-2 font-mono">{formatUptime(system.uptimeSeconds)}</strong></span><span><span className="text-foreground-subtle">Sample</span><strong className="ml-2 font-mono">{formatDateTime(system.observedAt)}</strong></span></div></> : <p className="text-xs text-foreground-muted">No historical system telemetry is available.</p>}
        </div>
        <div className="xl:col-span-7">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold">Network</p><span className={`text-[10px] ${network?.freshness.status === "stale" ? "text-warning" : "text-foreground-muted"}`}>{network ? freshnessLabel(network.freshness.status, network.freshness.ageSeconds) : "Telemetry unavailable"}</span></div>
          {network ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><MetricCard label="Inbound" value={network.inboundBytesPerSecond === null ? "Unavailable" : formatThroughput(network.inboundBytesPerSecond)} icon={ArrowDownToLine} supportingText={`Sample ${formatDateTime(network.observedAt)}`} /><MetricCard label="Outbound" value={network.outboundBytesPerSecond === null ? "Unavailable" : formatThroughput(network.outboundBytesPerSecond)} icon={ArrowUpFromLine} supportingText={`Sample ${formatDateTime(network.observedAt)}`} /><MetricCard label="Total received" value={formatBytes(network.bytesReceived)} icon={Database} supportingText="Exact persisted counter" /><MetricCard label="Total sent" value={formatBytes(network.bytesSent)} icon={MemoryStick} supportingText="Exact persisted counter" /></div> : <div className="rounded-md border bg-background/45 p-4 text-xs text-foreground-muted">No historical network telemetry is available.</div>}
        </div>
      </div>
      <ServicesSection state={state} />
    </article>
  );
}

export function RealMonitoredDevices({ devices }: RealMonitoredDevicesProps) {
  const maintenanceCount = devices.filter(({ device }) => device.operationalState === "maintenance").length;
  return <Panel title="Real Monitored Devices · Persisted" description={`PostgreSQL current state, separate from simulated fleet totals.${maintenanceCount ? ` ${maintenanceCount} in maintenance.` : ""}`} action={<StatusBadge status="informational" label={`${devices.length} registered`} compact />}>{devices.length === 0 ? <p className="text-xs text-foreground-muted">No persisted monitored devices.</p> : <div className="grid gap-4">{devices.map((state) => <DeviceCard key={state.device.id} state={state} />)}</div>}</Panel>;
}
