import { DatabaseZap } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  monitoringCapabilityPresentation,
  type MonitoringCapabilityStatus,
} from "@/lib/monitoring-capability";

export function MonitoringCapabilityState({
  status,
}: {
  status: Exclude<MonitoringCapabilityStatus, "available">;
}) {
  const copy = monitoringCapabilityPresentation[status];
  return (
    <section aria-label="Real Monitoring Lab">
      <Panel
        title="Real Monitoring Lab"
        description={copy.description}
        action={<StatusBadge status={status === "disabled" ? "neutral" : "warning"} label={status.toUpperCase()} compact />}
      >
        <div className="flex items-start gap-3 rounded-md border bg-background/45 p-4">
          <DatabaseZap aria-hidden="true" className={status === "unavailable" ? "text-warning" : "text-foreground-muted"} size={18} />
          <div>
            <p className="text-sm font-semibold">{copy.title}</p>
            <p className="mt-1 text-xs leading-5 text-foreground-muted">{copy.detail}</p>
          </div>
        </div>
      </Panel>
    </section>
  );
}
