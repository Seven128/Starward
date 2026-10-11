import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as document from "./spot-document";

type Node = { type: string | ((props: any) => Node); props: any };

function renderer() {
  const exported: Record<string, (props: any) => Node> = {};
  const jsx = (type: Node["type"], props: any) => ({ type, props });
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("./spot-document-fields.tsx", import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports: exported, require: (name: string) => {
    if (name === "react/jsx-runtime") return { jsx, jsxs: jsx, Fragment: "Fragment" };
    if (name === "@tarojs/components") return { Button: "Button", Input: "Input", Text: "Text", Textarea: "Textarea", View: "View" };
    if (name === "./spot-document") return document;
    if (name.endsWith("semantic-asset")) return { SemanticIcon: "Icon" };
    if (name.endsWith(".scss")) return {};
    throw Error(`unexpected module ${name}`);
  } });
  return exported;
}

function nodes(value: any): Node[] {
  if (value == null || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (typeof value.type === "function") return nodes(value.type(value.props));
  return [value, ...nodes(value.props?.children)];
}

test("frozen long values remain complete readable text rather than single-line inputs", () => {
  const render = renderer();
  const value = "入口台阶与路况需逐段核对。".repeat(12) + "全文末尾：靠海栏杆仍需留意。";
  const field = render.SpotDocumentField!({ fieldKey: "road", value, disabled: true, readOnly: true, onChange: () => assert.fail("read-only field changed") });
  const children = nodes(field);
  assert.equal(children.some(node => node.type === "Input"), false);
  const text = children.find(node => node.props.className === "formal-feedback-field__readonly-value");
  assert.ok(text, "a frozen road must have a wrapping text owner");
  assert.equal(text.props.children, value);
  assert.equal(text.props["aria-label"], undefined, "a label-only accessible name must not replace the full readable value");
});

test("temporary busy state keeps the input and its value for editing recovery", () => {
  const render = renderer();
  const changes: unknown[] = [];
  const field = render.SpotDocumentField!({ fieldKey: "road", value: "入口台阶", disabled: true, onChange: (...args: unknown[]) => changes.push(args) });
  const input = nodes(field).find(node => node.type === "Input");
  assert.ok(input);
  assert.equal(input.props.disabled, true);
  assert.equal(input.props.value, "入口台阶");
  assert.equal(nodes(field).some(node => node.props.className === "formal-feedback-field__readonly-value"), false);
  const editable = nodes(render.SpotDocumentField!({ fieldKey: "road", value: "入口台阶", disabled: false, onChange: (...args: unknown[]) => changes.push(args) })).find(node => node.type === "Input")!;
  editable.props.onInput({ detail: { value: "入口有台阶" } });
  assert.deepEqual(changes, [["road", "入口有台阶"]]);
});

test("empty frozen fields preserve native placeholders instead of presenting examples as submitted text", () => {
  const render = renderer();
  const values = document.emptySpotDocumentValues();
  const tree = nodes(render.SpotDocumentFields!({ values, disabled: false, readOnly: true, onChange: () => assert.fail("frozen document changed") }));
  for (const key of ["hours", "parkingNote", "detail"] as const) {
    const placeholder = document.SPOT_DOCUMENT_PLACEHOLDERS[key];
    assert.equal(tree.some(node => node.type === "Text" && node.props.children === placeholder), false,
      `${key}: a writing prompt is not submitted content`);
    const field = tree.find(node => ["Input", "Textarea"].includes(node.type as string) && node.props.placeholder === placeholder);
    assert.ok(field, `${key}: retain the existing empty-field presentation`);
    assert.equal(field.props.value, "");
    assert.equal(field.props.disabled, true);
    assert.equal(field.props.placeholderClass, "formal-feedback-placeholder");
  }
});

test("the shared frozen document preserves short values, facility choices and full multiline notes", () => {
  const render = renderer();
  const values = { ...document.emptySpotDocumentValues(), name: "星湾", parking: "有", toilet: "没有",
    parkingNote: "停车说明".repeat(20), toiletNote: "洗手间说明".repeat(20), detail: "第一段。\n" + "补充说明。".repeat(80) + "\n完整末段。" };
  const tree = nodes(render.SpotDocumentFields!({ values, disabled: true, readOnly: true, onChange: () => assert.fail("frozen document changed") }));
  for (const value of [values.name, values.parkingNote, values.toiletNote]) {
    assert.ok(tree.some(node => node.props.className === "formal-feedback-field__readonly-value" && node.props.children === value));
  }
  assert.equal(tree.some(node => node.type === "Textarea"), false);
  assert.ok(tree.some(node => node.type === "Text" && node.props.children === values.detail));
  assert.ok(tree.some(node => node.props.className?.includes("formal-feedback-textarea--readonly")));
  const choices = tree.filter(node => node.type === "Button" && node.props.ariaLabel?.startsWith("设施状态："));
  assert.equal(choices.length, 8);
  assert.ok(choices.every(node => node.props.disabled));
});
