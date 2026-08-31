import type { MonitoringCapabilityStatus } from "./monitoring-capability.ts";

export const labCapabilityPresentation: Record<MonitoringCapabilityStatus, {
  label: Uppercase<MonitoringCapabilityStatus>;
  description: string;
}> = {
  available: {
    label: "AVAILABLE",
    description: "Persisted monitoring is connected for this deployment.",
  },
  disabled: {
    label: "DISABLED",
    description: "The private persisted monitoring backend is intentionally disabled for this public deployment.",
  },
  unavailable: {
    label: "UNAVAILABLE",
    description: "Persisted monitoring is configured but currently unavailable. No device state is inferred from this condition.",
  },
};

export const deploymentSurfaces = [
  {
    title: "Public Portfolio",
    status: "CURRENT DEPLOYMENT",
    description: "Deployed on Vercel with a fully interactive demo/mock NOC. Real monitoring may be intentionally disabled.",
  },
  {
    title: "Private Monitoring Lab",
    status: "LAB ONLY",
    description: "Contains FastAPI host agents, an independent collector, PostgreSQL persistence, current state, history, persistent alerts, and reliability analytics when connected.",
  },
] as const;

export const architectureLayers = [
  { name: "Monitored Hosts", description: "Machines being observed." },
  { name: "FastAPI Agents", description: "Read-only host telemetry and configured service checks." },
  { name: "Independent Collector", description: "Periodically retrieves agent telemetry and persists sequential monitoring cycles." },
  { name: "PostgreSQL", description: "Authoritative persisted monitoring state and history." },
  { name: "Read Models", description: "Sanitized server-side models for current state, historical monitoring, reliability analytics, and persistent alert state." },
  { name: "Next.js NOC Dashboard", description: "Operator-facing visualization and monitoring interface." },
] as const;

export const monitoringCapabilities = [
  ["Real host telemetry", "IMPLEMENTED"],
  ["Network telemetry", "IMPLEMENTED"],
  ["Configured service checks", "IMPLEMENTED"],
  ["Independent collection", "IMPLEMENTED"],
  ["PostgreSQL persistence", "IMPLEMENTED"],
  ["Persistent alert lifecycle", "IMPLEMENTED"],
  ["Historical monitoring", "IMPLEMENTED"],
  ["Reliability analytics", "IMPLEMENTED"],
  ["Structured collector logging", "IMPLEMENTED"],
  ["Graceful collector shutdown", "IMPLEMENTED"],
  ["Same-host collector locking", "IMPLEMENTED"],
  ["Production-safe degradation", "IMPLEMENTED"],
  ["Always-on Linux deployment", "PLANNED"],
  ["Cloud-secured ingestion", "PLANNED / FUTURE"],
] as const;

export const securityDesignNotes = [
  "Agent endpoints are intended for controlled private environments.",
  "Agent URLs and database credentials remain server-side.",
  "Public Vercel does not directly connect to private LAN agents.",
  "The lab is not exposed merely by adding router port forwarding.",
  "API errors are sanitized before presentation.",
] as const;

export const reliabilityDesignDescription =
  "Availability is calculated only from observed evidence. Monitoring coverage is reported separately, and unmonitored gaps remain unknown rather than being silently treated as uptime or downtime.";

export const technologyStack = [
  ["Frontend", "Next.js, React, TypeScript, Tailwind CSS, Recharts"],
  ["Monitoring Agent", "Python, FastAPI, psutil"],
  ["Persistence / Collection", "PostgreSQL, Drizzle ORM, Node.js collector"],
  ["Deployment", "Vercel public dashboard; private/local real-monitoring lab"],
] as const;
