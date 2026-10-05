import assert from "node:assert/strict";
import test from "node:test";
import { createAccountOperationOwner, type AccountOperationState } from "./account-operation";

function fixture(state: Partial<AccountOperationState> = {}) {
  let current: AccountOperationState = { userId: "a", ownerId: "a", reset: 0, page: {}, target: "editor", ...state };
  const busy: boolean[] = [];
  const owner = createAccountOperationOwner(() => current, value => busy.push(value));
  return { owner, busy, set: (patch: Partial<AccountOperationState>) => { current = { ...current, ...patch }; owner.observe(); } };
}

test("pending native picker excludes saving and submitting, then releases on cancellation", async () => {
  const { owner } = fixture();
  let cancel!: () => void;
  const pendingPicker = new Promise<void>((resolve) => { cancel = resolve; });
  const calls: string[] = [];
  const choose = async () => { const operation = owner.begin(); if (!operation) return; try { calls.push("choose"); await operation.native(() => pendingPicker); } finally { operation.release(); } };
  const save = async () => { const operation = owner.begin(); if (!operation) return; try { calls.push("save"); return "saved"; } finally { operation.release(); } };
  const pending = choose();
  await choose();
  await save();
  assert.deepEqual(calls, ["choose"]);
  cancel();
  await pending;
  assert.equal(await save(), "saved");
});

test("a rejected operation does not lock out retries", async () => {
  const { owner } = fixture();
  const fail = async () => { const operation = owner.begin()!; try { throw new Error("network failed"); } finally { operation.release(); } };
  await assert.rejects(fail());
  const retry = owner.begin(); assert.ok(retry); assert.equal(retry.isCurrent(), true); retry.release();
});

test("A-B-A permanently retires one intent but preserves a fresh A command and its lock", () => {
  const f = fixture(), old = f.owner.begin()!;
  f.set({ userId: "b", ownerId: "b", reset: 1 });
  f.set({ userId: "a", ownerId: "a", reset: 2 });
  assert.equal(old.isCurrent(), false);
  const next = f.owner.begin()!; assert.ok(next);
  old.release(); assert.equal(f.owner.begin(), undefined); assert.equal(next.isCurrent(), true);
  assert.deepEqual(f.busy, [true, false, true]); next.release();
});

test("same-account reset, changed target/page and unmount retire without late UI release", () => {
  for (const change of [{ reset: 1 }, { target: "another" }, { page: {} }]) {
    const f = fixture(), operation = f.owner.begin()!; f.set(change);
    assert.equal(operation.isCurrent(), false); assert.deepEqual(f.busy, [true, false]);
  }
  const f = fixture(), operation = f.owner.begin()!; f.owner.dispose(); operation.release();
  assert.equal(operation.isCurrent(), false); assert.deepEqual(f.busy, [true]); assert.equal(f.owner.begin(), undefined);
  assert.equal(fixture({ page: undefined }).owner.begin(), undefined);
});

test("only the known native handoff bridges either callback/show ordering", async () => {
  for (const showFirst of [false, true]) {
    const f = fixture(), operation = f.owner.begin()!;
    let complete!: () => void;
    const handoff = operation.native(() => new Promise<void>(resolve => { complete = resolve; }));
    f.owner.hide(); assert.equal(operation.isCurrent(), true);
    if (showFirst) f.owner.show(); complete(); await handoff;
    assert.equal(operation.isCurrent(), true); if (!showFirst) f.owner.show();
    assert.equal(operation.isCurrent(), true); operation.release();
  }
  const f = fixture(), old = f.owner.begin()!; f.owner.hide(); f.owner.show();
  assert.equal(old.isCurrent(), false); assert.ok(f.owner.begin());
});

test("native handoff never exempts account/reset invalidation or unmount", async () => {
  const f = fixture(), operation = f.owner.begin()!;
  let complete!: () => void;
  const promise = operation.native(() => new Promise<void>(resolve => { complete = resolve; }));
  f.owner.hide(); f.set({ userId: "b", ownerId: "b", reset: 1 }); f.set({ userId: "a", ownerId: "a", reset: 2 });
  complete(); await promise; f.owner.show(); assert.equal(operation.isCurrent(), false);
});

test("anonymous initialization permits exactly one known null-to-A bind, including stored A", () => {
  for (const userId of [null, "a"]) {
    const f = fixture({ userId, ownerId: null }), operation = f.owner.begin({ allowAuthentication: true })!;
    assert.ok(operation); f.set({ userId: "a", ownerId: "a", reset: 1 }); operation.authenticate(); assert.equal(operation.isCurrent(), true);
    f.set({ reset: 2 }); assert.equal(operation.isCurrent(), false);
  }
  const f = fixture({ userId: null, ownerId: null }), old = f.owner.begin({ allowAuthentication: true })!;
  f.set({ reset: 1 }); f.set({ userId: "a", ownerId: "a", reset: 2 }); assert.equal(old.isCurrent(), false);
});

test("identity reads that hide an invalid native session cannot recursively resurrect a pending intent", () => {
  let state: AccountOperationState = { userId: "a", ownerId: "a", reset: 0, page: {}, target: "editor" };
  let invalid = false;
  const owner = createAccountOperationOwner(() => {
    if (invalid && state.ownerId) { state = { ...state, userId: null, ownerId: null, reset: 1 }; owner.observe(); }
    return state;
  }, () => {});
  const operation = owner.begin()!; invalid = true;
  assert.equal(operation.isCurrent(), false); assert.throws(operation.assertCurrent, /retired/);
});

test("only the current request's same-owner renewal admits A-null-A; ordinary resets still retire", async () => {
  const f = fixture(), operation = f.owner.begin()!;
  await operation.renewSession(async () => { f.set({ userId: null, ownerId: null, reset: 1 }); operation.assertCurrent(); f.set({ userId: "a", ownerId: "a", reset: 2 }); });
  assert.equal(operation.isCurrent(), true);
  f.set({ reset: 3 }); assert.equal(operation.isCurrent(), false);
  for (const interrupt of [{ userId: "b", ownerId: "b", reset: 2 }, { reset: 2 }, { target: "other" }]) {
    const g = fixture(), old = g.owner.begin()!;
    await old.renewSession(async () => { g.set({ userId: null, ownerId: null, reset: 1 }); g.set(interrupt); g.set({ userId: "a", ownerId: "a", reset: 3 }); });
    assert.equal(old.isCurrent(), false); assert.ok(g.owner.begin());
  }
  const g = fixture(), old = g.owner.begin()!;
  await assert.rejects(old.renewSession(async () => { g.set({ userId: null, ownerId: null, reset: 1 }); throw new Error("renew failed"); }), /renew failed/);
  assert.equal(old.isCurrent(), false);
});

test("a completed initial projection can renew its first history read before authenticate, but unresolved bootstrap cannot", async () => {
  for (const userId of [null, "a"]) {
    const f = fixture({ userId, ownerId: null }), operation = f.owner.begin({ allowAuthentication: true })!;
    await assert.rejects(operation.renewSession(async () => assert.fail("unresolved renewal must not run")), /unresolved/);
    f.set({ userId: "a", ownerId: "a", reset: 1 });
    await operation.renewSession(async () => {
      f.set({ userId: null, ownerId: null, reset: 2 }); operation.assertCurrent();
      f.set({ userId: "a", ownerId: "a", reset: 3 }); operation.assertCurrent();
    });
    operation.authenticate(); assert.equal(operation.isCurrent(), true);
    f.set({ reset: 4 }); assert.equal(operation.isCurrent(), false);
  }
});
