import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createSpotNavigationController, currentNavigationResource, currentNavigationSiteResource,
  type SpotNavigationSnapshot } from "../../navigation/spot-navigation-controller";

function snapshotReader(file: string, variable: string, bindings: Record<string, unknown>): () => SpotNavigationSnapshot {
  const ast = ts.createSourceFile(file, readFileSync(new URL(file, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let initializer: ts.Expression | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === variable && ts.isCallExpression(node.initializer!)) initializer = node.initializer.arguments[0];
    ts.forEachChild(node, visit);
  };
  visit(ast); assert.ok(initializer, `${variable} uses the production navigation owner`);
  return vm.runInNewContext(ts.transpileModule(`(${initializer.getText(ast)}).readSnapshot`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, { currentNavigationResource, currentNavigationSiteResource, ...bindings });
}
function fixture(page: "Map" | "Spot" | "Plan", override = false) {
  const context = { contextId: "ctx:a", contextFingerprint: "fingerprint:a", revision: 1 };
  const state = { mode: "DAY", accountOwnerId: "account:a" as string | null, mapResetVersion: 1, selectedSpotId: "spot:a", observationContext: { ...context }, plans: [{ planId: "plan:a", revision: 1 }] };
  const spot = { spotId: "spot:a", name: "当前公开点", address: "当前入口", visibilityPolicy: "PUBLIC_EXACT", status: "PUBLISHED",
    gcj02: { system: "GCJ02", latitude: 22.65, longitude: 114.11 }, wgs84: { system: "WGS84", latitude: 22.654, longitude: 114.106 } };
  const safety = { openness: "OPEN", legalAccess: "PERMITTED", nightSafety: "NO_KNOWN_HAZARD", explicitDanger: false, restrictions: [], guidance: [] };
  const plan = { planId: "plan:a", revision: 1, spotId: "spot:a" };
  const publication = { data: { data: { spot, accessAndSafety: safety }, dataState: "FRESH", etag: "spot:v1" }, error: null as unknown, isInvalidated: false, updatedAt: 1 };
  const site = { data: { data: { spotId: "spot:a", accessAndSafety: safety }, dataState: "PARTIAL", etag: "site:v1" }, error: null as unknown, isInvalidated: false, updatedAt: 1 };
  const scene = { data: { data: { spots: [spot] }, dataState: "PARTIAL", etag: "scene:v1" }, error: null as unknown, isInvalidated: false, updatedAt: 1 };
  const plans = { data: { data: { plans: [plan] }, dataState: "FRESH" }, error: null as unknown, isInvalidated: false, updatedAt: 1 };
  const paths = { Map: ["../../pages/map/index.tsx", "spotNavigation"], Spot: ["./spot-detail-page.tsx", "locationNavigation"], Plan: ["../../content/plan/detail/plan-editor-page.tsx", "planNavigation"] };
  let owner = "account:a";
  let currentOverride: typeof context | null = { ...context };
  const query = (value: unknown) => ({ readCurrent: () => value });
  const read = snapshotReader(paths[page][0]!, paths[page][1]!, {
    useAppStore: { getState: () => state }, currentDraftUserId: () => owner,
    spotOverview: query(publication), overview: query(publication), site: query(site),
    planQuery: query(plans), spotsQuery: query(scene), siteOverviewQuery: query(site),
    activeContext: context, observationContext: context, observationContextOverride: override ? context : undefined,
    readObservationContextOverride: () => currentOverride,
    pageVisible: true, bottomPresentation: "spot-panel", detailContextReady: true, selected: spot, selectedSpot: spot,
    spotId: spot.spotId, segment: "SITE", scope: "spot:scope", validRoute: true, navigationEpoch: { current: 0 },
    planOwner: owner, formOwner: { current: owner }, activePlanId: plan.planId, activePlan: plan, selectedSpotId: spot.spotId, editing: false,
  });
  return { read, publication, site, scene, plans, state, spot, setOwner: (value: string) => { owner = value; },
    replaceOverride: (value: typeof context | null) => { currentOverride = value; } };
}

test("all rendered consumers use the current cache publication, not retained renderer coordinates", () => {
  for (const page of ["Map", "Spot", "Plan"] as const) {
    const f = fixture(page); assert.equal(f.read().available, true, page);
    const current = { ...f.spot, address: "已更新入口", gcj02: { ...f.spot.gcj02, latitude: 23.1 } };
    if (page === "Plan") f.scene.data.data.spots = [current]; else f.publication.data.data.spot = current;
    assert.equal(f.read().spot?.gcj02.latitude, 23.1, page);
    assert.equal(f.read().spot?.address, "已更新入口", page);
    if (page === "Plan") f.site.isInvalidated = true; else f.publication.error = new Error("current refresh failed");
    assert.equal(f.read().available, false, page);
  }
});

test("context or private plan changes before the next render do not begin a mismatched native intent", () => {
  for (const page of ["Map", "Spot"] as const) {
    const f = fixture(page); f.state.observationContext.revision++;
    assert.equal(f.read().available, false, page);
    f.state.observationContext.revision--; f.state.observationContext.contextFingerprint = "different";
    assert.equal(f.read().available, false, page);
  }
  const plan = fixture("Plan"); plan.plans.data.data.plans = [{ ...plan.plans.data.data.plans[0]!, revision: 2 }];
  assert.equal(plan.read().available, false); plan.setOwner("account:b"); assert.equal(plan.read().available, false);
});

test("a late choice after synchronous publication or account reset never dispatches obsolete native coordinates", async () => {
  for (const page of ["Map", "Spot", "Plan"] as const) {
    const f = fixture(page); let accept!: (value: boolean) => void; const gate = new Promise<boolean>(resolve => { accept = resolve; });
    const effects: unknown[] = [];
    const command = createSpotNavigationController({ readSnapshot: f.read, isCurrent: () => true, confirmHandoff: () => gate,
      confirmBlocker: async () => true, chooseAction: async () => "MAP", openLocation: async target => { effects.push(target); },
      copyCoordinates: async value => { effects.push(value); }, confirmCopyFallback: async () => true,
      report: failure => { effects.push(failure); }, onAttempt() {}, onBusy() {} });
    const pending = command.openDirect(); f.state.mapResetVersion++; accept(true); await pending;
    assert.deepEqual(effects, [], page);
  }
});

test("missing site facts preserve the plan and destination while disabling external navigation only", () => {
  const f = fixture("Plan"); f.site.data.data.spotId = "spot:other";
  const snapshot = f.read(); assert.equal(snapshot.available, false); assert.equal(snapshot.safety, null);
  assert.equal(snapshot.spot?.spotId, "spot:a"); assert.equal(f.plans.data.data.plans[0]!.revision, 1);
});

test("plan-linked spot details read their own current Context rather than the unrelated browsing Context", () => {
  const f = fixture("Spot", true); f.state.observationContext.contextId = "ctx:unrelated-browse";
  assert.equal(f.read().available, true);
  f.replaceOverride({ contextId: "ctx:a", contextFingerprint: "fingerprint:a", revision: 2 });
  assert.equal(f.read().available, false, "new query Context cannot authorize the old rendered key");
  f.replaceOverride(null); assert.equal(f.read().available, false, "failed or invalidated Context remains unavailable");
});

test("a retained native session cannot authorize a private plan while the canonical account differs", () => {
  for (const owner of [null, "account:b"]) {
    const f = fixture("Plan"); f.state.accountOwnerId = owner;
    assert.equal(f.read().available, false);
  }
});
