import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { acquireCollectorProcessLock } from "../lib/collector-process-lock.ts";

test("a second local collector is prevented and graceful release permits restart", async () => {
  const directory = await mkdtemp(join(tmpdir(), "noc-collector-lock-test-"));
  const path = join(directory, "collector.lock");
  try {
    const first = await acquireCollectorProcessLock(path);
    assert.ok(first);
    assert.equal(JSON.parse(await readFile(path, "utf8")).pid, process.pid);
    assert.equal(await acquireCollectorProcessLock(path), null);
    await first.release();
    const restarted = await acquireCollectorProcessLock(path);
    assert.ok(restarted);
    await restarted.release();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("a stale lock left by an abnormally terminated process is recoverable", async () => {
  const directory = await mkdtemp(join(tmpdir(), "noc-collector-stale-lock-test-"));
  const path = join(directory, "collector.lock");
  try {
    await writeFile(path, JSON.stringify({ pid: 2_147_483_647, token: "stale" }), { mode: 0o600 });
    const recovered = await acquireCollectorProcessLock(path);
    assert.ok(recovered);
    assert.equal(JSON.parse(await readFile(path, "utf8")).pid, process.pid);
    await recovered.release();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
