import assert from "node:assert/strict";
import test from "node:test";
import { createProfileLinkRetry, profileSaveBelongsTo, type ProfileLinkInput } from "./profile-link-retry";

const input: ProfileLinkInput = { platform: "OTHER", displayName: "Example", url: "https://example.com", visibility: "PRIVATE", sortOrder: 0 };
function harness() {
  const values = new Map<string, unknown>();
  let sequence = 0, broken = false;
  const storage = {
    getStorageSync: (key: string) => { if (broken) throw new Error("storage"); return values.get(key); },
    setStorageSync: (key: string, value: unknown) => { if (broken) throw new Error("storage"); values.set(key, value); },
    removeStorageSync: (key: string) => { if (broken) throw new Error("storage"); values.delete(key); },
  };
  return { values, breakStorage: () => { broken = true; }, retry: (definitive?: (error: unknown) => boolean) => createProfileLinkRetry(storage, () => `key:${++sequence}`, definitive) };
}

test("cold retry replays the original order when an already-created link changes the list count", async () => {
  const h = harness();
  let originalKey = "";
  await assert.rejects(h.retry()("a", input, async key => { originalKey = key; throw new Error("lost receipt"); }), /lost receipt/);
  await h.retry()("a", { ...input, sortOrder: 1 }, async (key, original) => {
    assert.equal(key, originalKey);
    assert.deepEqual(original, input);
  });
  assert.equal(h.values.size, 0);
});

test("pending link identities are isolated by owner and editable content", async () => {
  const h = harness(), keys: string[] = [];
  for (const [owner, value] of [["a", input], ["ab", input], ["a", { ...input, visibility: "PUBLIC" }]] as const) {
    await assert.rejects(h.retry()(owner, value, async key => { keys.push(key); throw new Error("lost"); }));
  }
  assert.equal(new Set(keys).size, 3);
  const key = [...h.values.keys()].find(key => profileSaveBelongsTo(key, "a"))!;
  assert.ok(key);
  assert.equal(profileSaveBelongsTo(key, "ab"), false);
  await h.retry()("a", input, async key => assert.equal(key, keys[0]));
  await h.retry()("a", { ...input, visibility: "PUBLIC" }, async key => assert.equal(key, keys[2]));
  assert.equal([...h.values.keys()].some(key => profileSaveBelongsTo(key, "a")), false);
});

test("unavailable storage prevents dispatch; cleanup failure preserves a successful receipt", async () => {
  const h = harness();
  let calls = 0;
  await h.retry()("a", input, async () => { calls++; h.breakStorage(); return "saved"; }).then(result => assert.equal(result, "saved"));
  await assert.rejects(h.retry()("a", input, async () => { calls++; }), /尚未发出保存请求/);
  assert.equal(calls, 1);
  assert.equal(h.values.size, 1);
});

test("stored recovery is a whitelist, and damaged data cannot be overwritten", async () => {
  const h = harness();
  await assert.rejects(h.retry()("a", { ...input, accessToken: "not-retained" } as ProfileLinkInput, async () => { throw new Error("lost"); }));
  assert.equal(JSON.stringify([...h.values.values()]).includes("not-retained"), false);
  const key = [...h.values.keys()][0]!;
  h.values.set(key, { schema: 99 });
  let calls = 0;
  await assert.rejects(h.retry()("a", input, async () => { calls++; }), /尚未发出保存请求/);
  assert.equal(calls, 0);
  assert.deepEqual(h.values.get(key), { schema: 99 });
});

test("definitive rejection releases only its own intent while uncertain failures remain replayable", async () => {
  const h = harness();
  const rejected = new Error("validation rejected");
  const retry = h.retry(error => error === rejected);
  await assert.rejects(retry("a", input, async () => { throw new Error("timeout"); }));
  const other = { ...input, displayName: "Another" };
  await assert.rejects(retry("a", other, async () => { throw rejected; }));
  const stored = [...h.values.values()][0] as { entries: Array<{ input: ProfileLinkInput }> };
  assert.equal(stored.entries.length, 1);
  assert.equal(stored.entries[0]!.input.displayName, input.displayName);
  await assert.rejects(retry("a", input, async () => { throw rejected; }));
  assert.equal(h.values.size, 0);
});
