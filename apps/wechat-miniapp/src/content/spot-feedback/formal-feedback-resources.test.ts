import assert from "node:assert/strict";
import test from "node:test";
import type { ContributionSubmission } from "@starward/miniapp-contracts";
import { resolveRequestedFormalFeedback, retryFailedFormalResources } from "./formal-feedback-resources";

test("a requested feedback record is unavailable only after a current history response", () => {
  const missing = { data: { dataState: "READY", data: { submissions: [] as ContributionSubmission[] } } };
  assert.equal(resolveRequestedFormalFeedback(missing, "spot:one", "feedback:absent").status, "UNAVAILABLE");
  assert.equal(resolveRequestedFormalFeedback({ ...missing, isFetching: true }, "spot:one", "feedback:absent").status, "UNCONFIRMED");
  assert.equal(resolveRequestedFormalFeedback({ ...missing, refreshError: new Error("offline") }, "spot:one", "feedback:absent").status, "UNCONFIRMED");
  assert.equal(resolveRequestedFormalFeedback({ data: { ...missing.data, dataState: "STALE_USABLE" } }, "spot:one", "feedback:absent").status, "UNCONFIRMED");
  assert.equal(resolveRequestedFormalFeedback({ isError: true }, "spot:one", "feedback:absent").status, "UNCONFIRMED");
  assert.equal(resolveRequestedFormalFeedback(missing, "spot:one", "").status, "UNREQUESTED");
});

test("only a rejected or changes-requested feedback with a frozen record can reopen", () => {
  const record = (submissionState: string, formalFeedback: object | null) => ({
    submissionId: "feedback:one", spotId: "spot:one", submissionState, formalFeedback,
  } as ContributionSubmission);
  const history = (submission: ContributionSubmission) => ({ data: { dataState: "READY", data: { submissions: [submission] } } });
  assert.equal(resolveRequestedFormalFeedback(history(record("PENDING_REVIEW", {})), "spot:one", "feedback:one").status, "UNAVAILABLE");
  assert.equal(resolveRequestedFormalFeedback(history(record("REJECTED", null)), "spot:one", "feedback:one").status, "UNAVAILABLE");
  assert.equal(resolveRequestedFormalFeedback(history(record("REJECTED", {})), "spot:one", "feedback:one").status, "READY");
  assert.equal(resolveRequestedFormalFeedback(history(record("CHANGES_REQUESTED", {})), "spot:one", "feedback:one").status, "READY");
  assert.equal(resolveRequestedFormalFeedback(history(record("REJECTED", {})), "spot:other", "feedback:one").status, "UNAVAILABLE");
});

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
