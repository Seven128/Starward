import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { validateExternalUrl } from "@starward/miniapp-contracts";

function runtime(input = { displayName: "主页", url: "https://example.com" }, scenario = "normal") {
  const source = ts.createSourceFile("links.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declarations: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ["save", "remove"].includes(node.name.getText(source))) declarations.push(`const ${node.getText(source)};`);
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.equal(declarations.length, 2);
  const busy = { current: false }, calls: string[] = [], notices: string[] = [];
  const validation: string[] = [], fields: string[] = [];
  let identity = "account-a", saved = 0;
  const recovery: boolean[] = [];
  let confirm!: (value: { confirm: boolean }) => void;
  const confirmation = new Promise((resolve) => { confirm = resolve; });
  const handlers = vm.runInNewContext(ts.transpileModule(declarations.join("\n") + "\n({save, remove});", {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText, {
    owner: "account-a", formOwner: { current: "account-a" }, currentDraftUserId: () => identity,
    localDraft: { blocked: false, saved() { saved++; } },
    setSaveRecoveryError(value: boolean) { recovery.push(value); }, ProfileLinkRecoveryError: class extends Error {},
    mutationBusy: busy, ...input, platform: "OTHER", publicLink: false, activeLinks: [],
    validateExternalUrl,
    setValidationMessage: (value: string) => validation.push(value),
    setValidationField: (value: string) => fields.push(value),
    setMutation() {}, setDisplayName() {}, setUrl() {}, setPublicLink() {},
    announce: (_tone: string, title: string) => notices.push(title), errorMessage: () => "暂不可用",
    createProfileLink: async () => { calls.push("save"); if (scenario === "failure-switch") { identity = "account-b"; throw Error("late failure"); } if (scenario === "success-switch") identity = "account-b"; },
    deleteProfileLink: async () => { calls.push("delete"); },
    links: { refetch: async () => { if (scenario === "refresh-switch") identity = "account-b"; throw new Error("offline"); } },
    Taro: { showModal: () => { calls.push("confirm"); return confirmation; } },
  }) as { save(): Promise<void>; remove(link: object): Promise<void> };
  return { ...handlers, calls, notices, busy, confirm, validation, fields, recovery, saved: () => saved };
}

test("late link save results never clear another account's input or announce its errors", async () => {
  for (const scenario of ["failure-switch", "success-switch", "refresh-switch"]) {
    const page = runtime(undefined, scenario);
    await page.save();
    assert.deepEqual(page.calls, ["save"]);
    assert.equal(page.busy.current, false);
    assert.equal(page.saved(), scenario === "refresh-switch" ? 1 : 0);
    assert.deepEqual(page.recovery, scenario === "refresh-switch" ? [false] : []);
    assert.deepEqual(page.notices, scenario === "refresh-switch" ? ["主页链接已保存"] : []);
  }
});

test("invalid profile fields focus the relevant input without dispatching a write", async () => {
  for (const input of [
    { displayName: "  ", url: "https://example.com", field: "displayName", message: "请填写主页名称" },
    { displayName: "主页", url: "not-a-url", field: "url", message: "链接不可用" },
  ]) {
    const page = runtime(input);
    await page.save();
    assert.deepEqual(page.calls, []);
    assert.deepEqual(page.fields, [input.field]);
    assert.ok(page.validation.at(-1)?.includes(input.message));
    assert.equal(page.busy.current, false);
    await page.save();
    assert.deepEqual(page.fields, [input.field, input.field]);
    assert.deepEqual(page.calls, []);
  }
});

test("delete confirmation holds the operation lock and cancellation releases it", async () => {
  const page = runtime();
  const pending = page.remove({ profileLinkId: "one", displayName: "主页" });
  await page.remove({ profileLinkId: "two" });
  await page.save();
  assert.deepEqual(page.calls, ["confirm"]);
  page.confirm({ confirm: false });
  await pending;
  assert.equal(page.busy.current, false);
  assert.deepEqual(page.calls, ["confirm"]);
});

test("refresh failure cannot turn a confirmed save or delete into a write failure", async () => {
  const page = runtime();
  await page.save();
  const pending = page.remove({ profileLinkId: "one", displayName: "主页" });
  page.confirm({ confirm: true });
  await pending;
  assert.deepEqual(page.calls, ["save", "confirm", "delete"]);
  assert.ok(page.notices.includes("链接已保存，列表暂未刷新"));
  assert.ok(page.notices.includes("链接已移除，列表暂未刷新"));
  assert.ok(page.notices.every((title) => !title.includes("未保存") && !title.includes("未移除")));
  assert.equal(page.busy.current, false);
});
