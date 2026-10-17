import assert from "node:assert/strict";
import test from "node:test";
import { createAuthenticatedOperationRequester } from "./authenticated-operation";
import { createAccountOperationOwner } from "../hooks/account-operation";
import type { AuthSessionData } from "@starward/miniapp-contracts";

function fixture() {
  let state = { userId: "a" as string | null, ownerId: "a" as string | null, reset: 0, page: {}, target: "contribution" };
  let token: AuthSessionData | null = { userId: "a", accessToken: "RAM-a", expiresAt: "2999-01-01" } as AuthSessionData;
  const owner = createAccountOperationOwner(() => state, () => {});
  const set = (account: string | null) => { state = { ...state, userId: account, ownerId: account, reset: state.reset + 1 }; owner.observe(); };
  const sent: unknown[] = []; let denied = false;
  const request = createAuthenticatedOperationRequester({
    resolveSession: async () => { if (!token) { token = { userId: "a", accessToken: "RAM-renewed", expiresAt: "2999-01-01" } as AuthSessionData; set("a"); } return token; },
    readStoredSession: () => token,
    clearStoredSession: () => { token = null; set(null); },
    isPermissionDenied: error => error === "permission",
    request: async (_key, _path, options) => { sent.push(options); if (denied) { denied = false; throw "permission"; } return { data: {} } as never; },
  });
  return { owner, request, set, sent, deny: () => { denied = true; } };
}

test("current contribution operation is checked at the actual dispatch after session await", async () => {
  const f = fixture(), scope = f.owner.begin()!;
  const pending = f.request("create", "contributionPost", { auth: "REQUIRED", scope }, false, "a");
  assert.equal(f.sent.length, 0); f.set("b"); f.set("a");
  await assert.rejects(pending, /retired/); assert.equal(f.sent.length, 0);
  const next = f.owner.begin()!; await f.request("create", "contributionPost", { auth: "REQUIRED", scope: next }, false, "a");
  assert.equal(f.sent.length, 1); assert.equal("scope" in (f.sent[0] as object), false);
});

test("normal bounded permission renewal preserves current intent and idempotency identity", async () => {
  const f = fixture(), scope = f.owner.begin()!; f.deny();
  await f.request("create", "contributionPost", { auth: "REQUIRED", scope, idempotencyKey: "RAM-key" }, false, "a");
  assert.equal(f.sent.length, 2); assert.equal(scope.isCurrent(), true);
  assert.deepEqual(f.sent.map(value => (value as { idempotencyKey: string }).idempotencyKey), ["RAM-key", "RAM-key"]);
  f.set(null); f.set("a"); assert.equal(scope.isCurrent(), false, "ordinary subsequent A-null-A must retire");
});
