import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const page = ts.createSourceFile("spot-sky-page.tsx", readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const actions: { name: string; expression: ts.Expression }[] = [];
function visit(node: ts.Node) {
  if (ts.isJsxElement(node) && node.openingElement.tagName.getText(page) === "Button") {
    const attrs = node.openingElement.attributes.properties;
    const locked = attrs.find(a => ts.isJsxAttribute(a) && a.name.getText(page) === "disabled");
    const click = attrs.find(a => ts.isJsxAttribute(a) && a.name.getText(page) === "onClick");
    if (locked?.getText(page).includes("alignmentEditing") && click && ts.isJsxAttribute(click) &&
      click.initializer && ts.isJsxExpression(click.initializer) && click.initializer.expression) {
      const expression = click.initializer.expression, text = expression.getText(page);
      if (/set(?:LandscapeEnabled|ConstellationsEnabled|WideFieldEnabled|CoordinateGrids)/u.test(text))
        actions.push({ name: text.includes("setCoordinateGrids") ? text.includes("horizontal:") ? "horizontal" : "equatorial"
          : text.includes("setLandscapeEnabled") ? "landscape" : text.includes("setConstellationsEnabled") ? "constellations" : "wideField", expression });
    }
  }
  ts.forEachChild(node, visit);
}
visit(page);
assert.equal(actions.length, 5);
for (const action of actions) test(`queued actual ${action.name} action preserves editing and recovers after cancel/confirm`, () => {
  let mode = "auto", writes = 0;
  const flags: Record<string, boolean> = { landscape: false, constellations: true, wideField: false };
  let grids = { horizontal: false, equatorial: false };
  const set = (key: string) => (update: (value: boolean) => boolean) => { writes++; flags[key] = update(flags[key]!); };
  const callback = vm.runInNewContext(ts.transpileModule(`(${action.expression.getText(page)})`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    orientationController: { snapshot: () => ({ alignment: { mode } }) },
    setLandscapeEnabled: set("landscape"), setConstellationsEnabled: set("constellations"), setWideFieldEnabled: set("wideField"),
    setCoordinateGrids(update: (value: typeof grids) => typeof grids) { writes++; grids = update(grids); },
  });
  const initial = JSON.stringify({ flags, grids });
  // Native callback was captured before begin(), so its render disabled value is old.
  mode = "editing"; callback(); assert.equal(writes, 0); assert.equal(JSON.stringify({ flags, grids }), initial);
  mode = "auto"; callback(); assert.equal(writes, 1); assert.notEqual(JSON.stringify({ flags, grids }), initial);
  mode = "editing"; callback(); assert.equal(writes, 1);
  mode = "aligned"; callback(); assert.equal(writes, 2); assert.equal(JSON.stringify({ flags, grids }), initial);
});
