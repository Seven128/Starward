import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { normalizePlatformLocation } from "../../services/platform-location-result";

function selection(mode = "DAY", confirm = true, moveWait?: Promise<unknown>) {
  const ast = ts.createSourceFile("search.tsx", readFileSync(new URL("./search-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration = "";
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === "chooseMapLocation") declaration = node.getText(ast);
    ts.forEachChild(node, visit);
  };
  visit(ast); assert.ok(declaration);
  let resolve!: (value: unknown) => void, reject!: (value: unknown) => void;
  const pending = new Promise((yes, no) => { resolve = yes; reject = no; });
  const pickers = [{ pending, resolve, reject }];
  let pickerCount = 0;
  const calls: Array<{ action: string; value?: unknown }> = [];
  let page = {};
  const version = { current: 0 }, nativePending = { current: null as number | null };
  const platformAst = ts.createSourceFile("platform.ts", readFileSync(new URL("../../services/platform-location.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const platform = platformAst.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "choosePlatformLocation")!;
  const Taro = { getCurrentPages: () => [page], showModal: async () => { calls.push({ action: "warning" }); return { confirm }; },
    chooseLocation: (value: unknown) => {
      calls.push({ action: "choose", value });
      if (pickerCount > 0) {
        let resolve!: (value: unknown) => void, reject!: (error: unknown) => void;
        const pending = new Promise((yes, no) => { resolve = yes; reject = no; });
        pickers.push({ pending, resolve, reject });
      }
      return pickers[pickerCount++]!.pending;
    } };
  const useAppStore = { getState: () => ({ mode }) };
  const choosePlatformLocation = vm.runInNewContext(ts.transpileModule(platform.getText(platformAst).replace(/^export /, "") + "; choosePlatformLocation;",
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, { Taro, useAppStore, normalizePlatformLocation });
  const run = vm.runInNewContext(ts.transpileModule(`const ${declaration}; chooseMapLocation;`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    nativeSelectionPending: nativePending, selectionVersion: version,
    viewport: { center: { latitude: 22, longitude: 113 } },
    useAppStore, Taro, choosePlatformLocation,
    setFinderQuery: (value: unknown) => calls.push({ action: "query", value }),
    moveMapReference: async (value: unknown) => { calls.push({ action: "move", value }); await moveWait; },
    notify: () => calls.push({ action: "notice" }),
    errorMessage: (error: any) => error?.errMsg ?? error?.message ?? String(error),
  }) as () => Promise<void>;
  return { run, resolve, reject, calls, nativePending, resolveAt: (index: number, value: unknown) => pickers[index]!.resolve(value),
    leave: () => { page = {}; }, supersede: () => version.current++ };
}

test("a finished old Context request cannot release a newer native picker lock", async () => {
  let finishContext!: () => void;
  const moveWait = new Promise<void>(resolve => { finishContext = resolve; });
  const f = selection("DAY", true, moveWait);
  const first = f.run(); f.resolve({ latitude: 22, longitude: 113 });
  for (let i = 0; i < 10 && !f.calls.some(c => c.action === "move"); i++) await Promise.resolve();
  assert.ok(f.calls.some(c => c.action === "move"));
  const second = f.run(); const secondToken = f.nativePending.current;
  finishContext(); await first;
  assert.equal(f.nativePending.current, secondToken);
  await f.run();
  assert.equal(f.calls.filter(c => c.action === "choose").length, 2);
  f.resolveAt(1, { latitude: 23, longitude: 114 }); await second;
  assert.equal(f.nativePending.current, null);
});

test("platform selection retains GCJ02, has no formal identity and locks duplicate invocation", async () => {
  const flow = selection(); const running = flow.run(); await flow.run();
  flow.resolve({ latitude: 22.5, longitude: 113.5, name: "所选地点", address: "" }); await running;
  assert.deepEqual(flow.calls.map(item => item.action), ["choose", "move"]);
  assert.deepEqual(JSON.parse(JSON.stringify(flow.calls.at(-1)?.value)), {
    label: "所选地点", location: { system: "GCJ02", latitude: 22.5, longitude: 113.5 },
  });
  assert.equal(flow.nativePending.current, null);
});

test("unnamed platform points show coordinates instead of an invented address", async () => {
  const flow = selection(); const running = flow.run();
  flow.resolve({ latitude: 0, longitude: 0, name: "", address: "" }); await running;
  assert.equal((flow.calls.at(-1)?.value as { label: string }).label, "0.0000, 0.0000");
});

test("cancel, invalid coordinates and late page results never move the map", async () => {
  for (const scenario of ["cancel", "invalid", "leave", "supersede"]) {
    const flow = selection(); const running = flow.run();
    if (scenario === "leave") flow.leave();
    if (scenario === "supersede") flow.supersede();
    if (scenario === "cancel") flow.reject({ errMsg: "chooseLocation:fail cancel" });
    else flow.resolve({ latitude: scenario === "invalid" ? 100 : 22.5, longitude: 113.5 });
    await running;
    assert.deepEqual(flow.calls.map(item => item.action), scenario === "invalid" ? ["choose", "notice"] : ["choose"]);
    assert.equal(flow.nativePending.current, null);
  }
});

test("observation mode explains the native bright surface and cancellation stays in place", async () => {
  const flow = selection("OBSERVATION", false); await flow.run();
  assert.deepEqual(flow.calls.map(item => item.action), ["warning"]);
});
