import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { projectAdoptedSkyCatalog } from "./sky-report-catalog";
import { TEST_API_BASE, transportHarness } from "./api-request-test-support";
import { responseCacheKey } from "./cache-policy";
import { isCelestialObjectReference } from "@starward/miniapp-contracts";

const source = ts.createSourceFile("api-client.ts", readFileSync(new URL("./api-client.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
const declaration = source.statements.find((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === "getSkyReport")!;
function facade(h: ReturnType<typeof transportHarness>, project = projectAdoptedSkyCatalog) {
  return vm.runInNewContext(ts.transpileModule(declaration.getText(source).replace(/^export /u, "") + "\ngetSkyReport;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    projectAdoptedSkyCatalog: project,
    requestOperation: () => h.request("scene", "/scene"),
  }) as (spot: string, context: string) => Promise<any>;
}
function skyEnvelope(h: ReturnType<typeof transportHarness>, legacy = true) {
  const source = { id: "catalog:stars", kind: "OPEN_DATA" };
  const ref = legacy ? "HIP:32349" : "HR:2491";
  return { ...h.response, sources: [source, { id: "weather", kind: "PROVIDER" }],
    data: { sources: [source], targetFrames: [{ at: "2026-09-15T12:00:00.000Z", targets: ["jupiter"] }],
      hourly: [{ at: "2026-09-15T12:00:00.000Z", totalCloudPct: 20 }],
      skyScene: { format: "stellar-scene-v2", state: "AVAILABLE", unavailableReason: null, observer: {latitude:0,longitude:0,elevationM:0}, catalog: { catalogVersion: legacy ? "hipparcos-bright-stars.v1" : "bsc5p-bright-stars.v1", sources: [source], catalogHash: "a".repeat(64), rowCount: 1630, magnitudeLimit: 5, ...(legacy ? { entries: [{ sourceId: ref, objectRef: ref }] } : {}) },
        frames: [{ at: "2026-09-15T12:00:00.000Z", state: "AVAILABLE", ...(legacy ? { points: [[0, 30, 20]] } : { geometry: { format: "bsc5p-stellar-geometry-v1", referenceAt: "2000-01-01T12:00:00.000Z", catalogVersion: "bsc5p-bright-stars.v1", catalogHash: "a".repeat(64), at: "2026-09-15T12:00:00.000Z", observer: {latitude:0,longitude:0,elevationM:0}, julianYears:(Date.parse("2026-09-15T12:00:00.000Z")-Date.parse("2000-01-01T12:00:00Z"))/(365.25*86400000), equatorialToEnu:[1,0,0,0,1,0,0,0,1] } }) }],
        deepSky: { state: "AVAILABLE", catalog: { entries: [{ objectRef: "M:31" }] } } } } };
}

test("upgraded client rejects retired star cache after restart on offline and 304, and rejects a legacy server response", async () => {
  for (const outcome of ["offline", "200", "304"]) {
    const old = transportHarness(), data = skyEnvelope(old);
    await old.seed(data as any);
    const current = transportHarness();
    for (const [key, value] of old.storage) current.storage.set(key, structuredClone(value));
    const pending = facade(current)("spot:published", "context:unchanged");
    if (outcome === "offline") current.calls.at(-1)!.fail({ errMsg: "offline" });
    else current.calls.at(-1)!.success({ statusCode: Number(outcome), data: outcome === "200" ? data : undefined });
    const result = await pending;
    assert.equal(result.data.skyScene.state, "UNAVAILABLE");
    assert.equal(result.data.skyScene.catalog, null);
    assert.equal(result.data.skyScene.frames[0].geometry, null);
    assert.equal(result.dataState, outcome === "offline" ? "STALE_USABLE" : "PARTIAL");
    assert.deepEqual(result.data.hourly, data.data.hourly);
    assert.deepEqual(result.data.targetFrames, data.data.targetFrames);
    assert.deepEqual(result.data.skyScene.deepSky, data.data.skyScene.deepSky);
    assert.equal(result.sources.some((item: any) => item.id === "catalog:stars"), false);
    assert.ok(result.warnings.some((message: string) => message.includes("联网后刷新")));
    // Retired bytes cannot leak via an untouched cached object after projection.
    assert.equal((current.responseCache.get(responseCacheKey("scene", TEST_API_BASE, "/scene") + ":anonymous")?.envelope.data as any).skyScene.catalog.entries[0].objectRef, "HIP:32349");
    old.queryClient.clear(); current.queryClient.clear();
  }
});

test("HTTP 503 remains a failure and cannot return the retired catalog", async () => {
  const h = transportHarness(); await h.seed(skyEnvelope(h) as any);
  const pending = facade(h)("spot:published", "context:unchanged");
  h.calls.at(-1)!.success({ statusCode: 503, data: undefined });
  await assert.rejects(pending, /bff_http_503/);
  h.queryClient.clear();
});

test("network recovery returns selectable HR stars and retains their provenance", async () => {
  const h = transportHarness(), call = facade(h);
  const fresh = skyEnvelope(h, false);
  const pending = call("spot:published", "context:unchanged");
  h.calls.at(-1)!.success({ statusCode: 200, data: fresh });
  const result = await pending;
  assert.equal(result.data.skyScene.state, "AVAILABLE");
  assert.equal(result.data.skyScene.catalog.rowCount, 1630);
  assert.equal(result.data.skyScene.frames[0].geometry.catalogHash, result.data.skyScene.catalog.catalogHash);
  assert.equal(result.sources.some((item: any) => item.id === "catalog:stars"), true);
  h.queryClient.clear();
});

test("retired-identity regression detects omission of the response projection", async () => {
  const h = transportHarness(); await h.seed(skyEnvelope(h) as any);
  const pending = facade(h, value => value)("spot:published", "context:unchanged");
  h.calls.at(-1)!.fail({ errMsg: "offline" });
  const wrong = await pending;
  assert.throws(() => assert.equal(wrong.data.skyScene.state, "UNAVAILABLE"));
  assert.equal(isCelestialObjectReference(wrong.data.skyScene.catalog.entries[0].objectRef), false);
  h.queryClient.clear();
});

test("malformed source rows retire only stars and keep independent content", () => {
 const h=transportHarness(),envelope=skyEnvelope(h,true);
 (envelope.data.skyScene.catalog as any).sources=[null];
 const result=projectAdoptedSkyCatalog(envelope as any);
 assert.equal(result.data.skyScene.state,"UNAVAILABLE");
 assert.equal(result.data.hourly,envelope.data.hourly);
 assert.equal(result.data.skyScene.deepSky,envelope.data.skyScene.deepSky);
 h.queryClient.clear();
});
