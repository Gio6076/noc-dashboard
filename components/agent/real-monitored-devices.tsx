import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Database,
  MemoryStick,
  MonitorCog,
} from "lucide-react";
import { MetricCard } from "@/components/ui/metric-card";
import { Panel } from "@/components/ui/panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  formatBytes,
  formatPercentage,
  formatThroughput,
  formatUptime,
} from "@/lib/formatters";
import type { BrowserAgentDeviceSnapshot } from "@/types/live-monitoring";
import type { RealMonitoringAlert } from "@/types/monitoring-alert";

interface RealMonitoredDevicesProps {
  snapshots: readonly BrowserAgentDeviceSnapshot[];
  alerts?: readonly RealMonitoringAlert[];
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] text-foreground-subtle">{label}</dt>
      <dd className="mt-1 break-words font-mono text-xs text-foreground">{value}</dd>
    </div>
  );
}

function ServicesSection({ snapshot }: { snapshot: BrowserAgentDeviceSnapshot }) {
  const { services } = snapshot;
  const healthyServiceCount =
    services?.services.filter((service) => service.status === "up").length ?? 0;

  return (
    <section className="mt-4 rounded-md border bg-background/45 p-4" aria-label={`${snapshot.device.displayName} services`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold">Services</p>
        {services && services.services.length > 0 && (
          <span className="font-mono text-[10px] text-foreground-muted">
            {healthyServiceCount}/{services.services.length} services healthy
          </span>
        )}
      </div>

      {!services ? (
        <p className="mt-3 text-xs text-foreground-muted">Service telemetry unavailable</p>
      ) : services.services.length === 0 ? (
        <p className="mt-3 text-xs text-foreground-muted">No service checks configured</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {services.services.map((service, index) => (
            <li
              className="grid items-center gap-2 py-2 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
              key={`${service.type}-${service.name}-${index}`}
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-foreground">{service.name}</p>
                <p className="mt-0.5 truncate font-mono text-[10px] text-foreground-subtle">
                  {service.type.toUpperCase()}
                  {service.type !== "tcp" && service.httpStatusCode !== null
                    ? ` · HTTP ${service.httpStatusCode}`
                    : ""}
                </p>
              </div>
              <StatusBadge
                status={service.status === "up" ? "online" : "offline"}
                label={service.status.toUpperCase()}
                compact
              />
              <span className="w-14 text-right font-mono text-[10px] text-foreground-muted">
                {service.status === "up" ? `${Math.round(service.responseTimeMs)} ms` : "—"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DeviceCard({ snapshot, activeAlertCount }: { snapshot: BrowserAgentDeviceSnapshot; activeAlertCount: number }) {
  const { device, health, system, network, unavailableEndpoints } = snapshot;
  const hostname = health?.hostname ?? system?.hostname ?? "Unavailable";
  const platform = health?.platform ?? system?.platform ?? "Unavailable";
  const architecture =
    health?.architecture ?? system?.architecture ?? "Unavailable";
  const isUnreachable = snapshot.availability === "unreachable";
  const isDisabled = device.operationalState === "disabled";
  const status = isUnreachable
    ? "offline"
    : snapshot.availability === "partial"
      ? "warning"
      : "online";
  const statusLabel = isDisabled
    ? "NOT FETCHED"
    : isUnreachable
    ? "AGENT UNREACHABLE"
    : snapshot.availability === "partial"
      ? "AGENT PARTIAL"
      : "AGENT ONLINE";

  return (
    <article className="rounded-md border bg-surface-raised p-4">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-background text-informational">
            <MonitorCog aria-hidden="true" size={17} />
          </span>
          <div className="min-w-0">
            <h3 className="font-mono text-sm font-semibold">{device.displayName}</h3>
            <p className="mt-1 text-xs text-foreground-muted">
              {device.description ?? "Agent-monitored device"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <StatusBadge
            status={device.operationalState === "monitored" ? "informational" : device.operationalState === "maintenance" ? "maintenance" : "neutral"}
            label={device.operationalState.toUpperCase()}
            compact
          />
          {!isDisabled && <StatusBadge status={status} label={statusLabel} compact />}
        </div>
      </header>

      {device.operationalState === "maintenance" && (
        <p className="mt-3 rounded-md border border-warning/25 bg-warning-muted px-3 py-2 text-xs text-warning">
          Alert evaluation suppressed while this device is in maintenance.
        </p>
      )}

      {isDisabled && (
        <div className="mt-4 rounded-md border bg-background/45 p-4">
          <p className="text-sm font-medium text-foreground">Monitoring disabled</p>
          <p className="mt-1 text-xs leading-5 text-foreground-muted">
            Agent endpoints were not fetched and no alerts were evaluated.
          </p>
        </div>
      )}

      {activeAlertCount > 0 && (
        <p className="mt-3 font-mono text-[10px] font-medium uppercase tracking-wide text-critical">
          {activeAlertCount} active real monitoring alert{activeAlertCount === 1 ? "" : "s"}
        </p>
      )}

      {!isDisabled && (isUnreachable ? (
        <div className={`mt-4 rounded-md border p-4 ${device.operationalState === "maintenance" ? "border-warning/25 bg-warning-muted" : "border-critical/25 bg-critical-muted"}`}>
          <p className={`text-sm font-medium ${device.operationalState === "maintenance" ? "text-warning" : "text-critical"}`}>Monitoring agent could not be reached</p>
          <p className="mt-1 text-xs leading-5 text-foreground-muted">
            {device.operationalState === "maintenance"
              ? "Agent unreachable. This condition is visible, but alert evaluation is suppressed."
              : "This registered device remains monitored. Start or reconnect its agent; live polling will retry automatically."}
          </p>
        </div>
      ) : (
        <>
          {unavailableEndpoints.length > 0 && (
            <p className="mt-4 rounded-md border border-warning/25 bg-warning-muted px-3 py-2 text-xs text-warning">
              Partial telemetry: {unavailableEndpoints.join(", ")} endpoint{unavailableEndpoints.length === 1 ? " is" : "s are"} unavailable. Valid data is shown below.
            </p>
          )}

          <div className="mt-4 grid gap-4 xl:grid-cols-12">
            <div className="rounded-md border bg-background/45 p-4 xl:col-span-3">
              <p className="text-xs font-semibold">Identity</p>
              <dl className="mt-4 grid grid-cols-2 gap-4 xl:grid-cols-1">
                <Detail label="Hostname" value={hostname} />
                <Detail label="Platform" value={platform} />
                <Detail label="Architecture" value={architecture} />
                <Detail label="Logical CPUs" value={system ? String(system.logicalCpuCount) : "Unavailable"} />
                <Detail label="Uptime" value={system ? formatUptime(system.uptimeSeconds) : "Unavailable"} />
              </dl>
            </div>

            <div className="space-y-4 rounded-md border bg-background/45 p-4 xl:col-span-4">
              <p className="text-xs font-semibold">System</p>
              {system ? (
                <>
                  <ProgressBar value={system.cpuUsagePercent} label="CPU usage" />
                  <ProgressBar value={system.memoryUsagePercent} label="Memory usage" />
                  <ProgressBar value={system.diskUsagePercent} label="Disk usage" />
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <Detail label="CPU" value={formatPercentage(system.cpuUsagePercent, 1)} />
                    <Detail label="Memory" value={formatPercentage(system.memoryUsagePercent, 1)} />
                    <Detail label="Disk" value={formatPercentage(system.diskUsagePercent, 1)} />
                  </div>
                </>
              ) : (
                <p className="text-xs text-foreground-muted">System endpoint unavailable.</p>
              )}
            </div>

            <div className="xl:col-span-5">
              {network ? (
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard label="Inbound" value={formatThroughput(network.inboundBytesPerSecond)} icon={ArrowDownToLine} status="informational" supportingText="Current throughput" />
                  <MetricCard label="Outbound" value={formatThroughput(network.outboundBytesPerSecond)} icon={ArrowUpFromLine} status="informational" supportingText="Current throughput" />
                  <MetricCard label="Total received" value={formatBytes(network.totalBytesReceived)} icon={Database} supportingText={network.primaryIpv4Address ?? "IPv4 unavailable"} />
                  <MetricCard label="Total sent" value={formatBytes(network.totalBytesSent)} icon={MemoryStick} supportingText={network.activeInterfaceCount === undefined ? "Interface count unavailable" : `${network.activeInterfaceCount} active interfaces`} />
                </div>
              ) : (
                <div className="rounded-md border bg-background/45 p-4">
                  <p className="text-xs text-foreground-muted">Network endpoint unavailable.</p>
                </div>
              )}
            </div>
          </div>
          <ServicesSection snapshot={snapshot} />
        </>
      ))}
    </article>
  );
}

export function RealMonitoredDevices({ snapshots, alerts = [] }: RealMonitoredDevicesProps) {
  const maintenanceCount = snapshots.filter(
    ({ device }) => device.operationalState === "maintenance",
  ).length;

  return (
    <Panel
      title="Real Monitored Devices"
      description={`Local agent monitoring · Live device state kept separate from all simulated fleet totals and analytics.${maintenanceCount > 0 ? ` ${maintenanceCount} device${maintenanceCount === 1 ? "" : "s"} in maintenance.` : ""}`}
      action={<StatusBadge status="informational" label={`${snapshots.length} registered`} compact />}
    >
      <div className="grid gap-4">
        {snapshots.map((snapshot) => (
          <DeviceCard
            key={snapshot.device.id}
            snapshot={snapshot}
            activeAlertCount={alerts.filter((alert) => alert.deviceId === snapshot.device.id).length}
          />
        ))}
      </div>
    </Panel>
  );
}
