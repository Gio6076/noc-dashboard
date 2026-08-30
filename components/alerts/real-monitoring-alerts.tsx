import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime } from "@/lib/formatters";
import type { RealMonitoringAlert } from "@/types/monitoring-alert";

interface RealMonitoringAlertsProps {
  alerts: readonly RealMonitoringAlert[];
  compact?: boolean;
}

export function RealMonitoringAlerts({
  alerts,
  compact = false,
}: RealMonitoringAlertsProps) {
  const visibleAlerts = compact ? alerts.slice(0, 5) : alerts;

  return (
    <Panel
      title="Real Monitoring Alerts"
      description="Active current conditions from monitored devices. Maintenance and disabled devices are excluded from alert evaluation. No alert history or persistence."
      action={
        <StatusBadge
          status={alerts.some((alert) => alert.severity === "critical") ? "critical" : alerts.length > 0 ? "warning" : "healthy"}
          label={`${alerts.length} active`}
          compact
        />
      }
    >
      {alerts.length === 0 ? (
        <EmptyState
          title="No active real monitoring alerts"
          description="The latest available agent telemetry does not meet any configured alert condition."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-left text-xs">
            <caption className="sr-only">Active real monitoring alerts</caption>
            <thead className="border-b text-[10px] uppercase tracking-wide text-foreground-subtle">
              <tr>
                <th className="pb-2 pr-4 font-medium">Severity</th>
                <th className="pb-2 pr-4 font-medium">Device</th>
                {!compact && <th className="pb-2 pr-4 font-medium">Category</th>}
                <th className="pb-2 pr-4 font-medium">Alert</th>
                <th className="pb-2 font-medium">Observed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibleAlerts.map((alert) => (
                <tr key={alert.id}>
                  <td className="py-3 pr-4 align-top">
                    <StatusBadge status={alert.severity} label={alert.severity.toUpperCase()} compact />
                  </td>
                  <td className="py-3 pr-4 align-top font-mono font-medium">{alert.deviceName}</td>
                  {!compact && <td className="py-3 pr-4 align-top capitalize text-foreground-muted">{alert.category}</td>}
                  <td className="py-3 pr-4 align-top">
                    <p className="font-medium text-foreground">{alert.title}</p>
                    <p className="mt-1 text-[11px] leading-4 text-foreground-muted">{alert.message}</p>
                  </td>
                  <td className="whitespace-nowrap py-3 align-top font-mono text-[10px] text-foreground-muted">
                    {formatDateTime(alert.observedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {compact && alerts.length > visibleAlerts.length && (
            <p className="border-t pt-3 text-xs text-foreground-muted">
              {alerts.length - visibleAlerts.length} more active alert{alerts.length - visibleAlerts.length === 1 ? "" : "s"} on the Alerts page.
            </p>
          )}
        </div>
      )}
    </Panel>
  );
}
