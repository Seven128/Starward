import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { projectAdoptedSkyCatalog } from "./sky-report-catalog";
import { TEST_API_BASE, transportHarness } from "./api-request-test-support";
import { responseCacheKey } from "./cache-policy";
import { SKY_PLANET_ORDER } from "@starward/miniapp-contracts";
import * as reportContracts from "@starward/miniapp-contracts";

const source = ts.createSourceFile("api-client.ts", readFileSync(new URL("./api-client.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
const declaration = source.statements.find((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === "getSkyReport")!;
function facade(h: ReturnType<typeof transportHarness>) {
  return vm.runInNewContext(ts.transpileModule(declaration.getText(source).replace(/^export /u, "") + "\ngetSkyReport;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    ...reportContracts,
    ADOPTED_SKY_REPORT_CATALOG_VERSION: "bsc5p-bright-stars.v3",
    projectAdoptedSkyCatalog,
    requestOperation: () => h.request("scene", "/scene"),
  }) as (spot: string, context: string) => Promise<any>;
}
function skyEnvelope(legacy = true) {
  const source = { id: "catalog:stars", kind: "OPEN_DATA" };
  const ref = legacy ? "HIP:32349" : "HR:2491";
  return { apiVersion: "v2", generatedAt: new Date().toISOString(), requestId: "synthetic-sky-report",
    etag: "synthetic-etag", dataState: "FRESH", warnings: [] as string[], sources: [source, { id: "weather", kind: "PROVIDER" }],
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

/** Family rules use the actual projection; transport is exercised once per
 * distinct response path below. These checks never mutate the retained input. */
function projected(input: ReturnType<typeof skyEnvelope>) {
  const before = structuredClone(input);
  const result = projectAdoptedSkyCatalog(input as any);
  assert.deepEqual(input, before, "projection must preserve source/cache bytes");
  return result;
}

test("shared projection cleans retired fields after cache restart on offline, 304 and legacy server responses", async () => {
  for (const outcome of ["offline", "304", "200"]) {
    const old = transportHarness(), current = transportHarness(), data = skyEnvelope();
    const target = { targetId: "target:jupiter", direction: "123°", altitudeDeg: 36 };
    delete (data.data.hourly[0] as any).sunAzimuthDeg;
    delete (data.data.hourly[0] as any).moonAzimuthDeg;
    delete (data.data.hourly[0] as any).planets;
    data.data.targets = [target] as any;
    data.data.targetFrames[0]!.targets = [target] as any;
    try {
      await old.seed(data as any);
      for (const [key, value] of old.storage) current.storage.set(key, structuredClone(value));
      const pending = facade(current)("spot:published", "context:unchanged");
      if (outcome === "offline") current.calls.at(-1)!.fail({ errMsg: "offline" });
      else current.calls.at(-1)!.success({ statusCode: Number(outcome), data: outcome === "200" ? data : undefined });
      const result = await pending, row = result.data.hourly[0];
      assert.equal(result.data.skyScene.state, "UNAVAILABLE");
      assert.equal(result.data.skyScene.catalog, null);
      assert.equal(result.data.skyScene.frames[0].geometry, null);
      assert.deepEqual([row.sunAzimuthDeg, row.sunAltitudeDeg, row.sunAngularDiameterDeg], [null, null, null]);
      assert.deepEqual([row.moonAzimuthDeg, row.moonAngularDiameterDeg, row.planets], [null, null, null]);
      assert.equal(row.totalCloudPct, data.data.hourly[0]!.totalCloudPct);
      assert.equal(row.moonIllumination, data.data.hourly[0]!.moonIllumination);
      assert.equal(result.data.targetFrames[0].targets[0].targetId, target.targetId);
      assert.deepEqual([result.data.targets[0].azimuthDeg, result.data.targets[0].altitudeDeg], [null, null]);
      assert.deepEqual([result.data.targetFrames[0].targets[0].azimuthDeg,
        result.data.targetFrames[0].targets[0].altitudeDeg], [null, null]);
      assert.deepEqual(result.data.skyScene.deepSky, data.data.skyScene.deepSky);
      assert.equal(result.sources.some((item: any) => item.id === "catalog:stars"), false);
      assert.equal(result.dataState, outcome === "offline" ? "STALE_USABLE" : "PARTIAL");
      assert.ok(result.warnings.some((message: string) => message.includes("联网后刷新")));
      const cached = current.responseCache.get(responseCacheKey("scene", TEST_API_BASE, "/scene") + ":anonymous");
      assert.deepEqual(cached?.envelope.data, data.data, "projection cannot rewrite the restarted cache");
    } finally { old.queryClient.clear(); current.queryClient.clear(); }
  }
});

test("missing or null solar positions remain missing and recover from exact data", () => {
  for (const missing of ["absent", "null-pair"]) {
    const input = skyEnvelope(false);
    if (missing === "null-pair") {
      (input.data.hourly[0] as any).sunAzimuthDeg = null;
      (input.data.hourly[0] as any).sunAltitudeDeg = null;
    } else delete (input.data.hourly[0] as any).sunAzimuthDeg;
    const result = projected(input);
    assert.deepEqual([result.data.hourly[0]!.sunAzimuthDeg, result.data.hourly[0]!.sunAltitudeDeg], [null, null]);
    assert.equal(result.data.offlineReady, false);
    assert.equal(result.dataState, "PARTIAL");
    assert.ok(result.warnings.some(warning => warning.includes("太阳精确位置")));
    const restored = projected(skyEnvelope(false));
    assert.deepEqual([restored.data.hourly[0]!.sunAzimuthDeg, restored.data.hourly[0]!.sunAltitudeDeg], [279.5, -7.25]);
  }
});

test("missing or invalid solar diameter never invents a disc or discards valid twilight direction", () => {
  for (const missing of ["absent", "bad-diameter"]) {
    const input = skyEnvelope(false);
    if (missing === "bad-diameter") input.data.hourly[0]!.sunAngularDiameterDeg = 2;
    else delete (input.data.hourly[0] as any).sunAngularDiameterDeg;
    const result = projected(input);
    assert.deepEqual([result.data.hourly[0]!.sunAzimuthDeg, result.data.hourly[0]!.sunAltitudeDeg,
      result.data.hourly[0]!.sunAngularDiameterDeg], [279.5, -7.25, null]);
    assert.equal(result.dataState, "PARTIAL");
    assert.ok(result.warnings.some(warning => warning.includes("太阳盘角直径")));
    assert.equal(projected(skyEnvelope(false)).data.hourly[0]!.sunAngularDiameterDeg, .53);
  }
});

test("missing lunar position or invalid diameter withdraws lunar geometry and recovers", () => {
  for (const missing of ["absent", "bad-diameter"]) {
    const input = skyEnvelope(false);
    if (missing === "bad-diameter") input.data.hourly[0]!.moonAngularDiameterDeg = 2;
    else delete (input.data.hourly[0] as any).moonAzimuthDeg;
    const result = projected(input);
    assert.deepEqual([result.data.hourly[0]!.moonAzimuthDeg, result.data.hourly[0]!.moonAngularDiameterDeg], [null, null]);
    assert.equal(result.dataState, "PARTIAL");
    assert.ok(result.warnings.some(warning => warning.includes("月球精确位置")));
    const restored = projected(skyEnvelope(false));
    assert.deepEqual([restored.data.hourly[0]!.moonAzimuthDeg, restored.data.hourly[0]!.moonAngularDiameterDeg], [121.25, .51]);
  }
});

test("retired or mixed planetary rows lose geometry independently and recover seven identities", () => {
  for (const missing of ["absent", "mixed"]) {
    const input = skyEnvelope(false);
    if (missing === "mixed") (input.data.hourly[0]!.planets as any[])[2]!.body = "JUPITER";
    else delete (input.data.hourly[0] as any).planets;
    const result = projected(input);
    assert.equal(result.data.hourly[0]!.planets, null);
    assert.equal(result.dataState, "PARTIAL");
    assert.ok(result.warnings.some(warning => warning.includes("行星精确位置")));
    assert.deepEqual(projected(skyEnvelope(false)).data.hourly[0]!.planets!.map(planet => planet.body), SKY_PLANET_ORDER);
  }
});

test("a null planetary record preserves independent content and recovers from fresh data", () => {
  const input = skyEnvelope(false);
  (input.data.hourly[0]!.planets as unknown[])[2] = null;
  const result = projected(input);
  const { planets: _damaged, ...independent } = input.data.hourly[0]!;
  const { planets: _withdrawn, ...retained } = result.data.hourly[0]!;
  assert.equal(result.data.hourly[0]!.planets, null);
  assert.deepEqual(retained, independent, "sun, moon, time and weather remain usable");
  assert.deepEqual(result.data.skyScene, input.data.skyScene, "stars and deep sky remain usable");
  assert.deepEqual(result.data.targetFrames, input.data.targetFrames);
  assert.equal(result.dataState, "PARTIAL");
  assert.equal(result.data.offlineReady, false);
  assert.ok(result.warnings.some(warning => warning.includes("行星精确位置")));
  const fresh = skyEnvelope(false), restored = projected(fresh);
  assert.deepEqual(restored.data.hourly[0]!.planets, fresh.data.hourly[0]!.planets);
  assert.equal(restored.dataState, "FRESH");
  assert.equal(restored.warnings.some(warning => warning.includes("行星精确位置")), false);
});

test("a null target frame is isolated without losing valid frames or independent content", () => {
  const input = skyEnvelope(false), validFrames = structuredClone(input.data.targetFrames);
  (input.data.targetFrames as unknown[]).unshift(null);
  const result = projected(input);
  assert.deepEqual(result.data.targetFrames, validFrames);
  assert.deepEqual(result.data.hourly, input.data.hourly);
  assert.deepEqual(result.data.skyScene, input.data.skyScene);
  assert.equal(result.dataState, "PARTIAL");
  assert.ok(result.warnings.some(warning => warning.includes("天体精确方位")));
  const restored = projected(skyEnvelope(false));
  assert.deepEqual(restored.data.targetFrames, validFrames);
  assert.equal(restored.dataState, "FRESH");
  assert.equal(restored.warnings.some(warning => warning.includes("天体精确方位")), false);
});

test("HTTP 503 remains a failure and cannot return the retired catalog", async () => {
  const h = transportHarness();
  try {
    await h.seed(skyEnvelope() as any);
    const pending = facade(h)("spot:published", "context:unchanged");
    h.calls.at(-1)!.success({ statusCode: 503, data: undefined });
    await assert.rejects(pending, /bff_http_503/);
  } finally { h.queryClient.clear(); }
});

test("network recovery returns selectable HR stars and their precise independent geometry", async () => {
  const h = transportHarness(), call = facade(h);
  try {
    await h.seed(skyEnvelope() as any);
    const fresh = skyEnvelope(false);
    const pending = call("spot:published", "context:unchanged");
    h.calls.at(-1)!.success({ statusCode: 200, data: fresh });
    const result = await pending;
    assert.equal(result.data.skyScene.state, "AVAILABLE");
    assert.equal(result.data.skyScene.catalog.rowCount, 1630);
    assert.equal(result.data.skyScene.frames[0].geometry.catalogHash, result.data.skyScene.catalog.catalogHash);
    assert.equal(result.sources.some((item: any) => item.id === "catalog:stars"), true);
    assert.deepEqual(result.data.hourly, fresh.data.hourly);
    assert.deepEqual(result.data.targetFrames, fresh.data.targetFrames);
    assert.equal(result.dataState, "FRESH");
    assert.equal(result.warnings.length, 0);
  } finally { h.queryClient.clear(); }
});

test("malformed source rows retire only stars and keep independent content", () => {
  const input = skyEnvelope();
  (input.data.skyScene.catalog as any).sources = [null];
  const result = projected(input);
  assert.equal(result.data.skyScene.state, "UNAVAILABLE");
  assert.equal(result.data.hourly, input.data.hourly);
  assert.equal(result.data.skyScene.deepSky, input.data.skyScene.deepSky);
});

test("mirrored optical geometry is withdrawn without retiring valid stars and exact geometry recovers", () => {
  const input = skyEnvelope(false), at = input.data.hourly[0]!.at;
  const frame = { format: "eqj-enu-observer-v1", at, observer: { latitude: 0, longitude: 0, elevationM: 0 },
    equatorialToEnu: [1, 0, 0, 0, 1, 0, 0, 0, 1] };
  (input.data as any).observationFrames = [{ ...frame, equatorialToEnu: [-1, 0, 0, 0, 1, 0, 0, 0, 1] }];
  const result = projected(input);
  assert.equal(result.data.skyScene.state, "AVAILABLE");
  assert.equal(result.data.observationFrames, undefined);
  assert.ok(result.warnings.some(warning => warning.includes("巡天影像观测几何")));
  const fresh = skyEnvelope(false);
  (fresh.data as any).observationFrames = [frame];
  assert.deepEqual(projected(fresh).data.observationFrames, [frame]);
});

test("rounded target bearings retain identity but cannot become precise geometry, then recover", () => {
  const input = skyEnvelope(false);
  const target = { targetId: "target:jupiter", direction: "123°", altitudeDeg: 36 };
  input.data.targets = [target] as any;
  input.data.targetFrames[0]!.targets = [target] as any;
  const result = projected(input);
  assert.deepEqual(result.data.skyScene, input.data.skyScene);
  assert.deepEqual(result.data.hourly, input.data.hourly);
  assert.equal(result.data.targetFrames[0]!.targets[0]!.targetId, target.targetId);
  assert.deepEqual([result.data.targetFrames[0]!.targets[0]!.azimuthDeg,
    result.data.targetFrames[0]!.targets[0]!.altitudeDeg], [null, null]);
  assert.deepEqual([result.data.targets[0]!.azimuthDeg, result.data.targets[0]!.altitudeDeg], [null, null]);
  assert.equal(result.dataState, "PARTIAL");
  assert.ok(result.warnings.some(warning => warning.includes("天体精确方位")));
  const restored = projected(skyEnvelope(false));
  assert.deepEqual([restored.data.targetFrames[0]!.targets[0]!.azimuthDeg,
    restored.data.targetFrames[0]!.targets[0]!.altitudeDeg], [123.256789, 36.123456]);
});
