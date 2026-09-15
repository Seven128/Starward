import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { normalizePlatformLocation } from "../../../services/platform-location-result";

const ast = ts.createSourceFile("fields.tsx", readFileSync(new URL("./plan-travel-fields.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let declaration = "", inputCallback = "";
const visit = (node: ts.Node) => {
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === "chooseOrigin") declaration = node.getText(ast);
  if (ts.isJsxAttribute(node) && node.name.getText(ast) === "onInput" && node.initializer && ts.isJsxExpression(node.initializer)) inputCallback = node.initializer.expression!.getText(ast);
  ts.forEachChild(node, visit);
}; visit(ast);

function fixture() {
  let resolve!: (value: unknown) => void, reject!: (error: unknown) => void;
  const wait = new Promise((yes, no) => { resolve = yes; reject = no; });
  let account = "first", page = {}, calls = 0, notices = 0;
  const values: any[] = [], busy: boolean[] = [];
  const live = { current: { value: { origin: "原出发地", mode: "TRANSIT" }, disabled: false, ownerKey: "first:plan-1" } };
  const mounted = { current: true }, pending = { current: false };
  const run = vm.runInNewContext(ts.transpileModule(`const ${declaration}; chooseOrigin;`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    live, mounted, pending, disabled: false, setChoosing: (v: boolean) => busy.push(v), currentDraftUserId: () => account,
    Taro: { getCurrentPages: () => [page] }, choosePlatformLocation: () => { calls++; return wait; },
    onChange: (value: unknown) => values.push(value), PLAN_TRAVEL_ORIGIN_MAX_LENGTH: 120,
    errorMessage: (error: any) => error.errMsg ?? error.message, useAppStore: { getState: () => ({ notify: () => notices++ }) },
  });
  return { run, resolve, reject, values, busy, live, mounted, calls: () => calls, notices: () => notices,
    changeAccount: () => { account = "second"; }, leave: () => { page = {}; } };
}

test("plan chooses once, preserves travel mode and stores normalized coordinates without formal identity", async () => {
  const f = fixture(), running = f.run(); await f.run();
  const selected = normalizePlatformLocation({ latitude: 22.5, longitude: 113.5, name: "新出发地", address: "所选地址" });
  assert.notEqual(selected.wgs84.longitude, selected.location.longitude);
  f.resolve(selected); await running;
  assert.equal(f.calls(), 1); assert.equal(f.values.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(f.values[0])), { origin: "新出发地", mode: "TRANSIT",
    originLocation: { source: "WECHAT_CHOOSE_LOCATION", address: "所选地址", wgs84: selected.wgs84 } });
  assert.deepEqual(f.busy, [true, false]);
});

test("cancel, page/account/plan changes, manual edits and unmount cannot replace departure input", async () => {
  for (const scenario of ["cancel", "page", "account", "plan", "edit", "unmount", "busy", "error"]) {
    const f = fixture(), running = f.run();
    if (scenario === "page") f.leave();
    if (scenario === "account") f.changeAccount();
    if (scenario === "plan") f.live.current = { ...f.live.current, ownerKey: "first:plan-2" };
    if (scenario === "edit") f.live.current = { ...f.live.current, value: { ...f.live.current.value, origin: "后来手填" } };
    if (scenario === "unmount") f.mounted.current = false;
    if (scenario === "busy") f.live.current.disabled = true;
    if (["cancel", "error"].includes(scenario)) f.reject({ errMsg: scenario === "cancel" ? "chooseLocation:fail cancel" : "unavailable" });
    else f.resolve(normalizePlatformLocation({ latitude: 0, longitude: 0 }));
    await running;
    assert.deepEqual(f.values, [], scenario);
    assert.equal(f.notices(), scenario === "error" ? 1 : 0, scenario);
  }
});

test("manual input explicitly clears selected coordinates even when the text stays identical", () => {
  let saved: any;
  const callback = vm.runInNewContext(ts.transpileModule(`(${inputCallback})`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    value: { origin: "原出发地", mode: "DRIVING", originLocation: { address: "旧地址" } }, onChange: (v: any) => { saved = v; },
  });
  callback({ detail: { value: "原出发地" } });
  assert.equal(saved.originLocation, null); assert.equal(saved.origin, "原出发地");
});
