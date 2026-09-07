import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

test("authenticated retries preserve their original account and do not clear a newer login", async () => {
  const source = ts.createSourceFile("api.ts", readFileSync(new URL("./api-client.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declaration = source.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "requestOperation");
  assert.ok(declaration);
  for (const scenario of ["same", "changed-before-retry", "changed-during-refresh"]) {
    let requests = 0, clears = 0, resolutions = 0;
    class ApiError extends Error { code = "PERMISSION_DENIED"; }
    const run = vm.runInNewContext(ts.transpileModule(declaration.getText(source) + "\nrequestOperation;", {
      compilerOptions: { target: ts.ScriptTarget.ES2020 },
    }).outputText, {
      resolveSession: async () => ({ userId: ++resolutions > 1 && scenario === "changed-during-refresh" ? "b" : "a" }),
      readStoredSession: () => ({ userId: scenario === "changed-before-retry" ? "b" : "a" }),
      clearStoredSession: () => { clears++; },
      request: async () => { if (++requests === 1) throw new ApiError(); return "saved"; },
      operationPath: () => "/plans", MINIAPP_API_OPERATIONS: { planPut: { method: "PUT" } }, MiniappApiError: ApiError,
    });
    if (scenario === "same") {
      assert.equal(await run("plan", "planPut", { auth: "REQUIRED" }), "saved");
      assert.equal(requests, 2);
    } else {
      await assert.rejects(run("plan", "planPut", { auth: "REQUIRED" }));
      assert.equal(requests, 1);
    }
    assert.equal(clears, scenario === "changed-before-retry" ? 0 : 1);
  }
});
