import { createMapPageTestBoundaries } from "./map-page-test-support";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createMapGroundOverlayCoordinator, type MapGroundOverlayTarget } from "./map-ground-overlay";
import { primaryPageNavigationForTest } from "../../navigation/primary-page-navigation-test-support";

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

test("the Map root gives My and its bottom presentations one native Back boundary", async () => {
  const source = readFileSync(new URL("./index.tsx", import.meta.url), "utf8");
  assert.equal(source.match(/<NativeBackBoundary\b/gu)?.length, 1, "Map owns one shared native Back layer");
  const tree = ts.createSourceFile("map.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let active = "", onBack = "";
  const visit = (node: ts.Node) => {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(tree) === "NativeBackBoundary") {
      const prop = node.attributes.properties.find(item => ts.isJsxAttribute(item) && item.name.getText(tree) === "active") as ts.JsxAttribute;
      active = (prop.initializer as ts.JsxExpression).expression!.getText(tree);
      const back = node.attributes.properties.find(item => ts.isJsxAttribute(item) && item.name.getText(tree) === "onBack") as ts.JsxAttribute;
      onBack = (back.initializer as ts.JsxExpression).expression!.getText(tree);
    }
    ts.forEachChild(node, visit);
  };
  visit(tree); assert.ok(active);
  for (const kind of ["none", "spot-panel", "layer-sheet", "spot-editor", "sky-entry"]) {
    for (const visible of [false, true]) {
      const owner = createMapPageTestBoundaries();
      if (!visible) owner.scope.primaryNavigation.controller.hide();
      assert.equal(vm.runInNewContext(active, {...owner.scope, pageVisible: !visible, bottomPresentation: kind,
        skyEntryPresentation: kind === "sky-entry" ? 1 : null}), visible && kind !== "none",
        `${kind}/${visible}: native foreground owns Back even while Map content visibility lags`);
      owner.scope.primaryNavigation.controller.dispose();
    }
  }
  assert.ok(onBack);
  const boundaries = createMapPageTestBoundaries();
  const controller = boundaries.scope.primaryNavigation.controller;
  const navigation = primaryPageNavigationForTest({ getCurrentPages: () => [boundaries.nativePage] });
  const detach = navigation.registerPrimaryMapHost(controller);
  let mapBack = 0, auxiliary = 0, consumed = true;
  const back = vm.runInNewContext(ts.transpileModule(`(${onBack})`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    ...boundaries.scope,
    handleMapPresentationSystemBack: async () => { mapBack++; },
    myBack: { handle: async () => { auxiliary++; return consumed; } },
    openPrimaryPage: navigation.openPrimaryPage,
  }) as () => Promise<void>;
  try {
    await back(); assert.equal(mapBack, 1);
    controller.openMy();
    assert.equal(vm.runInNewContext(active, { ...boundaries.scope, pageVisible: false }), true, "My owns Back while Map content is hidden");
    await back(); assert.equal(auxiliary, 1); assert.equal(mapBack, 1);
    assert.equal(controller.getSnapshot().route, "pages/my/index", "one Back closes the active My task before leaving My");
    consumed = false;
    await back(); assert.equal(auxiliary, 2); assert.equal(controller.getSnapshot().phase, "closing");
    const retainedPanel = { ...boundaries.scope, bottomPresentation: "spot-panel" };
    assert.equal(vm.runInNewContext(active, retainedPanel), false, "My's programmatic exit retires the native Back generation");
    await back(); assert.equal(auxiliary, 2); assert.equal(mapBack, 1, "My's exit cannot also close Map's retained panel");
    controller.finishTransition(controller.getSnapshot().transitionTicket!);
    assert.equal(vm.runInNewContext(active, { ...retainedPanel, pageVisible: false }), true,
      "returning Map owns its retained panel without waiting for a second visibility state");
    await back(); assert.equal(mapBack, 2);
    controller.hide();
    assert.equal(vm.runInNewContext(active, retainedPanel), false, "native child hide retires Back while the panel is retained");
  } finally { detach(); controller.dispose(); }
  assert.match(source, /nativeMapContent=\{/u);
  assert.doesNotMatch(source, /<PageContainer\b/u, "Map's retained presentations share the same native Back owner");
  assert.doesNotMatch(source, /map-presentation-back-\$\{/u);
});

test("terrain uses the WEAPP MapContext ground-overlay lifecycle and replaces confirmed coverage by id", async () => {
  const source = readFileSync(new URL("./index.tsx", import.meta.url), "utf8");
  const coordinator = readFileSync(new URL("./map-ground-overlay.ts", import.meta.url), "utf8");
  const installation = readFileSync(new URL("./use-map-raster-installation.ts", import.meta.url), "utf8");
  const mapElement = source.match(/<Map\b[\s\S]*?\/>/u)?.[0] ?? "";
  assert.doesNotMatch(mapElement, /\bgroundOverlays=/u, "the component prop is not a WEAPP ground-overlay API");
  assert.match(installation, /Taro\.createMapContext\(nativeMap\.mapId\)/u);
  assert.match(coordinator, /\.addGroundOverlay\(/u);
  assert.match(coordinator, /\.removeGroundOverlay\(/u);
  assert.match(source, /const terrainInstallation = useMapRasterInstallation\(/u);
  assert.match(installation, /createMapGroundOverlayCoordinator\(input\.id/u);
  assert.match(installation, /southwest:[\s\S]*?bounds\.south[\s\S]*?bounds\.west/u);
  assert.match(installation, /northeast:[\s\S]*?bounds\.north[\s\S]*?bounds\.east/u);
  const calls: { kind: string; id: number; target?: MapGroundOverlayTarget }[] = [];
  const native = createMapGroundOverlayCoordinator(120, () => ({
    addGroundOverlay(options) { calls.push({ kind: "add", id: options.id, target: options }); options.success(); },
    updateGroundOverlay(options) { calls.push({ kind: "update", id: options.id, target: options }); options.success(); },
    removeGroundOverlay(options) { calls.push({ kind: "remove", id: options.id }); options.success(); },
  }), () => undefined);
  const first = { src: "/a.png", bounds: { southwest: { latitude: 22, longitude: 113 }, northeast: { latitude: 23, longitude: 114 } }, opacity: .62, zIndex: 0 };
  const second = { ...first, src: "/b.png", bounds: { ...first.bounds, northeast: { latitude: 24, longitude: 116 } } };
  await native.apply(first); await native.apply(second);
  assert.deepEqual(calls.map(call => [call.kind, call.id]), [["add", 120], ["update", 120]]);
  assert.deepEqual(calls[1]!.target!.bounds, second.bounds);
  assert.equal(calls[1]!.target!.src, second.src);
  assert.equal(calls[1]!.target!.opacity, first.opacity); assert.equal(calls[1]!.target!.zIndex, first.zIndex);
  assert.deepEqual(await native.dispose(), { complete: true, remainingIds: [] });
});

test("the Mini Program does not opt into Taro experimental CompileMode", () => {
  const config = readFileSync(new URL("../../../config/index.ts", import.meta.url), "utf8");
  assert.doesNotMatch(config, /\bcompileMode\b/u);
  for (const file of sourceFiles(new URL("../../", import.meta.url))) {
    if (file.pathname.endsWith("map-native-compatibility.test.ts")) continue;
    assert.doesNotMatch(readFileSync(file, "utf8"), /\bcompileMode\b/u, file.pathname);
  }
});
