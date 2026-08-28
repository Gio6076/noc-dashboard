import {
  BellRing,
  ChartNoAxesCombined,
  CircleGauge,
  Network,
  Router,
  Settings,
  Siren,
  type LucideIcon,
} from "lucide-react";

export const APP_NAME = "NOC Dashboard";
export const APP_DESCRIPTION =
  "Real-time network operations monitoring and infrastructure health overview.";
export const SYSTEM_NAME = "NOC-01";
export const SYSTEM_DESCRIPTION = "Mock Operations";

export const DEFAULT_LOCALE = "en-US";

export const NETWORK_THRESHOLDS = {
  latencyWarningMs: 100,
  latencyCriticalMs: 200,
  bandwidthWarningPercent: 75,
  bandwidthCriticalPercent: 90,
  packetLossWarningPercent: 1,
  packetLossCriticalPercent: 3,
} as const;

export interface NavigationItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  { label: "Overview", href: "/", icon: CircleGauge },
  { label: "Devices", href: "/devices", icon: Router },
  { label: "Network", href: "/network", icon: Network },
  { label: "Alerts", href: "/alerts", icon: BellRing },
  { label: "Incidents", href: "/incidents", icon: Siren },
  { label: "Analytics", href: "/analytics", icon: ChartNoAxesCombined },
  { label: "Settings", href: "/settings", icon: Settings },
] as const;
