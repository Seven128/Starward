import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { validateExternalUrl } from "@starward/miniapp-contracts";

const source = ts.createSourceFile("provenance.tsx", readFileSync(new URL("./provenance.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let handler = "";
function visit(node: ts.Node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === "copyLink") handler = node.getText(source);
  ts.forEachChild(node, visit);
}
visit(source);
assert.ok(handler);
function copying(write: (value: { data: string }) => Promise<void>) {
  const messages: string[] = [], errors: unknown[][] = [];
  const sandbox = {
    copying: false, validateExternalUrl, Taro: { setClipboardData: write },
    setCopying(value: boolean) { sandbox.copying = value; },
    setCopyState(value: string) { messages.push(value); },
    reportRuntimeError(...event: unknown[]) { errors.push(event); },
  };
  const copy = vm.runInNewContext(ts.transpileModule(`const ${handler}; copyLink;`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, sandbox) as (value: string) => Promise<void>;
  return { copy, messages, errors, sandbox };
}

test("copy failure is logged before existing feedback and a later successful retry", async () => {
  const failure = { errCode: -1, errMsg: "native private clipboard content" };
  let attempts = 0;
  const state = copying(async () => { if (++attempts === 1) throw failure; });
  await state.copy("https://example.org/source");
  assert.equal(state.errors.length, 1, "handled clipboard failure cannot depend on an unhandled-rejection hook");
  assert.equal(state.errors[0]![0], "native");
  assert.strictEqual(state.errors[0]![2], failure);
  assert.match(state.messages[0]!, /未能复制/u);
  assert.equal(state.sandbox.copying, false);
  await state.copy("https://example.org/source");
  assert.equal(attempts, 2);
  assert.equal(state.errors.length, 1);
  assert.match(state.messages[1]!, /已复制/u);
});

test("invalid links and duplicate activation do not become native failures", async () => {
  let attempts = 0, finish!: () => void;
  const state = copying(() => { attempts++; return new Promise(resolve => { finish = resolve; }); });
  await state.copy("file:///source");
  assert.equal(attempts, 0);
  const pending = state.copy("https://example.org/source");
  await state.copy("https://example.org/source");
  assert.equal(attempts, 1);
  finish(); await pending;
  assert.equal(state.errors.length, 0);
  assert.equal(state.sandbox.copying, false);
});
