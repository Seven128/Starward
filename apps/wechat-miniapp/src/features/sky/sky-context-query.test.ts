import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import type { ObservationContext } from "@starward/miniapp-contracts";
import { createSkyContextSession } from "./sky-context-session";

const compile = (source: string, module = ts.ModuleKind.CommonJS) => ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module },
}).outputText;
const source = readFileSync(new URL("./sky-context-query.ts", import.meta.url), "utf8");
const page = ts.createSourceFile("page.tsx", readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let binding = "";
function visit(node: ts.Node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(page) === "contextLookup" &&
      node.initializer && ts.isCallExpression(node.initializer)) {
    const options = node.initializer.arguments[0];
    assert(options && ts.isObjectLiteralExpression(options));
    const field = options.properties.find(value => ts.isPropertyAssignment(value) && value.name.getText(page) === "queryFn");
    assert(field && ts.isPropertyAssignment(field));
    binding = compile(`(${field.initializer.getText(page)})`);
  }
  ts.forEachChild(node, visit);
}
visit(page);
assert(binding, "exercise the production page's cached request binding");

class ApiError extends Error { constructor(public code: string) { super(code); } }
const context = (id = "ctx:a", revision = 1, privateProposal = true) => ({
  contextId: id as ObservationContext["contextId"], contextFingerprint: `${id}:${revision}`, revision,
  ...(privateProposal ? { privateProposal: { ownerId: "account:a" } } : {}),
});
type Context = ReturnType<typeof context>;
type Reply = { data: Context };
type Pending = { signal: AbortSignal | undefined; value: string | Context; resolve(value: Reply): void; reject(cause: unknown): void };
function fixture(privateProposal = true) {
  let state = { observationContext: context("ctx:a", 1, privateProposal) as Context | null,
    selectedSpotId: "spot:a", mapResetVersion: 0, spotOpenRequestVersion: 0 };
  const session = createSkyContextSession("ctx:a", () => state);
  const calls: Pending[] = [], restores: Pending[] = [], writes: (Context | null)[] = [];
  const request = (list: Pending[], value: string | Context, signal?: AbortSignal) =>
    new Promise<Reply>((resolve, reject) => list.push({ value, signal, resolve, reject }));
  const api = { MiniappApiError: ApiError,
    getObservationContext: (id: string, signal?: AbortSignal) => request(calls, id, signal),
    restoreObservationContext: (value: Context, signal?: AbortSignal) => request(restores, value, signal) };
  const exported: Record<string, unknown> = {};
  vm.runInNewContext(compile(source), { exports: exported, require(name: string) {
    if (name === "../../services/api-client") return api;
    if (name === "../../state/app-store") return { useAppStore: { getState: () => state } };
    assert.fail(`unexpected dependency ${name}`);
  } });
  const setObservationContext = (value: Context | null) => { writes.push(value); state = { ...state, observationContext: value }; };
  const lookup = vm.runInNewContext(binding, { ...exported, contextSession: session, setObservationContext }) as
    (signal?: AbortSignal) => Promise<Reply>;
  return { session, lookup, calls, restores, writes, state: () => state,
    replace(id: string) { state = { ...state, observationContext: context(`ctx:${id}`), selectedSpotId: `spot:${id}`,
      spotOpenRequestVersion: state.spotOpenRequestVersion + 1 }; } };
}
const tick = () => new Promise<void>(resolve => setImmediate(resolve));

test("public lookup preserves the exact response and cancellation signal without committing a Context", async () => {
  const h = fixture(false), controller = new AbortController(), reply = { data: context("ctx:a", 2, false) };
  const result = h.lookup(controller.signal);
  assert.equal(h.calls[0]!.value, "ctx:a"); assert.equal(h.calls[0]!.signal, controller.signal);
  h.calls[0]!.resolve(reply);
  assert.equal(await result, reply); assert.deepEqual(h.writes, []); assert.deepEqual(h.restores, []);
});

for (const code of ["NOT_FOUND", "STALE_REJECTED"]) test(`current private ${code} lookup restores once with the same signal and accepts its recovered ID`, async () => {
  const h = fixture(), controller = new AbortController(), previous = h.state().observationContext;
  const result = h.lookup(controller.signal); assert(h.session.busy);
  h.calls[0]!.reject(new ApiError(code)); await tick();
  assert.equal(h.restores.length, 1); assert.equal(h.restores[0]!.value, previous);
  assert.equal(h.restores[0]!.signal, controller.signal);
  const reply = { data: context("ctx:recovered", 2) }; h.restores[0]!.resolve(reply);
  assert.equal(await result, reply); assert.deepEqual(h.writes, [reply.data]);
  assert.equal(h.session.contextId, "ctx:recovered"); assert.equal(h.session.busy, false);
  const next = h.lookup(); assert.equal(h.calls[1]!.value, "ctx:recovered");
  h.calls[1]!.resolve(reply); await next;
});

for (const retire of ["hide", "replace", "a-b-a"] as const) test(`private lookup cannot publish or restore through ${retire} retirement`, async () => {
  for (const failed of [false, true]) {
    const h = fixture(), result = h.lookup().catch(cause => cause);
    if (retire === "hide") { h.session.hide(); h.session.show(); }
    else { h.replace("b"); if (retire === "a-b-a") h.replace("a"); }
    const failure = new ApiError("NOT_FOUND");
    if (failed) h.calls[0]!.reject(failure); else h.calls[0]!.resolve({ data: context("ctx:old", 2) });
    if (failed) assert.equal(await result, failure); else await result;
    assert.deepEqual(h.writes, []); assert.deepEqual(h.restores, []);
  }
});

test("a hidden in-flight restore cannot overwrite a fresh request or release its session ticket", async () => {
  const h = fixture(), old = h.lookup(); h.calls[0]!.reject(new ApiError("NOT_FOUND")); await tick();
  h.session.hide(); h.session.show();
  const fresh = h.lookup(); assert(h.session.busy);
  h.restores[0]!.resolve({ data: context("ctx:old", 2) }); await old;
  assert.deepEqual(h.writes, []); assert(h.session.busy, "old finally must not release the fresh request");
  const accepted = context("ctx:a", 2); h.calls[1]!.resolve({ data: accepted }); await fresh;
  assert.deepEqual(h.writes, [accepted]); assert.equal(h.session.busy, false);
});

test("current private denial clears the Context, while cancelled or provider failures retain it and finish the request", async () => {
  for (const code of ["PERMISSION_DENIED", "PROVIDER_UNAVAILABLE", "cancelled"]) {
    const h = fixture(), controller = new AbortController(), failure = new ApiError(code), original = h.state().observationContext;
    const result = h.lookup(controller.signal);
    if (code === "cancelled") controller.abort();
    h.calls[0]!.reject(failure); await assert.rejects(result, cause => cause === failure);
    assert.deepEqual(h.restores, []); assert.equal(h.session.busy, false);
    assert.deepEqual(h.writes, code === "PERMISSION_DENIED" ? [null] : []);
    assert.equal(h.state().observationContext, code === "PERMISSION_DENIED" ? null : original);
  }
});
