import { Panel } from "@/components/ui/panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { NETWORK_THRESHOLDS } from "@/lib/constants";
import { formatDeviceType } from "@/lib/formatters";
import type { NetworkDevice } from "@/types/network";

interface HighUtilizationDevicesProps {
  devices: readonly NetworkDevice[];
}

export function HighUtilizationDevices({
  devices,
}: HighUtilizationDevicesProps) {
  return (
    <Panel
      title="Capacity pressure"
      description="Highest current bandwidth utilization among responding devices."
    >
      <ol className="space-y-4">
        {devices.map((device) => (
          <li key={device.id}>
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-mono text-xs font-semibold">
                  {device.hostname}
                </p>
                <p className="mt-0.5 text-[10px] text-foreground-subtle">
                  {formatDeviceType(device.type)}
                </p>
              </div>
              <StatusBadge status={device.status} compact />
            </div>
            <ProgressBar
              label={`${device.hostname} utilization`}
              value={device.bandwidthUtilizationPercent}
              warningThreshold={NETWORK_THRESHOLDS.bandwidthWarningPercent}
              criticalThreshold={NETWORK_THRESHOLDS.bandwidthCriticalPercent}
              size="sm"
            />
          </li>
        ))}
      </ol>
    </Panel>
  );
}
