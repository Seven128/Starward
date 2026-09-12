import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = ts.createSourceFile(
  "api-client.ts",
  readFileSync(new URL("./api-client.ts", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest,
  true,
);
const declaration = source.statements.find(
  (node) =>
    ts.isFunctionDeclaration(node) &&
    node.name?.text === "updateObservationContext",
);
assert.ok(declaration);
const code = ts.transpileModule(
  declaration.getText(source).replace(/^export /u, "") +
    "\nupdateObservationContext;",
  { compilerOptions: { target: ts.ScriptTarget.ES2020 } },
).outputText;

class ApiError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

test("an observation edit recovers a server-lost context once and preserves the requested change", async () => {
  const calls: Array<{ id: string; revision: number; localDate: string }> = [];
  let recoveries = 0;
  const update = vm.runInNewContext(code, {
    MiniappApiError: ApiError,
    idempotencyKey: () => "test-key",
    invalidateApiCache: () => undefined,
    restoreObservationContext: async (context: { contextId: string }) => {
      recoveries++;
      assert.equal(context.contextId, "ctx:old");
      return { data: { contextId: "ctx:new", revision: 1 } };
    },
    requestOperation: async (
      _key: string,
      operation: string,
      options: {
        pathParams: { contextId: string };
        body: { expectedRevision: number; localDate: string };
      },
    ) => {
      assert.equal(operation, "observationContextPut");
      calls.push({
        id: options.pathParams.contextId,
        revision: options.body.expectedRevision,
        localDate: options.body.localDate,
      });
      if (calls.length === 1) throw new ApiError("NOT_FOUND");
      return { data: { contextId: "ctx:new", revision: 2 } };
    },
  });

  const result = await update(
    { contextId: "ctx:old", revision: 7 },
    { localDate: "2026-09-13" },
  );
  assert.equal(result.data.revision, 2);
  assert.equal(recoveries, 1);
  assert.deepEqual(calls, [
    { id: "ctx:old", revision: 7, localDate: "2026-09-13" },
    { id: "ctx:new", revision: 1, localDate: "2026-09-13" },
  ]);
});

test("a non-expiry update failure is not replayed", async () => {
  let requests = 0;
  const update = vm.runInNewContext(code, {
    MiniappApiError: ApiError,
    idempotencyKey: () => "test-key",
    invalidateApiCache: () => undefined,
    restoreObservationContext: () => assert.fail("must not recover"),
    requestOperation: async () => {
      requests++;
      throw new ApiError("CONFLICT");
    },
  });
  await assert.rejects(
    update(
      { contextId: "ctx:current", revision: 3 },
      { localDate: "2026-09-13" },
    ),
    /CONFLICT/u,
  );
  assert.equal(requests, 1);
});
