import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import type { AuthSessionData } from "@starward/miniapp-contracts";
import { createAccountOperationOwner } from "../hooks/account-operation";
import { createAuthenticatedOperationRequester, type RequestOperationScope } from "./authenticated-operation";

// Execute the real API continuation and SDK dispatcher. Session/storage ports
// are RAM; full login ownership is separately checked by the page integration.
function runtime(bootstrap = false) {
  let state = { userId: bootstrap ? null : "a", ownerId: bootstrap ? null : "a", reset: 0, page: {}, target: "share:plan" };
  let session = bootstrap ? null : { userId: "a", accessToken: "RAM-a", expiresAt: "2999-01-01" } as AuthSessionData | null;
  const operations = createAccountOperationOwner(() => state, () => {});
  const account = (owner: string | null) => { state = { ...state, userId: owner, ownerId: owner, reset: state.reset + 1 }; operations.observe(); };
  const resolveSession = async () => {
    if (!session) { session = { userId: "a", accessToken: "RAM-current", expiresAt: "2999-01-01" } as AuthSessionData; account("a"); }
    return session;
  };
  const sent: { path: string; options: Record<string, unknown> }[] = [];
  let denied = false, gate: Promise<void> | undefined;
  const requestOperation = createAuthenticatedOperationRequester({
    resolveSession, readStoredSession: () => session,
    clearStoredSession: () => { session = null; account(null); },
    isPermissionDenied: error => error === "permission",
    request: async (_key, path, options) => {
      sent.push({ path, options });
      assert.equal("scope" in options, false);
      if (denied) { denied = false; throw "permission"; }
      if (gate) await gate;
      return { data: { token: "RAM-public-capability" } } as never;
    },
  });
  const source = ts.createSourceFile("api.ts", readFileSync(new URL("./api-client.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "createPlanShare");
  assert.ok(declaration);
  const create = vm.runInNewContext(ts.transpileModule(declaration.getText(source).replace(/^export /, "") + "\ncreatePlanShare;", {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, { ensureSession: resolveSession, currentDraftUserId: () => state.userId, requestOperation }) as
    (planId: string, expectedUserId?: string, scope?: RequestOperationScope) => Promise<unknown>;
  return { operations, account, sent, create, deny: () => { denied = true; }, gate: (value: Promise<void>) => { gate = value; },
    changePage: () => { state = { ...state, page: {} }; } };
}

for (const departure of ["ABA", "hide", "page", "unmount"] as const) {
  test(`private share API continuation after session await rejects ${departure} before POST`, async () => {
    const f = runtime(), scope = f.operations.begin()!, pending = f.create("plan:one", "a", scope);
    assert.equal(f.sent.length, 0);
    if (departure === "ABA") { f.account("b"); f.account("a"); }
    else if (departure === "hide") f.operations.hide();
    else if (departure === "page") f.changePage();
    else f.operations.dispose();
    await assert.rejects(pending, /retired/);
    assert.equal(f.sent.length, 0);
  });
}

test("issued private share capability cannot be accepted by a retired generation; fresh A may create", async () => {
  const f = runtime(); let release!: () => void;
  f.gate(new Promise<void>(resolve => { release = resolve; }));
  const scope = f.operations.begin()!, pending = f.create("plan:one", "a", scope);
  for (let i = 0; i < 10 && !f.sent.length; i++) await Promise.resolve();
  assert.equal(f.sent.length, 1, "POST was already dispatched and cannot be undone");
  f.account("b"); f.account("a"); release();
  await assert.rejects(pending, /retired/);
  await f.create("plan:one", "a", f.operations.begin()!);
  assert.equal(f.sent.length, 2);
  assert.equal(f.sent[0]!.path, f.sent[1]!.path);
});

test("private creator keeps initial authentication and bounded same-A renewal", async () => {
  const initial = runtime(true), boot = initial.operations.begin({ allowAuthentication: true })!;
  await initial.create("plan:one", undefined, boot);
  assert.equal(boot.isCurrent(), true); assert.equal(initial.sent.length, 1);
  boot.release();
  const current = runtime(), scope = current.operations.begin()!; current.deny();
  await current.create("plan:one", "a", scope);
  assert.equal(scope.isCurrent(), true); assert.equal(current.sent.length, 2);
  assert.equal(current.sent[0]!.path, current.sent[1]!.path);
  assert.equal(current.sent[0]!.options.method, "POST");
});

test("existing unscoped share callers retain the original API behavior", async () => {
  const f = runtime(); await f.create("plan:one", "a");
  assert.equal(f.sent.length, 1);
  assert.equal(f.sent[0]!.options.method, "POST");
});
