import assert from "node:assert/strict";
import test from "node:test";
import { createPlaceSearchPort } from "./place-provider.ts";
import { createTestRuntimeConfig } from "./runtime-config.ts";
test("retired place factory makes no external request and supplies no manufactured result", async () => {
  let calls = 0;
  const adapter = createPlaceSearchPort(createTestRuntimeConfig(), async () => { calls++; throw new Error("unexpected request"); });
  const result = await adapter.search({ query: "深圳湾" });
  assert.equal(calls, 0);
  assert.equal(result.state, "UNAVAILABLE");
  assert.equal(result.value, null);
  assert.match(result.errorCode ?? "", /retired/);
});
