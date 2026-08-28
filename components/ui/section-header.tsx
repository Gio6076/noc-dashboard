import type { ReactNode } from "react";

interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  titleId?: string;
  headingLevel?: "h2" | "h3";
}

export function SectionHeader({
  title,
  description,
  action,
  titleId,
  headingLevel = "h2",
}: SectionHeaderProps) {
  const Heading = headingLevel;

  return (
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <Heading
          id={titleId}
          className="text-sm font-semibold tracking-tight text-foreground"
        >
          {title}
        </Heading>
        {description && (
          <p className="mt-1 text-xs leading-5 text-foreground-muted">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
