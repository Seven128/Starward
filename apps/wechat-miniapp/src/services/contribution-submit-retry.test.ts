import assert from "node:assert/strict";
import test from "node:test";
import { contributionSubmitBelongsTo, createContributionSubmitRetry, readContributionSubmitIntents } from "./contribution-submit-retry";

test("uncertain submission keeps its identity across runtimes and separates accounts and revisions", async () => {
  const values = new Map<string, unknown>();
  const storage = {
    getStorageSync: (key: string) => values.get(key),
    setStorageSync: (key: string, value: unknown) => { values.set(key, value); },
    removeStorageSync: (key: string) => { values.delete(key); },
  };
  let sequence = 0;
  const makeKey = () => `submit:${++sequence}`;
  const input = { submissionId: "contribution:one", expectedRevision: 3 };
  const first = createContributionSubmitRetry(storage, makeKey);
  await assert.rejects(first("account-a", input, async (key) => { assert.equal(key, "submit:1"); throw new Error("response lost"); }));
  const persistedKey = [...values.keys()][0]!;
  assert.equal(contributionSubmitBelongsTo(persistedKey, "account-a"), true);
  assert.equal(contributionSubmitBelongsTo(persistedKey, "account-b"), false);
  const readable = { ...storage, getStorageInfoSync: () => ({ keys: [...values.keys()] }) };
  assert.deepEqual(readContributionSubmitIntents(readable, "account-a"), [input]);
  assert.deepEqual(readContributionSubmitIntents(readable, "account-b"), []);
  const restarted = createContributionSubmitRetry(storage, makeKey);
  assert.equal(await restarted("account-b", input, async (key) => key), "submit:2");
  assert.equal(await restarted("account-a", { ...input, expectedRevision: 4 }, async (key) => key), "submit:3");
  assert.equal(await restarted("account-a", input, async (key) => key), "submit:1");
  assert.equal(values.size, 0);
});

test("unavailable or corrupt storage prevents a request; cleanup failure preserves a successful receipt", async () => {
  let calls = 0;
  const input = { submissionId: "contribution:one", expectedRevision: 1 };
  const operation = async () => { calls++; return "receipt"; };
  for (const failure of ["read", "write", "corrupt"]) {
    const retry = createContributionSubmitRetry({
      getStorageSync: () => { if (failure === "read") throw new Error("unavailable"); return failure === "corrupt" ? {} : ""; },
      setStorageSync: () => { if (failure === "write") throw new Error("full"); },
      removeStorageSync() {},
    }, () => "submit:one");
    await assert.rejects(retry("account-a", input, operation), /尚未发出提交请求/);
  }
  assert.equal(calls, 0);
  const retry = createContributionSubmitRetry({ getStorageSync: () => "submit:one", setStorageSync() {}, removeStorageSync() { throw new Error("unavailable"); } }, () => "unused");
  assert.equal(await retry("account-a", input, operation), "receipt");
  assert.equal(calls, 1);
});

test("definitive rejection removes a pending intent while uncertain errors retain it", async () => {
  const values = new Map<string, unknown>();
  const storage = { getStorageSync: (key: string) => values.get(key), setStorageSync: (key: string, value: unknown) => { values.set(key, value); }, removeStorageSync: (key: string) => { values.delete(key); } };
  const rejected = new Error("validation rejected");
  const retry = createContributionSubmitRetry(storage, () => "submit:one", (error) => error === rejected);
  const input = { submissionId: "contribution:one", expectedRevision: 1 };
  await assert.rejects(retry("account-a", input, async () => { throw new Error("timeout"); }));
  assert.equal(values.size, 1);
  await assert.rejects(retry("account-a", input, async () => { throw rejected; }));
  assert.equal(values.size, 0);
});
