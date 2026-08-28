import type { Metadata } from "next";
import {
  BellRing,
  Clock3,
  Gauge,
  RadioTower,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { AlertDistributionChart } from "@/components/analytics/alert-distribution-chart";
import { DeviceUtilizationChart } from "@/components/analytics/device-utilization-chart";
import { HealthDistributionChart } from "@/components/analytics/health-distribution-chart";
import { ReliabilityOverview } from "@/components/analytics/reliability-overview";
import { LatencyChart } from "@/components/dashboard/latency-chart";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  latencySeries,
  mockNetworkAlerts,
  mockNetworkDevices,
} from "@/data";
import { calculateAnalyticsSummary } from "@/lib/analytics";
import { NETWORK_THRESHOLDS } from "@/lib/constants";
import { calculateDashboardMetrics } from "@/lib/dashboard";
import {
  formatLatency,
  formatPercentage,
  formatUptime,
} from "@/lib/formatters";
import { getUtilizationTone } from "@/lib/status";

export const metadata: Metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  const dashboard = calculateDashboardMetrics(
    mockNetworkDevices,
    mockNetworkAlerts,
  );
  const analytics = calculateAnalyticsSummary(
    mockNetworkDevices,
    mockNetworkAlerts,
  );
  const exceptionDevices = mockNetworkDevices.filter(
    (device) => device.status === "degraded" || device.status === "offline",
  );
  const highUtilizationDevices = mockNetworkDevices
    .filter((device) => device.status !== "offline")
    .toSorted(
      (first, second) =>
        second.bandwidthUtilizationPercent -
        first.bandwidthUtilizationPercent,
    )
    .slice(0, 3);
  const latencyTone =
    analytics.averageLatencyMs >= NETWORK_THRESHOLDS.latencyCriticalMs
      ? "critical"
      : analytics.averageLatencyMs >= NETWORK_THRESHOLDS.latencyWarningMs
        ? "warning"
        : "healthy";

  return (
    <div className="space-y-5 xl:space-y-6">
      <SectionHeader
        title="Infrastructure analytics"
        description="Reliability, capacity, alert distribution, and performance patterns from the current monitoring window."
        action={
          <StatusBadge
            status="informational"
            label={`${latencySeries.length} samples analyzed`}
          />
        }
      />

      <section aria-label="Analytics summary">
        <div className="grid grid-cols-1 gap-3 min-[30rem]:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <MetricCard label="Average uptime" value={formatUptime(analytics.averageUptimeSeconds)} icon={Clock3} status="healthy" supportingText="Responding devices only" />
          <MetricCard label="Average latency" value={formatLatency(analytics.averageLatencyMs)} icon={RadioTower} status={latencyTone} supportingText="Current device samples" />
          <MetricCard label="Avg. utilization" value={formatPercentage(analytics.averageBandwidthUtilizationPercent)} icon={Gauge} status={getUtilizationTone(analytics.averageBandwidthUtilizationPercent, NETWORK_THRESHOLDS.bandwidthWarningPercent, NETWORK_THRESHOLDS.bandwidthCriticalPercent)} supportingText="Responding devices only" />
          <MetricCard label="Availability" value={formatPercentage(analytics.availabilityPercent, 1)} icon={ShieldCheck} status={analytics.availabilityPercent >= 99 ? "healthy" : "warning"} supportingText="Responding monitored devices" />
          <MetricCard label="Active alert rate" value={formatPercentage(analytics.activeAlertRatePercent, 1)} icon={BellRing} status={dashboard.criticalAlerts > 0 ? "critical" : "warning"} supportingText={`${dashboard.activeAlerts} of ${mockNetworkAlerts.length} alerts active`} />
          <MetricCard label="Health exceptions" value={formatPercentage(analytics.degradedOrOfflinePercent, 1)} icon={TriangleAlert} status={analytics.exceptionDevices > 0 ? "warning" : "healthy"} supportingText={`${analytics.exceptionDevices} degraded or offline`} />
        </div>
      </section>

      <div className="grid items-start gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-7">
          <DeviceUtilizationChart devices={mockNetworkDevices} />
        </div>
        <div className="min-w-0 xl:col-span-5">
          <HealthDistributionChart
            online={dashboard.onlineDevices}
            degraded={dashboard.degradedDevices}
            offline={dashboard.offlineDevices}
          />
        </div>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-5">
          <AlertDistributionChart counts={dashboard.alertCountsBySeverity} />
        </div>
        <div className="min-w-0 xl:col-span-7">
          <LatencyChart
            data={latencySeries}
            description="Median latency progression provides performance context for the current reliability window."
          />
        </div>
      </div>

      <ReliabilityOverview
        availabilityPercent={analytics.availabilityPercent}
        averageUptimeSeconds={analytics.averageUptimeSeconds}
        exceptionDevices={exceptionDevices}
        highUtilizationDevices={highUtilizationDevices}
      />
    </div>
  );
}
