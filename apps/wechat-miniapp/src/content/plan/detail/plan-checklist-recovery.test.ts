import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = ts.createSourceFile("page.tsx", readFileSync(new URL("./plan-editor-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let declaration = "";
const visit = (node: ts.Node) => {
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === "toggleReminderItem") declaration = `const ${node.getText(source)};`;
  ts.forEachChild(node, visit);
};
visit(source);
assert.ok(declaration);

test("confirmed checklist retry removes its obsolete failure without dismissing unrelated messages", async () => {
  let fails = true, owner = "account-a", switchOwner = false;
  const notifications: Array<any> = [{ id: "other", owner: "plan", dedupeKey: "other-operation" }];
  const unrelated = notifications[0];
  const notify = (value: any) => notifications.push({ ...value, id: `notice-${notifications.length}` });
  const state = { notifications, dismissNotification: (id: string) => {
    const index = notifications.findIndex(item => item.id === id);
    if (index >= 0) notifications.splice(index, 1);
  } };
  const sandbox = {
    scopedDraftUserId: () => owner,
    activePlan: { planId: "plan-a", revision: 1 }, mutationBusy: { current: false },
    setChecklistSaving: () => {},
    setPlanChecklistCompletion: async () => {
      if (fails) throw new Error("receipt-lost");
      if (switchOwner) owner = "account-b";
    },
    planQuery: { refetch: async () => {} },
    notify, useAppStore: { getState: () => state },
    announce: (tone: string, title: string, body: string) => notify({ owner: "plan", tone, title, body }),
    errorMessage: (error: Error) => error.message, MiniappApiError: class extends Error {},
  };
  const toggle = vm.runInNewContext(ts.transpileModule(`${declaration}\ntoggleReminderItem`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, sandbox);
  await toggle("reminder-a", "item-a", true);
  await toggle("reminder-a", "item-b", true);
  assert.equal(notifications.length, 3);
  const otherItemFailure = notifications[2];
  fails = false;
  await toggle("reminder-a", "item-a", true);
  assert.deepEqual(notifications, [unrelated, otherItemFailure], "a confirmed result must retire only its own obsolete retry notice");
  switchOwner = true;
  await toggle("reminder-a", "item-b", true);
  assert.equal(notifications.length, 2, "late account response cannot clear another account's state");
});
