import { Activity, BellRing, Router } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { NetworkHealthStatus } from "@/lib/dashboard";

interface OperationalSummaryItem {
  label: string;
  value: string | number;
}

interface NetworkHealthProps {
  status: NetworkHealthStatus;
  explanation: string;
  summary: readonly OperationalSummaryItem[];
}

const statusHeadings: Record<NetworkHealthStatus, string> = {
  healthy: "Network operating normally",
  warning: "Network performance requires attention",
  critical: "Critical network condition detected",
};

const summaryIcons = [Router, BellRing, Activity] as const;

export function NetworkHealth({
  status,
  explanation,
  summary,
}: NetworkHealthProps) {
  return (
    <Panel
      title="Network health"
      description="Current state derived from monitored devices and active alerts."
      action={<StatusBadge status={status} />}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={`mt-1 size-2.5 shrink-0 rounded-full ${
            status === "healthy"
              ? "bg-healthy"
              : status === "warning"
                ? "bg-warning"
                : "bg-critical"
          }`}
        />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            {statusHeadings[status]}
          </p>
          <p className="mt-1 text-xs leading-5 text-foreground-muted">
            {explanation}
          </p>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {summary.map((item, index) => {
          const Icon = summaryIcons[index % summaryIcons.length];

          return (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-md border bg-background/45 px-3 py-2.5"
            >
              <Icon
                aria-hidden="true"
                className="shrink-0 text-foreground-subtle"
                size={15}
              />
              <div className="min-w-0">
                <dt className="truncate text-[10px] uppercase tracking-wide text-foreground-subtle">
                  {item.label}
                </dt>
                <dd className="mt-0.5 truncate font-mono text-sm font-medium">
                  {item.value}
                </dd>
              </div>
            </div>
          );
        })}
      </dl>
    </Panel>
  );
}
