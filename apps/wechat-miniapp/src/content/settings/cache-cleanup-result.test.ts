import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

test("Settings waits for both cache owners before feedback and reports either cleanup failure", async () => {
  const source = ts.createSourceFile("settings.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration = "";
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "clearCache") declaration = "const " + node.getText(source) + ";";
    ts.forEachChild(node, visit);
  };
  visit(source); assert.ok(declaration);
  for (const failure of ["none", "response", "state", "both"]) {
    const calls: string[] = [], notices: { tone: string; title: string; body: string }[] = [], busy: unknown[] = [];
    const dismissed: string[] = [], scrolls: number[] = [];
    let resolveResponse!: () => void, rejectResponse!: (error: Error) => void, resolveState!: (ok: boolean) => void;
    const run = vm.runInNewContext(ts.transpileModule(declaration + "\nclearCache;", {
      compilerOptions: { target: ts.ScriptTarget.ES2020 },
    }).outputText, {
      accountActionPending: { current: false },
      setDataAction: (value: unknown) => busy.push(value), setSheet() {}, setScrollTop: (value: number) => scrolls.push(value),
      useAppStore: { getState: () => ({ notifications: [{ id: "previous", owner: "settings", dedupeKey: "settings-cache-cleanup-incomplete" }], dismissNotification: (id: string) => dismissed.push(id) }) },
      clearTemporaryApiCache: () => { calls.push("response-start"); return new Promise<void>((resolve, reject) => { resolveResponse = resolve; rejectResponse = reject; }); },
      clearLocalCache: () => { calls.push("state-reset"); return new Promise<boolean>((resolve) => { resolveState = resolve; }); },
      notify: (notice: { tone: string; title: string; body: string }) => notices.push(notice),
    });
    const pending = run();
    assert.deepEqual(calls, ["response-start", "state-reset"]);
    assert.equal(notices.length, 0);
    resolveState(failure !== "state" && failure !== "both");
    await Promise.resolve();
    assert.equal(notices.length, 0, "state completion alone cannot publish cache success");
    if (failure === "response" || failure === "both") rejectResponse(Error("native cleanup failed"));
    else resolveResponse();
    await pending;
    assert.equal(notices.length, 1);
    assert.equal(notices[0]!.tone, failure === "none" ? "success" : "warning");
    assert.deepEqual(dismissed, ["previous"], "a retry must retire its obsolete warning");
    assert.deepEqual(scrolls, failure === "none" ? [] : [0], "the persistent failure must be visible above the data section");
    if (failure === "response") {
      assert.equal(notices[0]!.title, "响应缓存尚未清完");
      assert.match(notices[0]!.body, /本机地图状态已重置/);
      assert.match(notices[0]!.body, /响应缓存/);
    } else if (failure === "state") {
      assert.equal(notices[0]!.title, "本机状态尚未清完");
      assert.match(notices[0]!.body, /响应缓存已清除/);
      assert.match(notices[0]!.body, /本机状态/);
    } else if (failure === "both") {
      assert.equal(notices[0]!.title, "临时缓存尚未清完");
      assert.match(notices[0]!.body, /本机状态与响应缓存/);
    }
    assert.deepEqual(busy, ["CACHE", null]);
  }
});
