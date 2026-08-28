"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BellRing,
  CheckCheck,
  CircleAlert,
  Eye,
  Search,
  SearchX,
  TriangleAlert,
  X,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime } from "@/lib/formatters";
import type {
  AlertSeverity,
  NetworkAlert,
  NetworkDevice,
} from "@/types/network";

interface AlertConsoleProps {
  alerts: readonly NetworkAlert[];
  devices: readonly NetworkDevice[];
}

type AlertFilter =
  | "all"
  | AlertSeverity
  | "active"
  | "acknowledged";

const alertFilters: readonly { label: string; value: AlertFilter }[] = [
  { label: "All", value: "all" },
  { label: "Critical", value: "critical" },
  { label: "Warning", value: "warning" },
  { label: "Informational", value: "informational" },
  { label: "Active", value: "active" },
  { label: "Acknowledged", value: "acknowledged" },
];

const severityPriority: Record<AlertSeverity, number> = {
  critical: 0,
  warning: 1,
  informational: 2,
};

function AlertDetailsDialog({
  alert,
  hostname,
  acknowledged,
  dialogRef,
  onAcknowledge,
  onClose,
}: {
  alert: NetworkAlert | null;
  hostname?: string;
  acknowledged: boolean;
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  onAcknowledge: (id: NetworkAlert["id"]) => void;
  onClose: () => void;
}) {
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="alert-detail-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[min(34rem,calc(100%-2rem))] overflow-y-auto rounded-[var(--panel-radius)] border border-border-strong bg-surface p-0 text-foreground shadow-2xl backdrop:bg-black/75"
    >
      {alert && (
        <div>
          <div className="flex items-start gap-4 border-b px-4 py-4 sm:px-5">
            <span
              className={`flex size-10 shrink-0 items-center justify-center rounded-md border ${
                alert.severity === "critical"
                  ? "bg-critical-muted text-critical"
                  : alert.severity === "warning"
                    ? "bg-warning-muted text-warning"
                    : "bg-informational-muted text-informational"
              }`}
            >
              <BellRing aria-hidden="true" size={19} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground-subtle">
                Alert details
              </p>
              <h2
                id="alert-detail-title"
                className="mt-1 text-base font-semibold leading-6"
              >
                {alert.title}
              </h2>
            </div>
            <button
              type="button"
              aria-label={`Close details for ${alert.title}`}
              onClick={() => dialogRef.current?.close()}
              className="flex size-9 shrink-0 items-center justify-center rounded-md text-foreground-muted hover:bg-surface-raised hover:text-foreground"
            >
              <X aria-hidden="true" size={18} />
            </button>
          </div>

          <div className="space-y-5 p-4 sm:p-5">
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={alert.severity} />
              <StatusBadge
                status={acknowledged ? "acknowledged" : alert.severity}
                label={acknowledged ? "Acknowledged" : "Active"}
              />
            </div>

            <p className="text-sm leading-6 text-foreground-muted">
              {alert.message}
            </p>

            <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-2">
              <div className="bg-background p-3">
                <dt className="text-[10px] uppercase tracking-wide text-foreground-subtle">
                  Device
                </dt>
                <dd className="mt-1 font-mono text-xs font-medium">
                  {hostname ?? "Network-wide"}
                </dd>
              </div>
              <div className="bg-background p-3">
                <dt className="text-[10px] uppercase tracking-wide text-foreground-subtle">
                  Detected
                </dt>
                <dd className="mt-1 font-mono text-xs font-medium">
                  <time dateTime={alert.occurredAt}>
                    {formatDateTime(alert.occurredAt)}
                  </time>
                </dd>
              </div>
            </dl>

            <div className="rounded-md border border-informational/20 bg-informational-muted p-3 text-xs leading-5 text-informational">
              Acknowledgements are stored for this browser session only and reset when the page refreshes.
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                disabled={acknowledged}
                onClick={() => onAcknowledge(alert.id)}
                className="inline-flex items-center gap-2 rounded-md border border-informational/30 bg-informational-muted px-3 py-2 text-xs font-medium text-informational hover:bg-informational/15 disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-raised disabled:text-foreground-subtle"
              >
                <CheckCheck aria-hidden="true" size={15} />
                {acknowledged ? "Alert acknowledged" : "Acknowledge alert"}
              </button>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}

export function AlertConsole({ alerts, devices }: AlertConsoleProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AlertFilter>("all");
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(
    () =>
      new Set(
        alerts.filter((alert) => alert.acknowledged).map((alert) => alert.id),
      ),
  );
  const [selectedAlert, setSelectedAlert] = useState<NetworkAlert | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const deviceNames = useMemo(
    () => new Map(devices.map((device) => [device.id, device.hostname])),
    [devices],
  );

  const isAcknowledged = (alert: NetworkAlert) =>
    acknowledgedIds.has(alert.id);

  const filteredAlerts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return alerts
      .filter((alert) => {
        const hostname = alert.deviceId
          ? deviceNames.get(alert.deviceId)
          : undefined;
        const acknowledged = acknowledgedIds.has(alert.id);
        const matchesQuery =
          normalizedQuery.length === 0 ||
          alert.title.toLowerCase().includes(normalizedQuery) ||
          alert.message.toLowerCase().includes(normalizedQuery) ||
          hostname?.toLowerCase().includes(normalizedQuery);
        const matchesFilter =
          filter === "all" ||
          (filter === "active" && !acknowledged) ||
          (filter === "acknowledged" && acknowledged) ||
          alert.severity === filter;

        return matchesQuery && matchesFilter;
      })
      .toSorted((first, second) => {
        const firstAcknowledged = acknowledgedIds.has(first.id);
        const secondAcknowledged = acknowledgedIds.has(second.id);

        if (firstAcknowledged !== secondAcknowledged) {
          return firstAcknowledged ? 1 : -1;
        }

        return (
          severityPriority[first.severity] -
            severityPriority[second.severity] ||
          Date.parse(second.occurredAt) - Date.parse(first.occurredAt)
        );
      });
  }, [acknowledgedIds, alerts, deviceNames, filter, query]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (selectedAlert && !dialog.open) dialog.showModal();
    if (!selectedAlert && dialog.open) dialog.close();
  }, [selectedAlert]);

  const activeAlerts = alerts.filter((alert) => !isAcknowledged(alert)).length;
  const criticalAlerts = alerts.filter(
    (alert) => alert.severity === "critical",
  ).length;
  const warningAlerts = alerts.filter(
    (alert) => alert.severity === "warning",
  ).length;

  const acknowledgeAlert = (id: NetworkAlert["id"]) => {
    setAcknowledgedIds((current) => {
      const next = new Set(current);
      next.add(id);
      return next;
    });
  };

  const clearFilters = () => {
    setQuery("");
    setFilter("all");
  };

  return (
    <>
      <section aria-label="Alert summary">
        <div className="grid grid-cols-1 gap-3 min-[30rem]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          <MetricCard
            label="Total alerts"
            value={alerts.length}
            icon={BellRing}
            status="informational"
            supportingText="Current mock monitoring window"
          />
          <MetricCard
            label="Active alerts"
            value={activeAlerts}
            icon={CircleAlert}
            status={activeAlerts > 0 ? "critical" : "healthy"}
            supportingText="Requires operator review"
          />
          <MetricCard
            label="Critical"
            value={criticalAlerts}
            icon={CircleAlert}
            status={criticalAlerts > 0 ? "critical" : "healthy"}
            supportingText="Critical severity records"
          />
          <MetricCard
            label="Warning"
            value={warningAlerts}
            icon={TriangleAlert}
            status={warningAlerts > 0 ? "warning" : "healthy"}
            supportingText="Warning severity records"
          />
          <MetricCard
            label="Acknowledged"
            value={acknowledgedIds.size}
            icon={CheckCheck}
            status="healthy"
            supportingText="Session acknowledgement state"
          />
        </div>
      </section>

      <Panel
        title="Alert console"
        description="Triage active conditions and review acknowledged monitoring events."
        action={
          <span className="font-mono text-xs text-foreground-muted">
            {filteredAlerts.length} of {alerts.length}
          </span>
        }
        className="mt-5 xl:mt-6"
        contentClassName="-mx-[var(--panel-padding)] -mb-[var(--panel-padding)]"
      >
        <div className="space-y-3 border-b px-[var(--panel-padding)] pb-4">
          <div className="relative">
            <label htmlFor="alert-search" className="sr-only">
              Search alerts by title, message, or device
            </label>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground-subtle"
              size={16}
            />
            <input
              id="alert-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search alert title, message, or hostname"
              className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-foreground-subtle"
            />
          </div>

          <fieldset>
            <legend className="sr-only">Filter alerts</legend>
            <div className="flex flex-wrap gap-2">
              {alertFilters.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={filter === item.value}
                  onClick={() => setFilter(item.value)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                    filter === item.value
                      ? "border-informational/35 bg-informational-muted text-informational"
                      : "bg-background text-foreground-muted hover:bg-surface-raised hover:text-foreground"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        {filteredAlerts.length === 0 ? (
          <div className="p-[var(--panel-padding)]">
            <EmptyState
              title="No alerts found"
              description="Try a different title, hostname, severity, or acknowledgement filter."
              icon={SearchX}
              action={
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-md border bg-surface-raised px-3 py-2 text-xs font-medium text-foreground hover:bg-surface-overlay"
                >
                  Clear filters
                </button>
              }
            />
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[58rem] border-collapse text-left">
                <caption className="sr-only">Network monitoring alerts</caption>
                <thead>
                  <tr className="border-b bg-background/45 text-[10px] uppercase tracking-[0.12em] text-foreground-subtle">
                    <th scope="col" className="px-4 py-2.5 font-medium">Severity</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Alert</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Device</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Detected</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredAlerts.map((alert) => {
                    const hostname = alert.deviceId
                      ? deviceNames.get(alert.deviceId)
                      : undefined;
                    const acknowledged = isAcknowledged(alert);

                    return (
                      <tr key={alert.id} className="hover:bg-surface-raised/45">
                        <td className="px-4 py-3 align-top">
                          <StatusBadge status={alert.severity} compact />
                        </td>
                        <th scope="row" className="max-w-md px-4 py-3 font-normal">
                          <span className="block text-xs font-semibold text-foreground">
                            {alert.title}
                          </span>
                          <span className="mt-1 block line-clamp-2 text-[11px] leading-5 text-foreground-muted">
                            {alert.message}
                          </span>
                        </th>
                        <td className="px-4 py-3 font-mono text-xs text-foreground-muted">
                          {hostname ?? "Network-wide"}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            status={acknowledged ? "acknowledged" : alert.severity}
                            label={acknowledged ? "Acknowledged" : "Active"}
                            compact
                          />
                        </td>
                        <td className="px-4 py-3 font-mono text-[10px] text-foreground-subtle">
                          <time dateTime={alert.occurredAt}>
                            {formatDateTime(alert.occurredAt)}
                          </time>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedAlert(alert)}
                            aria-label={`View details for ${alert.title}`}
                            className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground-muted hover:bg-surface-raised hover:text-foreground"
                          >
                            <Eye aria-hidden="true" size={14} />
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="divide-y md:hidden">
              {filteredAlerts.map((alert) => {
                const hostname = alert.deviceId
                  ? deviceNames.get(alert.deviceId)
                  : undefined;
                const acknowledged = isAcknowledged(alert);

                return (
                  <li key={alert.id} className="p-[var(--panel-padding)]">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={alert.severity} compact />
                      <StatusBadge
                        status={acknowledged ? "acknowledged" : alert.severity}
                        label={acknowledged ? "Acknowledged" : "Active"}
                        compact
                      />
                    </div>
                    <p className="mt-3 text-sm font-semibold">{alert.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-foreground-muted">
                      {alert.message}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10px] text-foreground-subtle">
                      <span>{hostname ?? "Network-wide"}</span>
                      <time dateTime={alert.occurredAt}>
                        {formatDateTime(alert.occurredAt)}
                      </time>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedAlert(alert)}
                      aria-label={`View details for ${alert.title}`}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground-muted hover:bg-surface-raised hover:text-foreground"
                    >
                      <Eye aria-hidden="true" size={14} />
                      Details
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Panel>

      <AlertDetailsDialog
        alert={selectedAlert}
        hostname={
          selectedAlert?.deviceId
            ? deviceNames.get(selectedAlert.deviceId)
            : undefined
        }
        acknowledged={
          selectedAlert ? acknowledgedIds.has(selectedAlert.id) : false
        }
        dialogRef={dialogRef}
        onAcknowledge={acknowledgeAlert}
        onClose={() => setSelectedAlert(null)}
      />
    </>
  );
}
