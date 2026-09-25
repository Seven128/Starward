import assert from "node:assert/strict";
import test from "node:test";
import { retryFailedFormalResources } from "./formal-feedback-resources";

test("one feedback retry refreshes every failed or stale independent resource", async () => {
  const retried: string[] = [];
  const resource = (name: string, flags: { isError?: boolean; refreshError?: boolean; dataState?: string }) => ({
    ...flags,
    refetch: async () => { retried.push(name); },
  });
  await retryFailedFormalResources(
    resource("baseline", { refreshError: true }),
    resource("history", { dataState: "STALE_USABLE" }),
    resource("site", { isError: true }),
  );
  assert.deepEqual(retried.sort(), ["baseline", "history", "site"]);
});

test("a healthy resource is not refetched by feedback recovery", async () => {
  let calls = 0;
  const healthy = { refetch: async () => { calls += 1; } };
  await retryFailedFormalResources(healthy, healthy, healthy);
  assert.equal(calls, 0);
});
