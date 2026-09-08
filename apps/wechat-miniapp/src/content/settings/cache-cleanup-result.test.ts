import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

test("Settings waits for both cache owners before feedback and reports either cleanup failure", async () => {
  const source = ts.createSourceFile("settings.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let action = "";
  const visit = (node: ts.Node) => {
    if (ts.isArrowFunction(node) && node.getText(source).startsWith("async (result)") && node.getText(source).includes("clearTemporaryApiCache")) action = node.getText(source);
    ts.forEachChild(node, visit);
  };
  visit(source); assert.ok(action);
  for (const failure of ["none", "response", "state", "cancel"]) {
    const calls: string[] = [], notices: { tone: string; title: string }[] = [];
    let resolveResponse!: () => void, rejectResponse!: (error: Error) => void, resolveState!: (ok: boolean) => void;
    const run = vm.runInNewContext(ts.transpileModule("(" + action + ");", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
      clearTemporaryApiCache: () => { calls.push("response-start"); return new Promise<void>((resolve, reject) => { resolveResponse = resolve; rejectResponse = reject; }); },
      clearLocalCache: () => { calls.push("state-reset"); return new Promise<boolean>((resolve) => { resolveState = resolve; }); },
      notify: (notice: { tone: string; title: string }) => notices.push(notice),
    });
    const pending = run({ confirm: failure !== "cancel" });
    if (failure === "cancel") { await pending; assert.equal(calls.length, 0); continue; }
    assert.deepEqual(calls, ["response-start", "state-reset"]);
    assert.equal(notices.length, 0);
    resolveState(failure !== "state");
    await Promise.resolve();
    assert.equal(notices.length, 0, "state completion alone cannot publish cache success");
    if (failure === "response") rejectResponse(Error("native cleanup failed"));
    else resolveResponse();
    await pending;
    assert.equal(notices.length, 1);
    assert.equal(notices[0]!.tone, failure === "none" ? "success" : "warning");
  }
});
