import {
  CheckCheck,
  CircleCheck,
  CircleDashed,
  CircleX,
  Info,
  TriangleAlert,
} from "lucide-react";
import {
  getStatusLabel,
  getStatusTone,
  type SemanticTone,
  type StatusKind,
} from "@/lib/status";

interface StatusBadgeProps {
  status: StatusKind;
  label?: string;
  compact?: boolean;
}

const toneClasses: Record<SemanticTone, string> = {
  neutral: "border-border-strong bg-surface-raised text-foreground-muted",
  healthy: "border-healthy/25 bg-healthy-muted text-healthy",
  warning: "border-warning/25 bg-warning-muted text-warning",
  critical: "border-critical/25 bg-critical-muted text-critical",
  informational:
    "border-informational/25 bg-informational-muted text-informational",
};

function StatusIcon({ status }: Pick<StatusBadgeProps, "status">) {
  const iconProps = { "aria-hidden": true, size: 12 } as const;

  if (status === "acknowledged") return <CheckCheck {...iconProps} />;

  switch (getStatusTone(status)) {
    case "healthy":
      return <CircleCheck {...iconProps} />;
    case "warning":
      return <TriangleAlert {...iconProps} />;
    case "critical":
      return <CircleX {...iconProps} />;
    case "informational":
      return <Info {...iconProps} />;
    case "neutral":
      return <CircleDashed {...iconProps} />;
  }
}

export function StatusBadge({
  status,
  label = getStatusLabel(status),
  compact = false,
}: StatusBadgeProps) {
  const tone = getStatusTone(status);

  return (
    <span
      className={`inline-flex w-fit shrink-0 items-center rounded-full border font-medium ${toneClasses[tone]} ${
        compact ? "gap-1 px-1.5 py-0.5 text-[10px]" : "gap-1.5 px-2 py-1 text-xs"
      }`}
    >
      <StatusIcon status={status} />
      <span>{label}</span>
    </span>
  );
}
