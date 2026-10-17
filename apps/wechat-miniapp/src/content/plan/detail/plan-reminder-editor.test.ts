import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

test("saving or unknown results freeze every reminder field and late callbacks cannot edit the submitted snapshot", () => {
  const source = ts.createSourceFile("editor.tsx", readFileSync(new URL("./plan-reminder-editor.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const code = source.statements.filter(node => !ts.isImportDeclaration(node)).map(node => node.getFullText(source)).join("\n");
  type Node = { type: string; props: Record<string, any> };
  const jsx = (type: string | ((props: any) => Node), props: any) => typeof type === "function" ? type(props) : { type, props };
  const exports: Record<string, any> = {};
  vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText,
    { exports, require: () => ({ jsx, jsxs: jsx }), Input: "Input", Button: "Button", Text: "Text", View: "View",
      useState: (value: unknown) => [value, () => {}], useRef: (value: unknown) => ({ current: value }), useEffect() {} });
  const reminders = [{ reminderId: "reminder:one", title: "器材", hoursBeforeDeparture: 1, notifyOnWechat: false,
    items: [{ itemId: "item:one", text: "电池", completed: false }] }];
  const before = structuredClone(reminders), changes: unknown[] = [];
  const controls: Node[] = [];
  const visit = (node: Node | Node[] | undefined) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== "object") return;
    if (["Input", "Button"].includes(node.type)) controls.push(node);
    visit(node.props?.children);
  };
  visit(exports.PlanReminderEditor({ reminders, disabled: true, onChange: (value: unknown) => changes.push(value) }));
  assert.ok(controls.length >= 8);
  for (const control of controls) {
    assert.equal(control.props.disabled, true, control.props["aria-label"] ?? control.props.className);
    control.props.onInput?.({ detail: { value: "changed" } });
    control.props.onClick?.();
  }
  assert.equal(changes.length, 0);
  assert.deepEqual(reminders, before);
  controls.length = 0;
  visit(exports.PlanReminderEditor({ reminders, disabled: false, onChange: (value: unknown) => changes.push(value) }));
  controls.find(node => node.props["aria-label"] === "提醒 1 名称")!.props.onInput({ detail: { value: "衣物" } });
  assert.equal((changes[0] as typeof reminders)[0]!.title, "衣物");
});
