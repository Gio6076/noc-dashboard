import assert from "node:assert/strict";
import test from "node:test";

import { CollectorRuntimeState } from "../lib/collector-runtime-state.ts";

test("runtime state transitions starting to running to stopping to stopped", () => {
  const state = new CollectorRuntimeState(new Date(0));
  assert.equal(state.snapshot().lifecycle, "starting");
  state.markRunning();
  assert.equal(state.snapshot().lifecycle, "running");
  state.markStopping();
  assert.equal(state.snapshot().lifecycle, "stopping");
  state.markStopped();
  assert.equal(state.snapshot().lifecycle, "stopped");
});

test("cycle timestamps, totals, and consecutive failures update correctly", () => {
  const state = new CollectorRuntimeState(new Date(0));
  state.markRunning();
  state.cycleStarted(new Date(1_000));
  state.cycleFailed(new Date(2_000));
  state.cycleFailed(new Date(3_000));
  assert.equal(state.snapshot().consecutiveCycleFailures, 2);
  assert.equal(state.snapshot().totalCyclesCompleted, 2);
  state.cycleStarted(new Date(4_000));
  state.cycleCompleted("partial", new Date(5_000));
  assert.deepEqual(state.snapshot(), {
    lifecycle: "running",
    processStartedAt: "1970-01-01T00:00:00.000Z",
    lastCycleStartedAt: "1970-01-01T00:00:04.000Z",
    lastCycleCompletedAt: "1970-01-01T00:00:05.000Z",
    lastCycleStatus: "partial",
    consecutiveCycleFailures: 0,
    totalCyclesCompleted: 3,
  });
});

