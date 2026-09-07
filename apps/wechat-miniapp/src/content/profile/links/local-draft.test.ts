import assert from "node:assert/strict";
import test from "node:test";
import { createProfileDraftSession, emptyProfileDraft, parseProfileDraft } from "./local-draft";
import { profileDraftBelongsTo, profileDraftKey } from "../../../services/local-draft-keys";

function harness() {
  const values = new Map<string, unknown>();
  let owner = "a", failing = false;
  const storage = {
    getStorageSync: (key: string) => { if (failing) throw new Error("unavailable"); return values.get(key); },
    setStorageSync: (key: string, value: unknown) => { if (failing) throw new Error("unavailable"); values.set(key, value); },
    removeStorageSync: (key: string) => { if (failing) throw new Error("unavailable"); values.delete(key); },
  };
  return { values, switchOwner: (next: string) => { owner = next; }, fail: (next: boolean) => { failing = next; },
    session: () => createProfileDraftSession(storage, owner, () => owner) };
}

test("incomplete homepage input survives a fresh session and requires an explicit recovery choice", () => {
  const h = harness(), first = h.session();
  const draft = { ...emptyProfileDraft(), platform: "OTHER" as const, displayName: "未完成", url: "https://", publicLink: true };
  first.change(draft);
  const reopened = h.session();
  assert.deepEqual(reopened.snapshot().recovery, draft);
  reopened.change(emptyProfileDraft());
  assert.deepEqual(h.values.get(profileDraftKey("a")!), draft);
  assert.deepEqual(reopened.restore().value, draft);
  reopened.saved();
  assert.equal(h.session().snapshot().recovery, null);
  assert.deepEqual(reopened.snapshot().value, emptyProfileDraft());
});

test("account changes cannot write, restore, discard or clear another owner's draft", () => {
  const h = harness(), a = h.session();
  const draft = { ...emptyProfileDraft(), displayName: "账户甲" };
  a.change(draft);
  const oldPage = h.session();
  h.switchOwner("ab");
  oldPage.restore(); oldPage.discard(); oldPage.saved(); a.change({ ...draft, displayName: "错误" });
  assert.deepEqual(h.values.get(profileDraftKey("a")!), draft);
  assert.equal(h.session().snapshot().recovery, null);
  assert.equal(profileDraftBelongsTo(profileDraftKey("a")!, "a"), true);
  assert.equal(profileDraftBelongsTo(profileDraftKey("ab")!, "a"), false);
  assert.equal(profileDraftKey(null), null);
});

test("storage failures retain live input, protect unreadable copies and do not revoke a server receipt", () => {
  const h = harness(), page = h.session();
  const draft = { ...emptyProfileDraft(), url: "incomplete" };
  h.fail(true);
  assert.deepEqual(page.change(draft).value, draft);
  assert.equal(page.snapshot().error, true);
  const unreadable = h.session();
  assert.equal(unreadable.snapshot().unreadable, true);
  assert.deepEqual(unreadable.change(draft).value, emptyProfileDraft());
  h.fail(false);
  page.change(draft);
  h.fail(true);
  const receipt = page.saved();
  assert.deepEqual(receipt.value, emptyProfileDraft());
  assert.equal(receipt.error, true);
  h.fail(false);
  page.discard();
  assert.equal(h.values.size, 0);
});

test("draft parser only retains editable fields and rejects oversized or unsupported data", () => {
  const draft = emptyProfileDraft();
  assert.deepEqual(parseProfileDraft({ ...draft, accessToken: "not-stored", serverResponse: {} }), draft);
  assert.equal(parseProfileDraft({ ...draft, url: "x".repeat(2049) }), null);
  assert.equal(parseProfileDraft({ ...draft, platform: "UNSUPPORTED" }), null);
  const h = harness();
  h.values.set(profileDraftKey("a")!, { schema: 99 });
  const page = h.session();
  assert.equal(page.snapshot().unreadable, true);
  page.discard();
  assert.equal(page.snapshot().unreadable, false);
  assert.equal(h.values.size, 0);
});
