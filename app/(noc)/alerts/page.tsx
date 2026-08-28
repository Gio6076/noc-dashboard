import type { Metadata } from "next";
import { AlertConsole } from "@/components/alerts/alert-console";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { mockNetworkAlerts, mockNetworkDevices } from "@/data";

export const metadata: Metadata = { title: "Alerts" };

export default function AlertsPage() {
  return (
    <div className="space-y-5 xl:space-y-6">
      <SectionHeader
        title="Alert operations"
        description="Prioritize active monitoring conditions and record session-level operator acknowledgements."
        action={
          <StatusBadge
            status="informational"
            label={`${mockNetworkAlerts.length} monitored alerts`}
          />
        }
      />
      <AlertConsole alerts={mockNetworkAlerts} devices={mockNetworkDevices} />
    </div>
  );
}
