import type { Metadata } from "next";
import { connection } from "next/server";
import { SettingsForm } from "@/components/settings/settings-form";
import { MonitoringArchitecture } from "@/components/settings/monitoring-architecture";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { getPersistedMonitoringCapability } from "@/lib/server/monitoring/get-persisted-monitoring-state";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await connection();
  const monitoring = await getPersistedMonitoringCapability();
  return (
    <div className="space-y-5 xl:space-y-6">
      <SectionHeader
        title="NOC configuration"
        description="Configure demonstration thresholds, notification routing, and local display preferences."
        action={<StatusBadge status="informational" label="Session only" />}
      />
      <SettingsForm />
      <MonitoringArchitecture capability={monitoring.status} />
    </div>
  );
}
