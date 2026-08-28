import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";
import type { SemanticTone } from "@/lib/status";

interface MetricTrend {
  value: string;
  direction: "up" | "down" | "neutral";
  label?: string;
  tone?: SemanticTone;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  supportingText?: string;
  status?: SemanticTone;
  trend?: MetricTrend;
}

const accentClasses: Record<SemanticTone, string> = {
  neutral: "border-border-strong bg-surface-raised text-foreground-muted",
  healthy: "border-healthy/25 bg-healthy-muted text-healthy",
  warning: "border-warning/25 bg-warning-muted text-warning",
  critical: "border-critical/25 bg-critical-muted text-critical",
  informational:
    "border-informational/25 bg-informational-muted text-informational",
};

const textClasses: Record<SemanticTone, string> = {
  neutral: "text-foreground-muted",
  healthy: "text-healthy",
  warning: "text-warning",
  critical: "text-critical",
  informational: "text-informational",
};

export function MetricCard({
  label,
  value,
  icon: Icon,
  supportingText,
  status = "neutral",
  trend,
}: MetricCardProps) {
  const TrendIcon =
    trend?.direction === "up"
      ? ArrowUpRight
      : trend?.direction === "down"
        ? ArrowDownRight
        : ArrowRight;

  return (
    <article className="min-w-0 rounded-[var(--panel-radius)] border bg-surface p-[var(--panel-padding)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-foreground-muted">{label}</p>
        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-md border ${accentClasses[status]}`}
        >
          <Icon aria-hidden="true" size={16} />
        </span>
      </div>
      <p className="mt-3 font-mono text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
        {value}
      </p>
      {(supportingText || trend) && (
        <div className="mt-2 flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
          {trend && (
            <span
              className={`inline-flex items-center gap-1 font-medium ${textClasses[trend.tone ?? "neutral"]}`}
            >
              <TrendIcon aria-hidden="true" size={13} />
              {trend.value}
              <span className="sr-only">trend {trend.direction}</span>
            </span>
          )}
          {supportingText && (
            <span className="text-foreground-subtle">{supportingText}</span>
          )}
          {trend?.label && (
            <span className="text-foreground-subtle">{trend.label}</span>
          )}
        </div>
      )}
    </article>
  );
}
