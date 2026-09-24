import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

test("shared button forwards native disabled state and prevents disabled callbacks", () => {
  const source = readFileSync(new URL("./soft-button.tsx", import.meta.url), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React,
  } }).outputText;
  const exports: { SoftButton?: (props: unknown) => { props: { disabled: boolean; onClick(): void; ariaLabel: string }; children: unknown[] } } = {};
  vm.runInNewContext(output, {
    exports, require: () => ({ Button: "button", Text: "text" }),
    React: { createElement: (_type: unknown, props: unknown, ...children: unknown[]) => ({ props, children }) },
  });
  let calls = 0;
  for (const disabled of [true, false, true]) {
    const button = exports.SoftButton!({ label: "保存", disabled, onClick: () => { calls++; } });
    assert.equal(button.props.disabled, disabled);
    assert.equal(button.props.ariaLabel, "保存");
    button.props.onClick();
  }
  assert.equal(calls, 1);
});

test("shared button without children renders its action label visibly", () => {
  const source = readFileSync(new URL("./soft-button.tsx", import.meta.url), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React,
  } }).outputText;
  const exports: { SoftButton?: (props: unknown) => { children: Array<{ children: unknown[] }> } } = {};
  vm.runInNewContext(output, {
    exports, require: () => ({ Button: "button", Text: "text" }),
    React: { createElement: (_type: unknown, props: unknown, ...children: unknown[]) => ({ props, children }) },
  });
  const button = exports.SoftButton!({ label: "重新获取场地信息" });
  assert.equal(button.children[0]?.children[0], "重新获取场地信息");
});
