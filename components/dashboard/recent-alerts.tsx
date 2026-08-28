import { BellOff } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime } from "@/lib/formatters";
import type { NetworkAlert, NetworkDevice } from "@/types/network";

interface RecentAlertsProps {
  alerts: readonly NetworkAlert[];
  devices?: readonly NetworkDevice[];
  action?: React.ReactNode;
}

export function RecentAlerts({
  alerts,
  devices = [],
  action,
}: RecentAlertsProps) {
  const deviceNames = new Map(
    devices.map((device) => [device.id, device.hostname]),
  );

  return (
    <Panel
      title="Recent alerts"
      description="Latest conditions reported by monitored infrastructure."
      action={action}
      contentClassName="-mx-[var(--panel-padding)] -mb-[var(--panel-padding)]"
    >
      {alerts.length === 0 ? (
        <div className="px-[var(--panel-padding)] pb-[var(--panel-padding)]">
          <EmptyState
            title="No recent alerts"
            description="No alert conditions match the current view."
            icon={BellOff}
            compact
          />
        </div>
      ) : (
        <ul className="divide-y">
          {alerts.map((alert) => {
            const hostname = alert.deviceId
              ? deviceNames.get(alert.deviceId)
              : undefined;

            return (
              <li
                key={alert.id}
                className="px-[var(--panel-padding)] py-3 first:pt-0"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={alert.severity} compact />
                  {alert.acknowledged && (
                    <StatusBadge status="acknowledged" compact />
                  )}
                  <time
                    dateTime={alert.occurredAt}
                    className="ml-auto font-mono text-[10px] text-foreground-subtle"
                  >
                    {formatDateTime(alert.occurredAt)}
                  </time>
                </div>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {alert.title}
                </p>
                <p className="mt-1 text-xs leading-5 text-foreground-muted">
                  {alert.message}
                </p>
                {hostname && (
                  <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wide text-foreground-subtle">
                    {hostname}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
