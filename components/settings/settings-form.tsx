"use client";

import { useEffect, useState, type ReactNode } from "react";
import { BellRing, MonitorCog, RotateCcw, Save, SlidersHorizontal } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { APP_NAME, NETWORK_THRESHOLDS } from "@/lib/constants";

interface DemoPreferences {
  refreshIntervalSeconds: number;
  latencyWarningMs: number;
  packetLossWarningPercent: number;
  bandwidthWarningPercent: number;
  notifyCritical: boolean;
  notifyWarning: boolean;
  notifyOffline: boolean;
  notifySecurity: boolean;
  compactDensity: boolean;
  showAcknowledgedAlerts: boolean;
}

const defaultPreferences: DemoPreferences = {
  refreshIntervalSeconds: 30,
  latencyWarningMs: NETWORK_THRESHOLDS.latencyWarningMs,
  packetLossWarningPercent: NETWORK_THRESHOLDS.packetLossWarningPercent,
  bandwidthWarningPercent: NETWORK_THRESHOLDS.bandwidthWarningPercent,
  notifyCritical: true,
  notifyWarning: true,
  notifyOffline: true,
  notifySecurity: true,
  compactDensity: false,
  showAcknowledgedAlerts: true,
};

function ToggleField({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border bg-background/45 p-3">
      <div>
        <label htmlFor={id} className="text-xs font-medium text-foreground">
          {label}
        </label>
        <p id={`${id}-description`} className="mt-1 text-[11px] leading-5 text-foreground-muted">
          {description}
        </p>
      </div>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        aria-describedby={`${id}-description`}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full border border-border-strong bg-surface-overlay bg-[radial-gradient(circle_at_25%_50%,#8c99aa_0.3rem,transparent_0.34rem)] transition-[background] checked:border-informational/40 checked:bg-informational-muted checked:bg-[radial-gradient(circle_at_75%_50%,#38bdf8_0.3rem,transparent_0.34rem)]"
      />
    </div>
  );
}

function SettingField({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-3 rounded-md border bg-background/45 p-3 sm:grid-cols-[minmax(0,1fr)_10rem] sm:items-center">
      <div>
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className="mt-1 text-[11px] leading-5 text-foreground-muted">{description}</p>
      </div>
      {children}
    </div>
  );
}

export function SettingsForm() {
  const [preferences, setPreferences] =
    useState<DemoPreferences>(defaultPreferences);
  const [savedPreferences, setSavedPreferences] =
    useState<DemoPreferences>(defaultPreferences);
  const [message, setMessage] = useState("");

  useEffect(() => {
    document.documentElement.dataset.density = savedPreferences.compactDensity
      ? "compact"
      : "comfortable";
  }, [savedPreferences.compactDensity]);

  const update = <Key extends keyof DemoPreferences>(
    key: Key,
    value: DemoPreferences[Key],
  ) => {
    setPreferences((current) => ({ ...current, [key]: value }));
    setMessage("");
  };

  const save = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavedPreferences(preferences);
    setMessage(
      "Demo preferences saved for this session. No monitoring infrastructure was changed.",
    );
  };

  const reset = () => {
    setPreferences(defaultPreferences);
    setSavedPreferences(defaultPreferences);
    setMessage("Demo preferences reset to application defaults.");
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <Panel
        title="Monitoring preferences"
        description="Local thresholds used to demonstrate future monitoring configuration."
        action={<SlidersHorizontal aria-hidden="true" className="text-informational" size={18} />}
      >
        <div className="space-y-2">
          <SettingField label="Refresh interval" description="Planned polling interval for a future monitoring API.">
            <select
              aria-label="Refresh interval"
              value={preferences.refreshIntervalSeconds}
              onChange={(event) => update("refreshIntervalSeconds", Number(event.target.value))}
              className="h-10 rounded-md border bg-surface px-3 text-sm text-foreground"
            >
              <option value={15}>15 seconds</option>
              <option value={30}>30 seconds</option>
              <option value={60}>1 minute</option>
              <option value={300}>5 minutes</option>
            </select>
          </SettingField>
          <SettingField label="Latency warning threshold" description="Flag device latency at or above this value.">
            <div className="relative">
              <input aria-label="Latency warning threshold in milliseconds" type="number" min={1} max={1000} value={preferences.latencyWarningMs} onChange={(event) => update("latencyWarningMs", Number(event.target.value))} className="h-10 w-full rounded-md border bg-surface px-3 pr-10 font-mono text-sm" />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-foreground-subtle">ms</span>
            </div>
          </SettingField>
          <SettingField label="Packet-loss warning threshold" description="Flag aggregate packet loss at or above this percentage.">
            <div className="relative">
              <input aria-label="Packet loss warning threshold percentage" type="number" min={0.1} max={100} step={0.1} value={preferences.packetLossWarningPercent} onChange={(event) => update("packetLossWarningPercent", Number(event.target.value))} className="h-10 w-full rounded-md border bg-surface px-3 pr-8 font-mono text-sm" />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-foreground-subtle">%</span>
            </div>
          </SettingField>
          <SettingField label="Bandwidth warning threshold" description="Flag device utilization at or above this percentage.">
            <div className="relative">
              <input aria-label="Bandwidth warning threshold percentage" type="number" min={1} max={100} value={preferences.bandwidthWarningPercent} onChange={(event) => update("bandwidthWarningPercent", Number(event.target.value))} className="h-10 w-full rounded-md border bg-surface px-3 pr-8 font-mono text-sm" />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-foreground-subtle">%</span>
            </div>
          </SettingField>
        </div>
      </Panel>

      <div className="grid items-start gap-4 xl:grid-cols-2">
        <Panel title="Notification preferences" description="Demonstration routing preferences; no notifications are sent." action={<BellRing aria-hidden="true" className="text-informational" size={18} />}>
          <div className="space-y-2">
            <ToggleField id="notify-critical" label="Critical alerts" description="Notify operators about critical severity conditions." checked={preferences.notifyCritical} onChange={(value) => update("notifyCritical", value)} />
            <ToggleField id="notify-warning" label="Warning alerts" description="Notify operators about warning severity conditions." checked={preferences.notifyWarning} onChange={(value) => update("notifyWarning", value)} />
            <ToggleField id="notify-offline" label="Device offline" description="Notify when a monitored target becomes unreachable." checked={preferences.notifyOffline} onChange={(value) => update("notifyOffline", value)} />
            <ToggleField id="notify-security" label="Security and authentication" description="Notify about management authentication anomalies." checked={preferences.notifySecurity} onChange={(value) => update("notifySecurity", value)} />
          </div>
        </Panel>

        <Panel title="Display preferences" description="Harmless interface preferences held only in this browser session." action={<MonitorCog aria-hidden="true" className="text-informational" size={18} />}>
          <div className="space-y-2">
            <ToggleField id="compact-density" label="Compact panel density" description="Reduce shared panel padding for a denser operations view." checked={preferences.compactDensity} onChange={(value) => update("compactDensity", value)} />
            <ToggleField id="show-acknowledged" label="Show acknowledged alerts" description="Preference reserved for the future persistent alert API." checked={preferences.showAcknowledgedAlerts} onChange={(value) => update("showAcknowledgedAlerts", value)} />
          </div>
        </Panel>
      </div>

      <Panel title="System information" description="Current demonstration runtime and integration status.">
        <dl className="grid gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-2 xl:grid-cols-3">
          {[
            ["Application", APP_NAME],
            ["Environment", "Demo / Mock Monitoring"],
            ["Data source", "Local deterministic mock dataset"],
            ["Frontend", "Next.js App Router / React / TypeScript"],
            ["Monitoring backend", "Not connected"],
            ["Persistence", "Session state only"],
          ].map(([label, value]) => (
            <div key={label} className="bg-background p-3">
              <dt className="text-[10px] uppercase tracking-wide text-foreground-subtle">{label}</dt>
              <dd className="mt-1.5 text-xs font-medium text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <div className="sticky bottom-3 z-20 flex flex-col gap-3 rounded-[var(--panel-radius)] border border-border-strong bg-surface/95 p-3 shadow-xl backdrop-blur-sm sm:flex-row sm:items-center">
        <p aria-live="polite" className="min-h-5 flex-1 text-xs text-foreground-muted">
          {message || "Changes remain drafts until saved and reset when the page reloads."}
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={reset} className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-xs font-medium text-foreground-muted hover:bg-surface-raised hover:text-foreground">
            <RotateCcw aria-hidden="true" size={14} /> Reset defaults
          </button>
          <button type="submit" className="inline-flex h-9 items-center gap-2 rounded-md border border-informational/30 bg-informational-muted px-3 text-xs font-medium text-informational hover:bg-informational/15">
            <Save aria-hidden="true" size={14} /> Save demo preferences
          </button>
        </div>
      </div>
    </form>
  );
}
