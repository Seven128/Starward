import assert from "node:assert/strict";
import test from "node:test";
import { clearImportSaveRecovery, createImportSaveRetry, ImportSaveRecoveryError, importSaveBelongsTo } from "./import-save-retry";

function fixture() {
  const values = new Map<string, unknown>();
  const storage = { getStorageSync: (key: string) => values.get(key), setStorageSync: (key: string, value: unknown) => { values.set(key, structuredClone(value)); }, removeStorageSync: (key: string) => { values.delete(key); } };
  let sequence = 0;
  const boot = () => createImportSaveRetry(storage, () => `test:${++sequence}`, error => error === "rejected");
  return { storage, values, boot };
}
test("cold retry reuses the original request identity and success removes recovery data", async () => {
  const f = fixture();
  let original = "";
  const input = { platform: "OTHER", originalUrl: "https://example.com/a", rightsConfirmed: true };
  await assert.rejects(f.boot()("a", "create", "", input, async key => { original = key; throw new Error("lost receipt"); }));
  assert.equal(await f.boot()("a", "create", "", input, async key => { assert.equal(key, original); return "receipt"; }), "receipt");
  assert.equal(f.values.size, 0);
});
test("accounts, drafts, revisions and edited payloads cannot reuse another request identity", async () => {
  const f = fixture(), keys: string[] = [];
  const fail = async (key: string) => { keys.push(key); throw new Error("unknown"); };
  for (const [owner, id, input] of [
    ["a", "one", { expectedRevision: 1, title: "first" }],
    ["b", "one", { expectedRevision: 1, title: "first" }],
    ["a", "two", { expectedRevision: 1, title: "first" }],
    ["a", "one", { expectedRevision: 2, title: "first" }],
    ["a", "one", { expectedRevision: 1, title: "changed" }],
  ] as const) await assert.rejects(f.boot()(owner, "update", id, input, fail));
  assert.equal(new Set(keys).size, 5);
  assert.equal([...f.values.keys()].filter(key => importSaveBelongsTo(key, "a")).length, 1);
});
test("only whitelisted input is retained; rejected requests are released", async () => {
  const f = fixture();
  await assert.rejects(f.boot()("a", "update", "one", { expectedRevision: 1, title: "own text", accessToken: "DO_NOT_STORE" }, async () => { throw new Error("unknown"); }));
  assert.doesNotMatch(JSON.stringify([...f.values.values()]), /accessToken|DO_NOT_STORE/);
  await assert.rejects(f.boot()("a", "update", "one", { expectedRevision: 1, title: "own text" }, async () => { throw "rejected"; }));
  assert.equal(f.values.size, 0);
});
test("storage failure prevents dispatch and failed cleanup cannot erase a confirmed receipt", async () => {
  const f = fixture();
  let calls = 0;
  const blocked = createImportSaveRetry({ ...f.storage, setStorageSync() { throw new Error("full"); } }, () => "test:one", () => false);
  await assert.rejects(blocked("a", "update", "one", {}, async () => { calls++; }), ImportSaveRecoveryError);
  assert.equal(calls, 0);
  const cleanupFails = createImportSaveRetry({ ...f.storage, removeStorageSync() { throw new Error("unavailable"); } }, () => "test:two", () => false);
  assert.equal(await cleanupFails("a", "update", "one", {}, async () => "saved"), "saved");
});

test("one confirmed save preserves another pending save; corrupt storage is not overwritten", async () => {
  const f = fixture();
  let finish!: (value: string) => void;
  const first = f.boot()("a", "update", "one", { expectedRevision: 1 }, () => new Promise<string>(resolve => { finish = resolve; }));
  let secondKey = "";
  await assert.rejects(f.boot()("a", "update", "two", { expectedRevision: 1 }, async key => { secondKey = key; throw new Error("unknown"); }));
  finish("saved");
  await first;
  await f.boot()("a", "update", "two", { expectedRevision: 1 }, async key => { assert.equal(key, secondKey); });
  const key = 'starward.import-save.v1:["a"]';
  f.values.set(key, { schema: 99 });
  await assert.rejects(f.boot()("a", "create", "", {}, async () => assert.fail("must not dispatch")), ImportSaveRecoveryError);
  assert.deepEqual(f.values.get(key), { schema: 99 });
  const otherKey = 'starward.import-save.v1:["ab"]';
  f.values.set(otherKey, { schema: 99 });
  clearImportSaveRecovery(f.storage, "a");
  assert.equal(f.values.has(key), false);
  assert.deepEqual(f.values.get(otherKey), { schema: 99 });
});
