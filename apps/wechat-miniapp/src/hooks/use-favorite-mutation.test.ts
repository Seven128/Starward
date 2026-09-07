import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function setup() {
  let owner = "one";
  const calls: Array<{ spotId: string; resolve: (value: unknown) => void; reject: (error: Error) => void }> = [];
  const state = {
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
    useMutation: () => ({ isPending: false, mutateAsync: ({ spotId }: { spotId: string }) => new Promise((resolve, reject) => calls.push({ spotId, resolve, reject })) }),
  } : name.includes("api-client") ? { currentDraftUserId: () => owner, errorMessage: (e: Error) => e.message } : { useAppStore: { getState: () => state } } });
  return { state, calls, run: exports.useFavoriteMutation().toggleFavorite as (id: string) => Promise<boolean>, switchOwner() { owner = "two"; state.favoriteIds = ["other-account"]; } };
}
const result = (...ids: string[]) => ({ data: { favorites: ids.map(spotId => ({ spotId })) } });

test("same-place rapid activation is single-flight; different-place responses do not erase each other", async () => {
  const s = setup();
  const a = s.run("a");
  assert.equal(await s.run("a"), false);
  const b = s.run("b");
  assert.equal(s.calls.length, 2);
  s.calls[1]!.resolve(result("b")); await b;
  s.calls[0]!.resolve(result("a")); await a;
  assert.deepEqual([...s.state.favoriteIds].sort(), ["a", "b"]);
  assert.equal(s.state.notifications.length, 0);
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
