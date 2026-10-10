import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { retryObservationScene } from "./context-restore";

function retry(selectedFailure: boolean) {
  const source = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration = "";
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "refreshMap") declaration = node.getText(source);
    ts.forEachChild(node, visit);
  };
  visit(source);assert.ok(declaration);
  const calls = { selection: 0, bootstrap: 0, scene: 0 };
  const selected = { spotId: "a", name: "A" }, context = { contextId: "ctx:lost-point", revision: 1, contextFingerprint: "old" };
  const refreshMap = vm.runInNewContext(ts.transpileModule(`const ${declaration}; refreshMap;`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
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
  return { refreshMap, calls };
}

test("Map retry resumes the failed explicit spot selection before any old-location scene", async () => {
  const map = retry(true);await map.refreshMap();
  assert.deepEqual(map.calls, { selection: 1, bootstrap: 0, scene: 0 });
});

test("an independent scene transport failure keeps its existing retry owner", async () => {
  const map = retry(false);await map.refreshMap();
  assert.deepEqual(map.calls, { selection: 0, bootstrap: 0, scene: 1 });
});
