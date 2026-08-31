import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_COLLECTION_INTERVAL_SECONDS,
  parseCollectionIntervalSeconds,
  runCollectorLoop,
  waitForCollectorDelay,
} from "../lib/monitoring-collector.ts";

test("collection interval defaults to 20 seconds", () => {
  assert.equal(parseCollectionIntervalSeconds(undefined), 20);
  assert.equal(DEFAULT_COLLECTION_INTERVAL_SECONDS, 20);
});

test("collection interval accepts a valid environment override", () => {
  assert.equal(parseCollectionIntervalSeconds("12.5"), 12.5);
});

test("collection interval rejects invalid values", () => {
  for (const value of ["", "not-a-number", "Infinity", "0", "-10"]) {
    assert.throws(() => parseCollectionIntervalSeconds(value), /positive finite number/);
  }
});

test("collection interval rejects values below five seconds", () => {
  assert.throws(() => parseCollectionIntervalSeconds("4.99"), /at least 5 seconds/);
});

test("collector cycles are sequential and never overlap", async () => {
  const shutdown = new AbortController();
  let activeCycles = 0;
  let maximumActiveCycles = 0;
  let cycles = 0;

  await runCollectorLoop({
    intervalMilliseconds: 20_000,
    signal: shutdown.signal,
    runCycle: async () => {
      activeCycles += 1;
      maximumActiveCycles = Math.max(maximumActiveCycles, activeCycles);
      await Promise.resolve();
      activeCycles -= 1;
      cycles += 1;
      if (cycles === 3) shutdown.abort();
    },
    wait: async () => true,
  });

  assert.equal(cycles, 3);
  assert.equal(maximumActiveCycles, 1);
});

test("a failed cycle does not stop the collector loop", async () => {
  const shutdown = new AbortController();
  let attempts = 0;
  let failures = 0;

  await runCollectorLoop({
    intervalMilliseconds: 20_000,
    signal: shutdown.signal,
    runCycle: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("cycle failed");
      shutdown.abort();
    },
    wait: async () => true,
    onCycleFailure: () => {
      failures += 1;
    },
  });

  assert.equal(attempts, 2);
  assert.equal(failures, 1);
});

test("shutdown during a cycle prevents another cycle", async () => {
  const shutdown = new AbortController();
  let cycles = 0;
  let waits = 0;

  await runCollectorLoop({
    intervalMilliseconds: 20_000,
    signal: shutdown.signal,
    runCycle: async () => {
      cycles += 1;
      shutdown.abort();
      await Promise.resolve();
    },
    wait: async () => {
      waits += 1;
      return true;
    },
  });

  assert.equal(cycles, 1);
  assert.equal(waits, 0);
});

test("collector delay can be interrupted by shutdown", async () => {
  const shutdown = new AbortController();
  const waiting = waitForCollectorDelay(20_000, shutdown.signal);

  shutdown.abort();

  assert.equal(await waiting, false);
});
