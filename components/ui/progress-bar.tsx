import { formatPercentage } from "@/lib/formatters";
import {
  getUtilizationTone,
  type SemanticTone,
} from "@/lib/status";

interface ProgressBarProps {
  value: number;
  label: string;
  status?: SemanticTone;
  warningThreshold?: number;
  criticalThreshold?: number;
  showValue?: boolean;
  size?: "sm" | "md";
}

const fillClasses: Record<SemanticTone, string> = {
  neutral: "bg-foreground-muted",
  healthy: "bg-healthy",
  warning: "bg-warning",
  critical: "bg-critical",
  informational: "bg-informational",
};

export function ProgressBar({
  value,
  label,
  status,
  warningThreshold = 75,
  criticalThreshold = 90,
  showValue = true,
  size = "md",
}: ProgressBarProps) {
  const normalizedValue = Math.min(100, Math.max(0, value));
  const tone =
    status ?? getUtilizationTone(value, warningThreshold, criticalThreshold);

  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
        <span className="truncate text-foreground-muted">{label}</span>
        {showValue && (
          <span className="shrink-0 font-mono text-foreground">
            {formatPercentage(value)}
          </span>
        )}
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={normalizedValue}
        aria-valuetext={formatPercentage(value)}
        className={`overflow-hidden rounded-full bg-surface-overlay ${
          size === "sm" ? "h-1" : "h-1.5"
        }`}
      >
        <div
          className={`h-full rounded-full ${fillClasses[tone]}`}
          style={{ width: `${normalizedValue}%` }}
        />
      </div>
    </div>
  );
}
