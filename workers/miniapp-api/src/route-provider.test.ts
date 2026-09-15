import assert from "node:assert/strict";
import test from "node:test";
import { createRoutePort } from "./route-provider.ts";
import { createTestRuntimeConfig } from "./runtime-config.ts";
test("retired route factory makes no external request and supplies no manufactured result", async () => {
  let calls = 0;
  const adapter = createRoutePort(createTestRuntimeConfig(), async () => { calls++; throw new Error("unexpected request"); });
  const result = await adapter.estimate({ origin: { system: "WGS84", latitude: 23, longitude: 113 }, destination: { system: "WGS84", latitude: 24, longitude: 114 } });
  assert.equal(calls, 0);
  assert.equal(result.state, "UNAVAILABLE");
  assert.equal(result.value?.durationMinutes, null); assert.equal(result.value?.distanceKm, null);
  assert.match(result.errorCode ?? "", /retired/);
});
