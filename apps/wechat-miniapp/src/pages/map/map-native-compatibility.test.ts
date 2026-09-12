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
  assert.match(source, /show=\{mapPresentationBackBoundaryVisible\}/u);
  assert.match(source, /onAfterLeave=\{handleMapPresentationSystemBack\}/u);
  assert.match(source, /setMapPresentationBackBoundaryVisible\(false\)[\s\S]*?setTimeout\([\s\S]*?setMapPresentationBackBoundaryVisible\(true\)/u);
  assert.doesNotMatch(source, /map-presentation-back-\$\{/u);
});

test("the Mini Program does not opt into Taro experimental CompileMode", () => {
  const config = readFileSync(new URL("../../../config/index.ts", import.meta.url), "utf8");
  assert.doesNotMatch(config, /\bcompileMode\b/u);
  for (const file of sourceFiles(new URL("../../", import.meta.url))) {
    if (file.pathname.endsWith("map-native-compatibility.test.ts")) continue;
    assert.doesNotMatch(readFileSync(file, "utf8"), /\bcompileMode\b/u, file.pathname);
  }
});
