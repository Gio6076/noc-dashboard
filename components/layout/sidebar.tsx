import Link from "next/link";
import {
  ChevronsLeft,
  ChevronsRight,
  RadioTower,
  X,
} from "lucide-react";
import { APP_NAME, NAVIGATION_ITEMS } from "@/lib/constants";

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  pathname: string;
  onCollapseToggle: () => void;
  onMobileClose: () => void;
}

function isRouteActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({
  collapsed,
  mobileOpen,
  pathname,
  onCollapseToggle,
  onMobileClose,
}: SidebarProps) {
  return (
    <>
      <button
        type="button"
        aria-label="Close navigation menu"
        aria-hidden={!mobileOpen}
        tabIndex={mobileOpen ? 0 : -1}
        className={`fixed inset-0 z-40 bg-black/65 transition-opacity md:hidden ${
          mobileOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={onMobileClose}
      />

      <aside
        aria-label="Primary navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-surface transition-[transform,width] duration-200 md:visible md:translate-x-0 md:w-20 ${
          collapsed ? "lg:w-20" : "lg:w-64"
        } ${mobileOpen ? "visible translate-x-0" : "invisible -translate-x-full"}`}
      >
        <div className="flex h-16 shrink-0 items-center gap-3 border-b px-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-informational/30 bg-informational-muted text-informational">
            <RadioTower aria-hidden="true" size={19} />
          </div>
          <div
            className={`min-w-0 flex-1 md:hidden ${collapsed ? "lg:hidden" : "lg:block"}`}
          >
            <p className="truncate text-sm font-semibold tracking-tight">
              {APP_NAME}
            </p>
            <p className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-foreground-subtle">
              Operations Console
            </p>
          </div>
          <button
            type="button"
            aria-label="Close navigation menu"
            className="flex size-9 shrink-0 items-center justify-center rounded-md text-foreground-muted hover:bg-surface-raised hover:text-foreground md:hidden"
            onClick={onMobileClose}
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p
            className={`mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground-subtle md:hidden ${
              collapsed ? "lg:hidden" : "lg:block"
            }`}
          >
            Monitor
          </p>
          <ul className="space-y-1">
            {NAVIGATION_ITEMS.map((item) => {
              const active = isRouteActive(pathname, item.href);
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    aria-label={item.label}
                    title={collapsed ? item.label : undefined}
                    onClick={onMobileClose}
                    className={`group flex h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors ${
                      active
                        ? "bg-informational-muted text-informational"
                        : "text-foreground-muted hover:bg-surface-raised hover:text-foreground"
                    }`}
                  >
                    <Icon aria-hidden="true" className="shrink-0" size={18} />
                    <span
                      className={`truncate md:hidden ${
                        collapsed ? "lg:hidden" : "lg:inline"
                      }`}
                    >
                      {item.label}
                    </span>
                    {active && (
                      <span
                        aria-hidden="true"
                        className="ml-auto size-1.5 rounded-full bg-informational md:hidden lg:block"
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="hidden border-t p-3 lg:block">
          <button
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            onClick={onCollapseToggle}
            className="flex h-10 w-full items-center justify-center gap-3 rounded-md text-foreground-muted hover:bg-surface-raised hover:text-foreground"
          >
            {collapsed ? (
              <ChevronsRight aria-hidden="true" size={18} />
            ) : (
              <>
                <ChevronsLeft aria-hidden="true" size={18} />
                <span className="text-sm">Collapse sidebar</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
