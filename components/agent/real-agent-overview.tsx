import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Cpu,
  Database,
  MemoryStick,
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
import type { AgentTelemetry } from "@/types/agent";

interface RealAgentOverviewProps {
  telemetry: AgentTelemetry;
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] text-foreground-subtle">{label}</dt>
      <dd className="mt-1 break-words font-mono text-xs text-foreground">{value}</dd>
    </div>
  );
}

export function RealAgentOverview({ telemetry }: RealAgentOverviewProps) {
  const { health, system, network, unavailableEndpoints } = telemetry;
  const isUnavailable = !health && !system && !network;

  if (isUnavailable) {
    return (
      <Panel
        title="Real Agent Telemetry"
        description="Local monitoring source · Real telemetry, kept separate from demo fleet metrics."
        action={<StatusBadge status="offline" label="Agent unavailable" compact />}
      >
        <div className="rounded-md border border-warning/25 bg-warning-muted p-4">
          <p className="text-sm font-medium text-warning">
            Local monitoring agent unavailable
          </p>
          <p className="mt-1 text-xs leading-5 text-foreground-muted">
            Ensure the FastAPI monitoring agent is running locally, then reload this page.
          </p>
        </div>
      </Panel>
    );
  }

  const agentIsHealthy = health?.status.toLowerCase() === "healthy" || health?.status.toLowerCase() === "ok";
  const hostname = health?.hostname ?? system?.hostname ?? "Unavailable";
  const platform = health?.platform ?? system?.platform ?? "Unavailable";
  const architecture = health?.architecture ?? system?.architecture ?? "Unavailable";

  return (
    <Panel
      title="Real Agent Telemetry"
      description="Local monitoring source · Live values from the real agent on this Mac; not included in demo fleet analytics."
      action={
        <StatusBadge
          status={agentIsHealthy ? "online" : "warning"}
          label={health?.status ?? "Health unavailable"}
          compact
        />
      }
    >
      {unavailableEndpoints.length > 0 && (
        <p className="mb-4 rounded-md border border-warning/25 bg-warning-muted px-3 py-2 text-xs text-warning">
          Partial telemetry: {unavailableEndpoints.join(", ")} endpoint{unavailableEndpoints.length === 1 ? " is" : "s are"} unavailable.
        </p>
      )}

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="rounded-md border bg-surface-raised p-4 xl:col-span-3">
          <p className="text-xs font-semibold text-foreground">Identity</p>
          <dl className="mt-4 grid grid-cols-2 gap-4 xl:grid-cols-1">
            <Detail label="Hostname" value={hostname} />
            <Detail label="Platform" value={platform} />
            <Detail label="Architecture" value={architecture} />
            <Detail label="Logical CPUs" value={system ? String(system.logicalCpuCount) : "Unavailable"} />
            <Detail label="Uptime" value={system ? formatUptime(system.uptimeSeconds) : "Unavailable"} />
          </dl>
        </div>

        <div className="space-y-4 rounded-md border bg-surface-raised p-4 xl:col-span-4">
          <p className="text-xs font-semibold text-foreground">System utilization</p>
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
            <div className="rounded-md border bg-surface-raised p-4">
              <Cpu aria-hidden="true" className="text-foreground-subtle" size={18} />
              <p className="mt-3 text-xs text-foreground-muted">Network endpoint unavailable.</p>
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}
