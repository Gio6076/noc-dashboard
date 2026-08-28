"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Clock3, Eye, Search, SearchX, Siren, X } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  formatDateTime,
  formatDuration,
} from "@/lib/formatters";
import { calculateIncidentDurationSeconds } from "@/lib/incidents";
import type {
  AlertSeverity,
  IncidentStatus,
  NetworkAlert,
  NetworkDevice,
  NetworkIncident,
} from "@/types/network";

interface IncidentConsoleProps {
  incidents: readonly NetworkIncident[];
  devices: readonly NetworkDevice[];
  alerts: readonly NetworkAlert[];
  referenceTime: string;
}

const severityPriority: Record<AlertSeverity, number> = {
  critical: 0,
  warning: 1,
  informational: 2,
};

const statusPriority: Record<IncidentStatus, number> = {
  active: 0,
  investigating: 1,
  resolved: 2,
};

function IncidentDetailsDialog({
  incident,
  devices,
  alerts,
  referenceTime,
  dialogRef,
  onClose,
}: {
  incident: NetworkIncident | null;
  devices: readonly NetworkDevice[];
  alerts: readonly NetworkAlert[];
  referenceTime: string;
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  onClose: () => void;
}) {
  const deviceNames = new Map(devices.map((device) => [device.id, device.hostname]));
  const alertsById = new Map(alerts.map((alert) => [alert.id, alert]));

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="incident-detail-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[min(40rem,calc(100%-2rem))] overflow-y-auto rounded-[var(--panel-radius)] border border-border-strong bg-surface p-0 text-foreground shadow-2xl backdrop:bg-black/75"
    >
      {incident && (
        <div>
          <div className="flex items-start gap-4 border-b px-4 py-4 sm:px-5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-critical-muted text-critical">
              <Siren aria-hidden="true" size={19} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground-subtle">
                Incident details
              </p>
              <h2 id="incident-detail-title" className="mt-1 text-base font-semibold leading-6">
                {incident.title}
              </h2>
            </div>
            <button
              type="button"
              aria-label={`Close details for ${incident.title}`}
              onClick={() => dialogRef.current?.close()}
              className="flex size-9 shrink-0 items-center justify-center rounded-md text-foreground-muted hover:bg-surface-raised hover:text-foreground"
            >
              <X aria-hidden="true" size={18} />
            </button>
          </div>

          <div className="space-y-5 p-4 sm:p-5">
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={incident.severity} />
              <StatusBadge status={incident.status} />
            </div>

            <p className="text-sm leading-6 text-foreground-muted">
              {incident.summary}
            </p>

            <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-2">
              <div className="bg-background p-3">
                <dt className="text-[10px] uppercase tracking-wide text-foreground-subtle">Affected devices</dt>
                <dd className="mt-1 space-y-1 font-mono text-xs font-medium">
                  {incident.affectedDeviceIds.map((id) => (
                    <span key={id} className="block">{deviceNames.get(id) ?? id}</span>
                  ))}
                </dd>
              </div>
              <div className="bg-background p-3">
                <dt className="text-[10px] uppercase tracking-wide text-foreground-subtle">Assigned team</dt>
                <dd className="mt-1 text-xs font-medium">{incident.assignedTeam}</dd>
              </div>
              <div className="bg-background p-3">
                <dt className="text-[10px] uppercase tracking-wide text-foreground-subtle">Started</dt>
                <dd className="mt-1 font-mono text-xs font-medium">
                  <time dateTime={incident.startedAt}>{formatDateTime(incident.startedAt)}</time>
                </dd>
              </div>
              <div className="bg-background p-3">
                <dt className="text-[10px] uppercase tracking-wide text-foreground-subtle">
                  Resolved
                </dt>
                <dd className="mt-1 font-mono text-xs font-medium">
                  {incident.resolvedAt ? (
                    <time dateTime={incident.resolvedAt}>{formatDateTime(incident.resolvedAt)}</time>
                  ) : (
                    "Active incident"
                  )}
                </dd>
              </div>
              <div className="bg-background p-3 sm:col-span-2">
                <dt className="text-[10px] uppercase tracking-wide text-foreground-subtle">Duration</dt>
                <dd className="mt-1 font-mono text-xs font-medium">
                  {formatDuration(calculateIncidentDurationSeconds(incident, referenceTime))}
                </dd>
              </div>
            </dl>

            {incident.rootCause && (
              <div className="rounded-md border bg-background/45 p-3">
                <h3 className="text-[10px] font-semibold uppercase tracking-wide text-foreground-subtle">Root cause</h3>
                <p className="mt-2 text-xs leading-5 text-foreground-muted">{incident.rootCause}</p>
              </div>
            )}

            <div>
              <h3 className="text-[10px] font-semibold uppercase tracking-wide text-foreground-subtle">Related alerts</h3>
              <ul className="mt-2 space-y-2">
                {incident.relatedAlertIds.map((id) => {
                  const alert = alertsById.get(id);
                  return (
                    <li key={id} className="flex items-start gap-2 rounded-md border bg-background/45 p-2.5">
                      {alert ? <StatusBadge status={alert.severity} compact /> : null}
                      <span className="text-xs leading-5 text-foreground-muted">{alert?.title ?? id}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}

export function IncidentConsole({
  incidents,
  devices,
  alerts,
  referenceTime,
}: IncidentConsoleProps) {
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState<AlertSeverity | "all">("all");
  const [status, setStatus] = useState<IncidentStatus | "all">("all");
  const [selectedIncident, setSelectedIncident] = useState<NetworkIncident | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const deviceNames = useMemo(
    () => new Map(devices.map((device) => [device.id, device.hostname])),
    [devices],
  );

  const filteredIncidents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return incidents
      .filter((incident) => {
        const affectedNames = incident.affectedDeviceIds
          .map((id) => deviceNames.get(id) ?? id)
          .join(" ")
          .toLowerCase();
        const matchesQuery =
          normalizedQuery.length === 0 ||
          incident.title.toLowerCase().includes(normalizedQuery) ||
          incident.summary.toLowerCase().includes(normalizedQuery) ||
          affectedNames.includes(normalizedQuery);

        return (
          matchesQuery &&
          (severity === "all" || incident.severity === severity) &&
          (status === "all" || incident.status === status)
        );
      })
      .toSorted(
        (first, second) =>
          Number(first.status === "resolved") -
            Number(second.status === "resolved") ||
          severityPriority[first.severity] - severityPriority[second.severity] ||
          statusPriority[first.status] - statusPriority[second.status] ||
          Date.parse(second.startedAt) - Date.parse(first.startedAt),
      );
  }, [deviceNames, incidents, query, severity, status]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (selectedIncident && !dialog.open) dialog.showModal();
    if (!selectedIncident && dialog.open) dialog.close();
  }, [selectedIncident]);

  const clearFilters = () => {
    setQuery("");
    setSeverity("all");
    setStatus("all");
  };

  return (
    <>
      <Panel
        title="Incident queue"
        description="Deterministic operational records correlated with current alerts and device state."
        action={<span className="font-mono text-xs text-foreground-muted">{filteredIncidents.length} of {incidents.length}</span>}
        contentClassName="-mx-[var(--panel-padding)] -mb-[var(--panel-padding)]"
      >
        <div className="grid gap-3 border-b px-[var(--panel-padding)] pb-4 lg:grid-cols-[minmax(0,1fr)_12rem_12rem]">
          <div className="relative">
            <label htmlFor="incident-search" className="sr-only">Search incidents by title, summary, or device</label>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground-subtle" size={16} />
            <input
              id="incident-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, summary, or device"
              className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-foreground-subtle"
            />
          </div>
          <div>
            <label htmlFor="incident-severity" className="sr-only">Filter by severity</label>
            <select
              id="incident-severity"
              value={severity}
              onChange={(event) => setSeverity(event.target.value as AlertSeverity | "all")}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm text-foreground"
            >
              <option value="all">All severities</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="informational">Informational</option>
            </select>
          </div>
          <div>
            <label htmlFor="incident-status" className="sr-only">Filter by incident status</label>
            <select
              id="incident-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as IncidentStatus | "all")}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm text-foreground"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>

        {filteredIncidents.length === 0 ? (
          <div className="p-[var(--panel-padding)]">
            <EmptyState
              title="No incidents found"
              description="Try a different incident title, device, severity, or status."
              icon={SearchX}
              action={<button type="button" onClick={clearFilters} className="rounded-md border bg-surface-raised px-3 py-2 text-xs font-medium hover:bg-surface-overlay">Clear filters</button>}
            />
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[62rem] border-collapse text-left">
                <caption className="sr-only">Network operations incidents</caption>
                <thead>
                  <tr className="border-b bg-background/45 text-[10px] uppercase tracking-[0.12em] text-foreground-subtle">
                    <th scope="col" className="px-4 py-2.5 font-medium">Severity</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Incident</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Affected device</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Started</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Duration</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredIncidents.map((incident) => (
                    <tr key={incident.id} className="hover:bg-surface-raised/45">
                      <td className="px-4 py-3 align-top"><StatusBadge status={incident.severity} compact /></td>
                      <th scope="row" className="max-w-md px-4 py-3 font-normal">
                        <span className="block text-xs font-semibold">{incident.title}</span>
                        <span className="mt-1 block line-clamp-2 text-[11px] leading-5 text-foreground-muted">{incident.summary}</span>
                      </th>
                      <td className="px-4 py-3 font-mono text-xs text-foreground-muted">
                        {incident.affectedDeviceIds.map((id) => deviceNames.get(id) ?? id).join(", ")}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={incident.status} compact /></td>
                      <td className="px-4 py-3 font-mono text-[10px] text-foreground-subtle"><time dateTime={incident.startedAt}>{formatDateTime(incident.startedAt)}</time></td>
                      <td className="px-4 py-3 font-mono text-xs text-foreground-muted">
                        {formatDuration(calculateIncidentDurationSeconds(incident, referenceTime))}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button type="button" onClick={() => setSelectedIncident(incident)} aria-label={`View details for ${incident.title}`} className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground-muted hover:bg-surface-raised hover:text-foreground">
                          <Eye aria-hidden="true" size={14} /> Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y md:hidden">
              {filteredIncidents.map((incident) => (
                <li key={incident.id} className="p-[var(--panel-padding)]">
                  <div className="flex flex-wrap gap-2"><StatusBadge status={incident.severity} compact /><StatusBadge status={incident.status} compact /></div>
                  <p className="mt-3 text-sm font-semibold">{incident.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-foreground-muted">{incident.summary}</p>
                  <p className="mt-2 font-mono text-[10px] text-foreground-subtle">{incident.affectedDeviceIds.map((id) => deviceNames.get(id) ?? id).join(", ")}</p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-foreground-subtle"><Clock3 aria-hidden="true" size={12} />{formatDuration(calculateIncidentDurationSeconds(incident, referenceTime))}</span>
                    <button type="button" onClick={() => setSelectedIncident(incident)} aria-label={`View details for ${incident.title}`} className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground-muted hover:bg-surface-raised hover:text-foreground"><Eye aria-hidden="true" size={14} /> Details</button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      <IncidentDetailsDialog
        incident={selectedIncident}
        devices={devices}
        alerts={alerts}
        referenceTime={referenceTime}
        dialogRef={dialogRef}
        onClose={() => setSelectedIncident(null)}
      />
    </>
  );
}
