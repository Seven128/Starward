import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function setup() {
  let owner: string | null = "one";
  const listeners = new Set<(snapshot: typeof state) => void>();
  const calls: Array<{ spotId: string; favorite: boolean; resolve: (value: unknown) => void; reject: (error: Error) => void }> = [];
  const state = {
    accountOwnerId: "one" as string | null,
    favoriteIds: [] as string[], notifications: [] as any[],
    toggleFavorite(id: string) { const selected = !this.favoriteIds.includes(id); this.favoriteIds = selected ? [...this.favoriteIds, id] : this.favoriteIds.filter(x => x !== id); return selected; },
    replaceFavoriteIds(ids: string[]) { this.favoriteIds = Array.from(ids); },
    notify(value: unknown) { this.notifications.push(value); },
    dismissNotification(id: string) { this.notifications = this.notifications.filter(x => x.id !== id); },
  };
  const exports: any = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("./use-favorite-mutation.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports, require: (name: string) => name.includes("react-query") ? {
    useMutation: () => ({ isPending: false, mutateAsync: ({ spotId, favorite }: { spotId: string; favorite: boolean }) => new Promise((resolve, reject) => calls.push({ spotId, favorite, resolve, reject })) }),
  } : name.includes("api-client") ? { currentDraftUserId: () => owner, ensureFavoriteOwner: async () => { owner = "one"; state.accountOwnerId = owner; return owner; }, errorMessage: (e: Error) => e.message } : { useAppStore: { getState: () => state, subscribe: (fn: (snapshot: typeof state) => void) => { listeners.add(fn); return () => listeners.delete(fn); } } } });
  return { state, calls, run: exports.useFavoriteMutation().toggleFavorite as (id: string) => Promise<boolean>, snapshot(ids: string[]) { state.replaceFavoriteIds(exports.reconcileFavoriteSnapshot(ids)); }, switchOwner(next: string | null = "two") { owner = next; state.accountOwnerId = next; state.favoriteIds = ["other-account"]; for (const fn of listeners) fn(state); } };
}
const result = (...ids: string[]) => ({ data: { favorites: ids.map(spotId => ({ spotId })) } });

test("different-place responses do not erase each other", async () => {
  const s = setup();
  const a = s.run("a");
  const b = s.run("b");
  assert.equal(s.calls.length, 2);
  s.calls[1]!.resolve(result("b")); await b;
  s.calls[0]!.resolve(result("a")); await a;
  assert.deepEqual([...s.state.favoriteIds].sort(), ["a", "b"]);
  assert.equal(s.state.notifications.length, 0);
});

test("in-flight reversal updates immediately and serializes the latest intent after the first receipt", async () => {
  const s = setup(); const first = s.run("a"); const reverse = s.run("a");
  assert.deepEqual(s.state.favoriteIds, [], "second tap reverses visible intent immediately");
  assert.equal(s.calls.length, 1, "no overlapping write for the same account and spot");
  s.calls[0]!.resolve(result("a"));
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(s.state.favoriteIds, [], "old success cannot replay an obsolete selection");
  assert.equal(s.calls[1]!.favorite, false);
  s.calls[1]!.resolve(result());
  assert.equal(await first, true); assert.equal(await reverse, true);
  assert.deepEqual(s.state.favoriteIds, []);
  assert.equal(s.state.notifications.length, 0);
});

test("Map invalidation snapshots retain latest in-flight intent and a third tap keeps its meaning", async () => {
  const s = setup(); const first = s.run("a"); const reverse = s.run("a");
  s.snapshot(["a", "b"]);
  assert.deepEqual(s.state.favoriteIds, ["b"]);
  const third = s.run("a");
  s.snapshot(["b"]);
  assert.deepEqual([...s.state.favoriteIds].sort(), ["a", "b"]);
  s.calls[0]!.resolve(result("a", "b")); await first; await reverse; await third;
  assert.equal(s.calls.length, 1, "latest intent already confirmed, no redundant write");
});

test("anonymous intent binds an account and an A-B-A transition never resumes its old queued write", { timeout: 3000 }, async () => {
  const s = setup(); s.switchOwner(null); const first = s.run("a");
  await new Promise(resolve => setImmediate(resolve));
  const reverse = s.run("a"); s.switchOwner("two"); s.switchOwner("one");
  s.calls[0]!.resolve(result("a"));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(s.calls.length, 1);
  await first; await reverse;
  assert.deepEqual(s.state.favoriteIds, ["other-account"]);
});

test("superseded failure still commits the latest intent; latest failure rolls back to last confirmed relation", async () => {
  const s = setup(); const first = s.run("a"); const reverse = s.run("a");
  s.calls[0]!.reject(new Error("uncertain first response"));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(s.calls[1]!.favorite, false);
  s.calls[1]!.resolve(result()); await first; await reverse;
  assert.equal(s.state.notifications.length, 0);
  const again = s.run("a"); const cancel = s.run("a");
  s.calls[2]!.resolve(result("a"));
  await new Promise(resolve => setImmediate(resolve));
  s.calls[3]!.reject(new Error("offline")); await again; await cancel;
  assert.deepEqual(s.state.favoriteIds, ["a"]);
  assert.equal(s.state.notifications.length, 1);
});

test("failed place rolls back only itself and can be retried quietly", async () => {
  const s = setup(); const a = s.run("a"); const b = s.run("b");
  s.calls[1]!.resolve(result("b")); await b;
  s.calls[0]!.reject(new Error("offline")); await a;
  assert.deepEqual(s.state.favoriteIds, ["b"]);
  s.state.notifications[0].id = "failed-a";
  const retry = s.run("a"); s.calls[2]!.resolve(result("a", "b")); await retry;
  assert.equal(s.state.notifications.length, 0);
});

test("late success and failure never replace a different account's favorites or notifications", async () => {
  for (const fail of [false, true]) {
    const s = setup(); const pending = s.run("a"); s.switchOwner();
    if (fail) s.calls[0]!.reject(new Error("offline")); else s.calls[0]!.resolve(result("a"));
    await pending;
    assert.deepEqual(s.state.favoriteIds, ["other-account"]);
    assert.equal(s.state.notifications.length, 0);
  }
});
