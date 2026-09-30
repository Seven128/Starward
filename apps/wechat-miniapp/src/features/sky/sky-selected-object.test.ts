import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { skyObjectPositionIsCurrent } from "./sky-object-location";
import { projectSkySelectionMarker } from "./sky-selection-marker";
import { createSkyViewBasis } from "./sky-view-projection";
import { SKY_OBSERVING_VERTICAL_FOV_DEG } from "./sky-zoom";

// Execute the actual component. Native composition/motion remain target checks.
const source = ts.createSourceFile("sky-selected-object.tsx",
  readFileSync(new URL("./sky-selected-object.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = source.statements.find(node => ts.isFunctionDeclaration(node) &&
  node.name?.text === "SkySelectedObject")!;
const code = ts.transpileModule(component.getText(source).replace(/^export /, "") +
  "\nSkySelectedObject(props);", { compilerOptions: { target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.React } }).outputText;
const context = { spotId: "spot:a", contextId: "context:a", contextRevision: 1,
  contextFingerprint: "fp", dataRevision: "data:a", algorithmVersion: "algo" };
const catalog = { catalogVersion: "catalog:a", catalogHash: "hash" };
const object = { reference: "HR:7557", displayName: "Altair", kind: "STAR" };
const data = { ...context, reference: object.reference, at: "2026-09-29T13:00:00Z",
  position: { ...catalog, azimuthDeg: 180, altitudeDeg: 45 }, unavailableReason: null };
const view = { basis: createSkyViewBasis(180, 135, 0)!, width: 400, height: 800,
  verticalFovDeg: 25, center: { x: 200, y: 400 } };
function render(overrides: Record<string, unknown> = {}, position: unknown = data) {
  const queries: unknown[] = [], opened: unknown[] = [];
  const props = { object, context, at: data.at, catalog, view, angularDiameterDeg: null,
    discIsItsMarker: false, landscapeCovered: () => false, reducedMotion: false,
    suspended: false, onSelect: (value: unknown) => opened.push(value), onRetrySky: () => {}, ...overrides };
  const result = vm.runInNewContext(code, {
    props, Button: "Button", Text: "Text", View: "View", SKY_OBSERVING_VERTICAL_FOV_DEG,
    React: { createElement: (tag: string, attributes: object, ...children: unknown[]) => ({ tag, attributes, children }) },
    skyObjectPositionIsCurrent, projectSkySelectionMarker,
    useCelestialPosition: (...args: unknown[]) => {
      queries.push(args); return { data: { data: position }, isPending: false, refetch: () => {} };
    },
  }) as any;
  return { result, queries, opened };
}

test("selected-object consumer uses one bound query and keeps the accessible marker when its name fades", () => {
  const close = render(), wide = render({ view: { ...view, verticalFovDeg: 90 }, reducedMotion: true });
  assert.equal(close.result.tag, "Button");
  assert.equal(close.result.attributes.ariaLabel, "Altair已选中，查看资料");
  assert(close.result.attributes.className.includes("--cross"));
  assert(wide.result.attributes.className.includes("--still"));
  assert.equal(close.result.children[1].attributes.style.opacity, 1);
  assert.equal(wide.result.children[1].attributes.style.opacity, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(close.queries)), JSON.parse(JSON.stringify(wide.queries)),
    "changing zoom/reduced motion must not create a new position request identity");
  wide.result.attributes.onClick(); assert.equal(wide.opened[0], object);
});

test("a late, foreign or missing position cannot draw a selected reticle", () => {
  for (const change of [{ contextId: "old" }, { contextRevision: 2 }, { at: "old" },
    { reference: "HR:1" }, { position: null }]) {
    const { result } = render({}, { ...data, ...change });
    assert.equal(result.attributes.className, "sky-selection-status");
  }
  assert.equal(render({ suspended: true }).result, null);
  assert.equal((render({ suspended: true }).queries[0] as unknown[])[2], false);
});

test("area consumer uses shared angular size while obscured geometry is honestly labelled", () => {
  const galaxy = { reference: "M:31", displayName: "仙女座星系", kind: "GALAXY" };
  const area = render({ object: galaxy, angularDiameterDeg: 3, landscapeCovered: () => true },
    { ...data, reference: galaxy.reference });
  assert(area.result.attributes.className.includes("--circle"));
  assert(area.result.attributes.ariaLabel.includes("模拟地景遮挡"));
  assert(parseFloat(area.result.children[0].attributes.style.width) > 24);
  assert.equal(render({ view: { ...view, verticalFovDeg: 90 } },
    { ...data, position: { ...data.position, altitudeDeg: -1 } }).result, null);
});
