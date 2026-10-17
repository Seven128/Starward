import { createMapPageTestBoundaries } from "./map-page-test-support";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function sourceFiles(directory: URL): URL[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = new URL(entry.name + (entry.isDirectory() ? "/" : ""), directory);
    if (entry.isDirectory()) return sourceFiles(target);
    return /\.tsx?$/u.test(entry.name) ? [target] : [];
  });
}

test("the native Map page stays outside Taro experimental local compile mode", () => {
  const source = readFileSync(new URL("./index.tsx", import.meta.url), "utf8");
  const mapElement = source.match(/<Map\b[\s\S]*?\/>/u)?.[0];

  assert.ok(mapElement, "Map page must render the native Map component");
  assert.doesNotMatch(source, /\bcompileMode\b/u);
});

test("the Map root installs a native Back boundary for its non-modal bottom presentations", () => {
  const source = readFileSync(new URL("./index.tsx", import.meta.url), "utf8");
  assert.equal(source.match(/<NativeBackBoundary\b/gu)?.length, 1, "Map owns one shared native Back layer");
  const tree = ts.createSourceFile("map.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let active = "";
  const visit = (node: ts.Node) => {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(tree) === "NativeBackBoundary") {
      const prop = node.attributes.properties.find(item => ts.isJsxAttribute(item) && item.name.getText(tree) === "active") as ts.JsxAttribute;
      active = (prop.initializer as ts.JsxExpression).expression!.getText(tree);
    }
    ts.forEachChild(node, visit);
  };
  visit(tree); assert.ok(active);
  for (const kind of ["none", "spot-panel", "layer-sheet", "spot-editor", "event-open", "event-exit", "sky-entry"]) {
    for (const visible of [false, true]) {
      assert.equal(vm.runInNewContext(active, {...createMapPageTestBoundaries().scope, pageVisible: visible, bottomPresentation: kind,
        eventModalOpen: kind === "event-open", eventModalPresent: kind === "event-exit",
        skyEntryPresentation: kind === "sky-entry" ? 1 : null}), visible && kind !== "none", `${kind}/${visible}`);
    }
  }
  assert.match(source, /onBack=\{handleMapPresentationSystemBack\}/u);
  assert.match(source, /nativeMapContent=\{/u);
  assert.doesNotMatch(source, /<PageContainer\b/u, "the shared owner also carries Map's event modal instead of installing a second container");
  assert.doesNotMatch(source, /map-presentation-back-\$\{/u);
});

test("terrain uses the WEAPP MapContext ground-overlay lifecycle", () => {
  const source = readFileSync(new URL("./index.tsx", import.meta.url), "utf8");
  const coordinator = readFileSync(new URL("./map-ground-overlay.ts", import.meta.url), "utf8");
  const installation = readFileSync(new URL("./use-map-raster-installation.ts", import.meta.url), "utf8");
  const mapElement = source.match(/<Map\b[\s\S]*?\/>/u)?.[0] ?? "";
  assert.doesNotMatch(mapElement, /\bgroundOverlays=/u, "the component prop is not a WEAPP ground-overlay API");
  assert.match(installation, /Taro\.createMapContext\(nativeMap\.mapId\)/u);
  assert.match(coordinator, /\.addGroundOverlay\(/u);
  assert.doesNotMatch(coordinator, /\.updateGroundOverlay\(/u,
    "changed bounds use a separately acknowledged add, preserving the old registered image until replacement is ready");
  assert.match(coordinator, /\.removeGroundOverlay\(/u);
  assert.match(source, /const terrainInstallation = useMapRasterInstallation\(/u);
  assert.match(installation, /createMapGroundOverlayCoordinator\(input\.id/u);
  assert.match(installation, /southwest:[\s\S]*?bounds\.south[\s\S]*?bounds\.west/u);
  assert.match(installation, /northeast:[\s\S]*?bounds\.north[\s\S]*?bounds\.east/u);
});

test("the Mini Program does not opt into Taro experimental CompileMode", () => {
  const config = readFileSync(new URL("../../../config/index.ts", import.meta.url), "utf8");
  assert.doesNotMatch(config, /\bcompileMode\b/u);
  for (const file of sourceFiles(new URL("../../", import.meta.url))) {
    if (file.pathname.endsWith("map-native-compatibility.test.ts")) continue;
    assert.doesNotMatch(readFileSync(file, "utf8"), /\bcompileMode\b/u, file.pathname);
  }
});
