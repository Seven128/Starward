import assert from "node:assert/strict";
import test from "node:test";
import { createImportLocalDraftStore, importLocalDraftBelongsTo, importLocalDraftKey, parseImportLocalDraft, type ImportLocalDraft } from "./local-draft";

const copy: ImportLocalDraft = { schema: 1, id: "import:one", revision: 3, platform: "OTHER", sourceUrl: "https://example.com/a", rightsConfirmed: true,
  title: "未保存标题", body: "未保存正文", sourceNote: "来源注记", visibility: "PRIVATE", association: "PROPOSAL", formalSpotId: "" };
function fixture() {
  let owner = "a";
  const values = new Map<string, unknown>();
  const storage = { getStorageSync: (key: string) => values.get(key), setStorageSync: (key: string, value: unknown) => { values.set(key, structuredClone(value)); }, removeStorageSync: (key: string) => { values.delete(key); } };
  return { values, storage, boot: () => createImportLocalDraftStore(storage, "a", () => owner), switch: () => { owner = "b"; } };
}
test("all editable fields and the original revision survive a cold restart, without response or session fields", () => {
  const f = fixture();
  f.boot().write({ ...copy, accessToken: "NEVER_SAVE", stage: "SUBMIT" } as ImportLocalDraft);
  assert.deepEqual(f.boot().read(), copy);
  assert.doesNotMatch(JSON.stringify([...f.values.values()]), /accessToken|NEVER_SAVE|SUBMIT/);
  assert.deepEqual(f.boot().read(), copy); // Reading does not consume recovery.
});
test("incomplete source input is recoverable; malformed or oversized records remain protected", () => {
  const source = { ...copy, id: "", revision: null, sourceUrl: "https://", rightsConfirmed: false };
  assert.deepEqual(parseImportLocalDraft(source), source);
  assert.equal(parseImportLocalDraft({ ...copy, revision: null }), null);
  assert.equal(parseImportLocalDraft({ ...copy, body: "x".repeat(6001) }), null);
  const f = fixture();
  f.values.set(importLocalDraftKey("a"), { schema: 99 });
  assert.throws(() => f.boot().read(), /不可读/);
  assert.deepEqual(f.values.get(importLocalDraftKey("a")), { schema: 99 });
});
test("old account sessions cannot read, write or clear; explicit clear preserves other accounts", () => {
  const f = fixture(), old = f.boot();
  old.write(copy);
  f.values.set(importLocalDraftKey("ab"), copy);
  assert.equal(importLocalDraftBelongsTo(importLocalDraftKey("ab"), "a"), false);
  old.clear();
  assert.deepEqual(f.values.get(importLocalDraftKey("ab")), copy);
  f.switch();
  assert.throws(() => old.read(), /账号已变化/);
  assert.throws(() => old.write(copy), /账号已变化/);
  assert.throws(() => old.clear(), /账号已变化/);
});
