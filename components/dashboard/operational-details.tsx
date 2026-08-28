import { Clock3 } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import type { DeviceUtilizationSummary } from "@/lib/dashboard";
import { formatUptime } from "@/lib/formatters";

interface OperationalDetailsProps {
  averageUptimeSeconds: number;
  degradedDevices: number;
  criticalAlerts: number;
  highestUtilizationDevices: readonly DeviceUtilizationSummary[];
}

export function OperationalDetails({
  averageUptimeSeconds,
  degradedDevices,
  criticalAlerts,
  highestUtilizationDevices,
}: OperationalDetailsProps) {
  return (
    <Panel
      title="Operational details"
      description="Availability and current capacity pressure."
    >
      <dl className="grid grid-cols-2 gap-2">
        <div className="rounded-md border bg-background/45 p-2.5">
          <dt className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-foreground-subtle">
            <Clock3 aria-hidden="true" size={12} />
            Avg. uptime
          </dt>
          <dd className="mt-1.5 font-mono text-sm font-semibold">
            {formatUptime(averageUptimeSeconds)}
          </dd>
        </div>
        <div className="rounded-md border bg-background/45 p-2.5">
          <dt className="text-[10px] uppercase tracking-wide text-foreground-subtle">
            Exceptions
          </dt>
          <dd className="mt-1.5 flex flex-wrap gap-1">
            <StatusBadge
              status={criticalAlerts > 0 ? "critical" : "healthy"}
              label={`${criticalAlerts} critical`}
              compact
            />
            <StatusBadge
              status={degradedDevices > 0 ? "degraded" : "online"}
              label={`${degradedDevices} degraded`}
              compact
            />
          </dd>
        </div>
      </dl>

      <div className="mt-4 space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground-subtle">
          Highest utilization
        </p>
        {highestUtilizationDevices.map((device) => (
          <ProgressBar
            key={device.id}
            label={device.hostname}
            value={device.utilizationPercent}
            size="sm"
          />
        ))}
      </div>
    </Panel>
  );
}
