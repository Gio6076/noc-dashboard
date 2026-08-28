import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";

interface DeviceStatusOverviewProps {
  total: number;
  online: number;
  degraded: number;
  offline: number;
}

export function DeviceStatusOverview({
  total,
  online,
  degraded,
  offline,
}: DeviceStatusOverviewProps) {
  const safeTotal = Math.max(total, 1);
  const onlinePercent = (online / safeTotal) * 100;
  const degradedPercent = (degraded / safeTotal) * 100;
  const offlinePercent = (offline / safeTotal) * 100;

  const statuses = [
    { label: "Online", status: "online" as const, count: online },
    { label: "Degraded", status: "degraded" as const, count: degraded },
    { label: "Offline", status: "offline" as const, count: offline },
  ];

  return (
    <Panel
      title="Device status"
      description={`${total} monitored ${total === 1 ? "device" : "devices"}`}
    >
      <div
        role="img"
        aria-label={`${online} online, ${degraded} degraded, and ${offline} offline out of ${total} devices`}
        className="flex h-2 overflow-hidden rounded-full bg-surface-overlay"
      >
        <span className="bg-healthy" style={{ width: `${onlinePercent}%` }} />
        <span className="bg-warning" style={{ width: `${degradedPercent}%` }} />
        <span className="bg-critical" style={{ width: `${offlinePercent}%` }} />
      </div>

      <ul className="mt-4 divide-y">
        {statuses.map((item) => (
          <li
            key={item.status}
            className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
          >
            <StatusBadge status={item.status} compact />
            <span className="font-mono text-sm font-semibold text-foreground">
              {item.count}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
