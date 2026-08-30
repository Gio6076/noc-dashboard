import assert from "node:assert/strict";
import test from "node:test";
import {
  assertDeviceStableKey,
  normalizeServiceUrl,
  serviceStableKey,
} from "../lib/persistence/identity.ts";

test("device stable keys are normalized and validated", () => {
  assert.equal(assertDeviceStableKey(" MacBook-Air "), "macbook-air");
  assert.throws(() => assertDeviceStableKey("MacBook Air"), /Invalid device stable key/);
});

test("TCP service identity is target based rather than display-name based", () => {
  const base = { type: "tcp" as const, status: "up" as const, host: "LOCALHOST", port: 22, responseTimeMs: 1, checkedAt: new Date().toISOString() };
  assert.equal(serviceStableKey({ ...base, name: "SSH" }), "tcp:localhost:22");
  assert.equal(serviceStableKey({ ...base, name: "Renamed SSH" }), "tcp:localhost:22");
});

test("HTTP service identity normalizes safe URLs", () => {
  const checkedAt = new Date().toISOString();
  assert.equal(normalizeServiceUrl("HTTPS://Example.COM//health"), "https://example.com/health");
  assert.equal(serviceStableKey({
    name: "Health", type: "https", status: "up", url: "https://EXAMPLE.com/health",
    httpStatusCode: 200, responseTimeMs: 1, checkedAt,
  }), "https:example.com:443:/health");
});

test("service URLs reject credentials and secret-bearing query data", () => {
  assert.throws(() => normalizeServiceUrl("https://user:pass@example.com/health"), /userinfo/);
  assert.throws(() => normalizeServiceUrl("https://example.com/health?token=secret"), /query/);
  assert.throws(() => normalizeServiceUrl("ftp://example.com/health"), /HTTP/);
});
