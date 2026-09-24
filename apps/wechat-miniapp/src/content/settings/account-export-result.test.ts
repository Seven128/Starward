import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = ts.createSourceFile("settings.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let declaration = "";
const visit = (node: ts.Node) => {
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === "downloadAccountData")
    declaration = `const ${node.getText(source)};`;
  ts.forEachChild(node, visit);
};
visit(source);
assert.ok(declaration);

function runCase(failure: "api" | "write" | "share" | "cleanup" | "none") {
  const calls: string[] = [];
  const notices: Array<{ title: string; body: string }> = [];
  const pending: unknown[] = [];
  const dismissed: string[] = [];
  const run = vm.runInNewContext(ts.transpileModule(`${declaration}\ndownloadAccountData;`, {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText, {
    accountActionPending: { current: false },
    setDataAction: (value: unknown) => pending.push(value),
    setSheet() {},
    exportAccountData: async () => {
      calls.push("api");
      if (failure === "api") throw Error("api");
      return { data: { generatedAt: "2026-09-06T12:00:00Z" } };
    },
    useAppStore: { getState: () => ({
      notifications: [
        { id: "export", owner: "settings", dedupeKey: "settings-account-export-failed" },
        { id: "other-owner", owner: "other", dedupeKey: "settings-account-export-failed" },
        { id: "other-action", owner: "settings", dedupeKey: "settings-account-delete-failed" },
      ],
      dismissNotification: (id: string) => dismissed.push(id),
    }) },
    writeJsonFile: async () => { calls.push("write"); if (failure === "write") throw Error("disk"); },
    removeJsonFile: async () => { calls.push("remove"); if (failure === "cleanup") throw Error("unlink"); },
    notify: (notice: { title: string; body: string }) => notices.push(notice),
    errorMessage: () => "操作失败",
    Taro: { env: { USER_DATA_PATH: "/isolated" }, shareFileMessage: async () => {
      calls.push("share");
      if (failure === "share" || failure === "cleanup") throw Error("share");
    } },
  }) as () => Promise<void>;
  return { run, calls, notices, pending, dismissed };
}

test("account export removes a private temporary file when writing or sharing fails", async () => {
  for (const failure of ["api", "write", "share", "cleanup", "none"] as const) {
    const { run, calls, notices, pending, dismissed } = runCase(failure);
    await run();
    assert.deepEqual(pending, ["EXPORT", null]);
    assert.deepEqual(dismissed, failure === "none" ? ["export"] : []);
    assert.deepEqual(calls, {
      api: ["api"], write: ["api", "write", "remove"],
      share: ["api", "write", "share", "remove"],
      cleanup: ["api", "write", "share", "remove"],
      none: ["api", "write", "share"],
    }[failure]);
    assert.equal(notices[0]?.title, {
      api: "账户数据导出失败", write: "账户数据导出失败", share: "文件分享未完成",
      cleanup: "本机临时文件未清除", none: "账户数据已生成",
    }[failure]);
    if (failure === "share") assert.match(notices[0]!.body, /已清理本次临时文件/u);
    if (failure === "cleanup") assert.match(notices[0]!.body, /仍留在本机/u);
  }
});
