import type { Metadata } from "next";
import {
  BellRing,
  CircleCheck,
  CircleX,
  Gauge,
  RadioTower,
  Server,
} from "lucide-react";
import { DeviceInventory } from "@/components/devices/device-inventory";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { mockNetworkAlerts, mockNetworkDevices } from "@/data";
import { NETWORK_THRESHOLDS } from "@/lib/constants";
import { calculateDashboardMetrics } from "@/lib/dashboard";
import { formatLatency, formatPercentage } from "@/lib/formatters";
import { getUtilizationTone } from "@/lib/status";

export const metadata: Metadata = { title: "Devices" };

export default function DevicesPage() {
  const metrics = calculateDashboardMetrics(
    mockNetworkDevices,
    mockNetworkAlerts,
  );
  const latencyStatus =
    metrics.averageLatencyMs >= NETWORK_THRESHOLDS.latencyCriticalMs
      ? "critical"
      : metrics.averageLatencyMs >= NETWORK_THRESHOLDS.latencyWarningMs
        ? "warning"
        : "healthy";

  return (
    <div className="space-y-5 xl:space-y-6">
      <SectionHeader
        title="Monitored infrastructure"
        description="Search the network inventory, assess device health, and inspect current telemetry."
        action={
          <StatusBadge
            status={metrics.offlineDevices > 0 ? "critical" : "healthy"}
            label={`${metrics.totalDevices} monitored`}
          />
        }
      />

      <section aria-label="Device inventory summary">
        <div className="grid grid-cols-1 gap-3 min-[30rem]:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <MetricCard
            label="Total devices"
            value={metrics.totalDevices}
            icon={Server}
            status="informational"
            supportingText="Across all monitored segments"
          />
          <MetricCard
            label="Online"
            value={metrics.onlineDevices}
            icon={CircleCheck}
            status="healthy"
            supportingText={`${formatPercentage((metrics.onlineDevices / metrics.totalDevices) * 100)} of inventory`}
          />
          <MetricCard
            label="Degraded"
            value={metrics.degradedDevices}
            icon={BellRing}
            status={metrics.degradedDevices > 0 ? "warning" : "healthy"}
            supportingText="Performance requires attention"
          />
          <MetricCard
            label="Offline"
            value={metrics.offlineDevices}
            icon={CircleX}
            status={metrics.offlineDevices > 0 ? "critical" : "healthy"}
            supportingText="Unreachable monitoring targets"
          />
          <MetricCard
            label="Average latency"
            value={formatLatency(metrics.averageLatencyMs)}
            icon={RadioTower}
            status={latencyStatus}
            supportingText="Responding devices only"
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
            supportingText="Responding devices only"
          />
        </div>
      </section>

      <DeviceInventory devices={mockNetworkDevices} />
    </div>
  );
}
