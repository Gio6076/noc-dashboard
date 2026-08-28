"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Eye,
  Search,
  SearchX,
  Server,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { NETWORK_THRESHOLDS } from "@/lib/constants";
import {
  formatBandwidth,
  formatDateTime,
  formatDeviceType,
  formatLatency,
  formatUptime,
} from "@/lib/formatters";
import type {
  DeviceStatus,
  DeviceType,
  NetworkDevice,
} from "@/types/network";

interface DeviceInventoryProps {
  devices: readonly NetworkDevice[];
}

type StatusFilter = "all" | Extract<
  DeviceStatus,
  "online" | "degraded" | "offline"
>;

const statusFilters: readonly { label: string; value: StatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Online", value: "online" },
  { label: "Degraded", value: "degraded" },
  { label: "Offline", value: "offline" },
];

const statusPriority: Record<DeviceStatus, number> = {
  offline: 0,
  degraded: 1,
  maintenance: 2,
  online: 3,
};

function DeviceDetailsDialog({
  device,
  dialogRef,
  onClose,
}: {
  device: NetworkDevice | null;
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  onClose: () => void;
}) {
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="device-detail-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[min(34rem,calc(100%-2rem))] overflow-y-auto rounded-[var(--panel-radius)] border border-border-strong bg-surface p-0 text-foreground shadow-2xl backdrop:bg-black/75"
    >
      {device && (
        <div>
          <div className="flex items-start gap-4 border-b px-4 py-4 sm:px-5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-surface-raised text-informational">
              <Server aria-hidden="true" size={19} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground-subtle">
                Device details
              </p>
              <h2
                id="device-detail-title"
                className="mt-1 truncate font-mono text-lg font-semibold"
              >
                {device.hostname}
              </h2>
              <p className="mt-1 font-mono text-xs text-foreground-muted">
                {device.ipAddress}
              </p>
            </div>
            <button
              type="button"
              aria-label={`Close details for ${device.hostname}`}
              onClick={() => dialogRef.current?.close()}
              className="flex size-9 shrink-0 items-center justify-center rounded-md text-foreground-muted hover:bg-surface-raised hover:text-foreground"
            >
              <X aria-hidden="true" size={18} />
            </button>
          </div>

          <div className="space-y-5 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={device.status} />
              <span className="rounded-full border bg-surface-raised px-2 py-1 text-xs text-foreground-muted">
                {formatDeviceType(device.type)}
              </span>
            </div>

            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-3">
              <div className="bg-background p-3">
                <dt className="text-[10px] uppercase tracking-wide text-foreground-subtle">
                  Latency
                </dt>
                <dd className="mt-1 font-mono text-sm font-medium">
                  {device.status === "offline"
                    ? "No response"
                    : formatLatency(device.latencyMs)}
                </dd>
              </div>
              <div className="bg-background p-3">
                <dt className="text-[10px] uppercase tracking-wide text-foreground-subtle">
                  Uptime
                </dt>
                <dd className="mt-1 font-mono text-sm font-medium">
                  {device.status === "offline"
                    ? "Unavailable"
                    : formatUptime(device.uptimeSeconds)}
                </dd>
              </div>
              <div className="col-span-2 bg-background p-3 sm:col-span-1">
                <dt className="text-[10px] uppercase tracking-wide text-foreground-subtle">
                  Throughput
                </dt>
                <dd className="mt-1 font-mono text-sm font-medium">
                  {formatBandwidth(device.bandwidthUsageMbps)}
                </dd>
              </div>
            </dl>

            <ProgressBar
              label="Bandwidth utilization"
              value={device.bandwidthUtilizationPercent}
              status={device.status === "offline" ? "neutral" : undefined}
              warningThreshold={NETWORK_THRESHOLDS.bandwidthWarningPercent}
              criticalThreshold={NETWORK_THRESHOLDS.bandwidthCriticalPercent}
            />

            <div className="rounded-md border bg-background/45 p-3">
              <p className="text-[10px] uppercase tracking-wide text-foreground-subtle">
                Last monitoring sample
              </p>
              <time
                dateTime={device.lastSeenAt}
                className="mt-1 block font-mono text-xs text-foreground-muted"
              >
                {formatDateTime(device.lastSeenAt)}
              </time>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}

export function DeviceInventory({ devices }: DeviceInventoryProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<DeviceType | "all">("all");
  const [selectedDevice, setSelectedDevice] = useState<NetworkDevice | null>(
    null,
  );
  const dialogRef = useRef<HTMLDialogElement>(null);

  const deviceTypes = useMemo(
    () => [...new Set(devices.map((device) => device.type))].toSorted(),
    [devices],
  );

  const filteredDevices = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return devices
      .filter((device) => {
        const matchesQuery =
          normalizedQuery.length === 0 ||
          device.hostname.toLowerCase().includes(normalizedQuery) ||
          device.ipAddress.includes(normalizedQuery) ||
          device.type.includes(normalizedQuery) ||
          formatDeviceType(device.type)
            .toLowerCase()
            .includes(normalizedQuery);
        const matchesStatus =
          statusFilter === "all" || device.status === statusFilter;
        const matchesType =
          typeFilter === "all" || device.type === typeFilter;

        return matchesQuery && matchesStatus && matchesType;
      })
      .toSorted(
        (first, second) =>
          statusPriority[first.status] - statusPriority[second.status] ||
          first.hostname.localeCompare(second.hostname),
      );
  }, [devices, query, statusFilter, typeFilter]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (selectedDevice && !dialog.open) dialog.showModal();
    if (!selectedDevice && dialog.open) dialog.close();
  }, [selectedDevice]);

  const clearFilters = () => {
    setQuery("");
    setStatusFilter("all");
    setTypeFilter("all");
  };

  return (
    <>
      <Panel
        title="Device inventory"
        description="Search monitored infrastructure and inspect current telemetry."
        action={
          <span className="font-mono text-xs text-foreground-muted">
            {filteredDevices.length} of {devices.length}
          </span>
        }
        contentClassName="-mx-[var(--panel-padding)] -mb-[var(--panel-padding)]"
      >
        <div className="space-y-3 border-b px-[var(--panel-padding)] pb-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative min-w-0 flex-1">
              <label htmlFor="device-search" className="sr-only">
                Search devices by hostname, IP address, or type
              </label>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground-subtle"
                size={16}
              />
              <input
                id="device-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search hostname, IP address, or type"
                className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-foreground-subtle"
              />
            </div>

            <div className="relative shrink-0">
              <label htmlFor="device-type-filter" className="sr-only">
                Filter by device type
              </label>
              <SlidersHorizontal
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground-subtle"
                size={15}
              />
              <select
                id="device-type-filter"
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value as DeviceType | "all")
                }
                className="h-10 w-full appearance-none rounded-md border bg-background py-0 pl-9 pr-8 text-sm text-foreground lg:w-48"
              >
                <option value="all">All device types</option>
                {deviceTypes.map((type) => (
                  <option key={type} value={type}>
                    {formatDeviceType(type)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <fieldset>
            <legend className="sr-only">Filter devices by status</legend>
            <div className="flex flex-wrap gap-2">
              {statusFilters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  aria-pressed={statusFilter === filter.value}
                  onClick={() => setStatusFilter(filter.value)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                    statusFilter === filter.value
                      ? "border-informational/35 bg-informational-muted text-informational"
                      : "bg-background text-foreground-muted hover:bg-surface-raised hover:text-foreground"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        {filteredDevices.length === 0 ? (
          <div className="p-[var(--panel-padding)]">
            <EmptyState
              title="No devices found"
              description="Try a different hostname, IP address, device type, or status filter."
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
                <caption className="sr-only">
                  Monitored network device inventory
                </caption>
                <thead>
                  <tr className="border-b bg-background/45 text-[10px] uppercase tracking-[0.12em] text-foreground-subtle">
                    <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Device</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Type</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Latency</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Uptime</th>
                    <th scope="col" className="w-48 px-4 py-2.5 font-medium">Utilization</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredDevices.map((device) => (
                    <tr key={device.id} className="hover:bg-surface-raised/45">
                      <td className="px-4 py-3">
                        <StatusBadge status={device.status} compact />
                      </td>
                      <th scope="row" className="px-4 py-3 font-normal">
                        <span className="block font-mono text-xs font-semibold text-foreground">
                          {device.hostname}
                        </span>
                        <span className="mt-1 block font-mono text-[10px] text-foreground-subtle">
                          {device.ipAddress}
                        </span>
                      </th>
                      <td className="px-4 py-3 text-xs text-foreground-muted">
                        {formatDeviceType(device.type)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-foreground-muted">
                        {device.status === "offline"
                          ? "No response"
                          : formatLatency(device.latencyMs)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-foreground-muted">
                        {device.status === "offline"
                          ? "Unavailable"
                          : formatUptime(device.uptimeSeconds)}
                      </td>
                      <td className="px-4 py-3">
                        <ProgressBar
                          label={`${device.hostname} bandwidth`}
                          value={device.bandwidthUtilizationPercent}
                          status={
                            device.status === "offline" ? "neutral" : undefined
                          }
                          warningThreshold={
                            NETWORK_THRESHOLDS.bandwidthWarningPercent
                          }
                          criticalThreshold={
                            NETWORK_THRESHOLDS.bandwidthCriticalPercent
                          }
                          size="sm"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedDevice(device)}
                          aria-label={`View details for ${device.hostname}`}
                          className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground-muted hover:bg-surface-raised hover:text-foreground"
                        >
                          <Eye aria-hidden="true" size={14} />
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y md:hidden">
              {filteredDevices.map((device) => (
                <li key={device.id} className="p-[var(--panel-padding)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm font-semibold">
                        {device.hostname}
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-foreground-subtle">
                        {device.ipAddress}
                      </p>
                    </div>
                    <StatusBadge status={device.status} compact />
                  </div>
                  <p className="mt-2 text-xs text-foreground-muted">
                    {formatDeviceType(device.type)}
                  </p>
                  <div className="mt-3">
                    <ProgressBar
                      label="Bandwidth utilization"
                      value={device.bandwidthUtilizationPercent}
                      status={device.status === "offline" ? "neutral" : undefined}
                      warningThreshold={
                        NETWORK_THRESHOLDS.bandwidthWarningPercent
                      }
                      criticalThreshold={
                        NETWORK_THRESHOLDS.bandwidthCriticalPercent
                      }
                      size="sm"
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="font-mono text-[11px] text-foreground-subtle">
                      {device.status === "offline"
                        ? "No response"
                        : `${formatLatency(device.latencyMs)} · ${formatUptime(device.uptimeSeconds)}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedDevice(device)}
                      aria-label={`View details for ${device.hostname}`}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground-muted hover:bg-surface-raised hover:text-foreground"
                    >
                      <Eye aria-hidden="true" size={14} />
                      Details
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      <DeviceDetailsDialog
        device={selectedDevice}
        dialogRef={dialogRef}
        onClose={() => setSelectedDevice(null)}
      />
    </>
  );
}
