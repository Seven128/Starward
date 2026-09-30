import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = ts.createSourceFile("settings.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let declaration = "", removeDeclaration = "";
const visit = (node: ts.Node) => {
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === "downloadAccountData")
    declaration = `const ${node.getText(source)};`;
  if (ts.isFunctionDeclaration(node) && node.name?.text === "removeJsonFile")
    removeDeclaration = node.getText(source);
  ts.forEachChild(node, visit);
};
visit(source);
assert.ok(declaration);
assert.ok(removeDeclaration);

function runCase(failure: "api" | "write" | "share" | "cleanup" | "cleanup-after-share" | "none") {
  const calls: string[] = [];
  const notices: Array<{ title: string; body: string; placement: string; tone: string; dedupeKey: string }> = [];
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
        { id: "cleanup", owner: "settings", dedupeKey: "settings-account-export-cleanup-failed" },
        { id: "prior-success", owner: "settings", dedupeKey: "settings-account-exported" },
        { id: "other-owner", owner: "other", dedupeKey: "settings-account-export-failed" },
        { id: "other-action", owner: "settings", dedupeKey: "settings-account-delete-failed" },
      ],
      dismissNotification: (id: string) => dismissed.push(id),
    }) },
    writeJsonFile: async () => { calls.push("write"); if (failure === "write") throw Error("disk"); },
    removeJsonFile: async () => { calls.push("remove"); if (failure === "cleanup" || failure === "cleanup-after-share") throw Error("unlink"); },
    notify: (notice: { title: string; body: string; placement: string; tone: string; dedupeKey: string }) => notices.push(notice),
    errorMessage: () => "操作失败",
    Taro: { env: { USER_DATA_PATH: "/isolated" }, shareFileMessage: async () => {
      calls.push("share");
      if (failure === "share" || failure === "cleanup") throw Error("share");
    } },
  }) as () => Promise<void>;
  return { run, calls, notices, pending, dismissed };
}

test("account export removes its private file after a share receipt and reports cleanup failures", async () => {
  for (const failure of ["api", "write", "share", "cleanup", "cleanup-after-share", "none"] as const) {
    const { run, calls, notices, pending, dismissed } = runCase(failure);
    await run();
    assert.deepEqual(pending, ["EXPORT", null]);
    assert.deepEqual(dismissed, failure === "none" || failure === "cleanup-after-share" ? ["export", "cleanup", "prior-success"] : []);
    assert.deepEqual(calls, {
      api: ["api"], write: ["api", "write", "remove"],
      share: ["api", "write", "share", "remove"],
      cleanup: ["api", "write", "share", "remove"],
      "cleanup-after-share": ["api", "write", "share", "remove"],
      none: ["api", "write", "share", "remove"],
    }[failure]);
    assert.equal(notices[0]?.title, {
      api: "账户数据导出失败", write: "账户数据导出失败", share: "文件分享未完成",
      cleanup: "本机临时文件未清除", "cleanup-after-share": "本机临时文件未清除", none: "账户数据已生成",
    }[failure]);
    if (failure === "share") assert.match(notices[0]!.body, /已清理本次临时文件/u);
    if (failure === "cleanup") assert.match(notices[0]!.body, /仍留在本机/u);
    if (failure === "cleanup-after-share") {
      assert.match(notices[0]!.body, /文件已分享/u);
      assert.equal(notices[0]!.placement, "inline");
      assert.equal(notices[0]!.tone, "warning");
      assert.equal(notices[0]!.dedupeKey, "settings-account-export-cleanup-failed");
    }
  }
});

test("cleanup treats an absent file as complete but surfaces a real unlink failure", async () => {
  const unlink = (errMsg: string) => vm.runInNewContext(ts.transpileModule(`${removeDeclaration}\nremoveJsonFile;`, {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText, {
    Taro: { getFileSystemManager: () => ({ unlink: ({ fail }: { fail: (result: { errMsg: string }) => void }) => fail({ errMsg }) }) },
  }) as (filePath: string) => Promise<void>;
  await assert.doesNotReject(unlink("unlink:fail ENOENT: no such file")("/isolated/export.json"));
  await assert.rejects(unlink("unlink:fail permission denied")("/isolated/export.json"), /permission denied/u);
});
