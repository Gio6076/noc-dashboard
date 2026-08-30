import {
  BellRing,
  CircleCheck,
  CircleX,
  Gauge,
  RadioTower,
  Server,
} from "lucide-react";
import { DeviceStatusOverview } from "@/components/dashboard/device-status-overview";
import { LiveRealMonitoring } from "@/components/monitoring/live-real-monitoring";
import { LatencyChart } from "@/components/dashboard/latency-chart";
import { NetworkHealth } from "@/components/dashboard/network-health";
import { OperationalDetails } from "@/components/dashboard/operational-details";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { RecentAlerts } from "@/components/dashboard/recent-alerts";
import { TrafficChart } from "@/components/dashboard/traffic-chart";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  inboundTrafficSeries,
  latencySeries,
  mockNetworkActivity,
  mockNetworkAlerts,
  mockNetworkDevices,
  outboundTrafficSeries,
} from "@/data";
import { NETWORK_THRESHOLDS, SYSTEM_NAME } from "@/lib/constants";
import { calculateDashboardMetrics } from "@/lib/dashboard";
import { getMonitoredDeviceSnapshots } from "@/lib/agent-api";
import { evaluateMonitoringAlerts } from "@/lib/monitoring-alerts";
import { createLiveMonitoringResponse } from "@/lib/live-monitoring";
import {
  formatLatency,
  formatPercentage,
} from "@/lib/formatters";
import { getUtilizationTone } from "@/lib/status";

const severityPriority = {
  critical: 3,
  warning: 2,
  informational: 1,
} as const;

export default async function OverviewPage() {
  const monitoredDeviceSnapshots = await getMonitoredDeviceSnapshots();
  const realMonitoringAlerts = evaluateMonitoringAlerts(monitoredDeviceSnapshots);
  const liveMonitoringData = createLiveMonitoringResponse(
    monitoredDeviceSnapshots,
    realMonitoringAlerts,
  );
  const metrics = calculateDashboardMetrics(
    mockNetworkDevices,
    mockNetworkAlerts,
  );

  const recentAlerts = mockNetworkAlerts
    .toSorted((first, second) => {
      if (first.acknowledged !== second.acknowledged) {
        return first.acknowledged ? 1 : -1;
      }

      const severityDifference =
        severityPriority[second.severity] - severityPriority[first.severity];

      if (severityDifference !== 0) return severityDifference;
      return Date.parse(second.occurredAt) - Date.parse(first.occurredAt);
    })
    .slice(0, 5);

  const recentActivity = mockNetworkActivity
    .toSorted(
      (first, second) =>
        Date.parse(second.occurredAt) - Date.parse(first.occurredAt),
    )
    .slice(0, 6);

  const offlineHostnames = mockNetworkDevices
    .filter((device) => device.status === "offline")
    .map((device) => device.hostname);

  const healthExplanation = [
    offlineHostnames.length > 0
      ? `${offlineHostnames.join(", ")} ${offlineHostnames.length === 1 ? "is" : "are"} offline.`
      : null,
    metrics.criticalAlerts > 0
      ? `${metrics.criticalAlerts} unacknowledged critical ${metrics.criticalAlerts === 1 ? "alert requires" : "alerts require"} immediate attention.`
      : null,
    metrics.degradedDevices > 0
      ? `${metrics.degradedDevices} ${metrics.degradedDevices === 1 ? "device is" : "devices are"} operating in a degraded state.`
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  const respondingDeviceCount =
    metrics.onlineDevices + metrics.degradedDevices;
  const latencyStatus =
    metrics.averageLatencyMs >= NETWORK_THRESHOLDS.latencyCriticalMs
      ? "critical"
      : metrics.averageLatencyMs >= NETWORK_THRESHOLDS.latencyWarningMs
        ? "warning"
        : "healthy";

  return (
    <div className="space-y-5 xl:space-y-6">
      <SectionHeader
        title="Demo / Simulated Environment"
        description="Deterministic enterprise infrastructure posture and telemetry. These values do not include real monitored devices."
        action={
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wide text-foreground-subtle">
              {SYSTEM_NAME}
            </span>
            <StatusBadge status="informational" label="Demo snapshot" compact />
          </div>
        }
      />

      <section aria-label="Network summary metrics">
        <div className="grid grid-cols-1 gap-3 min-[30rem]:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <MetricCard
            label="Total devices"
            value={metrics.totalDevices}
            icon={Server}
            status="informational"
            supportingText={`${Object.values(metrics.deviceCountsByType).filter(Boolean).length} device categories`}
          />
          <MetricCard
            label="Online devices"
            value={metrics.onlineDevices}
            icon={CircleCheck}
            status="healthy"
            supportingText={`${formatPercentage((metrics.onlineDevices / metrics.totalDevices) * 100)} of inventory`}
          />
          <MetricCard
            label="Offline devices"
            value={metrics.offlineDevices}
            icon={CircleX}
            status={metrics.offlineDevices > 0 ? "critical" : "healthy"}
            supportingText={
              metrics.offlineDevices > 0
                ? "Immediate attention required"
                : "No unreachable devices"
            }
          />
          <MetricCard
            label="Active alerts"
            value={metrics.activeAlerts}
            icon={BellRing}
            status={metrics.criticalAlerts > 0 ? "critical" : "warning"}
            supportingText={`${metrics.criticalAlerts} critical unresolved`}
          />
          <MetricCard
            label="Average latency"
            value={formatLatency(metrics.averageLatencyMs)}
            icon={RadioTower}
            status={latencyStatus}
            supportingText={`${respondingDeviceCount} responding devices`}
          />
          <MetricCard
            label="Bandwidth utilization"
            value={formatPercentage(
              metrics.averageBandwidthUtilizationPercent,
            )}
            icon={Gauge}
            status={getUtilizationTone(
              metrics.averageBandwidthUtilizationPercent,
              NETWORK_THRESHOLDS.bandwidthWarningPercent,
              NETWORK_THRESHOLDS.bandwidthCriticalPercent,
            )}
            supportingText="Average across responding devices"
          />
        </div>
      </section>

      <LiveRealMonitoring
        initialData={liveMonitoringData}
        showDevices
        showAlerts
        compactAlerts
      />

      <div className="grid items-start gap-4 xl:grid-cols-12">
        <div className="xl:col-span-6">
          <NetworkHealth
            status={metrics.overallHealth}
            explanation={healthExplanation}
            summary={[
              { label: "Responding", value: respondingDeviceCount },
              { label: "Active alerts", value: metrics.activeAlerts },
              { label: "Avg. latency", value: formatLatency(metrics.averageLatencyMs) },
            ]}
          />
        </div>
        <div className="min-w-0 sm:grid sm:grid-cols-2 sm:gap-4 xl:col-span-6">
          <DeviceStatusOverview
            total={metrics.totalDevices}
            online={metrics.onlineDevices}
            degraded={metrics.degradedDevices}
            offline={metrics.offlineDevices}
          />
          <div className="mt-4 sm:mt-0">
            <OperationalDetails
              averageUptimeSeconds={metrics.averageUptimeSeconds}
              degradedDevices={metrics.degradedDevices}
              criticalAlerts={metrics.criticalAlerts}
              highestUtilizationDevices={metrics.highestUtilizationDevices}
            />
          </div>
        </div>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-7">
          <TrafficChart
            inbound={inboundTrafficSeries}
            outbound={outboundTrafficSeries}
            description="Aggregate edge throughput during the latest three-hour monitoring window."
          />
        </div>
        <div className="min-w-0 xl:col-span-5">
          <LatencyChart
            data={latencySeries}
            description="Median monitored-device latency during the latest three-hour window."
          />
        </div>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-7">
          <RecentAlerts alerts={recentAlerts} devices={mockNetworkDevices} />
        </div>
        <div className="min-w-0 xl:col-span-5">
          <RecentActivity
            activity={recentActivity}
            devices={mockNetworkDevices}
          />
        </div>
      </div>
    </div>
  );
}
