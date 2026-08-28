import { useId, type ReactNode } from "react";
import { SectionHeader } from "@/components/ui/section-header";

interface PanelProps {
  children: ReactNode;
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function Panel({
  children,
  title,
  description,
  action,
  className = "",
  contentClassName = "",
}: PanelProps) {
  const generatedId = useId();
  const titleId = title ? `panel-${generatedId}` : undefined;
  const Element = title ? "section" : "div";

  return (
    <Element
      aria-labelledby={titleId}
      className={`min-w-0 rounded-[var(--panel-radius)] border bg-surface p-[var(--panel-padding)] ${className}`}
    >
      {title && (
        <SectionHeader
          title={title}
          description={description}
          action={action}
          titleId={titleId}
        />
      )}
      <div className={`${title ? "mt-4" : ""} ${contentClassName}`}>
        {children}
      </div>
    </Element>
  );
}
