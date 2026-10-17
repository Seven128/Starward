import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { observationContextRecoveryInput } from "./observation-context-recovery";

const source = ts.createSourceFile("api-client.ts",
  readFileSync(new URL("./api-client.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
const names = ["restoreObservationContext", "rebuildObservationContext", "replaceRetiredObservationContext"];
const declarations = source.statements.filter(node => ts.isFunctionDeclaration(node) && names.includes(node.name?.text ?? ""));
assert.equal(declarations.length, names.length);
const functions = declarations.map(node => node.getText(source).replace(/^export /u, "")).join("\n");
const code = ts.transpileModule(functions + "\nrestoreObservationContext;",
  { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;

class ApiError extends Error { constructor(readonly code: string) { super(code); } }

test("a removed formal spot restores its exact map origin instead of leaving the map failed", async () => {
  const origin = { data: { contextId: "ctx:origin-new", location: { kind: "MAP_POINT" } } };
  const calls: unknown[] = [];
  const restore = vm.runInNewContext(code, {
    MiniappApiError: ApiError,
    getObservationContext: async () => { throw new ApiError("NOT_FOUND"); },
    observationContextRecoveryInput: (_context: unknown, routeOriginContextId: string) => {
      calls.push(routeOriginContextId); return { location: { kind: "FORMAL_SPOT" } };
    },
    resolveObservationContext: async (input: { location: { kind: string } }) => {
      calls.push(input.location.kind);
      if (input.location.kind === "MAP_POINT") return origin;
      throw new ApiError("NOT_FOUND");
    },
  });
  const result = await restore({ location: { kind: "FORMAL_SPOT" }, routeOrigin: {
    displayName: "原地图中心", wgs84: { system: "WGS84", latitude: 22.5, longitude: 114 }, source: "MAP_VIEWPORT" },
    timezone: "Asia/Shanghai", localDate: "2026-09-15", selectedAtUtc: "2026-09-15T13:00:00Z",
    eventInstanceId: null, targetProfile: "DAILY" });
  assert.equal(result, origin);
  assert.deepEqual(calls, ["MAP_POINT", "ctx:origin-new", "FORMAL_SPOT"]);
});

test("transport failure does not rebuild or replace a stored location", async () => {
  let resolves = 0;
  const restore = vm.runInNewContext(code, {
    MiniappApiError: ApiError,
    getObservationContext: async () => { throw new ApiError("PROVIDER_UNAVAILABLE"); },
    observationContextRecoveryInput: () => ({}),
    resolveObservationContext: async () => { resolves++; return {}; },
  });
  await assert.rejects(restore({ location: { kind: "FORMAL_SPOT" } }), /PROVIDER_UNAVAILABLE/u);
  assert.equal(resolves, 0);
});

test("retired replacement never reads its writable ID and recreates the exact confirmed time and origin", async () => {
  const calls: any[] = [];
  const replace = vm.runInNewContext(ts.transpileModule(functions + "\nreplaceRetiredObservationContext;",
    { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    MiniappApiError: ApiError, observationContextRecoveryInput,
    getObservationContext: () => { throw Error("must not read retired ID"); },
    resolveObservationContext: async (input: any) => { calls.push(input); return { data: { contextId: calls.length === 1 ? "fresh-origin" : "fresh-spot" } }; },
  });
  const initial = { contextId: "retired", location: { kind: "FORMAL_SPOT", spotId: "spot:a" },
    routeOrigin: { displayName: "原地图位置", wgs84: { system: "WGS84", latitude: 22.5, longitude: 114 }, source: "MAP_VIEWPORT" },
    timezone: "Asia/Shanghai", localDate: "2026-10-07", selectedAtUtc: "2026-10-07T16:00:00Z", eventInstanceId: null, targetProfile: "DAILY" };
  assert.equal((await replace(initial)).data.contextId, "fresh-spot");
  assert.equal(calls.length, 2);
  assert.equal(calls[0].location.wgs84, initial.routeOrigin.wgs84);
  assert.equal(calls[1].routeOriginContextId, "fresh-origin");
  for (const call of calls) {
    assert.equal(call.selectedAt, initial.selectedAtUtc);assert.equal(call.localDate, initial.localDate);
  }
});

test("failed retired replacement retains the snapshot without retrying a read or default location", async () => {
  let resolves = 0;
  const replace = vm.runInNewContext(ts.transpileModule(functions + "\nreplaceRetiredObservationContext;",
    { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    MiniappApiError: ApiError, observationContextRecoveryInput,
    getObservationContext: () => { throw Error("must not read retired ID"); },
    resolveObservationContext: async () => { resolves++;throw new ApiError("PROVIDER_UNAVAILABLE"); },
  });
  await assert.rejects(replace({ location: { kind: "FORMAL_SPOT", spotId: "spot:a" }, routeOrigin: null,
    selectedAtUtc: "2026-10-07T16:00:00Z", localDate: "2026-10-07" }), /PROVIDER_UNAVAILABLE/u);
  assert.equal(resolves, 1);
});
