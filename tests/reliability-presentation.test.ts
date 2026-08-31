import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  evidenceCoveragePresentation,
  formatReliabilityDuration,
  formatReliabilityPercentage,
  RELIABILITY_WINDOWS,
  reliabilityRequestPath,
  retainLastGoodReliabilityData,
} from "../lib/reliability-presentation.ts";
import type { ReliabilityAnalytics } from "../types/reliability-analytics.ts";

function analytics(overrides: Partial<ReliabilityAnalytics> = {}): ReliabilityAnalytics {
  return {
    device: { stableKey: "macbook-air", displayName: "MacBook Air", operationalState: "monitored", monitoringType: "agent" },
    window: { from: "2026-08-30T00:00:00.000Z", to: "2026-08-31T00:00:00.000Z", durationSeconds: 86_400 },
    evidencePolicy: { maximumGapSeconds: 60 },
    monitoringCoverage: { observedSeconds: 432, unknownSeconds: 85_968, coveragePercent: 0.5 },
    deviceAvailability: { availableSeconds: 432, degradedSeconds: 0, unavailableSeconds: 0, unknownSeconds: 85_968, observedAvailabilityPercent: 100 },
    services: [],
    ...overrides,
  };
}

test("100% observed availability remains distinct from low coverage", () => {
  const result = analytics();
  assert.equal(formatReliabilityPercentage(result.deviceAvailability.observedAvailabilityPercent), "100%");
  assert.equal(formatReliabilityPercentage(result.monitoringCoverage.coveragePercent), "0.50%");
  assert.equal(evidenceCoveragePresentation(result.monitoringCoverage.coveragePercent).label, "LOW COVERAGE");
});
test("null availability is not rendered as zero", () => assert.equal(formatReliabilityPercentage(null), "Not measurable"));
test("coverage thresholds have explicit evidence states", () => {
  assert.equal(evidenceCoveragePresentation(0).label, "NO COVERAGE");
  assert.equal(evidenceCoveragePresentation(0.01).label, "LOW COVERAGE");
  assert.equal(evidenceCoveragePresentation(49.99).label, "LOW COVERAGE");
  assert.equal(evidenceCoveragePresentation(50).label, "MODERATE COVERAGE");
  assert.equal(evidenceCoveragePresentation(89.99).label, "MODERATE COVERAGE");
  assert.equal(evidenceCoveragePresentation(90).label, "HIGH COVERAGE");
});
test("duration formatting preserves short precision and renders minutes and hours", () => {
  assert.equal(formatReliabilityDuration(12.5), "12.5s");
  assert.equal(formatReliabilityDuration(180), "3m 0s");
  assert.equal(formatReliabilityDuration(45_102.9), "12h 31m 43s");
  assert.equal(formatReliabilityDuration(null), "—");
});
test("fixed window controls map to API hours", () => {
  assert.deepEqual(RELIABILITY_WINDOWS.map(({ label, hours }) => [label, hours]), [["1h", 1], ["6h", 6], ["24h", 24], ["7d", 168]]);
  for (const { hours } of RELIABILITY_WINDOWS) assert.equal(reliabilityRequestPath("macbook-air", hours), `/api/monitoring/reliability/macbook-air?hours=${hours}`);
});
test("device changes are safely encoded in reliability requests", () => assert.equal(reliabilityRequestPath("linux mint/acer", 24), "/api/monitoring/reliability/linux%20mint%2Facer?hours=24"));
test("failed refresh retains the last successful result", () => {
  const previous = analytics();
  assert.deepEqual(retainLastGoodReliabilityData({ data: previous, refreshError: false }, null), { data: previous, refreshError: true });
});
test("successful refresh replaces data and clears the failure state", () => {
  const next = analytics({ device: { stableKey: "linux-mint-acer", displayName: "Linux Mint Acer", operationalState: "maintenance", monitoringType: "agent" } });
  assert.deepEqual(retainLastGoodReliabilityData({ data: analytics(), refreshError: true }, next), { data: next, refreshError: false });
});
test("presentation keeps maintenance, availability, service evidence, outage counts, and MTTR semantics explicit", () => {
  const source = readFileSync(new URL("../components/analytics/real-reliability-analytics.tsx", import.meta.url), "utf8");
  for (const label of ["Operational state", "not caused by maintenance state", "of observed time", "Observed DOWN evidence", "Recovered outage duration in window", "Outage occurrences", "Recovered outages", "Active outages", "Mean Time to Recovery (MTTR)", "excludes active outages"]) assert.match(source, new RegExp(label.replace(/[()]/g, "\\$&")));
});
test("real and demo analytics remain separately labeled on the page", () => {
  const source = readFileSync(new URL("../app/(noc)/analytics/page.tsx", import.meta.url), "utf8");
  assert.match(source, /RealReliabilityAnalytics/);
  assert.match(source, /Demo \/ Mock Reliability Analytics/);
  assert.match(source, /mockNetworkDevices/);
  assert.match(source, /operationalState === "monitored"/);
});
