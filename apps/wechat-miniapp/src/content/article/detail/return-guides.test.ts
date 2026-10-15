import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function harness(previous = { route: "spot/guides/index", options: { spotId: "spot:a", contextId: "ctx:a" }, scroll: 420 }) {
  const source = ts.createSourceFile("article.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration: ts.VariableDeclaration | undefined;
  const visit = (node: ts.Node) => { if (ts.isVariableDeclaration(node) && node.name.getText(source) === "returnToGuides") declaration = node; ts.forEachChild(node, visit); };
  visit(source); assert.ok(declaration);
  const stack: any[] = [{ route: "pages/map/index" }, previous, { route: "content/article/detail/index" }];
  const calls: string[] = []; let busy = false, failure = false, reject: (() => void) | undefined;
  const scope = {
    spotId: "spot:a", contextId: "ctx:a", notify() {}, safe: (value: string) => decodeURIComponent(value ?? ""),
    useAppStore: { getState: () => ({ observationContext: { contextId: "ctx:a", location: { kind: "FORMAL_SPOT", spotId: "spot:a" } } }) },
    navigation: { begin({ valid }: { valid: () => boolean }) { if (busy || !valid()) return; busy = true; return { stack,
      fail() { failure = true; }, release() { busy = false; } }; } },
    Taro: {
      async navigateBack() { calls.push("back"); if (reject) await new Promise<void>((_resolve, fail) => { reject = () => fail(new Error("native back unavailable")); }); stack.pop(); },
      async redirectTo({ url }: { url: string }) { calls.push(url); stack[stack.length - 1] = { route: url }; },
    },
  };
  const action = vm.runInNewContext(ts.transpileModule(`const ${declaration.getText(source)}; returnToGuides;`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, scope);
  return { action, stack, calls, previous, get failed() { return failure; }, deferFailure() { reject = () => {}; }, reject() { reject?.(); } };
}

test("the article footer returns to the existing same-point directory instance and reading position", async () => {
  const h = harness(); await h.action();
  assert.deepEqual(h.calls, ["back"]);
  assert.equal(h.stack.length, 2);
  assert.equal(h.stack.at(-1), h.previous);
  assert.equal(h.previous.scroll, 420);
});

test("a different directory cannot become the footer destination; the fallback keeps the exact current object", async () => {
  const h = harness({ route: "spot/guides/index", options: { spotId: "spot:other", contextId: "ctx:a" }, scroll: 0 });
  await h.action();
  assert.deepEqual(h.calls, ["/spot/guides/index?spotId=spot%3Aa&contextId=ctx%3Aa"]);
  assert.equal(h.stack[1], h.previous);
});

test("a pending or failed return cannot duplicate navigation or discard the current article", async () => {
  const h = harness(); const article = h.stack.at(-1); h.deferFailure();
  const attempt = h.action(); await h.action(); assert.deepEqual(h.calls, ["back"]);
  h.reject(); await attempt;
  assert.equal(h.failed, true); assert.equal(h.stack.at(-1), article);
});
