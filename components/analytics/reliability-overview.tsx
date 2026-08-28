import { Panel } from "@/components/ui/panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDeviceType, formatUptime } from "@/lib/formatters";
import type { SemanticTone } from "@/lib/status";
import type { NetworkDevice } from "@/types/network";

interface ReliabilityOverviewProps {
  availabilityPercent: number;
  averageUptimeSeconds: number;
  exceptionDevices: readonly NetworkDevice[];
  highUtilizationDevices: readonly NetworkDevice[];
}

export function ReliabilityOverview({
  availabilityPercent,
  averageUptimeSeconds,
  exceptionDevices,
  highUtilizationDevices,
}: ReliabilityOverviewProps) {
  const availabilityTone: SemanticTone =
    availabilityPercent >= 99
      ? "healthy"
      : availabilityPercent >= 90
        ? "warning"
        : "critical";

  return (
    <Panel
      title="Reliability interpretation"
      description="Fleet availability and the devices contributing most to current health exceptions."
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div>
          <ProgressBar
            label="Responding-device availability"
            value={availabilityPercent}
            status={availabilityTone}
          />
          <dl className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-md border bg-background/45 p-3">
              <dt className="text-[10px] uppercase tracking-wide text-foreground-subtle">Average uptime</dt>
              <dd className="mt-1.5 font-mono text-sm font-semibold">{formatUptime(averageUptimeSeconds)}</dd>
            </div>
            <div className="rounded-md border bg-background/45 p-3">
              <dt className="text-[10px] uppercase tracking-wide text-foreground-subtle">Exceptions</dt>
              <dd className="mt-1.5 font-mono text-sm font-semibold">{exceptionDevices.length} devices</dd>
            </div>
          </dl>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-foreground-subtle">Health contributors</h3>
            <ul className="mt-2 space-y-2">
              {exceptionDevices.map((device) => (
                <li key={device.id} className="flex items-center justify-between gap-3 rounded-md border bg-background/45 p-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs font-semibold">{device.hostname}</p>
                    <p className="mt-0.5 truncate text-[10px] text-foreground-subtle">{formatDeviceType(device.type)}</p>
                  </div>
                  <StatusBadge status={device.status} compact />
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-foreground-subtle">Capacity leaders</h3>
            <ul className="mt-2 space-y-2">
              {highUtilizationDevices.map((device) => (
                <li key={device.id} className="flex items-center justify-between gap-3 rounded-md border bg-background/45 p-2.5">
                  <span className="truncate font-mono text-xs font-semibold">{device.hostname}</span>
                  <span className="shrink-0 font-mono text-xs text-foreground-muted">{device.bandwidthUtilizationPercent}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Panel>
  );
}
