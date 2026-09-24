import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const ast = ts.createSourceFile("plan-editor-page.tsx", readFileSync(new URL("./plan-editor-page.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let element = "";
const visit = (node: ts.Node) => {
  if (ts.isJsxElement(node) && node.openingElement.attributes.properties.some(prop => ts.isJsxAttribute(prop)
    && prop.name.getText(ast) === "data-od-id" && prop.initializer?.getText(ast) === '"plan-preparation"')) element = node.getText(ast);
  ts.forEachChild(node, visit);
};
visit(ast);
assert.ok(element);

test("saved personal reminder name remains visible beside its offset, notification and checklist", () => {
  const tree = vm.runInNewContext(ts.transpileModule(`(${element})`, { compilerOptions: {
    jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022,
  } }).outputText, {
    React: { createElement: (type: string, props: unknown, ...children: unknown[]) => ({ type, props, children }) },
    View: "View", Text: "Text", Button: "Button", StatusPanel: "StatusPanel",
    activePlan: { planId: "plan:1", reminders: [{ reminderId: "r1", title: "出发前检查设备",
      hoursBeforeDeparture: 1, items: [{ itemId: "i1", text: "检查相机电池", completed: true }] }] },
    reminderNotifications: [], planReminderStatusLabel: () => "通知未开启",
    planReminderStatusDetail: () => "清单仍可使用", checklistSaving: false,
    toggleReminderItem: () => {},
  });
  const values = (node: any): string => node == null || typeof node === "boolean" ? "" : Array.isArray(node)
    ? node.map(values).join("") : typeof node === "object" ? values(node.children) : String(node);
  const copy = values(tree);
  for (const expected of ["出发前检查设备", "出发前 1 小时", "通知未开启", "检查相机电池", "1/1"]) {
    assert.ok(copy.includes(expected), expected);
  }
});
