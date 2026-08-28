"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { NAVIGATION_ITEMS } from "@/lib/constants";
import { Sidebar } from "@/components/layout/sidebar";
import { TopHeader } from "@/components/layout/top-header";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const currentSection =
    NAVIGATION_ITEMS.find((item) =>
      item.href === "/"
        ? pathname === item.href
        : pathname.startsWith(`${item.href}/`) || pathname === item.href,
    )?.label ?? "Network Operations";

  useEffect(() => {
    if (!isMobileOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMobileOpen(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isMobileOpen]);

  return (
    <div className="min-h-dvh bg-background">
      <Sidebar
        collapsed={isCollapsed}
        mobileOpen={isMobileOpen}
        pathname={pathname}
        onCollapseToggle={() => setIsCollapsed((current) => !current)}
        onMobileClose={() => setIsMobileOpen(false)}
      />

      <div
        className={`min-w-0 transition-[margin] duration-200 md:ml-20 ${
          isCollapsed ? "lg:ml-20" : "lg:ml-64"
        }`}
      >
        <TopHeader
          sectionTitle={currentSection}
          onMenuOpen={() => setIsMobileOpen(true)}
        />
        <main className="min-w-0 p-[var(--layout-gutter)] lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
