import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

type Element = { type: string; props: Record<string, unknown>; children: unknown[] };
function render(checked: boolean, disabled: boolean, changes: boolean[]) {
  const source = readFileSync(new URL("./toggle-field.tsx", import.meta.url), "utf8")
    .replace(/^import .*;\r?\n/gm, "")
    .replace("export function", "function");
  const component = vm.runInNewContext(ts.transpileModule(source + "\nToggleField;", {
    compilerOptions: { target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React },
  }).outputText, {
    Button: "button", Text: "text", View: "view",
    React: { createElement: (type: string, props: Record<string, unknown>, ...children: unknown[]) => ({ type, props, children }) },
  }) as (props: Record<string, unknown>) => Element;
  return component({ id: "reminder", label: "提醒", checked, disabled, onChange: (next: boolean) => changes.push(next) });
}

test("a setting is one controlled full-row action with an explicit accessible state", () => {
  const changes: boolean[] = [];
  const off = render(false, false, changes);
  assert.equal(off.type, "button");
  assert.match(String(off.props.ariaLabel), /已关闭.*开启/);
  (off.props.onClick as () => void)();
  assert.deepEqual(changes, [true]);
  assert.equal(off.props["aria-pressed"], undefined, "compile mode must not emit Taro's invalid NaN pressed state");
  const on = render(true, false, changes);
  (on.props.onClick as () => void)();
  assert.deepEqual(changes, [true, false]);
  assert.match(String(on.props.ariaLabel), /已开启.*关闭/);
});

test("disabled settings cannot request a mutation even if activation is delivered", () => {
  const changes: boolean[] = [];
  const field = render(true, true, changes);
  (field.props.onClick as () => void)();
  assert.deepEqual(changes, []);
  assert.equal(field.props.disabled, true);
});
