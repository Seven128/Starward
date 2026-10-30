import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { TOTAL_CLOUD_POLICY, unavailableTotalCloud, type ObservationContext, type SpotId } from "@starward/miniapp-contracts";
import * as recovery from "./observation-context-recovery";
import { totalCloudClientFixture } from "./total-cloud-test-support";
import { createSkyContextSession } from "../features/sky/sky-context-session";

const ast = ts.createSourceFile("api-client.ts", readFileSync(new URL("./api-client.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
const names = ["resolveObservationContext", "getObservationContext", "restoreObservationContext", "rebuildObservationContext", "replaceRetiredObservationContext", "updateObservationContext"];
const owner = ast.statements.filter(node => ts.isFunctionDeclaration(node) && names.includes(node.name?.text ?? "") ||
  ts.isVariableStatement(node) && node.declarationList.declarations.some(declaration => declaration.name.getText(ast) === "legacyCloudAdoption"));
assert.equal(owner.length, names.length + 1);
const code = ts.transpileModule(owner.map(node => node.getText(ast).replace(/^export /u, "")).join("\n") + `\n({${names.join(",")}});`,
  { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
class ApiError extends Error { constructor(readonly code: string, readonly statusCode = 503) { super(code); } }
class Cancelled extends Error {}

function context(): ObservationContext {
  return { schemaVersion: "observation-context-v2", contextId: "ctx:cloud" as ObservationContext["contextId"], revision: 1, contextFingerprint: "prior",
    location: { kind: "MAP_POINT", displayName: "原地图位置", wgs84: { system: "WGS84", latitude: 30, longitude: 110 }, source: "MAP_VIEWPORT" },
    routeOrigin: null, timezone: "UTC", localDate: "2026-09-20", nightStartUtc: "2026-09-20T12:00:00.000Z", nightEndUtc: "2026-09-21T12:00:00.000Z",
    selectedAtUtc: "2026-09-20T14:00:00.000Z", eventInstanceId: null, targetProfile: "DAILY",
    weatherView: { primaryPolicy: "QWEATHER", comparisonModels: [], selectedModel: null, cloudLayer: "TOTAL" },
    algorithmVersions: { astronomy: "a", opportunity: "o", tripDecision: "t", darkSky: "d", eventCatalog: "e" },
    privacyClass: "PUBLIC_REFERENCE", createdAt: "2026-09-20T00:00:00.000Z", expiresAt: "2026-09-22T00:00:00.000Z" };
}
function load(requestOperation: (...args: any[]) => Promise<any>, initial: ObservationContext | null = null) {
  const invalidations: string[] = [];
  const state = { observationContext: initial, selectedSpotId: null, mapResetVersion: 0, spotOpenRequestVersion: 0 };
  const api = vm.runInNewContext(code, { ...recovery, TOTAL_CLOUD_POLICY, requestOperation, MiniappApiError: ApiError,
    MiniappRequestCancelled: Cancelled, currentDraftUserId: () => state.observationContext?.privateProposal?.ownerId ?? null,
    useAppStore: { getState: () => state },
    idempotencyKey: () => "context", invalidateApiCache: (key: string) => invalidations.push(key) });
  return { api, invalidations, state };
}

test("actual private Sky polling cannot commit a legacy downgrade or an unversioned cloud replacement", async () => {
  const binding = totalCloudClientFixture().binding, base = context();
  const initial: ObservationContext = { ...base, schemaVersion: "observation-context-v3", privacyClass: "ACCOUNT_PRIVATE",
    location: { kind: "FORMAL_SPOT", spotId: "spot:a" as SpotId, locationVersion: 1 },
    privateProposal: { ownerId: "account:a" as NonNullable<ObservationContext["privateProposal"]>["ownerId"],
      submissionId: "contribution:a" as NonNullable<ObservationContext["privateProposal"]>["submissionId"], attemptId: "attempt:a", attemptBaseRevision: 1 },
    weatherView: { ...base.weatherView, totalCloud: binding } };
  const queryCode = ts.transpileModule(readFileSync(new URL("../features/sky/sky-context-query.ts", import.meta.url), "utf8"),
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  for (const scenario of ["erased", "changed", "malformed", "string", "fractional", "missing", "backwards", "foreign", "later"] as const) {
    const nextCloud = scenario === "erased" ? undefined : { ...binding,
      publicationId: scenario === "malformed" ? "invalid" : `ecmwf-tcc:${"c".repeat(64)}` };
    const revision = scenario === "string" ? "2" : scenario === "fractional" ? 1.5 : scenario === "missing" ? undefined
      : scenario === "backwards" ? 0 : scenario === "later" ? 2 : 1;
    const latest = { ...initial, contextId: scenario === "foreign" ? "ctx:other" : initial.contextId, revision,
      weatherView: { ...initial.weatherView, totalCloud: nextCloud } };
    const { api, state } = load(async (_key, operation) => { assert.equal(operation, "observationContextGet");
      return { dataState: "FRESH", data: latest }; }, initial);
    const exported: Record<string, any> = {}, commits: ObservationContext[] = [];
    vm.runInNewContext(queryCode, { exports: exported, require(name: string) {
      if (name === "../../services/api-client") return { ...api, MiniappApiError: ApiError };
      if (name === "../../state/app-store") return { useAppStore: { getState: () => state } };
      assert.fail(`unexpected dependency ${name}`);
    } });
    const session = createSkyContextSession(initial.contextId, () => state);
    const read = exported.getSkyPageObservationContext(session, (value: ObservationContext) => { commits.push(value); state.observationContext = value; });
    if (scenario === "later") { await read; assert.equal(commits.length, 1); assert.equal(commits[0]?.revision, 2); }
    else { await assert.rejects(read, /bff_observation_context_restore_invalid/u);
      assert.deepEqual(commits, []); assert.equal(state.observationContext, initial); }
    assert.equal(session.busy, false);
  }
});

test("central restore adopts a legacy Context through one CAS and retains its pin on later restore", async () => {
  const initial = context(), binding = totalCloudClientFixture().binding;
  let current = initial, writes = 0;
  const { api, invalidations } = load(async (_key, operation, options) => {
    if (operation === "observationContextGet") return { dataState: "FRESH", data: current };
    assert.equal(operation, "observationContextPut"); writes++;
    assert.equal(options.body.totalCloudPolicy, TOTAL_CLOUD_POLICY); assert.equal(options.body.refreshTotalCloud, true);
    assert.equal(options.body.expectedRevision, 1);
    current = { ...current, revision: 2, contextFingerprint: "adopted", weatherView: { ...current.weatherView, totalCloud: binding } };
    return { dataState: "FRESH", data: current };
  });
  const adopted = await api.restoreObservationContext(initial);
  assert.equal(adopted.data.revision, 2); assert.equal(adopted.data.weatherView.totalCloud.publicationId, binding.publicationId);
  assert.equal((await api.restoreObservationContext(initial)).data, current); assert.equal(writes, 1);
  assert.deepEqual(invalidations, ["map-scene", "spot-overview", "spot-sky"]);
  assert.equal(initial.weatherView.totalCloud, undefined, "only the confirmed returned Context may replace committed state");
});

test("an unconfigured server confirms one legacy CAS without repeated per-page revisions", async () => {
  let current = context(), writes = 0;
  const { api } = load(async (_key, operation) => {
    if (operation === "observationContextPut") { writes++; current = { ...current, revision: current.revision + 1 }; }
    return { dataState: "FRESH", data: current };
  });
  await api.restoreObservationContext(current); await api.restoreObservationContext(current); await api.restoreObservationContext(current);
  assert.equal(writes, 1); assert.equal(current.revision, 2); assert.equal(current.weatherView.totalCloud, undefined);
});

test("failed adoption keeps the original Context and cannot be acknowledged by unchanged readback", async () => {
  const initial = context(); let writes = 0;
  const { api, invalidations } = load(async (_key, operation) => {
    if (operation === "observationContextPut") { writes++; throw new ApiError("PROVIDER_UNAVAILABLE"); }
    return { dataState: "FRESH", data: initial };
  });
  await assert.rejects(api.restoreObservationContext(initial), /PROVIDER_UNAVAILABLE/u);
  assert.equal(writes, 1); assert.equal(initial.revision, 1); assert.equal(initial.weatherView.totalCloud, undefined);
  assert.deepEqual(invalidations, []);
});

test("valid GET cannot downgrade or silently change a pin, while an authoritative later CAS may advance it", async () => {
  const base = context(), binding = totalCloudClientFixture().binding;
  const initial = { ...base, weatherView: { ...base.weatherView, totalCloud: binding } };
  for (const scenario of ["erased", "same-revision-change", "malformed", "later-refresh"] as const) {
    const nextCloud = scenario === "erased" ? undefined : { ...binding,
      publicationId: scenario === "malformed" ? "bad" : `ecmwf-tcc:${"c".repeat(64)}` };
    const latest = { ...initial, revision: scenario === "later-refresh" ? 2 : 1, weatherView: { ...base.weatherView, totalCloud: nextCloud } };
    let writes = 0;
    const { api } = load(async (_key, operation) => { if (operation !== "observationContextGet") writes++;
      return { dataState: "FRESH", data: latest }; });
    if (scenario === "later-refresh") assert.equal((await api.restoreObservationContext(initial)).data, latest);
    else await assert.rejects(api.restoreObservationContext(initial), /bff_observation_context_restore_invalid/u);
    assert.equal(writes, 0);
  }
});

test("expired or schema-invalid recovery restores exact immutable cloud identity and rejects ignored or changed bindings", async () => {
  for (const initialCloud of [totalCloudClientFixture().binding, unavailableTotalCloud("READ_FAILED")]) {
    for (const result of ["same", "ignored", "changed"] as const) {
      const initial = { ...context(), weatherView: { ...context().weatherView, totalCloud: initialCloud } };
      const posts: any[] = [];
      const { api } = load(async (_key, operation, options) => {
        if (operation === "observationContextGet") throw new ApiError("STALE_REJECTED", 410);
        assert.equal(operation, "observationContextPost"); posts.push(options.body);
        const totalCloud = result === "same" ? options.body.restoreTotalCloud : result === "ignored" ? undefined
          : unavailableTotalCloud("NOT_READY");
        return { dataState: "FRESH", data: { ...initial, contextId: "ctx:restored", weatherView: { ...initial.weatherView, totalCloud } } };
      });
      if (result === "same") assert(recovery.sameObservationCloudBinding(initial, (await api.restoreObservationContext(initial)).data));
      else await assert.rejects(api.restoreObservationContext(initial), /bff_observation_context_restore_invalid/u);
      assert.equal(posts.length, 1); assert.equal(posts[0].totalCloudPolicy, TOTAL_CLOUD_POLICY);
      assert.equal(JSON.stringify(posts[0].restoreTotalCloud), JSON.stringify(recovery.observationContextRecoveryBindings(initial).restoreTotalCloud));
    }
  }
});

test("route-origin rebuild and retired replacement inherit the same cloud pin instead of selecting current twice", async () => {
  const binding = totalCloudClientFixture().binding, base = context();
  const initial = { ...base, weatherView: { ...base.weatherView, totalCloud: binding }, routeOrigin: {
    contextId: "ctx:old-origin" as ObservationContext["contextId"], displayName: "原点", wgs84: { system: "WGS84" as const, latitude: 31, longitude: 111 }, source: "USER_LOCATION" as const } };
  const posts: any[] = [];
  const { api } = load(async (_key, operation, options) => {
    assert.equal(operation, "observationContextPost"); posts.push(options.body);
    return { dataState: "FRESH", data: { ...initial, contextId: posts.length === 1 ? "ctx:new-origin" : "ctx:restored" } };
  });
  const result = await api.replaceRetiredObservationContext(initial);
  assert.equal(result.data.contextId, "ctx:restored"); assert.equal(posts.length, 2);
  for (const body of posts) assert.equal(body.restoreTotalCloud.publicationId, binding.publicationId);
  assert.equal(posts[1].routeOriginContextId, "ctx:new-origin");
});

test("precise recovery keeps the original absolute deadline for both origin and target, rejecting an older renewing server", async () => {
  for (const renew of [false, true]) {
    const base = context(), binding = totalCloudClientFixture().binding;
    const initial: ObservationContext = { ...base, privacyClass: "SESSION_PRECISE", expiresAt: "2999-09-20T16:00:00.000Z",
      weatherView: { ...base.weatherView, totalCloud: binding }, routeOrigin: {
        contextId: "ctx:precise" as ObservationContext["contextId"], displayName: "精确原点", source: "USER_LOCATION",
        wgs84: { system: "WGS84", latitude: 31, longitude: 111 } } };
    const posts: any[] = [];
    const { api } = load(async (_key, operation, options) => {
      assert.equal(operation, "observationContextPost"); posts.push(options.body);
      return { dataState: "FRESH", data: { ...initial, contextId: posts.length === 1 ? "ctx:origin-new" : "ctx:target-new",
        expiresAt: renew ? "2999-09-20T17:00:00.000Z" : options.body.restoreExpiresAt } };
    });
    if (renew) await assert.rejects(api.replaceRetiredObservationContext(initial), /bff_observation_context_restore_invalid/u);
    else assert.equal((await api.replaceRetiredObservationContext(initial)).data.expiresAt, initial.expiresAt);
    assert.equal(posts.length, renew ? 1 : 2);
    for (const body of posts) { assert.equal(body.restoreExpiresAt, initial.expiresAt);
      assert.equal(body.restoreTotalCloud.publicationId, binding.publicationId); }
  }
  const expired = { ...context(), privacyClass: "SESSION_PRECISE", expiresAt: "2000-01-01T00:00:00.000Z" };
  let posts = 0; const { api } = load(async () => { posts++; return {}; });
  await assert.rejects(api.replaceRetiredObservationContext(expired), /observation_context_expired/u);
  assert.equal(posts, 0, "expired precise permission cannot start a renewal loop");
});

test("Sky HTTP response-cache namespace excludes old total-cloud representations", async () => {
  const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "getSkyReport")!;
  let key = "";
  const getSky = vm.runInNewContext(ts.transpileModule(declaration.getText(ast).replace(/^export /u, "") + "\ngetSkyReport;",
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    requestOperation: async (group: string) => { key = group; return {}; }, projectAdoptedSkyCatalog: (value: unknown) => value,
    ADOPTED_SKY_REPORT_CATALOG_VERSION: "catalog", CURRENT_DEEP_SKY_CATALOG_VERSION: "deep",
  });
  await getSky("spot:a", "ctx:cloud"); assert.equal(key, "spot-sky:v5:total-cloud:spot:a");
});
