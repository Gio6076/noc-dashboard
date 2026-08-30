import type { AgentServiceCheck } from "@/types/agent";

const SAFE_KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function assertDeviceStableKey(value: string): string {
  const key = value.trim().toLowerCase();
  if (!SAFE_KEY.test(key)) throw new Error("Invalid device stable key");
  return key;
}

function normalizeHost(value: string): string {
  const host = value.trim().toLowerCase();
  if (!host || /[\s/@?#]/.test(host)) throw new Error("Invalid service host");
  return host;
}

export function normalizeServiceUrl(value: string): string {
  const parsed = new URL(value);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Service URL must use HTTP or HTTPS");
  }
  if (parsed.username || parsed.password) throw new Error("Service URL must not contain userinfo");
  if (parsed.search || parsed.hash) throw new Error("Service URL must not contain query strings or fragments");
  parsed.hostname = parsed.hostname.toLowerCase();
  parsed.pathname = parsed.pathname.replace(/\/{2,}/g, "/") || "/";
  return parsed.toString();
}

export function serviceStableKey(service: AgentServiceCheck): string {
  if (service.type === "tcp") {
    return `tcp:${normalizeHost(service.host)}:${service.port}`;
  }
  const url = new URL(normalizeServiceUrl(service.url));
  const port = url.port || (url.protocol === "https:" ? "443" : "80");
  return `${service.type}:${url.hostname}:${port}:${url.pathname}`;
}

export function serviceAlertConditionKey(deviceKey: string, service: AgentServiceCheck): string {
  return `service:${assertDeviceStableKey(deviceKey)}:${serviceStableKey(service)}:down`;
}
