import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { clearPlanDraft } from "./plan-draft";
import { createPlanTestOperations } from "./plan-operation-test-support";

function runtime(afterDelete?: () => void) {
  const source = ts.createSourceFile("plan.tsx", readFileSync(new URL("./plan-editor-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration = "";
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "remove") declaration = `const ${node.getText(source)};`;
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(declaration);
  const busy = { current: false }, notices: string[] = [], calls: string[] = [];
  let owner: string | null = "owner";
  const confirmations: Array<(value: { confirm: boolean }) => void> = [];
  let currentPage = {};
  const operations = createPlanTestOperations(() => owner, busy, () => currentPage);
  const remove = vm.runInNewContext(ts.transpileModule(declaration + "\nremove;", {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText, {
    activePlan: { planId: "saved-plan" }, mutationBusy: busy, isDirty: true,
    operations,
    scopedDraftUserId: () => owner, planDraftKey: () => null, clearPlanDraft,
    setDeleting() {}, replacePlans: () => calls.push("replace"),
    planChecklistStorageKey: (id: string) => id,
    announce: (_tone: string, title: string) => notices.push(title), errorMessage: () => "error",
    deleteObservationPlan: async () => { calls.push("delete"); if (afterDelete) { owner = null; afterDelete(); } return { data: { plans: [] } }; },
    Taro: {
      showModal: () => { calls.push("confirm"); return new Promise(resolve => { confirmations.push(resolve); }); },
      removeStorageSync: () => calls.push("cleanup"),
      navigateBack: async () => { calls.push("back"); throw new Error("no history"); },
      switchTab: async () => { calls.push("tab"); throw new Error("navigation unavailable"); },
    },
  }) as () => Promise<void>;
  return { remove, busy, notices, calls, operations,
    confirm: (value: { confirm: boolean }) => { assert.ok(confirmations.length); confirmations.shift()!(value); },
    setOwner: (value: string | null) => { owner = value; operations.observe(); },
    leavePage: () => { currentPage = {}; operations.hide(); } };
}

test("cancelled plan deletion releases its lock without a request or cleanup", async () => {
  const page = runtime();
  const pending = page.remove();
  await page.remove();
  assert.deepEqual(page.calls, ["confirm"]);
  page.confirm({ confirm: false });
  await pending;
  assert.equal(page.busy.current, false);
  assert.deepEqual(page.calls, ["confirm"]);
});

test("a deleted plan stays deleted when both return navigation paths fail", async () => {
  const page = runtime();
  const pending = page.remove();
  page.confirm({ confirm: true });
  await pending;
  assert.deepEqual(page.calls, ["confirm", "delete", "replace", "cleanup", "back", "tab"]);
  assert.ok(page.notices.every((title) => title === "计划已删除"));
  assert.equal(page.busy.current, false);
});

test("an account change while deletion is pending cannot replace the new account's plans", async () => {
  const page = runtime(() => {});
  const pending = page.remove();
  page.confirm({ confirm: true });
  await pending;
  assert.deepEqual(page.calls, ["confirm", "delete"]);
  assert.deepEqual(page.notices, []);
  assert.equal(page.busy.current, false);
});

test("a failed old-account deletion does not announce unchanged data in the new account", async () => {
  const page = runtime(() => { throw new Error("late request failure"); });
  const pending = page.remove();
  page.confirm({ confirm: true });
  await pending;
  assert.deepEqual(page.calls, ["confirm", "delete"]);
  assert.deepEqual(page.notices, []);
  assert.equal(page.busy.current, false);
});

test("retired deletion confirmations cannot dispatch after ABA, unmount or actual page departure", async () => {
  for (const departure of ["aba", "unmount", "page"] as const) {
    const page = runtime(), pending = page.remove();
    if (departure === "aba") { page.setOwner("b"); page.setOwner("owner"); }
    else if (departure === "unmount") page.operations.dispose();
    else page.leavePage();
    page.confirm({ confirm: true }); await pending;
    assert.deepEqual(page.calls, ["confirm"]); assert.deepEqual(page.notices, []);
  }
});

test("old deletion completion cannot release a fresh returning author's pending confirmation", async () => {
  const page = runtime(), old = page.remove();
  page.setOwner("b"); page.setOwner("owner");
  const fresh = page.remove();
  assert.equal(page.busy.current, true); assert.deepEqual(page.calls, ["confirm", "confirm"]);
  page.confirm({ confirm: true }); await old;
  assert.equal(page.busy.current, true); assert.deepEqual(page.calls, ["confirm", "confirm"]);
  page.confirm({ confirm: false }); await fresh;
  assert.equal(page.busy.current, false); assert.deepEqual(page.notices, []);
});

test("known native confirmation preserves callback-before-show and show-before-callback", async () => {
  for (const ordering of ["callback-first", "show-first"] as const) {
    const page = runtime(), pending = page.remove();
    page.operations.hide();
    if (ordering === "show-first") page.operations.show();
    page.confirm({ confirm: true }); await pending;
    if (ordering === "callback-first") page.operations.show();
    assert.deepEqual(page.calls, ["confirm", "delete", "replace", "cleanup", "back", "tab"]);
    assert.equal(page.busy.current, false);
  }
});
