import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { createScrollSettlement } from "../../components/scroll-settlement";
import { createSkyObservationTime } from "./sky-observation-time";

const source = ts.createSourceFile("sky.tsx", readFileSync(process.env.SKY_DATE_RULER_SOURCE ??
  new URL("./spot-sky-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

function attribute(component: string, name: string) {
  const values: string[] = [];
  function visit(node: ts.Node) {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === component) {
      const prop = node.attributes.properties.filter(ts.isJsxAttribute)
        .find(prop => prop.name.getText(source) === name)?.initializer;
      assert(prop && ts.isJsxExpression(prop) && prop.expression);
      values.push(prop.expression.getText(source));
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.equal(values.length, 1);
  return values[0]!;
}

test("opening the calendar cancels the active ruler and fences its queued scroll and settlement; closing restores it", t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const committedAt = "2026-10-06T13:00:00.000Z", previewAt = "2026-10-06T13:30:00.000Z";
  const rows = [committedAt, previewAt].map(at => ({ at, opportunityBlockers: [] }));
  const time = createSkyObservationTime();
  time.bind("same-context-revision1", committedAt, { startAt: committedAt, endAt: previewAt });
  let calendarOpen = false, hookIndex = 0;
  const hooks: any[] = [], pendingEffects: Array<() => void> = [], commits: number[] = [];
  const context = vm.createContext({
    React: { createElement: (type: string, props: object, ...children: unknown[]) => ({ type, props, children: children.flat() }) },
    View: "view", Text: "text", Button: "button", ScrollView: "scroll", SoftButton: "soft",
    createScrollSettlement, createRulerScrollPosition: () => ({ move() {}, cancel() {} }),
    useDidShow() {}, useDidHide() {}, useCallback: (fn: unknown) => fn,
    useState(value: unknown) { const i = hookIndex++; if (!(i in hooks)) hooks[i] = value;
      return [hooks[i], (next: unknown) => { hooks[i] = typeof next === "function" ? next(hooks[i]) : next; }]; },
    useRef(value: unknown) { const i = hookIndex++; return hooks[i] ??= { current: value }; },
    useEffect(fn: () => (() => void) | void, deps: unknown[]) {
      const i = hookIndex++, previous = hooks[i];
      if (!previous || deps.some((value, j) => !Object.is(value, previous.deps[j]))) {
        pendingEffects.push(() => { previous?.cleanup?.(); hooks[i] = { deps, cleanup: fn() }; });
      }
    },
    clampIndex: (i: number, n: number) => Math.max(0, Math.min(i, n - 1)),
    orientationRulerStepPx: () => 44, orientationRulerDistance: () => 0,
    formatTime: (at: string) => at, orientationRulerLabel: () => "",
    alignmentEditing: false, datePickerOpen: false,
    orientationController: { snapshot: () => ({ alignment: { mode: "auto" } }) },
    setPreviewIndex: () => time.cancel(), setDatePickerOpen: (open: boolean) => { calendarOpen = open; },
  });
  const evaluate = (code: string) => vm.runInContext(ts.transpileModule(code,
    { compilerOptions: { target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React } }).outputText, context);
  const declaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "OrientationTimeRuler");
  assert(declaration);
  const component = evaluate(declaration.getText(source) + "\nOrientationTimeRuler;");
  const openDate = evaluate("(" + attribute("ObservationDateControl", "onOpenChange") + ");");
  const render = () => {
    hookIndex = 0;
    context.datePickerOpen = calendarOpen;
    const tree = component({ rows, activeIndex: time.snapshot().at === previewAt ? 1 : 0, committedIndex: 0,
      timezone: "UTC", isPreviewing: time.snapshot().at !== committedAt, saving: false,
      interactionLocked: evaluate(attribute("OrientationTimeRuler", "interactionLocked")), reducedMotion: false,
      onPreview: (index: number) => time.preview(rows[index]!.at), onCommit: (index: number) => commits.push(index),
      onCancel: () => time.cancel() });
    pendingEffects.splice(0).forEach(fn => fn());
    return { tree, scroll: tree.children.find((n: any) => n?.type === "scroll").props };
  };
  const first = render(), one = { touches: [{ identifier: 1 }] }, event = { detail: { scrollLeft: 44 } };
  first.scroll.onTouchStart(one);first.scroll.onScroll(event);first.scroll.onTouchEnd();
  assert.equal(time.snapshot().at, previewAt);
  openDate(true);
  assert.equal(time.snapshot().at, committedAt);
  const locked = render();
  assert.equal(locked.scroll.scrollX, false, "calendar consumes time interaction without claiming a save");
  assert(!JSON.stringify(locked.tree).includes("保存中"));
  // These handlers were captured before the calendar opened, matching queued
  // native events. The shared live settlement must already be cancelled.
  first.scroll.onScroll(event);first.scroll.onTouchEnd();first.scroll.onScrollEnd();
  t.mock.timers.tick(1000);
  assert.equal(time.snapshot().at, committedAt);
  assert.equal(time.snapshot().binding, "same-context-revision1");
  assert.deepEqual(commits, []);
  openDate(false);
  const restored = render();
  assert.equal(restored.scroll.scrollX, true);
  restored.scroll.onTouchStart(one);restored.scroll.onScroll(event);restored.scroll.onTouchEnd();
  assert.equal(time.snapshot().at, previewAt);
  t.mock.timers.tick(150);
  assert.deepEqual(commits, [1], "normal release commits once after the calendar closes");
});
