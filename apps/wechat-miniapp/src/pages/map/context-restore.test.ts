import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as contextRestore from "./context-restore.ts";
import { restoreMapBootstrapContext, retryObservationScene, observationSceneNeedsContextRestore } from "./context-restore.ts";
import { canApplyContextRestore, sameContextVersion } from "../../services/observation-context-version.ts";
import type { ApiEnvelope, MapSceneData, ObservationContext } from "@starward/miniapp-contracts";

const id = (value: string) => value as ObservationContext["contextId"];
const initial = { contextId: id("a"), revision: 1, contextFingerprint: "one" };
const updated = { contextId: id("a"), revision: 2, contextFingerprint: "two" };

test("recovery cannot overwrite a newer time or another selected context", () => {
  assert.equal(canApplyContextRestore(initial, updated, initial), false);
  assert.equal(canApplyContextRestore(initial, { ...initial, contextId: id("b") }, updated), false);
  assert.equal(canApplyContextRestore(null, initial, updated), false);
  assert.equal(canApplyContextRestore(updated, updated, initial), false);
});

test("initial bootstrap, current refresh and expired-ID recovery remain available", () => {
  assert.equal(canApplyContextRestore(null, null, initial), true);
  assert.equal(canApplyContextRestore(initial, initial, updated), true);
  assert.equal(canApplyContextRestore(updated, updated, { ...initial, contextId: id("recovered") }), true);
});

test("a removed persisted formal spot returns the map to its current viewport", async () => {
  const fallback = { location: { kind: "MAP_POINT", displayName: "当前地图中心",
    wgs84: { system: "WGS84", latitude: 22.5, longitude: 114 }, source: "MAP_VIEWPORT" },
    localDate: "2026-09-15", targetProfile: "DAILY" } as const;
  const stored = { location: { kind: "FORMAL_SPOT", spotId: "spot:removed" } } as ObservationContext;
  const result = await restoreMapBootstrapContext({
    storedContext: stored, fallback,
    restore: async () => { throw Object.assign(new Error("gone"), { code: "NOT_FOUND" }); },
    resolve: async (request) => ({ data: { location: request.location } } as never),
    shouldFallback: (error) => (error as { code?: string }).code === "NOT_FOUND",
  });
  assert.equal(result.data.location.kind, "MAP_POINT");
});

test("bootstrap does not replace a formal spot on transport or permission failure", async () => {
  for (const code of ["PROVIDER_UNAVAILABLE", "PERMISSION_DENIED"]) {
    let fallbackCalls = 0;
    await assert.rejects(restoreMapBootstrapContext({
      storedContext: { location: { kind: "FORMAL_SPOT", spotId: "spot:kept" } } as ObservationContext,
      fallback: {} as never,
      restore: async () => { throw Object.assign(new Error(code), { code }); },
      resolve: async () => { fallbackCalls++; return {} as never; },
      shouldFallback: (error) => (error as { code?: string }).code === "NOT_FOUND",
    }), new RegExp(code));
    assert.equal(fallbackCalls, 0);
  }
});

const envelope = <Data>(data: Data, dataState = "FRESH") => ({ data, dataState } as ApiEnvelope<Data>);
const sceneResult = envelope({ spots: [{ spotId: "spot:kept" }] } as unknown as MapSceneData);

test("a retired writable Context is rebuilt from its confirmed snapshot instead of reading its late server time", async () => {
  const confirmed = { ...initial, location: { kind: "FORMAL_SPOT", spotId: "spot:a" }, localDate: "2026-10-07",
    selectedAtUtc: "2026-10-07T16:00:00Z" } as ObservationContext;
  const late = { ...confirmed, revision: confirmed.revision + 1, localDate: "2026-10-08", selectedAtUtc: "2026-10-08T16:00:00Z" };
  const fresh = { ...confirmed, contextId: id("fresh-a") };
  const calls: string[] = [];
  const input = { storedContext: confirmed, retiredContextId: confirmed.contextId, fallback: {} as never,
    restore: async () => { calls.push("old-id-read");return envelope(late); },
    replaceRetired: async (snapshot: ObservationContext) => { calls.push("fresh-id-resolve");assert.equal(snapshot, confirmed);return envelope(fresh); },
    resolve: async () => { throw Error("must retain the formal snapshot rather than defaulting to the viewport"); },
    shouldFallback: () => false,
  };
  const result = await restoreMapBootstrapContext(input);
  assert.equal(result.data.contextId, fresh.contextId);
  assert.equal(result.data.selectedAtUtc, confirmed.selectedAtUtc);
  assert.deepEqual(calls, ["fresh-id-resolve"]);
});

test("a map or search retry restores an expired cached Context before loading its scene", async () => {
  for (const sceneFailure of [{ statusCode: 404, code: "NOT_FOUND" }, { statusCode: 410, code: "STALE_REJECTED" }]) {
    const calls: string[] = [];
    const original = { ...initial, location: { kind: "FORMAL_SPOT", spotId: "spot:kept" }, selectedAtUtc: "2026-10-07T13:00:00Z" } as ObservationContext;
    const recovered = { ...original, contextId: id("recovered") };
    const result = await retryObservationScene({ context: original, retryContext: false, retryScene: true,
      sceneFailure, current: () => true,
      refreshContext: async () => { calls.push("restore"); return envelope(recovered); },
      refreshScene: async () => { calls.push("expired-scene"); throw Error("old Context still missing"); },
    });
    assert.deepEqual(calls, ["restore"]);
    assert.equal(result.contextChanged, true);
    assert.equal(result.result?.data, recovered);
    assert.equal(recovered.location, original.location);
    assert.equal(recovered.selectedAtUtc, original.selectedAtUtc);
  }
});

test("ordinary scene failures and permissions do not recreate the upstream Context", async () => {
  for (const sceneFailure of [{ statusCode: 503, code: "PROVIDER_UNAVAILABLE" }, { statusCode: 403, code: "PERMISSION_DENIED" }, { statusCode: 401, code: "LOGIN_REQUIRED" }, { statusCode: 404, code: "PROVIDER_UNAVAILABLE" }]) {
    assert.equal(observationSceneNeedsContextRestore(sceneFailure), false);
    const result = await retryObservationScene({ context: initial as ObservationContext, retryContext: false, retryScene: true,
      sceneFailure, current: () => true,
      refreshContext: async () => { throw Error("must preserve current identity"); },
      refreshScene: async () => sceneResult,
    });
    assert.equal(result.result, sceneResult);
  }
});

test("failed or stale Context restoration never retries an expired scene", async () => {
  for (const restored of [undefined, envelope(initial as ObservationContext, "STALE_USABLE")]) {
    const result = await retryObservationScene({ context: initial as ObservationContext, retryContext: true, retryScene: true,
      sceneFailure: null, current: () => true, refreshContext: async () => restored,
      refreshScene: async () => { throw Error("expired scene must not be requested"); },
    });
    assert.equal(result.result, null);
  }
});

test("unchanged revalidated Context can refresh its scene, changed revision cannot refresh the old render", async () => {
  for (const context of [initial, updated]) {
    let sceneCalls = 0;
    const result = await retryObservationScene({ context: initial as ObservationContext, retryContext: true, retryScene: true,
      sceneFailure: null, current: () => true, refreshContext: async () => envelope(context as ObservationContext),
      refreshScene: async () => { sceneCalls++; return sceneResult; },
    });
    assert.equal(sceneCalls, context === initial ? 1 : 0);
    assert.equal(result.contextChanged, context !== initial);
  }
});

test("leaving or replacing the retry scope while restoration waits cannot request the old scene", async () => {
  let current = true;
  let settle!: (value: ApiEnvelope<ObservationContext>) => void;
  const pending = retryObservationScene({ context: initial as ObservationContext, retryContext: true, retryScene: true,
    sceneFailure: null, current: () => current,
    refreshContext: () => new Promise(resolve => { settle = resolve; }),
    refreshScene: async () => { throw Error("retired request must not launch"); },
  });
  current = false;
  settle(envelope(initial as ObservationContext));
  assert.equal((await pending).result, null);
});


test("a pending formal selection keeps its confirmed time through bootstrap and spot resolution", async () => {
  const source = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let restoration = "", resolution = "", active = "";
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.expression.getText(source) === "useEffect" && node.arguments[0]?.getText(source).includes("canApplyContextRestore") && node.arguments[0].getText(source).includes("bootstrapContext.data")) restoration = node.arguments[0].getText(source);
    if (ts.isVariableStatement(node)) {
      for (const item of node.declarationList.declarations) {
        if (item.name.getText(source) === "resolveSpotContext") resolution = node.getText(source);
        if (["bootstrapReference", "restoredContext", "activeContext"].includes(item.name.getText(source))) active += node.getText(source) + "\n";
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);assert.ok(restoration && resolution && active);
  const confirmed = { ...initial, location: { kind: "FORMAL_SPOT", spotId: "spot:a" }, localDate: "2026-10-07", selectedAtUtc: "2026-10-07T16:00:00Z", eventInstanceId: null, targetProfile: "DAILY", routeOrigin: null };
  const late = { ...confirmed, revision: 2, localDate: "2026-10-08", selectedAtUtc: "2026-10-08T16:00:00Z" };
  const state = { selectedSpotId: "spot:b", observationContext: confirmed, mapResetVersion: 1, retireObservationContextEdit() {} };
  const installed: unknown[] = [], requests: any[] = [], mapPointIntent = { current: 0 };
  const scope = {
    bootstrapContext: { data: { data: late } }, observationContext: confirmed, selectedSpotId: "spot:b", pageVisible: true, mapResetVersion: 1,
    retiredObservationContextId: null, bootstrapReplacementBlocked: false,
    lastHandledSelectedId: { current: "spot:b" },
    useAppStore: { getState: () => state }, canApplyContextRestore, sameContextVersion, spotSelectionAllowsContextRestore: contextRestore.spotSelectionAllowsContextRestore,
    setObservationContext(value: any) { state.observationContext = value; installed.push(value); }, selectSpot() {}, setSelectedFallback() {}, setSelectedProposal() {}, setBottomPresentation() {}, notify() {},
    mapPointIntent, invalidateMapPointIntent: () => ++mapPointIntent.current, detailRequestGeneration: { current: 0 },
    setSpotContextAttempt() {}, dismissMapRegionFailure() {}, setAnnouncement() {}, localDateForNow: () => "unexpected", isMiniappRequestCancelled: () => false,
    restoreObservationContext: async (input: any) => { assert.equal(input, confirmed); return { data: late }; },
    resolveObservationContext: async (input: any) => { requests.push(input); return { data: { ...confirmed, contextId: "ctx:b", location: { kind: "FORMAL_SPOT", spotId: "spot:b" } } }; },
  };
  const compile = (text: string) => ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  const presented = vm.runInNewContext(compile(active + "\nactiveContext;"), scope);
  assert.equal(presented.selectedAtUtc, confirmed.selectedAtUtc, "a rejected old Context cannot drive the active scene/time");
  vm.runInNewContext(compile(`(${restoration})();`), scope);assert.equal(installed.length, 0, "bootstrap must not install the old place's later edit");
  const resolve = vm.runInNewContext(compile(resolution + "\nresolveSpotContext;"), scope);
  await resolve({ spotId: "spot:b", name: "新地点", timezone: "Asia/Shanghai" });
  assert.equal(requests.length, 1);assert.equal(requests[0].localDate, confirmed.localDate);assert.equal(requests[0].selectedAt, confirmed.selectedAtUtc);assert.equal(state.observationContext.location.spotId, "spot:b");
});


test("spot selection permits initial, unselected and same-place recovery including publication and removal", () => {
  const allows = contextRestore.spotSelectionAllowsContextRestore;
  const selected = "spot:a" as import("@starward/miniapp-contracts").SpotId;
  const formal = { location: { kind: "FORMAL_SPOT", spotId: selected } } as ObservationContext;
  const mapPoint = { location: { kind: "MAP_POINT" } } as ObservationContext;
  const pending = { location: { kind: "PENDING_PROPOSAL" } } as ObservationContext;
  assert.equal(allows(null, selected), true);
  for (const expected of [formal, mapPoint, pending]) assert.equal(allows(expected, null), true);
  assert.equal(allows(formal, selected), true); // Restore may yield a renewed ID or a removed-point MAP_POINT.
  assert.equal(allows(formal, "spot:b" as typeof selected), false);
  assert.equal(allows(mapPoint, selected), false);
  assert.equal(allows(pending, selected), false);
});

test("explicit spot resolution owns the shared POST while cold recovery can supply a safe scene reference", () => {
  const source = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = new Set(["bootstrapReplacementBlocked", "bootstrapPointIntent", "bootstrapContext", "bootstrapReference", "restoredContext", "activeContext"]);
  const statements: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isVariableStatement(node) && node.declarationList.declarations.some(item => names.has(item.name.getText(source)))) statements.push(node.getText(source));
    ts.forEachChild(node, visit);
  };visit(source);assert.equal(statements.length, names.size);
  const confirmed = { ...initial, location: { kind: "FORMAL_SPOT", spotId: "spot:a" }, selectedAtUtc: "2026-10-07T16:00:00Z" };
  const fresh = { ...confirmed, contextId: "fresh-a" };
  for (const scenario of ["pending-b", "failed-a", "cold-a", "cold-b", "return-a", "closed", "rebound-a"]) {
    const attempt = scenario === "rebound-a" ? { spotId: "spot:a", pending: true } : scenario.startsWith("pending") ? { spotId: "spot:b", pending: true } : scenario.startsWith("failed") ? { spotId: "spot:a", pending: false, error: Error("failed") }
      : scenario === "return-a" ? { spotId: "spot:b", pending: false, error: Error("old failure") } : null;
    let options: any;
    const result = vm.runInNewContext(ts.transpileModule(statements.join("\n") + "\n({bootstrapReplacementBlocked, activeContext});",
      { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
      mapPointIntent: { current: 0 }, lastHandledSelectedId: { current: scenario === "rebound-a" ? "spot:a" : null },
      lastHandledSpotOpenVersion: { current: 1 }, spotOpenRequestVersion: scenario === "rebound-a" ? 2 : 1,
      observationContext: confirmed, retiredObservationContextId: confirmed.contextId,
      selectedSpotId: scenario === "closed" ? null : scenario.endsWith("b") ? "spot:b" : "spot:a", spotContextAttempt: attempt,
      accountOwnerId: "user:test", mapResetVersion: 1, viewport: { center: { latitude: 22, longitude: 114 } }, pageVisible: true,
      spotSelectionAllowsContextRestore: contextRestore.spotSelectionAllowsContextRestore,
      sameContextVersion, useAppStore: { getState: () => ({ selectedSpotId: scenario === "closed" ? null : scenario.endsWith("b") ? "spot:b" : "spot:a", mapResetVersion: 1, spotOpenRequestVersion: scenario === "rebound-a" ? 2 : 1, observationContext: confirmed }) },
      useResourceQuery: (value: any) => { options = value;return { data: { data: fresh } }; },
    });
    const blocked = Boolean(attempt && scenario !== "return-a" && scenario !== "rebound-a");
    assert.equal(result.bootstrapReplacementBlocked, blocked, scenario);
    assert.equal(options.enabled, !blocked, scenario);
    if (blocked) assert.throws(() => options.queryFn(), /context_selection_resolution_pending/u, "manual refetch cannot cancel the selected POST");
    else assert.equal(result.activeContext.contextId, fresh.contextId, "cold mismatched selection can load its summary using a safe confirmed-time reference");
  }
});

test("a cold non-retired selection uses a rebuilt bootstrap reference to obtain its actual spot summary", () => {
  const source = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = new Set(["bootstrapReference", "restoredContext", "activeContext", "scene", "spots", "selectedFromScene", "selected"]);
  const statements: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isVariableStatement(node) && node.declarationList.declarations.some(d => names.has(d.name.getText(source)))) statements.push(node.getText(source));
    ts.forEachChild(node, visit);
  };visit(source);assert.equal(statements.length, names.size);
  const confirmed = { ...initial, location: { kind: "MAP_POINT" }, selectedAtUtc: "2026-10-07T16:00:00Z" };
  const recovered = { ...confirmed, contextId: id("ctx:recovered-point"), selectedAtUtc: "2026-10-07T16:00:00.000Z" };
  for (const fresh of [recovered, { ...recovered, contextId: id("ctx:late-point"), selectedAtUtc: "2026-10-08T16:00:00Z" }]) {
  let sceneOptions: any;
  const result = vm.runInNewContext(ts.transpileModule(statements.join("\n") + "\n({activeContext, selected});",
    { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    observationContext: confirmed, selectedSpotId: "spot:b", selectedFallback: null,
    bootstrapContext: { data: { data: fresh } }, retiredObservationContextId: null, bootstrapReplacementBlocked: false,
    lastHandledSelectedId: { current: null },
    spotSelectionAllowsContextRestore: contextRestore.spotSelectionAllowsContextRestore,
    accountOwnerId: "user:test", pageVisible: true, preferences: {}, committedFilters: {}, debouncedFinderQuery: "",
    analysisOverlay: "TOTAL_CLOUD", viewport: { center: { latitude: 22.5, longitude: 114 }, zoom: 12 },
    useMapForecastQuery: (options: any) => {
      sceneOptions = options;
      return options.enabled && options.queryKey[2] === recovered.contextId
        ? { data: envelope({ spots: [{ spotId: "spot:b" }] }) } : {};
    },
  });
  assert.equal(result.activeContext.contextId, fresh === recovered ? recovered.contextId : confirmed.contextId,
    "only a rebuilt reference with the confirmed clock can drive the cold scene");
  assert.equal(sceneOptions.enabled, true);
  assert.equal(result.selected?.spotId ?? null, fresh === recovered ? "spot:b" : null,
    "the cold selection obtains its summary only from the safe recovered scene");
  }
});

test("an intermediate bootstrap render cannot dispatch after explicit selection takes ownership", () => {
  const source = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = new Set(["bootstrapReplacementBlocked", "bootstrapPointIntent", "bootstrapContext"]), statements: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isVariableStatement(node) && node.declarationList.declarations.some(item => names.has(item.name.getText(source)))) statements.push(node.getText(source));
    ts.forEachChild(node, visit);
  };visit(source);
  const pointIntent = { current: 0 }, confirmed = { ...initial, location: { kind: "FORMAL_SPOT", spotId: "spot:a" } };
  let options: any, replacements = 0;
  vm.runInNewContext(ts.transpileModule(statements.join("\n"), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    mapPointIntent: pointIntent, lastHandledSelectedId: { current: null }, lastHandledSpotOpenVersion: { current: 0 }, spotOpenRequestVersion: 0,
    observationContext: confirmed, retiredObservationContextId: confirmed.contextId,
    selectedSpotId: "spot:b", spotContextAttempt: null, accountOwnerId: "user:test", mapResetVersion: 1,
    viewport: { center: { latitude: 22, longitude: 114 } }, pageVisible: true, sameContextVersion,
    useAppStore: { getState: () => ({ selectedSpotId: "spot:b", mapResetVersion: 1, observationContext: confirmed }) },
    useResourceQuery: (value: any) => { options = value;return {}; },
    gcj02ToWgs84: (value: any) => value, currentTimezoneHint: () => "Asia/Shanghai", localDateForNow: () => "2026-10-07",
    restoreMapBootstrapContext: () => { replacements++;return {}; }, replaceRetiredObservationContext() {},
    restoreObservationContext() {}, resolveObservationContext() {},
  });
  assert.equal(options.enabled, true, "selection has committed before local attempt state is rendered");
  pointIntent.current++;
  assert.throws(() => options.queryFn(), /context_selection_resolution_pending/u);
  assert.equal(replacements, 0, "bootstrap must not cancel the explicit replacement POST");
});

test("a non-retired intermediate render reads the synchronous explicit owner before local attempt arrives", () => {
  const source = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = new Set(["bootstrapReplacementBlocked", "bootstrapPointIntent", "bootstrapContext"]), statements: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isVariableStatement(node) && node.declarationList.declarations.some(item => names.has(item.name.getText(source)))) statements.push(node.getText(source));
    ts.forEachChild(node, visit);
  };visit(source);
  const confirmed = { ...initial, location: { kind: "FORMAL_SPOT", spotId: "spot:a" } };
  let options: any, replacements = 0;
  vm.runInNewContext(ts.transpileModule(statements.join("\n"), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    mapPointIntent: { current: 1 }, lastHandledSelectedId: { current: "spot:b" }, lastHandledSpotOpenVersion: { current: 0 }, spotOpenRequestVersion: 0,
    observationContext: confirmed, retiredObservationContextId: null,
    selectedSpotId: "spot:b", spotContextAttempt: null, accountOwnerId: "user:test", mapResetVersion: 1,
    viewport: { center: { latitude: 22, longitude: 114 } }, pageVisible: true, sameContextVersion,
    spotSelectionAllowsContextRestore: contextRestore.spotSelectionAllowsContextRestore,
    useAppStore: { getState: () => ({ selectedSpotId: "spot:b", retiredObservationContextId: null, spotOpenRequestVersion: 0, mapResetVersion: 1, observationContext: confirmed }) },
    useResourceQuery: (value: any) => { options = value;return {}; },
    gcj02ToWgs84: (value: any) => value, currentTimezoneHint: () => "Asia/Shanghai", localDateForNow: () => "2026-10-07",
    restoreMapBootstrapContext: () => { replacements++;return {}; }, replaceRetiredObservationContext() {},
    restoreObservationContext() {}, resolveObservationContext() {},
  });
  assert.equal(options.enabled, false, "a claimed selection must not create an artificial bootstrap error");
  assert.throws(() => options.queryFn(), /context_selection_resolution_pending/u);
  assert.equal(replacements, 0);
});

test("retired selection retains cached formal markers without requesting its unsafe Context", () => {
  const source = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = new Set(["scene", "spots"]), statements: string[] = [];
  const visit = (node: ts.Node) => { if (ts.isVariableStatement(node) && node.declarationList.declarations.some(d => names.has(d.name.getText(source)))) statements.push(node.getText(source));ts.forEachChild(node, visit); };
  visit(source);assert.equal(statements.length, names.size);
  const confirmed = { ...initial, location: { kind: "FORMAL_SPOT", spotId: "spot:a" } };
  const cached = { data: { spots: [{ spotId: "spot:a" }, { spotId: "spot:b" }] } };let options: any, requests = 0;
  const result = vm.runInNewContext(ts.transpileModule(statements.join("\n") + "\nspots;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    activeContext: null, observationContext: confirmed, accountOwnerId: "user:test", committedFilters: {}, debouncedFinderQuery: "隔离测试",
    viewport: { center: { latitude: 22, longitude: 114 }, zoom: 12 }, preferences: {}, analysisOverlay: "TOTAL_CLOUD", pageVisible: true,
    useMapForecastQuery: (value: any) => { options = value;assert.equal(value.queryKey[2], confirmed.contextId);return { data: cached }; },
    getMapScene: () => { requests++;throw Error("unsafe old request"); },
  });
  assert.equal(result.length, 2);assert.equal(result[0].spotId, "spot:a");assert.equal(result[1].spotId, "spot:b");
  assert.equal(options.enabled, false);assert.throws(() => options.queryFn(), /context_selection_resolution_pending/u);assert.equal(requests, 0);
});
