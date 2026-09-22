import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

test("partial-month calendars place every selectable date under its actual weekday", () => {
  const source = readFileSync(new URL("./observation-date-control.tsx", import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports: Record<string, any> = {};
  const jsx = (type: unknown, props: unknown) => ({ type, props });
  new Function("require", "exports", code)((name: string) => name === "@tarojs/components"
    ? { Button: "button", ScrollView: "scroll-view", Text: "text", View: "view" }
    : name.includes("native-back-boundary") ? { NativeBackBoundary: "page-container" }
    : name.endsWith(".scss") ? {} : { jsx, jsxs: jsx, Fragment: "fragment" }, exports);
  const dates = ["2026-09-13", "2026-09-14", "2026-09-15", "2026-10-01", "2026-10-02"];
  const tree = exports.ObservationDateControl({ dates, selectedDate: dates[0], today: dates[1], open: true, busy: false, onOpenChange() {}, onSelect() {} });
  const grids: any[] = [];
  function visit(node: any) {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node?.props) return;
    if (node.props.className === "observation-calendar__days") grids.push(node);
    visit(node.props.children);
  }
  visit(tree);
  assert.equal(grids.length, 2);
  const columns = new Map<string, number>();
  for (const grid of grids) grid.props.children.flat(Infinity).forEach((cell: any, index: number) => {
    if (cell.props["data-date"]) columns.set(cell.props["data-date"], index % 7);
  });
  assert.deepEqual([...columns], [[dates[0], 6], [dates[1], 0], [dates[2], 1], [dates[3], 3], [dates[4], 4]]);
});
