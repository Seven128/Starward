import assert from "node:assert/strict";
import test from "node:test";
import { remainingPublicPlanLifetimeMs } from "./share-lifetime";

test("a delayed public share response cannot extend the server's expiry", () => {
  const generatedAt = "2026-09-25T12:00:00.000Z";
  const expiresAt = "2026-09-25T12:00:03.500Z";
  assert.equal(remainingPublicPlanLifetimeMs(generatedAt, expiresAt, 10_000, 14_000), 0);
  assert.equal(remainingPublicPlanLifetimeMs(generatedAt, expiresAt, 10_000, 10_200), 3_300);
});

test("relative share expiry rejects invalid dates and a backward local clock jump", () => {
  assert.equal(remainingPublicPlanLifetimeMs("invalid", "2026-09-25T12:00:03.500Z", 10_000, 10_200), 0);
  assert.equal(remainingPublicPlanLifetimeMs("2026-09-25T12:00:00.000Z", "2026-09-25T12:00:03.500Z", 10_000, 9_999), 0);
});
