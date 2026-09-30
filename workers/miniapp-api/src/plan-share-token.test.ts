import assert from "node:assert/strict";
import test from "node:test";
import { openPlanShare, sealPlanShare } from "./plan-share-token";

const secret = "a-test-secret-long-enough-for-authenticated-share-tokens";
test("plan share capability hides private identity, expires and rejects tampering", () => {
  const now = Date.now();
  const token = sealPlanShare({ userId: "user:private", planId: "plan:private", revision: 3, expiresAt: now + 86_400_000 }, secret);
  assert.equal(token.includes("private"), false);
  assert.equal(openPlanShare(token, secret, now)?.planId, "plan:private");
  assert.equal(openPlanShare(token, secret, now + 86_400_000), null);
  assert.equal(openPlanShare(token.slice(0, -1) + (token.endsWith("A") ? "B" : "A"), secret, now), null);
  assert.equal(openPlanShare(token, "another-test-secret-long-enough-for-share-tokens", now), null);
});
