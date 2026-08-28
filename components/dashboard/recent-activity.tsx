import { Activity, Radio } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import { formatDateTime } from "@/lib/formatters";
import type { NetworkActivity, NetworkDevice } from "@/types/network";

interface RecentActivityProps {
  activity: readonly NetworkActivity[];
  devices?: readonly NetworkDevice[];
  action?: React.ReactNode;
}

export function RecentActivity({
  activity,
  devices = [],
  action,
}: RecentActivityProps) {
  const deviceNames = new Map(
    devices.map((device) => [device.id, device.hostname]),
  );

  return (
    <Panel
      title="Recent activity"
      description="Configuration, state, and operator events."
      action={action}
      contentClassName="-mx-[var(--panel-padding)] -mb-[var(--panel-padding)]"
    >
      {activity.length === 0 ? (
        <div className="px-[var(--panel-padding)] pb-[var(--panel-padding)]">
          <EmptyState
            title="No recent activity"
            description="New network and operator events will appear here."
            icon={Radio}
            compact
          />
        </div>
      ) : (
        <ol className="divide-y">
          {activity.map((event) => {
            const hostname = event.deviceId
              ? deviceNames.get(event.deviceId)
              : undefined;

            return (
              <li
                key={event.id}
                className="flex gap-3 px-[var(--panel-padding)] py-3 first:pt-0"
              >
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border bg-surface-raised text-informational">
                  <Activity aria-hidden="true" size={13} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs leading-5 text-foreground">
                    {event.description}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10px] text-foreground-subtle">
                    {hostname && <span>{hostname}</span>}
                    {event.actor && <span>by {event.actor}</span>}
                    <time dateTime={event.occurredAt} className="sm:ml-auto">
                      {formatDateTime(event.occurredAt)}
                    </time>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}
