import type { Metadata } from "next";
import {
  CheckCheck,
  CircleAlert,
  SearchCheck,
  Siren,
  TriangleAlert,
} from "lucide-react";
import { IncidentConsole } from "@/components/incidents/incident-console";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  INCIDENT_REFERENCE_TIME,
  mockNetworkAlerts,
  mockNetworkDevices,
  mockNetworkIncidents,
} from "@/data";
import { summarizeIncidents } from "@/lib/incidents";

export const metadata: Metadata = { title: "Incidents" };

export default function IncidentsPage() {
  const summary = summarizeIncidents(mockNetworkIncidents);

  return (
    <div className="space-y-5 xl:space-y-6">
      <SectionHeader
        title="Incident management"
        description="Correlated service-impact records, ownership, timelines, and investigation context."
        action={
          <StatusBadge
            status={summary.critical > 0 ? "critical" : "healthy"}
            label={`${summary.active + summary.investigating} unresolved`}
          />
        }
      />

      <section aria-label="Incident summary">
        <div className="grid grid-cols-1 gap-3 min-[30rem]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          <MetricCard label="Total incidents" value={summary.total} icon={Siren} status="informational" supportingText="Current deterministic record set" />
          <MetricCard label="Active" value={summary.active} icon={CircleAlert} status={summary.active > 0 ? "critical" : "healthy"} supportingText="Ongoing service-impact records" />
          <MetricCard label="Critical" value={summary.critical} icon={TriangleAlert} status={summary.critical > 0 ? "critical" : "healthy"} supportingText="Critical severity incidents" />
          <MetricCard label="Investigating" value={summary.investigating} icon={SearchCheck} status={summary.investigating > 0 ? "warning" : "healthy"} supportingText="Root cause under review" />
          <MetricCard label="Resolved" value={summary.resolved} icon={CheckCheck} status="healthy" supportingText="Closed within this window" />
        </div>
      </section>

      <IncidentConsole
        incidents={mockNetworkIncidents}
        devices={mockNetworkDevices}
        alerts={mockNetworkAlerts}
        referenceTime={INCIDENT_REFERENCE_TIME}
      />
    </div>
  );
}
