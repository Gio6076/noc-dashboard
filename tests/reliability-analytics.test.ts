import assert from "node:assert/strict";
import test from "node:test";
import {
  aggregateObservedStates,
  assembleReliabilityAnalytics,
  calculateServiceOutages,
  MAXIMUM_RELIABILITY_EVIDENCE_GAP_MS,
} from "../lib/reliability-analytics.ts";
import {
  InvalidMonitoringHistoryWindowError,
  parseMonitoringHistoryHours,
} from "../lib/monitoring-history-window.ts";
import type { ReliabilityRows } from "../lib/reliability-analytics.ts";

const from = new Date("2026-08-31T10:00:00.000Z");
const to = new Date("2026-08-31T10:10:00.000Z");
const window = { from, to, durationSeconds: 600 };

function at(seconds: number): Date {
  return new Date(from.getTime() + seconds * 1_000);
}

function rows(overrides: Partial<ReliabilityRows> = {}): ReliabilityRows {
  return {
    device: {
      id: "device-1",
      stableKey: "macbook-air",
      displayName: "MacBook Air",
      monitoringType: "agent",
      operationalState: "monitored",
    },
    deviceObservations: [],
    services: [{ id: "service-1", stableKey: "http:test:80:/", name: "Test", type: "http" }],
    serviceObservations: [],
    serviceAlerts: [],
    ...overrides,
  };
}

function serviceObservations(values: Array<[number, "up" | "down"]>) {
  return values.map(([seconds, status], index) => ({
    id: `observation-${index}`,
    serviceId: "service-1",
    observedAt: at(seconds),
    status,
  }));
}

test("continuous samples carry state through each next sample and the final evidence gap", () => {
  const result = assembleReliabilityAnalytics(rows({
    serviceObservations: serviceObservations([[0, "up"], [20, "up"], [40, "up"]]),
  }), window)!;
  assert.equal(result.services[0].observedUpSeconds, 100);
  assert.equal(result.services[0].unknownSeconds, 500);
});

test("a long gap becomes unknown instead of implied uptime", () => {
  const result = assembleReliabilityAnalytics(rows({
    serviceObservations: serviceObservations([[0, "up"], [300, "up"]]),
  }), window)!;
  assert.equal(result.services[0].observedUpSeconds, 120);
  assert.equal(result.services[0].unknownSeconds, 480);
});

test("a next observation at the exact maximum gap is continuous", () => {
  const result = aggregateObservedStates([
    { id: "a", observedAt: at(0), state: "up" as const },
    { id: "b", observedAt: at(60), state: "up" as const },
  ], ["up", "down"], window, MAXIMUM_RELIABILITY_EVIDENCE_GAP_MS);
  assert.equal(result.byStateMs.up, 120_000);
});

test("recent pre-window evidence establishes boundary state and is clipped", () => {
  const result = aggregateObservedStates([
    { id: "a", observedAt: at(-20), state: "up" as const },
  ], ["up", "down"], window);
  assert.equal(result.byStateMs.up, 40_000);
});

test("stale pre-window evidence does not establish boundary state", () => {
  const result = aggregateObservedStates([
    { id: "a", observedAt: at(-61), state: "up" as const },
  ], ["up", "down"], window);
  assert.equal(result.observedMs, 0);
  assert.equal(result.unknownMs, 600_000);
});

test("the final observation extends only through the gap and clips at window end", () => {
  const middle = aggregateObservedStates([{ id: "a", observedAt: at(300), state: "up" as const }], ["up"], window);
  const end = aggregateObservedStates([{ id: "a", observedAt: at(580), state: "up" as const }], ["up"], window);
  assert.equal(middle.observedMs, 60_000);
  assert.equal(end.observedMs, 20_000);
});

test("intervals before and after the window are safely clipped", () => {
  const result = aggregateObservedStates([
    { id: "a", observedAt: at(-20), state: "up" as const },
    { id: "b", observedAt: at(590), state: "down" as const },
    { id: "c", observedAt: at(700), state: "up" as const },
  ], ["up", "down"], window);
  assert.deepEqual(result.byStateMs, { up: 40_000, down: 10_000 });
});

test("no observations means zero coverage, full unknown, and null availability", () => {
  const result = assembleReliabilityAnalytics(rows(), window)!;
  assert.equal(result.services[0].observedSeconds, 0);
  assert.equal(result.services[0].unknownSeconds, 600);
  assert.equal(result.services[0].coveragePercent, 0);
  assert.equal(result.services[0].observedAvailabilityPercent, null);
  assert.equal(result.monitoringCoverage.coveragePercent, 0);
  assert.equal(result.deviceAvailability.observedAvailabilityPercent, null);
});

test("all observed UP is 100%, all DOWN is 0%, and mixed time uses known time", () => {
  const up = assembleReliabilityAnalytics(rows({ serviceObservations: serviceObservations([[0, "up"]]) }), window)!;
  const down = assembleReliabilityAnalytics(rows({ serviceObservations: serviceObservations([[0, "down"]]) }), window)!;
  const mixed = assembleReliabilityAnalytics(rows({ serviceObservations: serviceObservations([[0, "up"], [20, "down"]]) }), window)!;
  assert.equal(up.services[0].observedAvailabilityPercent, 100);
  assert.equal(down.services[0].observedAvailabilityPercent, 0);
  assert.equal(mixed.services[0].observedUpSeconds, 20);
  assert.equal(mixed.services[0].observedDownSeconds, 60);
  assert.equal(mixed.services[0].observedAvailabilityPercent, 25);
  assert.equal(mixed.services[0].coveragePercent, 13.333333);
  assert.equal(mixed.services[0].unknownSeconds, 520);
});

test("device state mapping separates online, degraded, unavailable, and not-fetched", () => {
  const result = assembleReliabilityAnalytics(rows({ deviceObservations: [
    { id: "a", observedAt: at(0), availability: "online" },
    { id: "b", observedAt: at(20), availability: "partial" },
    { id: "c", observedAt: at(40), availability: "unreachable" },
    { id: "d", observedAt: at(60), availability: "not-fetched" },
  ] }), window)!;
  assert.equal(result.deviceAvailability.availableSeconds, 20);
  assert.equal(result.deviceAvailability.degradedSeconds, 20);
  assert.equal(result.deviceAvailability.unavailableSeconds, 20);
  assert.equal(result.deviceAvailability.unknownSeconds, 540);
  assert.equal(result.deviceAvailability.observedAvailabilityPercent, 66.666667);
});

test("maintenance remains visible but does not change observation arithmetic", () => {
  const observed = [{ id: "a", observedAt: at(0), availability: "unreachable" as const }];
  const monitored = assembleReliabilityAnalytics(rows({ deviceObservations: observed }), window)!;
  const maintenance = assembleReliabilityAnalytics(rows({
    device: { ...rows().device!, operationalState: "maintenance" },
    deviceObservations: observed,
  }), window)!;
  assert.equal(maintenance.device.operationalState, "maintenance");
  assert.deepEqual(maintenance.deviceAvailability, monitored.deviceAvailability);
});

test("services with zero observations remain represented", () => {
  const result = assembleReliabilityAnalytics(rows({ services: [
    ...rows().services,
    { id: "service-2", stableKey: "tcp:empty:1", name: "Empty", type: "tcp" },
  ] }), window)!;
  assert.equal(result.services.length, 2);
  assert.equal(result.services[1].unknownSeconds, 600);
  assert.equal(result.services[1].observedAvailabilityPercent, null);
});

function alert(id: string, start: number, recovered: number | null) {
  return {
    id,
    serviceId: "service-1",
    status: recovered === null ? "active" as const : "recovered" as const,
    firstObservedAt: at(start),
    recoveredAt: recovered === null ? null : at(recovered),
  };
}

test("DOWN samples never create outage occurrences", () => {
  const result = assembleReliabilityAnalytics(rows({
    serviceObservations: serviceObservations([[0, "down"], [20, "down"], [40, "down"]]),
  }), window)!;
  assert.equal(result.services[0].outageCount, 0);
});

test("persistent recovered occurrences count once each and expose durations", () => {
  const result = calculateServiceOutages([alert("a", 10, 40), alert("b", 100, 190)], window);
  assert.equal(result.outageCount, 2);
  assert.equal(result.recoveredOutageCount, 2);
  assert.equal(result.totalRecoveredDowntimeSeconds, 120);
  assert.equal(result.longestRecoveredOutageSeconds, 90);
  assert.equal(result.meanTimeToRecoverySeconds, 60);
});

test("active outages count but never contribute to recovered duration or MTTR", () => {
  const result = calculateServiceOutages([alert("active", 10, null)], window);
  assert.deepEqual(result, {
    outageCount: 1,
    recoveredOutageCount: 0,
    activeOutageCount: 1,
    totalRecoveredDowntimeSeconds: 0,
    longestRecoveredOutageSeconds: null,
    meanTimeToRecoverySeconds: null,
  });
});

test("window downtime is clipped while MTTR uses actual recovered duration", () => {
  const before = alert("before", -100, 50);
  const after = alert("after", 550, 650);
  const result = calculateServiceOutages([before, after], window);
  assert.equal(result.totalRecoveredDowntimeSeconds, 100);
  assert.equal(result.longestRecoveredOutageSeconds, 150);
  assert.equal(result.meanTimeToRecoverySeconds, 125);
});

test("a recovered outage outside the window is excluded", () => {
  assert.equal(calculateServiceOutages([alert("old", -200, -100)], window).outageCount, 0);
  assert.equal(calculateServiceOutages([alert("future", 700, 800)], window).outageCount, 0);
});

test("percentage precision is deterministic", () => {
  const result = aggregateObservedStates([{ id: "a", observedAt: at(0), state: "up" as const }], ["up"], {
    from,
    to: new Date(from.getTime() + 180_000),
    durationSeconds: 180,
  });
  const analytics = assembleReliabilityAnalytics(rows({
    serviceObservations: serviceObservations([[0, "up"]]),
  }), { from, to: new Date(from.getTime() + 180_000), durationSeconds: 180 })!;
  assert.equal(result.observedMs, 60_000);
  assert.equal(analytics.services[0].coveragePercent, 33.333333);
});

test("reliability reuses invalid history-window semantics", () => {
  for (const value of ["0", "169", "", "Infinity", "bad"]) {
    assert.throws(() => parseMonitoringHistoryHours(value), InvalidMonitoringHistoryWindowError);
  }
  assert.equal(parseMonitoringHistoryHours(null), 24);
});
