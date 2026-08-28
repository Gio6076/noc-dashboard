import { Bell, Menu, ShieldCheck } from "lucide-react";
import { SYSTEM_DESCRIPTION, SYSTEM_NAME } from "@/lib/constants";

interface TopHeaderProps {
  sectionTitle: string;
  onMenuOpen: () => void;
}

export function TopHeader({ sectionTitle, onMenuOpen }: TopHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-background/95 px-[var(--layout-gutter)] backdrop-blur-sm lg:px-6">
      <button
        type="button"
        aria-label="Open navigation menu"
        onClick={onMenuOpen}
        className="mr-3 flex size-9 shrink-0 items-center justify-center rounded-md text-foreground-muted hover:bg-surface-raised hover:text-foreground md:hidden"
      >
        <Menu aria-hidden="true" size={20} />
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] font-medium uppercase tracking-[0.16em] text-foreground-subtle">
          Network Operations
        </p>
        <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">
          {sectionTitle}
        </h1>
      </div>

      <div className="ml-3 flex items-center gap-2 sm:gap-3">
        <div className="hidden items-center gap-2 border-r pr-3 lg:flex">
          <ShieldCheck aria-hidden="true" className="text-informational" size={18} />
          <div className="leading-tight">
            <p className="font-mono text-xs font-medium">{SYSTEM_NAME}</p>
            <p className="text-[10px] text-foreground-subtle">
              {SYSTEM_DESCRIPTION}
            </p>
          </div>
        </div>

        <div
          className="flex items-center gap-2 rounded-full border border-informational/20 bg-informational-muted px-2.5 py-1.5"
          aria-label="Monitoring environment: demonstration"
        >
          <span className="size-1.5 rounded-full bg-informational" aria-hidden="true" />
          <span className="hidden text-xs font-medium text-informational sm:inline">
            Demo monitoring
          </span>
        </div>

        <button
          type="button"
          aria-label="Notifications"
          className="relative flex size-9 items-center justify-center rounded-md text-foreground-muted hover:bg-surface-raised hover:text-foreground"
        >
          <Bell aria-hidden="true" size={18} />
          <span
            aria-hidden="true"
            className="absolute right-2 top-2 size-1.5 rounded-full bg-critical ring-2 ring-background"
          />
        </button>

        <button
          type="button"
          aria-label="Open user profile"
          className="flex size-9 items-center justify-center rounded-full border border-border-strong bg-surface-raised font-mono text-xs font-semibold text-foreground"
        >
          NO
        </button>
      </div>
    </header>
  );
}
