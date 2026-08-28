import type { Metadata } from "next";
import { SettingsForm } from "@/components/settings/settings-form";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusBadge } from "@/components/ui/status-badge";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="space-y-5 xl:space-y-6">
      <SectionHeader
        title="NOC configuration"
        description="Configure demonstration thresholds, notification routing, and local display preferences."
        action={<StatusBadge status="informational" label="Session only" />}
      />
      <SettingsForm />
    </div>
  );
}
