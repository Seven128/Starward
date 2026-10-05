import assert from "node:assert/strict";
import test from "node:test";
import type { AuthSessionData } from "@starward/miniapp-contracts";
import { createAccountOperationOwner } from "../hooks/account-operation";
import { createAccountProfileClient } from "./account-profile-client";
import { createAuthenticatedOperationRequester } from "./authenticated-operation";

function fixture() {
  let state = { userId: "a" as string | null, ownerId: "a" as string | null, reset: 0, page: {}, target: "profile" };
  let session = { userId: "a", accessToken: "RAM-a", expiresAt: "2999-01-01" } as AuthSessionData | null;
  const owner = createAccountOperationOwner(() => state, () => {});
  const set = (account: string | null) => { state = { ...state, userId: account, ownerId: account, reset: state.reset + 1 }; owner.observe(); };
  const sent: { path: string; options: Record<string, unknown> }[] = [];
  let invalidate = 0, deny = false, fail = false, key = 0;
  let response: Promise<unknown> | undefined;
  const request = createAuthenticatedOperationRequester({
    resolveSession: async () => {
      if (!session) { session = { userId: "a", accessToken: "RAM-renewed", expiresAt: "2999-01-01" } as AuthSessionData; set("a"); }
      return session;
    },
    readStoredSession: () => session,
    clearStoredSession: () => { session = null; set(null); },
    isPermissionDenied: error => error === "permission",
    request: async (_key, path, options) => {
      sent.push({ path, options });
      if (deny) { deny = false; throw "permission"; }
      if (fail) throw new Error("network");
      if (response) await response;
      return { data: { revision: 2 } } as never;
    },
  });
  const client = createAccountProfileClient({ request, currentUser: () => state.userId, makeKey: () => `RAM-key-${++key}`, invalidate: async () => { invalidate++; } });
  const write = (kind: "nickname" | "avatar", scope = owner.begin()!) => kind === "nickname"
    ? client.saveAccountNickname("a", { nickname: "名字", expectedRevision: 1 }, scope)
    : client.saveAccountAvatar("a", { dataBase64: "AA==", mimeType: "image/jpeg", declaredByteSize: 1, zoom: 1, expectedRevision: 1 }, scope);
  return { owner, set, sent, write, invalidated: () => invalidate, deny: () => { deny = true; }, fail: (value: boolean) => { fail = value; }, response: (value: Promise<unknown>) => { response = value; } };
}

for (const kind of ["nickname", "avatar"] as const) {
  test(`${kind}: account ABA during real session await blocks the old PUT and permits fresh intent`, async () => {
    const f = fixture(), old = f.owner.begin()!, pending = f.write(kind, old);
    assert.equal(f.sent.length, 0); f.set("b"); f.set("a");
    await assert.rejects(pending, /retired/);
    assert.equal(f.sent.length, 0); assert.equal(f.invalidated(), 0);
    await f.write(kind); assert.equal(f.sent.length, 1); assert.equal(f.invalidated(), 1);
    assert.equal("scope" in f.sent[0]!.options, false);
  });

  test(`${kind}: current bounded renewal preserves original key, then ordinary reset retires`, async () => {
    const f = fixture(), scope = f.owner.begin()!; f.deny();
    await f.write(kind, scope);
    assert.equal(f.sent.length, 2); assert.equal(f.invalidated(), 1);
    assert.equal(scope.isCurrent(), true);
    assert.equal(f.sent[0]!.options.idempotencyKey, f.sent[1]!.options.idempotencyKey);
    f.set(null); f.set("a"); assert.equal(scope.isCurrent(), false);
  });

  test(`${kind}: already dispatched retired response cannot invalidate, retry keeps uncertain key`, async () => {
    const f = fixture(); let release!: () => void;
    f.response(new Promise<void>(resolve => { release = resolve; }));
    const scope = f.owner.begin()!, pending = f.write(kind, scope);
    await Promise.resolve(); assert.equal(f.sent.length, 1);
    f.owner.dispose(); release(); await assert.rejects(pending, /retired/);
    assert.equal(f.invalidated(), 0);
    const g = fixture(); g.fail(true);
    const old = g.owner.begin()!; await assert.rejects(g.write(kind, old), /network/); old.release();
    g.fail(false); await g.write(kind);
    assert.equal(g.sent[0]!.options.idempotencyKey, g.sent[1]!.options.idempotencyKey);
  });
}
