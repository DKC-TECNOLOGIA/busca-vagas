import test from "node:test";
import assert from "node:assert/strict";
import { checkRateLimit } from "../../src/lib/security/rate-limit.mjs";

test("checkRateLimit allows requests up to limit and blocks excess", () => {
  const key = `test-${Date.now()}`;
  const r1 = checkRateLimit(key, { limit: 2, windowMs: 10_000 });
  const r2 = checkRateLimit(key, { limit: 2, windowMs: 10_000 });
  const r3 = checkRateLimit(key, { limit: 2, windowMs: 10_000 });

  assert.equal(r1.allowed, true);
  assert.equal(r2.allowed, true);
  assert.equal(r3.allowed, false);
  assert.ok(r3.retryAfterSec >= 1);
});
