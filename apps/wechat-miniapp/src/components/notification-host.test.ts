import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

test("the production floating host stops rendering on page hide and resumes on show", () => {
  const source = readFileSync(new URL("./notification.tsx", import.meta.url), "utf8");
  const ast = ts.createSourceFile("notification.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const host = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "FloatingNotificationHost");
  assert.ok(host);
  let visible = true;
  let show = () => {};
  let hide = () => {};
  const code = ts.transpileModule(host.getText(ast).replace(/^export /, ""), {
    compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const render = vm.runInNewContext(code + "\nFloatingNotificationHost", {
    useState: () => [visible, (value: boolean) => { visible = value; }],
    useDidShow: (callback: () => void) => { show = callback; },
    useDidHide: (callback: () => void) => { hide = callback; },
    React: { createElement: (type: unknown, props: unknown, ...children: unknown[]) => ({ type, props, children }) },
    View: "View", NotificationRegion: "NotificationRegion",
  });
  assert.ok(render());
  hide();
  assert.equal(render(), null);
  show();
  assert.ok(render());
});

test("each actual themed page branch mounts one floating host outside its scroll content", () => {
  const owners = [
    "pages/map/index", "pages/map/search-page", "pages/auth/index", "features/my/my-library-page",
    "features/sky/spot-sky-page", "features/spot/spot-detail-page", "spot/data-source/index",
    "content/article/detail/index", "content/plan/detail/plan-editor-page", "content/plan/list/index", "content/contribution/index",
    "content/event/modal-host-page",
    "content/settings/index", "content/profile/links/index", "content/import/index",
  ];
  for (const owner of owners) {
    const source = readFileSync(new URL(`../${owner}.tsx`, import.meta.url), "utf8");
    const ast = ts.createSourceFile(owner, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let roots = 0;
    const visit = (node: ts.Node) => {
      if (ts.isJsxElement(node) && node.openingElement.attributes.properties.some((prop) =>
        ts.isJsxAttribute(prop) && prop.name.getText(ast) === "className" && /\b(themeClass|presentationClass)\b/.test(prop.getText(ast)))) {
        roots += 1;
        const hosts = node.children.filter((child) => ts.isJsxSelfClosingElement(child) && child.tagName.getText(ast) === "FloatingNotificationHost");
        assert.equal(hosts.length, 1, owner);
      }
      ts.forEachChild(node, visit);
    };
    visit(ast);
    assert.ok(roots > 0, owner);
  }
  assert.doesNotMatch(readFileSync(new URL("../app.tsx", import.meta.url), "utf8"), /FloatingNotificationHost/);
});

test("only passive dismissible success acknowledgements expire; cleanup protects replacements", () => {
  const source = readFileSync(new URL("./notification.tsx", import.meta.url), "utf8");
  const ast = ts.createSourceFile("notification.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const region = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "NotificationRegion");
  assert.ok(region);
  let current: any = null;
  let cleanup: undefined | (() => void);
  let scheduled: (() => void)[] = [];
  const dismissed: string[] = [];
  const dismiss = (id: string) => dismissed.push(id);
  const code = ts.transpileModule(region.getText(ast).replace(/^export /, ""), {
    compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const render = vm.runInNewContext(code + "\nNotificationRegion", {
    useAppStore: (select: any) => select({ notifications: [], dismissNotification: dismiss }),
    selectNotification: () => ({ current, residualCount: 0 }),
    useEffect: (effect: any) => { cleanup?.(); cleanup = effect(); },
    setTimeout: (callback: () => void, delay: number) => { assert.equal(delay, 6000); scheduled.push(callback); return scheduled.length; },
    clearTimeout: () => {},
    React: { createElement: () => ({}) }, NotificationComponent: "NotificationComponent",
  });
  const success = { id: "saved", createdAt: 1, occurrences: 1, tone: "success", placement: "floating", dismissible: true };
  for (const record of [null, { ...success, tone: "error" }, { ...success, tone: "warning" },
    { ...success, placement: "inline" }, { ...success, dismissible: false },
    { ...success, action: { label: "撤销", route: "/undo" } }]) {
    current = record; render({});
    assert.equal(scheduled.length, 0);
  }
  current = success; render({});
  scheduled[0]!();
  assert.deepEqual(dismissed, ["saved"]);
  dismissed.length = 0; scheduled = [];
  current = success; render({});
  current = { ...success, occurrences: 2, createdAt: 2 }; render({});
  scheduled[0]!();
  assert.deepEqual(dismissed, []);
  scheduled[1]!();
  assert.deepEqual(dismissed, ["saved"]);
  dismissed.length = 0;
  current = success; render({});
  cleanup?.();
  scheduled.at(-1)!();
  assert.deepEqual(dismissed, []);
});
