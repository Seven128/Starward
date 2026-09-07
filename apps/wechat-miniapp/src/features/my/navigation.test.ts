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
  let reject!: (error: Error) => void;
  const urls: string[] = [], notices: unknown[] = [], dismissed: string[] = [];
  const run = vm.runInNewContext(ts.transpileModule(`${declaration}\nopenPage;`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    navigationPending: { current: false }, recordAcceptanceDiagnostic: () => {},
    notify: (notice: unknown) => notices.push(notice),
    Taro: { navigateTo: ({ url }: { url: string }) => {
      urls.push(url);
      return urls.length === 1 ? new Promise((_resolve, fail) => { reject = fail; }) : Promise.resolve();
    } },
    useAppStore: { getState: () => ({
      notifications: [{ id: "mine", owner: "my", dedupeKey: "my-contribution-navigation-failed" }, { id: "other", owner: "my", dedupeKey: "another-error" }],
      dismissNotification: (id: string) => dismissed.push(id),
    }) },
  });
  const pending = run("/content/contribution/index", "反馈页面", "contribution");
  await run("/content/settings/index", "设置", "settings");
  assert.deepEqual(urls, ["/content/contribution/index"]);
  reject(new Error("native navigation failed"));
  await pending;
  assert.equal(notices.length, 1);
  await run("/content/contribution/index", "反馈页面", "contribution");
  assert.equal(urls.length, 2);
  assert.deepEqual(dismissed, ["mine"]);
});
