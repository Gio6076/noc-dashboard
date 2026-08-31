import {
  Activity, ArrowDown, Boxes, Database, Gauge, HardDrive, LockKeyhole,
  Monitor, ServerCog, ShieldCheck, Waypoints,
} from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { MonitoringCapabilityStatus } from "@/lib/monitoring-capability";
import {
  architectureLayers, deploymentSurfaces, labCapabilityPresentation,
  monitoringCapabilities, reliabilityDesignDescription, securityDesignNotes,
  technologyStack,
} from "@/lib/monitoring-architecture";

const layerIcons = [HardDrive, Activity, ServerCog, Database, Boxes, Monitor];

function InventoryStatus({ label }: { label: string }) {
  const implemented = label === "IMPLEMENTED";
  return <StatusBadge status={implemented ? "healthy" : "neutral"} label={label} compact />;
}

export function MonitoringArchitecture({ capability }: { capability: MonitoringCapabilityStatus }) {
  const capabilityCopy = labCapabilityPresentation[capability];
  return (
    <section aria-labelledby="monitoring-architecture-heading" className="space-y-4">
      <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-informational">System information</p>
          <h2 id="monitoring-architecture-heading" className="mt-1 text-lg font-semibold">Monitoring Architecture</h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-foreground-muted">Deployment boundaries, data flow, and implementation status for this portfolio monitoring lab.</p>
        </div>
        <StatusBadge status="informational" label="ARCHITECTURE / STATUS" compact />
      </div>

      <Panel title="Real Monitoring Lab" description={capabilityCopy.description} action={<StatusBadge status={capability === "available" ? "healthy" : capability === "unavailable" ? "warning" : "neutral"} label={capabilityCopy.label} />}>
        <div className="grid gap-3 md:grid-cols-2">
          {deploymentSurfaces.map((surface) => (
            <article key={surface.title} className="rounded-md border bg-background/45 p-4">
              <div className="flex items-start justify-between gap-3"><h3 className="text-sm font-semibold">{surface.title}</h3><StatusBadge status="neutral" label={surface.status} compact /></div>
              <p className="mt-2 text-xs leading-5 text-foreground-muted">{surface.description}</p>
            </article>
          ))}
        </div>
      </Panel>

      <Panel title="Monitoring data flow" description="Each numbered layer passes monitoring evidence to the next layer in order." action={<Waypoints aria-hidden="true" size={18} className="text-informational" />}>
        <ol className="grid gap-2 xl:grid-cols-6">
          {architectureLayers.map((layer, index) => {
            const Icon = layerIcons[index];
            return <li key={layer.name} className="relative flex min-w-0 flex-col rounded-md border bg-background/45 p-3">
              <div className="flex items-center gap-2"><span className="font-mono text-[10px] text-foreground-subtle">{String(index + 1).padStart(2, "0")}</span><Icon aria-hidden="true" size={15} className="text-informational" /></div>
              <h3 className="mt-2 text-xs font-semibold uppercase tracking-wide">{layer.name}</h3>
              <p className="mt-1 text-[11px] leading-4 text-foreground-muted">{layer.description}</p>
              {index < architectureLayers.length - 1 && <ArrowDown aria-hidden="true" size={14} className="mx-auto mt-3 text-foreground-subtle xl:absolute xl:-right-3 xl:top-1/2 xl:z-10 xl:m-0 xl:-translate-y-1/2 xl:-rotate-90" />}
            </li>;
          })}
        </ol>
      </Panel>

      <div className="grid items-start gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Panel title="Implemented capabilities" description="Current scope and explicitly deferred deployment work." action={<Gauge aria-hidden="true" size={18} className="text-informational" />}>
          <ul className="grid gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-2">
            {monitoringCapabilities.map(([name, status]) => <li key={name} className="flex items-center justify-between gap-3 bg-background p-3"><span className="text-xs">{name}</span><InventoryStatus label={status} /></li>)}
          </ul>
        </Panel>
        <div className="space-y-4">
          <Panel title="Security design" description="Private connection details stay outside the browser." action={<LockKeyhole aria-hidden="true" size={18} className="text-informational" />}>
            <ul className="space-y-2">{securityDesignNotes.map((note) => <li key={note} className="flex gap-2 text-xs leading-5 text-foreground-muted"><ShieldCheck aria-hidden="true" size={13} className="mt-1 shrink-0 text-healthy" />{note}</li>)}</ul>
          </Panel>
          <Panel title="Reliability design" description="Observed Availability and Monitoring Coverage are separate signals.">
            <p className="text-xs leading-5 text-foreground-muted">{reliabilityDesignDescription}</p>
          </Panel>
          <Panel title="Collector design" description="Collection is independent of dashboard requests.">
            <p className="text-xs leading-5 text-foreground-muted">Cycles run sequentially to prevent overlap, with structured operational logs, graceful SIGINT/SIGTERM shutdown, and lightweight same-host process locking. No distributed lock is implemented yet.</p>
          </Panel>
        </div>
      </div>

      <Panel title="Technology stack" description="Technologies used by the current dashboard and private lab.">
        <dl className="grid gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-2 xl:grid-cols-4">
          {technologyStack.map(([label, value]) => <div key={label} className="bg-background p-3"><dt className="text-[10px] uppercase tracking-wide text-foreground-subtle">{label}</dt><dd className="mt-1.5 text-xs leading-5 text-foreground">{value}</dd></div>)}
        </dl>
      </Panel>
    </section>
  );
}
