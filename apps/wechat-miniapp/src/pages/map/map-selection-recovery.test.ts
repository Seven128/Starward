import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { retryObservationScene } from "./context-restore";
import { createMapSceneTestBoundaries } from "./map-page-test-support";

function retry(selectedFailure: boolean, light = false) {
  const source = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration = "";
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "refreshMap") declaration = node.getText(source);
    ts.forEachChild(node, visit);
  };
  visit(source);assert.ok(declaration);
  const calls = { selection: 0, bootstrap: 0, scene: 0 };
  let lightReads = 0;
  const layer = createMapSceneTestBoundaries({overlay: light ? "LIGHT" : "NONE", refetchLight: async () => {
    lightReads++; return {data: {}};
  }});
  const selected = { spotId: "a", name: "A" }, context = { contextId: "ctx:lost-point", revision: 1, contextFingerprint: "old" };
  const refreshMap = vm.runInNewContext(ts.transpileModule(`const ${declaration}; refreshMap;`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    ...layer.scope,
    nativeViewport: {bounds: {west: 113.9, east: 114.1, south: 22.4, north: 22.6}, error: null},
    setAnnouncement() {}, bootstrapReplacementBlocked: false, selected,
    visibleSpotContextAttempt: selectedFailure ? { spotId: selected.spotId, pending: false, error: Error("lost origin") } : null,
    resolveSpotContext: async (spot: unknown) => { assert.equal(spot, selected);calls.selection++; },
    failedMapRegion: { current: null }, mapPointIntent: { current: 1 }, navigationEpoch: { current: 1 },
    useAppStore: { getState: () => ({ accountOwnerId: "owner", mapResetVersion: 0 }) },
    activeContext: context, mapContextFailed: false,
    scene: { error: selectedFailure ? { code: "NOT_FOUND", statusCode: 404 } : { code: "INTERNAL", statusCode: 503 },
      refetch: async () => { calls.scene++;return { dataState: "FRESH", data: {} }; } },
    bootstrapContext: { refetch: async () => { calls.bootstrap++;return { dataState: "FRESH", data: { ...context, contextId: "ctx:restored-point" } }; } },
    retryObservationScene,
  }) as () => Promise<void>;
  return { refreshMap, calls, get lightReads() { return lightReads; } };
}

test("Map retry resumes the failed explicit spot selection before any old-location scene", async () => {
  const map = retry(true);await map.refreshMap();
  assert.deepEqual(map.calls, { selection: 1, bootstrap: 0, scene: 0 });
  assert.equal(map.lightReads, 0);
});

test("an independent scene transport failure keeps its existing retry owner", async () => {
  const map = retry(false);await map.refreshMap();
  assert.deepEqual(map.calls, { selection: 0, bootstrap: 0, scene: 1 });
  assert.equal(map.lightReads, 0);
});

test("a global light refresh reaches both the Scene recovery and independent static owner", async () => {
  const map = retry(false, true); await map.refreshMap();
  assert.deepEqual(map.calls, {selection: 0, bootstrap: 0, scene: 1});
  assert.equal(map.lightReads, 1);
});
