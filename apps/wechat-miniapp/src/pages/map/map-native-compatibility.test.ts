import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

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
  assert.match(source, /active=\{pageVisible && \(eventModalOpen \|\| eventModalPresent \|\| bottomPresentation === "spot-panel" \|\| bottomPresentation === "layer-sheet" \|\| bottomPresentation === "spot-editor"\)\}/u);
  assert.match(source, /onBack=\{handleMapPresentationSystemBack\}/u);
  assert.match(source, /nativeMapContent=\{/u);
  assert.doesNotMatch(source, /<PageContainer\b/u, "the shared owner also carries Map's event modal instead of installing a second container");
  assert.doesNotMatch(source, /map-presentation-back-\$\{/u);
});

test("terrain uses the WEAPP MapContext ground-overlay lifecycle", () => {
  const source = readFileSync(new URL("./index.tsx", import.meta.url), "utf8");
  const coordinator = readFileSync(new URL("./terrain-ground-overlay.ts", import.meta.url), "utf8");
  const mapElement = source.match(/<Map\b[\s\S]*?\/>/u)?.[0] ?? "";
  assert.doesNotMatch(mapElement, /\bgroundOverlays=/u, "the component prop is not a WEAPP ground-overlay API");
  assert.match(source, /Taro\.createMapContext\(mapId\)/u);
  assert.match(coordinator, /\.addGroundOverlay\(/u);
  assert.match(coordinator, /\.updateGroundOverlay\(/u);
  assert.match(coordinator, /\.removeGroundOverlay\(/u);
  assert.match(source, /createTerrainGroundOverlayCoordinator/u);
  assert.match(source, /southwest:[\s\S]*?bounds\.south[\s\S]*?bounds\.west/u);
  assert.match(source, /northeast:[\s\S]*?bounds\.north[\s\S]*?bounds\.east/u);
});

test("the Mini Program does not opt into Taro experimental CompileMode", () => {
  const config = readFileSync(new URL("../../../config/index.ts", import.meta.url), "utf8");
  assert.doesNotMatch(config, /\bcompileMode\b/u);
  for (const file of sourceFiles(new URL("../../", import.meta.url))) {
    if (file.pathname.endsWith("map-native-compatibility.test.ts")) continue;
    assert.doesNotMatch(readFileSync(file, "utf8"), /\bcompileMode\b/u, file.pathname);
  }
});
