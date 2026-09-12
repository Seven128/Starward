import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { clearPlanDraft } from "./plan-draft";

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
  let confirm!: (value: { confirm: boolean }) => void;
  const confirmation = new Promise((resolve) => { confirm = resolve; });
  const remove = vm.runInNewContext(ts.transpileModule(declaration + "\nremove;", {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText, {
    activePlan: { planId: "saved-plan" }, mutationBusy: busy, isDirty: true,
    scopedDraftUserId: () => owner, planDraftKey: () => null, clearPlanDraft,
    setDeleting() {}, replacePlans: () => calls.push("replace"),
    planChecklistStorageKey: (id: string) => id,
    announce: (_tone: string, title: string) => notices.push(title), errorMessage: () => "error",
    deleteObservationPlan: async () => { calls.push("delete"); if (afterDelete) { owner = null; afterDelete(); } return { data: { plans: [] } }; },
    Taro: {
      showModal: () => { calls.push("confirm"); return confirmation; },
      removeStorageSync: () => calls.push("cleanup"),
      navigateBack: async () => { calls.push("back"); throw new Error("no history"); },
      switchTab: async () => { calls.push("tab"); throw new Error("navigation unavailable"); },
    },
  }) as () => Promise<void>;
  return { remove, busy, notices, calls, confirm };
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
  assert.deepEqual(page.notices, ["账户已变化"]);
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
