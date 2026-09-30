import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { projectAdoptedSkyCatalog } from "./sky-report-catalog";
import { TEST_API_BASE, transportHarness } from "./api-request-test-support";
import { responseCacheKey } from "./cache-policy";
import { isCelestialObjectReference, SKY_PLANET_ORDER } from "@starward/miniapp-contracts";

const source = ts.createSourceFile("api-client.ts", readFileSync(new URL("./api-client.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
const declaration = source.statements.find((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === "getSkyReport")!;
function facade(h: ReturnType<typeof transportHarness>, project = projectAdoptedSkyCatalog) {
  return vm.runInNewContext(ts.transpileModule(declaration.getText(source).replace(/^export /u, "") + "\ngetSkyReport;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    ADOPTED_SKY_REPORT_CATALOG_VERSION: "bsc5p-bright-stars.v3",
    projectAdoptedSkyCatalog: project,
    requestOperation: () => h.request("scene", "/scene"),
  }) as (spot: string, context: string) => Promise<any>;
}
function skyEnvelope(h: ReturnType<typeof transportHarness>, legacy = true) {
  const source = { id: "catalog:stars", kind: "OPEN_DATA" };
  const ref = legacy ? "HIP:32349" : "HR:2491";
  return { ...h.response, sources: [source, { id: "weather", kind: "PROVIDER" }],
    data: { sources: [source], targets: [], targetFrames: [{ at: "2026-09-15T12:00:00.000Z", targets: [{ targetId: "target:jupiter", azimuthDeg: 123.256789, altitudeDeg: 36.123456 }] }],
      hourly: [{ at: "2026-09-15T12:00:00.000Z", totalCloudPct: 20, sunAzimuthDeg: 279.5, sunAltitudeDeg: -7.25, sunAngularDiameterDeg: .53,
        moonAzimuthDeg: 121.25, moonAltitudeDeg: 37.5, moonAngularDiameterDeg: .51, moonIllumination: .63,
        planets: SKY_PLANET_ORDER.map((body,index)=>({body,azimuthDeg:30+index*10,altitudeDeg:10,
          angularDiameterDeg:.001,illuminatedFraction:.9,visualMagnitude:1,
          ringTiltDeg:body==="SATURN" ? 10 : null,ringPoleEnu:body==="SATURN" ? [0,0,1] : null})) }],
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

test("old or malformed solar positions stay missing across offline, 304 and old server, then recover from exact data", async () => {
  for (const outcome of ["offline", "304", "200", "null-pair"] as const) {
    const h = transportHarness(), call = facade(h);
    const old = skyEnvelope(h, false);
    if (outcome === "null-pair") {
      (old.data.hourly[0] as any).sunAzimuthDeg = null;
      (old.data.hourly[0] as any).sunAltitudeDeg = null;
    } else delete (old.data.hourly[0] as any).sunAzimuthDeg;
    await h.seed(old as any);
    const pending = call("spot:published", "context:unchanged");
    if (outcome === "offline") h.calls.at(-1)!.fail({ errMsg: "offline" });
    else h.calls.at(-1)!.success({ statusCode: outcome === "null-pair" ? 200 : Number(outcome), data: outcome === "200" || outcome === "null-pair" ? old : undefined });
    const degraded = await pending;
    assert.deepEqual([degraded.data.hourly[0].sunAzimuthDeg, degraded.data.hourly[0].sunAltitudeDeg], [null, null]);
    assert.equal(degraded.data.offlineReady, false);
    assert.equal(degraded.dataState, outcome === "offline" ? "STALE_USABLE" : "PARTIAL");
    assert.ok(degraded.warnings.some((warning: string) => warning.includes("太阳精确位置")));
    assert.equal((h.responseCache.get(responseCacheKey("scene", TEST_API_BASE, "/scene") + ":anonymous")?.envelope.data as any).hourly[0].sunAltitudeDeg, outcome === "null-pair" ? null : -7.25,
      "presentation projection cannot rewrite the cached original");
    const fresh = skyEnvelope(h, false);
    const next = call("spot:published", "context:unchanged");
    h.calls.at(-1)!.success({ statusCode: 200, data: fresh });
    const restored = await next;
    assert.deepEqual([restored.data.hourly[0].sunAzimuthDeg, restored.data.hourly[0].sunAltitudeDeg], [279.5, -7.25]);
    h.queryClient.clear();
  }
});

test("missing solar diameter does not invent a disc or discard a still-valid twilight direction", async () => {
  for (const outcome of ["offline", "304", "200", "bad-diameter"] as const) {
    const h = transportHarness(), call = facade(h), old = skyEnvelope(h,false);
    if (outcome === "bad-diameter") (old.data.hourly[0] as any).sunAngularDiameterDeg = 2;
    else delete (old.data.hourly[0] as any).sunAngularDiameterDeg;
    await h.seed(old as any);
    const pending = call("spot:published","context:unchanged");
    if (outcome === "offline") h.calls.at(-1)!.fail({errMsg:"offline"});
    else h.calls.at(-1)!.success({statusCode:outcome === "bad-diameter" ? 200 : Number(outcome),
      data:outcome === "200" || outcome === "bad-diameter" ? old : undefined});
    const degraded = await pending;
    assert.deepEqual([degraded.data.hourly[0].sunAzimuthDeg,degraded.data.hourly[0].sunAltitudeDeg,
      degraded.data.hourly[0].sunAngularDiameterDeg],[279.5,-7.25,null]);
    assert.equal(degraded.dataState,outcome === "offline" ? "STALE_USABLE" : "PARTIAL");
    assert.ok(degraded.warnings.some((warning:string)=>warning.includes("太阳盘角直径")));
    assert.equal((h.responseCache.get(responseCacheKey("scene", TEST_API_BASE, "/scene") + ":anonymous")?.envelope.data as any).hourly[0].sunAngularDiameterDeg,
      outcome === "bad-diameter" ? 2 : undefined,"presentation must not rewrite cached bytes");
    const next=call("spot:published","context:unchanged");
    h.calls.at(-1)!.success({statusCode:200,data:skyEnvelope(h,false)});
    const restored=await next;
    assert.equal(restored.data.hourly[0].sunAngularDiameterDeg,.53);
    h.queryClient.clear();
  }
});

test("old or malformed lunar disc geometry cannot survive offline, 304 or old server recovery", async () => {
  for (const outcome of ["offline", "304", "200", "bad-diameter"] as const) {
    const h = transportHarness(), call = facade(h);
    const old = skyEnvelope(h,false);
    if (outcome === "bad-diameter") (old.data.hourly[0] as any).moonAngularDiameterDeg = 2;
    else delete (old.data.hourly[0] as any).moonAzimuthDeg;
    await h.seed(old as any);
    const pending = call("spot:published","context:unchanged");
    if (outcome === "offline") h.calls.at(-1)!.fail({errMsg:"offline"});
    else h.calls.at(-1)!.success({statusCode:outcome === "bad-diameter" ? 200 : Number(outcome),
      data:outcome === "200" || outcome === "bad-diameter" ? old : undefined});
    const degraded = await pending;
    assert.deepEqual([degraded.data.hourly[0].moonAzimuthDeg,degraded.data.hourly[0].moonAngularDiameterDeg],[null,null]);
    assert.equal(degraded.dataState,outcome === "offline" ? "STALE_USABLE" : "PARTIAL");
    assert.ok(degraded.warnings.some((warning:string)=>warning.includes("月球精确位置")));
    assert.equal((h.responseCache.get(responseCacheKey("scene", TEST_API_BASE, "/scene") + ":anonymous")?.envelope.data as any).hourly[0].moonAngularDiameterDeg,
      outcome === "bad-diameter" ? 2 : .51,"presentation must not rewrite the cached original");
    const next = call("spot:published","context:unchanged");
    h.calls.at(-1)!.success({statusCode:200,data:skyEnvelope(h,false)});
    const restored = await next;
    assert.deepEqual([restored.data.hourly[0].moonAzimuthDeg,restored.data.hourly[0].moonAngularDiameterDeg],[121.25,.51]);
    h.queryClient.clear();
  }
});

test("retired or mixed planetary rows lose their geometry on offline, 304 and server recovery", async () => {
  for (const outcome of ["offline", "304", "200", "mixed"] as const) {
    const h = transportHarness(), call = facade(h), old = skyEnvelope(h,false);
    if (outcome === "mixed") (old.data.hourly[0]!.planets as any[])[2]!.body = "JUPITER";
    else delete (old.data.hourly[0] as any).planets;
    await h.seed(old as any);
    const pending = call("spot:published","context:unchanged");
    if (outcome === "offline") h.calls.at(-1)!.fail({errMsg:"offline"});
    else h.calls.at(-1)!.success({statusCode:outcome === "mixed" ? 200 : Number(outcome),
      data:outcome === "200" || outcome === "mixed" ? old : undefined});
    const degraded = await pending;
    assert.equal(degraded.data.hourly[0].planets,null);
    assert.equal(degraded.dataState,outcome === "offline" ? "STALE_USABLE" : "PARTIAL");
    assert.ok(degraded.warnings.some((warning:string)=>warning.includes("行星精确位置")));
    assert.equal((h.responseCache.get(responseCacheKey("scene", TEST_API_BASE, "/scene") + ":anonymous")?.envelope.data as any).hourly[0].planets?.[2]?.body,
      outcome === "mixed" ? "JUPITER" : undefined,"projection cannot rewrite the cached source");
    const next = call("spot:published","context:unchanged");
    h.calls.at(-1)!.success({statusCode:200,data:skyEnvelope(h,false)});
    const restored = await next;
    assert.deepEqual(restored.data.hourly[0].planets.map((p:any)=>p.body),SKY_PLANET_ORDER);
    h.queryClient.clear();
  }
});

for (const outcome of ["200", "304", "offline"] as const) {
  test(`a null planetary record preserves independent sky content on ${outcome} and recovers from fresh data`, async () => {
    const h = transportHarness(), call = facade(h);
    try {
      const damaged = skyEnvelope(h, false);
      (damaged.data.hourly[0]!.planets as unknown[])[2] = null;
      await h.seed(damaged as any);
      const pending = call("spot:published", "context:unchanged");
      if (outcome === "offline") h.calls.at(-1)!.fail({ errMsg: "offline" });
      else h.calls.at(-1)!.success({ statusCode: Number(outcome), data: outcome === "200" ? damaged : undefined });
      const result = await pending;
      assert.equal(result.data.hourly[0].planets, null);
      const { planets: _damaged, ...independent } = damaged.data.hourly[0]!;
      const { planets: _withdrawn, ...retained } = result.data.hourly[0];
      assert.deepEqual(retained, independent, "sun, moon, time and weather remain usable");
      assert.equal(result.data.skyScene.state, "AVAILABLE");
      assert.deepEqual(result.data.skyScene, damaged.data.skyScene, "stars and independent deep-sky content remain usable");
      assert.deepEqual(result.data.targetFrames, damaged.data.targetFrames);
      assert.equal(result.dataState, outcome === "offline" ? "STALE_USABLE" : "PARTIAL");
      assert.equal(result.data.offlineReady, false);
      assert.ok(result.warnings.some((warning: string) => warning.includes("行星精确位置")));
      const cached = h.responseCache.get(responseCacheKey("scene", TEST_API_BASE, "/scene") + ":anonymous")?.envelope.data as any;
      assert.deepEqual(cached.hourly[0].planets, damaged.data.hourly[0]!.planets,
        "presentation degradation must not replace the stored response");

      const fresh = skyEnvelope(h, false);
      const recovering = call("spot:published", "context:unchanged");
      h.calls.at(-1)!.success({ statusCode: 200, data: fresh });
      const restored = await recovering;
      assert.deepEqual(restored.data.hourly[0].planets, fresh.data.hourly[0]!.planets);
      assert.equal(restored.dataState, "FRESH");
      assert.equal(restored.warnings.some((warning: string) => warning.includes("行星精确位置")), false);
    } finally { h.queryClient.clear(); }
  });
}

test("a null target frame is isolated across network/cache reads without losing valid frames", async () => {
  for (const outcome of ["200", "304", "offline"] as const) {
    const h = transportHarness(), call = facade(h);
    try {
      const damaged = skyEnvelope(h, false);
      const validFrames = [...damaged.data.targetFrames];
      (damaged.data.targetFrames as unknown[]).unshift(null);
      await h.seed(damaged as any);
      const pending = call("spot:published", "context:unchanged");
      if (outcome === "offline") h.calls.at(-1)!.fail({ errMsg: "offline" });
      else h.calls.at(-1)!.success({ statusCode: Number(outcome), data: outcome === "200" ? damaged : undefined });
      const result = await pending;
      assert.deepEqual(result.data.targetFrames, validFrames);
      assert.deepEqual(result.data.hourly, damaged.data.hourly);
      assert.equal(result.data.skyScene.state, "AVAILABLE");
      assert.deepEqual(result.data.skyScene, damaged.data.skyScene);
      assert.equal(result.dataState, outcome === "offline" ? "STALE_USABLE" : "PARTIAL");
      assert.ok(result.warnings.some((warning: string) => warning.includes("天体精确方位")));
      const cached = h.responseCache.get(responseCacheKey("scene", TEST_API_BASE, "/scene") + ":anonymous")?.envelope.data as any;
      assert.deepEqual(cached.targetFrames, damaged.data.targetFrames);
      const recovering = call("spot:published", "context:unchanged");
      h.calls.at(-1)!.success({ statusCode: 200, data: skyEnvelope(h, false) });
      const restored = await recovering;
      assert.deepEqual(restored.data.targetFrames, validFrames);
      assert.equal(restored.dataState, "FRESH");
      assert.equal(restored.warnings.some((warning: string) => warning.includes("天体精确方位")), false);
    } finally { h.queryClient.clear(); }
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

test("a mirrored optical frame is removed from network and offline projections without retiring valid stars",async()=>{
 const h=transportHarness(), at="2026-09-15T12:00:00.000Z";
 const old=skyEnvelope(h,false);
 (old.data as any).observationFrames=[{format:"eqj-enu-observer-v1",at,
   observer:{latitude:0,longitude:0,elevationM:0},equatorialToEnu:[-1,0,0,0,1,0,0,0,1]}];
 await h.seed(old as any);
 const pending=facade(h)("spot:published","context:unchanged");
 h.calls.at(-1)!.fail({errMsg:"offline"});
 const degraded=await pending;
 assert.equal(degraded.data.skyScene.state,"AVAILABLE");
 assert.equal(degraded.data.observationFrames,undefined);
 assert.ok(degraded.warnings.some((warning:string)=>warning.includes("巡天影像观测几何")));
 assert.equal((h.responseCache.get(responseCacheKey("scene", TEST_API_BASE, "/scene") + ":anonymous")?.envelope.data as any).observationFrames[0].equatorialToEnu[0],-1);
 const fresh=skyEnvelope(h,false);
 const frame={format:"eqj-enu-observer-v1",at,observer:{latitude:0,longitude:0,elevationM:0},
   equatorialToEnu:[1,0,0,0,1,0,0,0,1]};
 (fresh.data as any).observationFrames=[frame];
 const next=facade(h)("spot:published","context:unchanged");
 h.calls.at(-1)!.success({statusCode:200,data:fresh});
 assert.deepEqual((await next).data.observationFrames,[frame]);
 h.queryClient.clear();
});

test("rounded-only target caches lose geometry independently on offline, 304 and old-server reads, then recover", async () => {
  for (const outcome of ["offline", "200", "304"]) {
    const h = transportHarness(), call = facade(h);
    const prior = skyEnvelope(h, false);
    const oldTarget = { targetId: "target:jupiter", direction: "123°", altitudeDeg: 36 };
    prior.data.targets = [oldTarget] as any;
    prior.data.targetFrames[0]!.targets = [oldTarget] as any;
    await h.seed(prior as any);
    const pending = call("spot:published", "context:unchanged");
    if (outcome === "offline") h.calls.at(-1)!.fail({ errMsg: "offline" });
    else h.calls.at(-1)!.success({ statusCode: Number(outcome), data: outcome === "200" ? prior : undefined });
    const result = await pending;
    assert.equal(result.data.skyScene.state, "AVAILABLE");
    assert.deepEqual(result.data.skyScene, prior.data.skyScene);
    assert.deepEqual(result.data.hourly, prior.data.hourly);
    assert.equal(result.data.targetFrames[0].targets[0].targetId, oldTarget.targetId);
    assert.equal(result.data.targetFrames[0].targets[0].azimuthDeg, null);
    assert.equal(result.data.targetFrames[0].targets[0].altitudeDeg, null);
    assert.equal(result.data.targets[0].azimuthDeg, null);
    assert.equal(result.dataState, outcome === "offline" ? "STALE_USABLE" : "PARTIAL");
    assert.ok(result.warnings.some((message: string) => message.includes("天体精确方位")));
    assert.equal(oldTarget.altitudeDeg, 36, "projection cannot rewrite source/cache bytes");

    // A subsequent live representation, not a synthesized bearing, restores geometry.
    h.queryClient.clear();
    const fresh = skyEnvelope(h, false);
    const recovering = call("spot:published", "context:unchanged");
    h.calls.at(-1)!.success({ statusCode: 200, data: fresh });
    const recovered = await recovering;
    assert.equal(recovered.data.targetFrames[0].targets[0].azimuthDeg, 123.256789);
    assert.equal(recovered.data.targetFrames[0].targets[0].altitudeDeg, 36.123456);
    assert.equal(recovered.data.skyScene.state, "AVAILABLE");
    h.queryClient.clear();
  }
});
