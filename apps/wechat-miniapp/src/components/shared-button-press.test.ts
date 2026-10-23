import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

type Props = Record<string, any>;
function load(name: "SharedButton" | "PickerTrigger" = "SharedButton") {
  const source = readFileSync(new URL("./shared-button-press.tsx", import.meta.url), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React,
  } }).outputText;
  const exports: Partial<Record<"SharedButton" | "PickerTrigger", (props: Props) => { type: string; props: Props; children: unknown[] }>> = {};
  vm.runInNewContext(output, {
    exports,
    require: (id: string) => id === "@tarojs/components" ? { Button: "native-button", View: "native-view" } : {},
    React: { createElement: (type: string, props: Props, ...children: unknown[]) => ({ type, props, children }) },
  });
  return exports[name]!;
}

test("one native tap retains the original event and command; disabled and pending states cannot submit", () => {
  const button = load();
  const event = { detail: { x: 17, y: 22 } };
  const received: unknown[] = [];
  const onClick = (value: unknown) => received.push(value);
  for (const state of [{ disabled: true }, { loading: true }, { "aria-busy": true }, { "aria-busy": "true" }]) {
    const control = button({ ...state, onClick });
    assert.equal(control.props.disabled, true);
    assert.equal(control.props.hoverClass, "none");
    control.props.onClick(event);
  }
  assert.deepEqual(received, []);
  const control = button({ "aria-busy": "false", onClick });
  assert.equal(control.type, "native-button");
  control.props.onClick(event);
  assert.deepEqual(received, [event]);
});

test("native touch, cancellation, long-press and platform actions retain their original owner", () => {
  const button = load();
  const calls: string[] = [];
  const handlers = Object.fromEntries(["onTouchStart", "onTouchMove", "onTouchEnd", "onTouchCancel", "onLongPress", "onOpenSetting"]
    .map(name => [name, () => calls.push(name)]));
  const control = button({ ...handlers, id: "time-step", openType: "openSetting", formType: "submit",
    disabled: false, "aria-expanded": true, children: "original content" });
  for (const [name, handler] of Object.entries(handlers)) {
    assert.equal(control.props[name], handler, `${name} must not be wrapped, delayed or consumed`);
    control.props[name]();
  }
  assert.deepEqual(calls, Object.keys(handlers));
  assert.equal(control.props.id, "time-step");
  assert.equal(control.props.openType, "openSetting");
  assert.equal(control.props.formType, "submit");
  assert.equal(control.props["aria-expanded"], true);
  assert.deepEqual(control.children, ["original content"]);
});

test("a modal scrim retains its close command without a fake pressed surface", () => {
  const button = load();
  let closed = 0;
  const control = button({ pressVariant: "none", className: "modal-scrim", onClick: () => closed++ });
  assert.equal(control.props.className, "modal-scrim");
  assert.equal(control.props.hoverClass, "none");
  control.props.onClick({});
  assert.equal(closed, 1);
});

test("a native Picker face shares feedback without replacing its host, children or gesture owner", () => {
  const trigger = load("PickerTrigger"), content = { text: "original selection" };
  const onTouchMove = () => {}, style = { borderRadius: "8px" };
  const control = trigger({ disabled: false, className: "plan-field-value", children: content, onTouchMove, style,
    hoverStartTime: 80, hoverStayTime: 120 });
  assert.equal(control.type, "native-view");
  assert.equal(control.children[0], content);
  assert.equal(control.props.onTouchMove, onTouchMove);
  assert.equal(control.props.style, style);
  assert.equal(control.props.hoverClass, load()({}).props.hoverClass);
  assert.equal(control.props.hoverStartTime, 0); assert.equal(control.props.hoverStayTime, 0);
  assert.equal(control.props.disabled, undefined, "the parent Picker owns its disabled state; View has no disabled command");
  const unavailable = trigger({ disabled: true, className: "plan-field-value" });
  assert.equal(unavailable.props.hoverClass, "none");
  assert.equal(unavailable.props.className, "plan-field-value", "a disabled View cannot keep a pressed style from an earlier touch");
});
