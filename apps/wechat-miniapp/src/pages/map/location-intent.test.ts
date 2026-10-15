import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

function harness() {
  const source = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = new Set(["cancelLocation", "locationCandidateCurrent", "locateMap", "moveToLocation"]), declarations: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && names.has(node.name.getText(source))) declarations.push(`const ${node.getText(source)};`);
    ts.forEachChild(node, visit);
  };
  visit(source); assert.equal(declarations.length, names.size);
  const replies: Array<(value: unknown) => void> = [], viewports: unknown[] = [], contexts: unknown[] = [];
  const state = { locationState: "DEFAULT_REGION", mapResetVersion: 0, notifications: [] };
  const intent = { current: 0 }, lock = { current: null as unknown };
  const scope = { locationCandidate: null as any, busy: false, owner: null as string | null, alive: true,
    mapPointIntent: intent, locationRequestBusy: lock, Taro: {},
    invalidateMapPointIntent: () => ++intent.current,
    useAppStore: { getState: () => state }, currentDraftUserId: () => scope.owner,
    nativeMap: { isCurrent: () => scope.alive },
    setLocationState: (value: string) => { state.locationState = value; },
    setLocationBusy: (value: boolean) => { scope.busy = value; },
    setLocationCandidate: (value: unknown) => { scope.locationCandidate = value; },
    requestOneShotLocation: () => new Promise(resolve => replies.push(resolve)),
    setViewport: (value: unknown) => viewports.push(value),
    resolveMapPoint: async (...args: unknown[]) => { contexts.push(args); return {}; },
    notify() {}, setAnnouncement() {}, errorMessage: () => "unavailable",
  };
  const commands = vm.runInNewContext(ts.transpileModule(`${declarations.join("\n")}\n({locateMap,cancelLocation,moveToLocation})`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, scope);
  return { ...commands, scope, state, replies, viewports, contexts, intent, lock };
}

test("one-shot success preserves the current map until its explicit move action", async () => {
  const h = harness(), waiting = h.locateMap();
  h.replies[0]!({ state: "GRANTED", center: { latitude: 22, longitude: 114 } });
  await waiting;
  assert.equal(h.state.locationState, "GRANTED");
  assert.equal(h.viewports.length, 0); assert.equal(h.contexts.length, 0);
  await h.moveToLocation();
  assert.equal(h.viewports.length, 1); assert.equal(h.contexts.length, 1);
  assert.equal(h.scope.locationCandidate, null);
  await h.moveToLocation(); assert.equal(h.viewports.length, 1);
});

test("cancel ignores a late result and its finalizer cannot unlock a later location request", async () => {
  const h = harness(), old = h.locateMap();
  h.cancelLocation();
  assert.equal(h.state.locationState, "DEFAULT_REGION");
  const next = h.locateMap();
  h.replies[0]!({ state: "GRANTED", center: { latitude: 1, longitude: 2 } }); await old;
  assert.equal(h.scope.busy, true); assert.equal(h.scope.locationCandidate, null);
  h.replies[1]!({ state: "UNAVAILABLE" }); await next;
  assert.equal(h.scope.busy, false); assert.equal(h.state.locationState, "UNAVAILABLE");
  assert.equal(h.viewports.length, 0);
});

test("a later map intent or changed identity cannot move a previously acquired location", async () => {
  for (const change of ["map", "account", "hide"]) {
    const h = harness(), waiting = h.locateMap();
    h.replies[0]!({ state: "GRANTED", center: { latitude: 22, longitude: 114 } }); await waiting;
    if (change === "map") h.intent.current++;
    if (change === "account") h.scope.owner = "next";
    if (change === "hide") h.scope.alive = false;
    await h.moveToLocation(); assert.equal(h.viewports.length, 0, change);
  }
});
