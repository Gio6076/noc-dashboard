import type { Metadata } from "next";
import {
  Activity,
  Gauge,
  RadioTower,
  Router,
  ShieldAlert,
  WifiOff,
} from "lucide-react";
import { LatencyChart } from "@/components/dashboard/latency-chart";
import { TrafficChart } from "@/components/dashboard/traffic-chart";
import { HighUtilizationDevices } from "@/components/network/high-utilization-devices";
import { PacketLossChart } from "@/components/network/packet-loss-chart";
import { MetricCard } from "@/components/ui/metric-card";
import { Panel } from "@/components/ui/panel";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  inboundTrafficSeries,
  latencySeries,
  mockNetworkAlerts,
  mockNetworkDevices,
  outboundTrafficSeries,
  packetLossSeries,
} from "@/data";
import { NETWORK_THRESHOLDS } from "@/lib/constants";
import { calculateDashboardMetrics } from "@/lib/dashboard";
import {
  formatBandwidth,
  formatLatency,
  formatPercentage,
} from "@/lib/formatters";
import { getUtilizationTone } from "@/lib/status";
import { summarizeTimeSeries } from "@/lib/telemetry";

export const metadata: Metadata = { title: "Network" };

export default function NetworkPage() {
  const metrics = calculateDashboardMetrics(
    mockNetworkDevices,
    mockNetworkAlerts,
  );
  const inbound = summarizeTimeSeries(inboundTrafficSeries);
  const outbound = summarizeTimeSeries(outboundTrafficSeries);
  const latency = summarizeTimeSeries(latencySeries);
  const packetLoss = summarizeTimeSeries(packetLossSeries);
  const respondingDevices = metrics.onlineDevices + metrics.degradedDevices;
  const highUtilizationDevices = mockNetworkDevices
    .filter((device) => device.status !== "offline")
    .toSorted(
      (first, second) =>
        second.bandwidthUtilizationPercent -
        first.bandwidthUtilizationPercent,
    )
    .slice(0, 4);
  const congestedDevices = highUtilizationDevices.filter(
    (device) =>
      device.bandwidthUtilizationPercent >=
      NETWORK_THRESHOLDS.bandwidthWarningPercent,
  );

  const latencyTone =
    metrics.averageLatencyMs >= NETWORK_THRESHOLDS.latencyCriticalMs
      ? "critical"
      : metrics.averageLatencyMs >= NETWORK_THRESHOLDS.latencyWarningMs
        ? "warning"
        : "healthy";
  const packetLossTone = getUtilizationTone(
    packetLoss.latest,
    NETWORK_THRESHOLDS.packetLossWarningPercent,
    NETWORK_THRESHOLDS.packetLossCriticalPercent,
  );

  return (
    <div className="space-y-5 xl:space-y-6">
      <SectionHeader
        title="Telemetry analysis"
        description="Traffic flow, path quality, and capacity conditions across monitored infrastructure."
        action={<StatusBadge status={metrics.overallHealth} />}
      />

      <section aria-label="Network telemetry summary">
        <div className="grid grid-cols-1 gap-3 min-[30rem]:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <MetricCard
            label="Average latency"
            value={formatLatency(metrics.averageLatencyMs)}
            icon={RadioTower}
            status={latencyTone}
            supportingText="Across responding devices"
          />
          <MetricCard
            label="Avg. utilization"
            value={formatPercentage(
              metrics.averageBandwidthUtilizationPercent,
            )}
            icon={Gauge}
            status={getUtilizationTone(
              metrics.averageBandwidthUtilizationPercent,
              NETWORK_THRESHOLDS.bandwidthWarningPercent,
              NETWORK_THRESHOLDS.bandwidthCriticalPercent,
            )}
            supportingText="Current device samples"
          />
          <MetricCard
            label="Responding devices"
            value={respondingDevices}
            icon={Router}
            status="healthy"
            supportingText={`${metrics.totalDevices} monitored total`}
          />
          <MetricCard
            label="Degraded devices"
            value={metrics.degradedDevices}
            icon={ShieldAlert}
            status={metrics.degradedDevices > 0 ? "warning" : "healthy"}
            supportingText="Operating with exceptions"
          />
          <MetricCard
            label="Latest packet loss"
            value={formatPercentage(packetLoss.latest, 1)}
            icon={WifiOff}
            status={packetLossTone}
            supportingText={`Peak ${formatPercentage(packetLoss.peak, 1)}`}
          />
          <MetricCard
            label="Network health"
            value={metrics.overallHealth.toUpperCase()}
            icon={Activity}
            status={metrics.overallHealth}
            supportingText={`${metrics.activeAlerts} active alerts`}
          />
        </div>
      </section>

      <div className="grid items-start gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-8">
          <TrafficChart
            inbound={inboundTrafficSeries}
            outbound={outboundTrafficSeries}
            description="Aggregate edge throughput during the latest three-hour monitoring window."
          />
        </div>
        <div className="xl:col-span-4">
          <Panel
            title="Traffic readings"
            description="Peak and latest aggregate throughput."
          >
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border bg-border">
              {[
                { label: "Peak inbound", value: inbound.peak },
                { label: "Peak outbound", value: outbound.peak },
                { label: "Latest inbound", value: inbound.latest },
                { label: "Latest outbound", value: outbound.latest },
              ].map((reading) => (
                <div key={reading.label} className="bg-background p-3">
                  <dt className="text-[10px] uppercase tracking-wide text-foreground-subtle">
                    {reading.label}
                  </dt>
                  <dd className="mt-1.5 font-mono text-sm font-semibold">
                    {formatBandwidth(reading.value)}
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-7">
          <LatencyChart
            data={latencySeries}
            description="Median path latency remains below the configured warning threshold."
          />
        </div>
        <div className="min-w-0 xl:col-span-5">
          <PacketLossChart
            data={packetLossSeries}
            description="Recent samples show a loss exception despite acceptable median latency."
          />
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2 xl:grid-cols-12">
        <div className="xl:col-span-3">
          <Panel title="Latency readings" description="Three-hour median path samples.">
            <dl className="space-y-3">
              {[
                { label: "Series average", value: latency.average },
                { label: "Latest sample", value: latency.latest },
                { label: "Peak sample", value: latency.peak },
                {
                  label: "Warning threshold",
                  value: NETWORK_THRESHOLDS.latencyWarningMs,
                },
              ].map((reading) => (
                <div
                  key={reading.label}
                  className="flex items-center justify-between gap-3 border-b pb-2.5 last:border-0 last:pb-0"
                >
                  <dt className="text-xs text-foreground-muted">{reading.label}</dt>
                  <dd className="font-mono text-xs font-semibold">
                    {formatLatency(reading.value)}
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>

        <div className="xl:col-span-4">
          <HighUtilizationDevices devices={highUtilizationDevices} />
        </div>

        <div className="lg:col-span-2 xl:col-span-5">
          <Panel
            title="Network conditions"
            description="Current exceptions derived from device and path telemetry."
          >
            <ul className="space-y-3">
              <li className="flex items-start justify-between gap-3 rounded-md border bg-background/45 p-3">
                <div>
                  <p className="text-xs font-medium">Device reachability</p>
                  <p className="mt-1 text-xs leading-5 text-foreground-muted">
                    {metrics.offlineDevices}{" "}
                    {metrics.offlineDevices === 1
                      ? "device is"
                      : "devices are"}{" "}
                    unreachable and affects backup service availability.
                  </p>
                </div>
                <StatusBadge status={metrics.offlineDevices > 0 ? "critical" : "healthy"} compact />
              </li>
              <li className="flex items-start justify-between gap-3 rounded-md border bg-background/45 p-3">
                <div>
                  <p className="text-xs font-medium">Capacity pressure</p>
                  <p className="mt-1 text-xs leading-5 text-foreground-muted">
                    {congestedDevices.length}{" "}
                    {congestedDevices.length === 1
                      ? "device exceeds"
                      : "devices exceed"}{" "}
                    the configured bandwidth warning threshold.
                  </p>
                </div>
                <StatusBadge status={congestedDevices.length > 0 ? "warning" : "healthy"} compact />
              </li>
              <li className="flex items-start justify-between gap-3 rounded-md border bg-background/45 p-3">
                <div>
                  <p className="text-xs font-medium">Path quality</p>
                  <p className="mt-1 text-xs leading-5 text-foreground-muted">
                    Packet loss peaked at {formatPercentage(packetLoss.peak, 1)} while latest median latency remained {formatLatency(latency.latest)}.
                  </p>
                </div>
                <StatusBadge
                  status={
                    packetLoss.peak >= NETWORK_THRESHOLDS.packetLossCriticalPercent
                      ? "critical"
                      : packetLossTone
                  }
                  compact
                />
              </li>
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
