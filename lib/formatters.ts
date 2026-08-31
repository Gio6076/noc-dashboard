import { DEFAULT_LOCALE } from "./constants.ts";
import type { DeviceType } from "../types/network.ts";

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

export function formatBytes(bytes: number | string | bigint): string {
  const units = ["B", "KB", "MB", "GB", "TB", "PB"] as const;
  if (typeof bytes !== "number") {
    let value: bigint;
    try {
      value = typeof bytes === "bigint" ? bytes : BigInt(bytes);
    } catch {
      return "0 B";
    }
    if (value <= BigInt(0)) return "0 B";
    let unitIndex = 0;
    let divisor = BigInt(1);
    while (unitIndex < units.length - 1 && value >= divisor * BigInt(1024)) {
      divisor *= BigInt(1024);
      unitIndex += 1;
    }
    const whole = value / divisor;
    if (whole >= BigInt(10) || unitIndex === 0) return `${whole.toString()} ${units[unitIndex]}`;
    const tenth = (value % divisor) * BigInt(10) / divisor;
    return `${whole.toString()}.${tenth.toString()} ${units[unitIndex]}`;
  }
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** unitIndex;
  const fractionDigits = value >= 10 || unitIndex === 0 ? 0 : 1;

  return `${value.toFixed(fractionDigits)} ${units[unitIndex]}`;
}

export function formatThroughput(bytesPerSecond: number): string {
  return `${formatBytes(bytesPerSecond)}/s`;
}

export function formatPercentage(value: number, fractionDigits = 0): string {
  return `${value.toFixed(fractionDigits)}%`;
}

export function formatUptime(totalSeconds: number | string | bigint): string {
  if (typeof totalSeconds !== "number") {
    let seconds: bigint;
    try {
      seconds = typeof totalSeconds === "bigint" ? totalSeconds : BigInt(totalSeconds);
    } catch {
      return "Unavailable";
    }
    if (seconds < BigInt(0)) seconds = BigInt(0);
    const days = seconds / BigInt(86_400);
    const hours = seconds % BigInt(86_400) / BigInt(3_600);
    const minutes = seconds % BigInt(3_600) / BigInt(60);
    if (days > BigInt(0)) return `${days.toString()}d ${hours.toString()}h`;
    if (hours > BigInt(0)) return `${hours.toString()}h ${minutes.toString()}m`;
    return `${minutes.toString()}m`;
  }
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
