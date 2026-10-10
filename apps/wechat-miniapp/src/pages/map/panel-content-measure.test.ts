import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { panelIdentityMinimumHeight, readPanelSnapGeometry } from "./panel-snap";

function mountMeasurement(selectedProposal: object | null, panelIdentityHeight = 0) {
  const source = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const effects: ts.CallExpression[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.expression.getText(source) === "useEffect" && node.arguments[0]?.getText(source).includes("panelIdentityMinimumHeight(")) effects.push(node);
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.equal(effects.length, 1, "exercise the actual Map native measurement effect");
  const effect = effects[0]!;
  const layouts: { identity: string; height: number }[] = [];
  const selectors: string[] = [];
  const ticks: (() => void)[] = [];
  const deliveries: ((rows: unknown[]) => void)[] = [];
  const panelSnapCache = { current: null as null | { identity: string; geometry: unknown } };
  let invalidations = 0;
  const query = { select(selector: string) { selectors.push(selector); return query; }, boundingClientRect() { return query; }, exec(callback: (rows: unknown[]) => void) { deliveries.push(callback); } };
  const environment = { panelSnapCache, bottomPresentation: "spot-panel", pageVisible: true, panelPhase: "idle", selectedProposal,
    panelIdentityHeight, panelGeometryIdentity: selectedProposal ? "proposal:owner:a" : "formal:spot:a",
    panelIdentityMinimumHeight, readPanelSnapGeometry, invalidatePanelGeometry() { invalidations++; panelSnapCache.current = null; },
    setPanelIdentityLayout(value: { identity: string; height: number }) { layouts.push({ identity: value.identity, height: value.height }); },
    panelViewportSize: () => ({ width: 390, height: 762 }), Taro: { nextTick(callback: () => void) { ticks.push(callback); }, createSelectorQuery: () => query } };
  const cleanup = vm.runInNewContext(ts.transpileModule(`(${effect.arguments[0]!.getText(source)})()`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, environment) as () => void;
  return { selectors, layouts, ticks, deliveries, panelSnapCache, cleanup, invalidations: () => invalidations,
    dependencies: effect.arguments[1]!.getText(source) };
}

const rulers = [{ height: 368 }, { height: 297 }, { height: 368 }, { height: 661 }];
const content = [{ top: 400, height: 20 }, { top: 420, height: 78 }, { height: 50 }, { top: 572, height: 66.5 }];

test("Map measures the formal route prefix and rebuilds rulers after installing its floor", () => {
  const mounted = mountMeasurement(null);
  mounted.ticks.shift()!();
  assert.equal(mounted.selectors.at(-1), ".spot-panel__block--route");
  mounted.deliveries.shift()!([...rulers, ...content]);
  assert.deepEqual(mounted.layouts, [{ identity: "formal:spot:a", height: 297 }]);
  assert.equal(mounted.invalidations(), 1);
  assert.equal(mounted.panelSnapCache.current, null, "old rulers are not cached with a new content floor");
  for (const dependency of ["spotOverviewProjection.pending", "spotOverviewProjection.error", "spotOverviewProjection.stale", "visibleSpotContextAttempt"]) {
    assert.ok(mounted.dependencies.includes(dependency), `${dependency}: prefix recovery changes require a fresh native span`);
  }
  const stable = mountMeasurement(null, 297);
  stable.ticks.shift()!(); stable.deliveries.shift()!([...rulers, ...content]);
  assert.equal(stable.panelSnapCache.current?.identity, "formal:spot:a");
  assert.deepEqual(stable.layouts, []);
});

test("private proposals retain the existing identity floor without a fabricated route", () => {
  const mounted = mountMeasurement({ submissionId: "private:a" });
  mounted.ticks.shift()!();
  assert.equal(mounted.selectors.includes(".spot-panel__block--route"), false);
  mounted.deliveries.shift()!([...rulers, ...content.slice(0, 3)]);
  assert.deepEqual(mounted.layouts, [{ identity: "proposal:owner:a", height: 156 }]);
});

test("formal measurement accepts the adopted handle over the title and reserves the full action lane", () => {
  // The handle stays in the same document, but its transparent target overlaps
  // the identity. Counting it as a separate leading row rejects this layout.
  const overlap = [{ top: 400, height: 20 }, { top: 400, height: 78 },
    { height: 68 }, { top: 552, height: 74.4 }];
  const mounted = mountMeasurement(null);
  mounted.ticks.shift()!(); mounted.deliveries.shift()!([...rulers, ...overlap]);
  assert.deepEqual(mounted.layouts, [{ identity: "formal:spot:a", height: 303 }]);
  const stable = mountMeasurement(null, 303);
  stable.ticks.shift()!(); stable.deliveries.shift()!([...rulers, ...overlap]);
  assert.equal(stable.panelSnapCache.current?.identity, "formal:spot:a");
  assert.deepEqual(stable.layouts, []);
  const scrolled = overlap.map((row, index) => index === 2 ? row : { ...row, top: row.top! - 800 });
  assert.equal(panelIdentityMinimumHeight(scrolled), 303);
});

test("invalid and retired native content cannot install a formal floor or cached anchors", () => {
  const invalid = mountMeasurement(null);
  invalid.ticks.shift()!(); invalid.deliveries.shift()!([...rulers, ...content.slice(0, 3), null]);
  assert.deepEqual(invalid.layouts, []); assert.equal(invalid.panelSnapCache.current, null);
  const retired = mountMeasurement(null);
  retired.ticks.shift()!(); retired.cleanup(); retired.deliveries.shift()!([...rulers, ...content]);
  assert.deepEqual(retired.layouts, []); assert.equal(retired.panelSnapCache.current, null);
  const hiddenBeforeTick = mountMeasurement(null);
  hiddenBeforeTick.cleanup(); hiddenBeforeTick.ticks.shift()!();
  assert.deepEqual(hiddenBeforeTick.selectors, []);
});
