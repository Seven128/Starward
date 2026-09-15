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
    estimateSpotRoute: () => { throw new Error("Retired route provider must not be called"); },
    notify: () => calls.push("notice"),
  }) as () => Promise<void>;
  return { open, choose, rejectChoice, calls, invalidate: () => epoch.current++ };
}

test("a late navigation choice cannot open a location after leaving its context", async () => {
  const page = navigation(); const pending = page.open();
  page.invalidate(); page.choose({ tapIndex: 0 }); await pending;
  assert.deepEqual(page.calls, []);
});

test("menu failure never defaults to opening the external map", async () => {
  const page = navigation(); const pending = page.open();
  page.rejectChoice(new Error("unavailable")); await pending;
  assert.deepEqual(page.calls, ["notice"]);
});

test("choosing external navigation opens the destination without any route provider", async () => {
  const page = navigation(); const pending = page.open();
  page.choose({ tapIndex: 0 }); await pending;
  assert.deepEqual(page.calls, ["open"]);
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
