import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function navigation(options: { warningFails?: boolean; copyFails?: boolean; restricted?: boolean } = {}) {
  const source = ts.createSourceFile("spot.tsx", readFileSync(new URL("./spot-detail-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration = "", cancelDeclaration = "";
  const visit = (node: ts.Node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === "isCancelledAction") cancelDeclaration = node.getText(source);
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "openNavigation") declaration = `const ${node.getText(source)};`;
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(declaration);
  let choose!: (value: { tapIndex: number }) => void, rejectChoice!: (error: unknown) => void;
  const choice = new Promise((resolve, reject) => { choose = resolve; rejectChoice = reject; });
  let resolveRoute!: (value: unknown) => void;
  const route = new Promise(resolve => { resolveRoute = resolve; });
  let started!: () => void;
  const routeStarted = new Promise<void>(resolve => { started = resolve; });
  const epoch = { current: 0 }, calls: string[] = [];
  const open = vm.runInNewContext(ts.transpileModule(cancelDeclaration + "\n" + declaration + "\nopenNavigation;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    Error,
    detail: { spot: { spotId: "spot:a", visibilityPolicy: options.restricted ? "PUBLIC_APPROXIMATE" : "PUBLIC_EXACT", gcj02: {}, wgs84: {} }, accessAndSafety: { explicitDanger: options.warningFails, restrictions: [], guidance: [] } },
    navigationEpoch: epoch, navigationScope: { current: "scope" }, scope: "scope",
    observationContext: { contextId: "ctx:a" }, effectiveRoute: { originLabel: "origin" },
    Taro: {
      showActionSheet: () => choice,
      showModal: async () => { calls.push("modal"); throw new Error("native failure"); },
      openLocation: async () => calls.push("open"),
      setClipboardData: async () => { calls.push("copy"); if (options.copyFails) throw new Error("clipboard failure"); },
    },
    estimateSpotRoute: () => { calls.push("estimate"); started(); return route; },
    setRequestedRoute: () => calls.push("write-route"), setRoutePending() {},
    notify: () => calls.push("notice"),
  }) as () => Promise<void>;
  return { open, choose, rejectChoice, resolveRoute, routeStarted, calls, invalidate: () => epoch.current++ };
}

test("a late navigation choice cannot open a location after leaving its context", async () => {
  const page = navigation(); const pending = page.open();
  page.invalidate(); page.choose({ tapIndex: 0 }); await pending;
  assert.deepEqual(page.calls, []);
});

test("a late route estimate cannot overwrite or open the former destination", async () => {
  const page = navigation(); const pending = page.open();
  page.choose({ tapIndex: 0 }); await page.routeStarted;
  page.invalidate(); page.resolveRoute({ data: {}, dataState: "FRESH" }); await pending;
  assert.deepEqual(page.calls, ["estimate"]);
});

test("menu failure never defaults to opening the external map", async () => {
  const page = navigation(); const pending = page.open();
  page.rejectChoice(new Error("unavailable")); await pending;
  assert.deepEqual(page.calls, ["notice"]);
});

test("a current route estimate still opens the chosen destination", async () => {
  const page = navigation(); const pending = page.open();
  page.choose({ tapIndex: 0 }); await page.routeStarted;
  page.resolveRoute({ data: {}, dataState: "FRESH" }); await pending;
  assert.deepEqual(page.calls, ["estimate", "write-route", "open"]);
});

test("failed safety warning stops navigation with a handled result", async () => {
  const page = navigation({ warningFails: true });
  await assert.doesNotReject(page.open());
  assert.deepEqual(page.calls, ["modal", "notice"]);
});

test("clipboard failure is not misreported as an external map failure", async () => {
  const page = navigation({ copyFails: true }); const pending = page.open();
  page.choose({ tapIndex: 1 }); await assert.doesNotReject(pending);
  assert.deepEqual(page.calls, ["copy", "notice"]);
});

test("restricted spot coordinates never reach external map or clipboard", async () => {
  const page = navigation({ restricted: true });
  await page.open();
  assert.deepEqual(page.calls, ["notice"]);
});

for (const result of [{ errMsg: 'showActionSheet:fail cancel' }, new Error('showActionSheet:fail cancel')]) {
  test(`cancelling navigation options is quiet (${result instanceof Error ? 'Error' : 'native result'})`, async () => {
    const page = navigation(); const pending = page.open();
    page.rejectChoice(result); await pending;
    assert.deepEqual(page.calls, []);
  });
}
test('a native action sheet failure remains visible', async () => {
  const page = navigation(); const pending = page.open();
  page.rejectChoice({ errMsg: 'showActionSheet:fail unavailable' }); await pending;
  assert.deepEqual(page.calls, ['notice']);
});
