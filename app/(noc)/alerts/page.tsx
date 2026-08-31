import type { Metadata } from "next";
import { connection } from "next/server";
import { AlertConsole } from "@/components/alerts/alert-console";
import { LiveRealMonitoring } from "@/components/monitoring/live-real-monitoring";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { mockNetworkAlerts, mockNetworkDevices } from "@/data";
import { getPersistedMonitoringCapability } from "@/lib/server/monitoring/get-persisted-monitoring-state";

export const metadata: Metadata = { title: "Alerts" };

export default async function AlertsPage() {
  await connection();
  const persistedMonitoring = await getPersistedMonitoringCapability();

  return (
    <div className="space-y-5 xl:space-y-6">
      <SectionHeader
        title="Alerts"
        description="Current real monitoring conditions and a separately labeled deterministic demo alert console."
        action={
          <StatusBadge
            status="informational"
            label="Persisted polling"
          />
        }
      />
      <LiveRealMonitoring initialResult={persistedMonitoring} showAlerts />
      <SectionHeader
        title="Demo / Simulated Alerts"
        description="Deterministic demonstration data. Session-level acknowledgement controls below do not apply to real monitoring alerts."
        action={<StatusBadge status="informational" label={`${mockNetworkAlerts.length} demo alerts`} compact />}
      />
      <AlertConsole alerts={mockNetworkAlerts} devices={mockNetworkDevices} />
    </div>
  );
}
