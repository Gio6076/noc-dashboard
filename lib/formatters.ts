import { DEFAULT_LOCALE } from "@/lib/constants";
import type { DeviceType } from "@/types/network";

const compactNumberFormatter = new Intl.NumberFormat(DEFAULT_LOCALE, {
  maximumFractionDigits: 1,
  notation: "compact",
});

const dateTimeFormatter = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
  dateStyle: "medium",
  timeStyle: "short",
});

const timeFormatter = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
  hour: "numeric",
  minute: "2-digit",
});

export function formatLatency(milliseconds: number): string {
  return `${Math.round(milliseconds)} ms`;
}

export function formatBandwidth(megabitsPerSecond: number): string {
  return `${compactNumberFormatter.format(megabitsPerSecond)} Mbps`;
}

export function formatPercentage(value: number, fractionDigits = 0): string {
  return `${value.toFixed(fractionDigits)}%`;
}

export function formatUptime(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatDuration(totalSeconds: number): string {
  return formatUptime(Math.max(0, totalSeconds));
}

export function formatDateTime(timestamp: string): string {
  return dateTimeFormatter.format(new Date(timestamp));
}

export function formatTime(timestamp: string): string {
  return timeFormatter.format(new Date(timestamp));
}

export function formatDeviceType(type: DeviceType): string {
  return type
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
