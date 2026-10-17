import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

test("My serializes competing entries and permits retry after native navigation fails", async () => {
  const source = ts.createSourceFile("my.tsx", readFileSync(new URL("./my-library-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration = "";
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "openPage") declaration = `const ${node.getText(source)};`;
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(declaration);
  const urls: string[] = [], notices: unknown[] = [], dismissed: string[] = [];
  const calls: Array<{ resolve: () => void; reject: (error: Error) => void }> = [];
  const state = {
    accountOwnerId: "a", mapResetVersion: 0,
    notifications: [{ id: "mine", owner: "my", dedupeKey: "my-contribution-navigation-failed" }, { id: "other", owner: "my", dedupeKey: "another-error" }],
    dismissNotification: (id: string) => { dismissed.push(id); state.notifications = state.notifications.filter(item => item.id !== id); },
  };
  const store = { getState: () => state, subscribe: () => () => {} };
  const page = {};
  const load = (file: string): any => {
    const module = { exports: {} };
    vm.runInNewContext(ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText, {
    module, exports: module.exports,
    require: (name: string) => name === "react" ? {
      useState: () => [false, () => {}], useRef: (initial: unknown) => ({ current: initial }),
      useEffect: (setup: () => void) => setup(),
    } : name === "@tarojs/taro" ? { __esModule: true, useDidShow: () => {}, useDidHide: () => {},
      default: { getCurrentPages: () => [page], navigateTo: ({ url }: { url: string }) => {
        urls.push(url); return new Promise<void>((resolve, reject) => calls.push({ resolve, reject }));
      } },
    } : name.endsWith("use-page-navigation") ? load("../../hooks/use-page-navigation.ts") : name.includes("api-client") ? { currentDraftUserId: () => "a" } : { useAppStore: store },
  });
    return module.exports;
  };
  const module = load("../../hooks/use-account-navigation.ts") as { useAccountNavigation: (owner: string) => unknown };
  const run = vm.runInNewContext(ts.transpileModule(`${declaration}\nopenPage;`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    navigation: module.useAccountNavigation("a"), recordAcceptanceDiagnostic: () => {},
    notify: (notice: unknown) => notices.push(notice),
    useAppStore: store,
  });
  const pending = run("/content/contribution/index", "反馈页面", "contribution");
  await run("/content/settings/index", "设置", "settings");
  assert.deepEqual(urls, ["/content/contribution/index"]);
  calls[0]!.reject(new Error("native navigation failed"));
  await pending;
  assert.equal(notices.length, 1);
  const retry = run("/content/contribution/index", "反馈页面", "contribution");
  calls[1]!.resolve(); await retry;
  assert.equal(urls.length, 2);
  assert.deepEqual(dismissed, ["mine"]);
  const oldRecord = { id: "renewed", owner: "my", dedupeKey: "my-contribution-navigation-failed" };
  state.notifications.push(oldRecord);
  const next = run("/content/contribution/index", "反馈页面", "contribution");
  const renewed = { ...oldRecord };
  state.notifications = state.notifications.map(item => item === oldRecord ? renewed : item);
  calls[2]!.resolve(); await next;
  assert.ok(state.notifications.includes(renewed));
  assert.deepEqual(dismissed, ["mine"]);
});

test("My root exposes only the adopted plan, contribution, and settings destinations", () => {
  const source = readFileSync(new URL("./my-library-page.tsx", import.meta.url), "utf8");
  assert.match(source, /data-control="my-plan-entry"|<MyPlanCard/u);
  assert.match(source, /data-control="my-contribution-entry"/u);
  assert.match(source, /data-control="my-settings-action"/u);
  assert.doesNotMatch(source, /openEvents|天象事件目录|routine-entry--events/u);
});
