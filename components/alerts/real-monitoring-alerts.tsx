import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime } from "@/lib/formatters";
import { persistedActiveAlerts } from "@/lib/persisted-monitoring-ui";
import type { PersistedDeviceCurrentState } from "@/types/persisted-monitoring";

interface RealMonitoringAlertsProps { devices: readonly PersistedDeviceCurrentState[]; compact?: boolean; }

export function RealMonitoringAlerts({ devices, compact = false }: RealMonitoringAlertsProps) {
  const alerts = persistedActiveAlerts(devices);
  const visibleAlerts = compact ? alerts.slice(0, 5) : alerts;
  return (
    <Panel title="Real Monitoring Alerts · Persistent" description="Current ACTIVE alert instances from PostgreSQL. Recovered instances and demo alerts are excluded." action={<StatusBadge status={alerts.some((alert) => alert.severity === "critical") ? "critical" : alerts.length ? "warning" : "healthy"} label={`${alerts.length} active`} compact />}>
      {alerts.length === 0 ? <EmptyState title="No active real monitoring alerts" description="PostgreSQL contains no ACTIVE persistent alert instances for these devices." /> : (
        <div className="overflow-x-auto"><table className="w-full min-w-[52rem] text-left text-xs"><caption className="sr-only">Active persistent real monitoring alerts</caption><thead className="border-b text-[10px] uppercase tracking-wide text-foreground-subtle"><tr><th className="pb-2 pr-4 font-medium">Severity</th><th className="pb-2 pr-4 font-medium">Device</th>{!compact && <th className="pb-2 pr-4 font-medium">Category</th>}<th className="pb-2 pr-4 font-medium">Alert</th><th className="pb-2 pr-4 font-medium">First observed</th><th className="pb-2 font-medium">Last observed</th></tr></thead><tbody className="divide-y divide-border">{visibleAlerts.map((alert) => <tr key={alert.id}><td className="py-3 pr-4 align-top"><StatusBadge status={alert.severity} label={alert.severity.toUpperCase()} compact /></td><td className="py-3 pr-4 align-top font-mono font-medium">{alert.deviceName}</td>{!compact && <td className="py-3 pr-4 align-top capitalize text-foreground-muted">{alert.category}</td>}<td className="py-3 pr-4 align-top"><p className="font-medium text-foreground">{alert.title}</p><p className="mt-1 text-[11px] leading-4 text-foreground-muted">{alert.message}</p><p className="mt-1 font-mono text-[10px] text-foreground-subtle">Observed {alert.observationCount} time{alert.observationCount === 1 ? "" : "s"}</p></td><td className="whitespace-nowrap py-3 pr-4 align-top font-mono text-[10px] text-foreground-muted">{formatDateTime(alert.firstObservedAt)}</td><td className="whitespace-nowrap py-3 align-top font-mono text-[10px] text-foreground-muted">{formatDateTime(alert.lastObservedAt)}</td></tr>)}</tbody></table></div>
      )}
    </Panel>
  );
}
