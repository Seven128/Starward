import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const ast = ts.createSourceFile("plan.tsx", readFileSync(new URL("./plan-editor-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function findText(predicate: (node: ts.Node) => boolean) {
  let found = "";
  const visit = (node: ts.Node) => { if (predicate(node)) found = node.getText(ast); ts.forEachChild(node, visit); };
  visit(ast); assert.ok(found); return found;
}
const compile = (text: string) => ts.transpileModule(`const run = ${text}; run;`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;

test("context restoration binds its response to the editor owner and rejects late results after account change", async () => {
  const property = findText(node => ts.isPropertyAssignment(node) && node.name.getText(ast) === "queryFn" && node.getText(ast).includes("requestingOwner"));
  const callback = property.slice(property.indexOf(":") + 1);
  for (const changed of [false, true]) {
    let owner: string | null = "a", calls = 0;
    const restore = vm.runInNewContext(compile(callback), {
      scopedDraftUserId: () => owner, planOwner: "a", planSnapshot: null, requestedSpotId: null, observationContext: { contextId: "before" },
      useAppStore: { getState: () => ({ observationContext: { contextId: "before" } }) },
      restoreObservationContext: async () => { calls++; if (changed) owner = null; return { data: { contextId: "restored" } }; },
    });
    if (changed) await assert.rejects(restore(), /账号已变化/);
    else assert.equal((await restore()).owner, "a");
    owner = null;
    await assert.rejects(restore(), /账号已变化/);
    assert.equal(calls, 1);
  }
});
test("plan context restoration remains local and never commits to the opener map", async () => {
  const property = findText(node => ts.isPropertyAssignment(node) && node.name.getText(ast) === "queryFn" && node.getText(ast).includes("requestingOwner"));
  let writes = 0;
  const mapContext = { contextId: "map-before", selectedAtUtc: "2026-09-09T12:00:00Z" };
  const restore = vm.runInNewContext(compile(property.slice(property.indexOf(":") + 1)), {
    scopedDraftUserId: () => "a", planOwner: "a", planSnapshot: null, requestedSpotId: null,
    observationContext: mapContext,
    useAppStore: { getState: () => ({ observationContext: mapContext, setObservationContext: () => { writes++; } }) },
    setObservationContext: () => { writes++; },
    restoreObservationContext: async () => ({ data: { contextId: "plan-local" } }),
  });
  const result = await restore();
  assert.equal(result.data.contextId, "plan-local");
  assert.equal(mapContext.contextId, "map-before");
  assert.equal(writes, 0);
  const commits: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && /setObservationContext$/.test(node.expression.getText(ast))) commits.push(node.getText(ast));
    ts.forEachChild(node, visit);
  };
  visit(ast);
  assert.deepEqual(commits, []);
});

test("new plan from My can resolve a local map-view context before a spot is selected", async () => {
  const enabledProperty = findText(node => ts.isPropertyAssignment(node) && node.name.getText(ast) === "enabled" && node.getText(ast).includes("newPlanRequested.current"));
  const enabledExpression = enabledProperty.slice(enabledProperty.indexOf(":") + 1);
  const enabled = (owner: string | null, newPlan: boolean, requestedPlanId: string | null) => vm.runInNewContext(
    ts.transpileModule(`Boolean(${enabledExpression});`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText,
    { pageVisible: true, scopedDraftUserId: () => owner, observationContext: null, planSnapshot: null,
      requestedSpotId: null, newPlanRequested: { current: newPlan }, requestedPlanId },
  );
  assert.equal(enabled("a", true, null), true, "new plan queries a context without a previous map selection");
  assert.equal(enabled("a", false, "plan:existing"), false, "existing plans wait for their saved snapshot");
  assert.equal(enabled(null, true, null), false, "an unresolved account must not start a private plan request");
  const property = findText(node => ts.isPropertyAssignment(node) && node.name.getText(ast) === "queryFn" && node.getText(ast).includes("requestingOwner"));
  const requests: unknown[] = [];
  const conversions: unknown[] = [];
  const restore = vm.runInNewContext(compile(property.slice(property.indexOf(":") + 1)), {
    scopedDraftUserId: () => "a", planOwner: "a", planSnapshot: null, requestedSpotId: null,
    observationContext: null, viewport: { center: { latitude: 22.5431, longitude: 114.0579 } },
    today: () => "2026-09-24", currentTimezoneHint: () => "Asia/Shanghai",
    gcj02ToWgs84: (input: unknown) => { conversions.push(input); return { lat: 22.5331, lon: 114.0479 }; },
    resolveObservationContext: async (input: unknown) => { requests.push(input); return { data: { contextId: "plan-local-map" } }; },
  });
  const result = await restore();
  assert.equal(result.data.contextId, "plan-local-map");
  assert.deepEqual(JSON.parse(JSON.stringify(conversions)), [{ lat: 22.5431, lon: 114.0579, system: "GCJ-02" }]);
  assert.deepEqual(JSON.parse(JSON.stringify(requests)), [{
    location: { kind: "MAP_POINT", displayName: "当前地图中心", wgs84: {
      system: "WGS84", latitude: 22.5331, longitude: 114.0479,
    }, source: "MAP_VIEWPORT", timezoneHint: "Asia/Shanghai" },
    localDate: "2026-09-24", targetProfile: "DAILY",
  }]);
});

test("new plan restores a retired browsing snapshot locally without reading its late server mutation", async () => {
  const property = findText(node => ts.isPropertyAssignment(node) && node.name.getText(ast) === "queryFn" && node.getText(ast).includes("requestingOwner"));
  const before = { contextId: "retired-a", localDate: "2026-10-07", selectedAtUtc: "2026-10-07T16:00:00Z", location: { kind: "FORMAL_SPOT", spotId: "spot:a" } };
  let reads = 0, replacements = 0, writes = 0;
  const restore = vm.runInNewContext(compile(property.slice(property.indexOf(":") + 1)), {
    scopedDraftUserId: () => "a", planOwner: "a", planSnapshot: null, requestedSpotId: null, observationContext: before,
    useAppStore: { getState: () => ({ retiredObservationContextId: before.contextId, setObservationContext: () => writes++ }) },
    restoreObservationContext: async () => { reads++; return { data: { ...before, localDate: "2026-10-08" } }; },
    replaceRetiredObservationContext: async (snapshot: unknown) => { replacements++; assert.equal(snapshot, before); return { data: { ...before, contextId: "fresh-a" } }; },
  });
  const result = await restore();
  assert.equal(result.data.localDate, before.localDate);
  assert.equal(result.data.selectedAtUtc, before.selectedAtUtc);
  assert.equal(result.data.contextId, "fresh-a");
  assert.equal(reads, 0);assert.equal(replacements, 1);assert.equal(writes, 0);
});

test("a new requested spot rebuilds its retired map origin before resolving the plan-local destination", async () => {
  const property = findText(node => ts.isPropertyAssignment(node) && node.name.getText(ast) === "queryFn" && node.getText(ast).includes("requestingOwner"));
  const before = { contextId: "retired-map", location: { kind: "MAP_POINT" }, localDate: "2026-10-07", selectedAtUtc: "2026-10-07T16:00:00Z" };
  const calls: any[] = [];
  const restore = vm.runInNewContext(compile(property.slice(property.indexOf(":") + 1)), {
    scopedDraftUserId: () => "a", planOwner: "a", planSnapshot: null, requestedSpotId: "spot:b", observationContext: before,
    useAppStore: { getState: () => ({ retiredObservationContextId: before.contextId }) },
    replaceRetiredObservationContext: async () => { calls.push("replace"); return { data: { ...before, contextId: "fresh-map" } }; },
    resolveObservationContext: async (input: unknown) => { calls.push(input); return { data: { contextId: "plan-b" } }; },
  });
  assert.equal((await restore()).data.contextId, "plan-b");
  assert.equal(calls[0], "replace");
  assert.equal(calls[1].routeOriginContextId, "fresh-map");
  assert.equal(calls[1].localDate, before.localDate);
});

test("a retired plan reference failure does not reread the old ID or resolve a default destination", async () => {
  const property = findText(node => ts.isPropertyAssignment(node) && node.name.getText(ast) === "queryFn" && node.getText(ast).includes("requestingOwner"));
  let oldReads = 0, destinationResolves = 0;
  const restore = vm.runInNewContext(compile(property.slice(property.indexOf(":") + 1)), {
    scopedDraftUserId: () => "a", planOwner: "a", planSnapshot: null, requestedSpotId: "spot:b",
    observationContext: { contextId: "retired", localDate: "2026-10-07", location: { kind: "MAP_POINT" } },
    useAppStore: { getState: () => ({ retiredObservationContextId: "retired" }) },
    replaceRetiredObservationContext: async () => { throw Error("reference unavailable"); },
    restoreObservationContext: async () => { oldReads++; return {}; },
    resolveObservationContext: async () => { destinationResolves++; return {}; },
  });
  await assert.rejects(restore(), /reference unavailable/);
  assert.equal(oldReads, 0);assert.equal(destinationResolves, 0);
});
