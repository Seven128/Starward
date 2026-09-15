import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = ts.createSourceFile("api-client.ts",
  readFileSync(new URL("./api-client.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
const declaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "restoreObservationContext");
assert.ok(declaration);
const code = ts.transpileModule(declaration.getText(source).replace(/^export /u, "") + "\nrestoreObservationContext;",
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
