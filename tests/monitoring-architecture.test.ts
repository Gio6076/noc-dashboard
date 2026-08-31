import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  architectureLayers, deploymentSurfaces, labCapabilityPresentation,
  monitoringCapabilities, reliabilityDesignDescription, securityDesignNotes,
} from "../lib/monitoring-architecture.ts";

test("capability presentation covers available, disabled, and unavailable states", () => {
  assert.equal(labCapabilityPresentation.available.label, "AVAILABLE");
  assert.match(labCapabilityPresentation.available.description, /connected for this deployment/i);
  assert.equal(labCapabilityPresentation.disabled.label, "DISABLED");
  assert.match(labCapabilityPresentation.disabled.description, /intentionally disabled/i);
  assert.doesNotMatch(labCapabilityPresentation.disabled.description, /fail|error|offline/i);
  assert.equal(labCapabilityPresentation.unavailable.label, "UNAVAILABLE");
  assert.match(labCapabilityPresentation.unavailable.description, /currently unavailable/i);
  assert.doesNotMatch(labCapabilityPresentation.unavailable.description, /devices? (?:are|is) offline/i);
});

test("capability inventory distinguishes implemented work from planned work", () => {
  const inventory = new Map<string, string>(monitoringCapabilities);
  for (const feature of ["Real host telemetry", "Network telemetry", "Configured service checks", "Independent collection", "PostgreSQL persistence", "Persistent alert lifecycle", "Historical monitoring", "Reliability analytics", "Structured collector logging", "Graceful collector shutdown", "Same-host collector locking", "Production-safe degradation"]) assert.equal(inventory.get(feature), "IMPLEMENTED");
  assert.notEqual(inventory.get("Always-on Linux deployment"), "IMPLEMENTED");
  assert.notEqual(inventory.get("Cloud-secured ingestion"), "IMPLEMENTED");
});

test("public portfolio and private lab remain explicitly separated", () => {
  assert.deepEqual(deploymentSurfaces.map(({ title }) => title), ["Public Portfolio", "Private Monitoring Lab"]);
  assert.match(deploymentSurfaces[0].description, /demo\/mock NOC/i);
  assert.match(deploymentSurfaces[1].description, /when connected/i);
});

test("security notes disclose design without private connection details", () => {
  const text = securityDesignNotes.join(" ");
  assert.match(text, /server-side/i);
  assert.match(text, /does not directly connect/i);
  assert.doesNotMatch(text, /DATABASE_URL|https?:\/\/|localhost|\b(?:\d{1,3}\.){3}\d{1,3}\b|username|password/i);
});

test("reliability design distinguishes observed availability from coverage and preserves unknown gaps", () => {
  assert.match(reliabilityDesignDescription, /Availability.*observed evidence/i);
  assert.match(reliabilityDesignDescription, /coverage.*separately/i);
  assert.match(reliabilityDesignDescription, /gaps remain unknown/i);
});

test("architecture layers preserve the monitoring data-flow order", () => {
  assert.deepEqual(architectureLayers.map(({ name }) => name), ["Monitored Hosts", "FastAPI Agents", "Independent Collector", "PostgreSQL", "Read Models", "Next.js NOC Dashboard"]);
});

test("settings keeps the interactive demo form alongside server capability integration", () => {
  const page = readFileSync(new URL("../app/(noc)/settings/page.tsx", import.meta.url), "utf8");
  const form = readFileSync(new URL("../components/settings/settings-form.tsx", import.meta.url), "utf8");
  assert.match(page, /<SettingsForm \/>/);
  assert.match(page, /getPersistedMonitoringCapability/);
  assert.match(page, /<MonitoringArchitecture capability={monitoring.status} \/>/);
  assert.match(form, /Save demo preferences/);
  assert.match(form, /Monitoring preferences/);
});
