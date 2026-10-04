import assert from "node:assert/strict";
import test from "node:test";
import { buildDeepSkyScene, deepSkySceneCacheKey } from "./deep-sky-scene-provider.ts";
import { loadDeepSkyCatalog } from "@starward/astronomy-core/deep-sky-catalog";
import type { DeepSkySceneCatalogEntry } from "@starward/miniapp-contracts";

test("exact image planes retain all 51 identities across the horizon without millidegree rounding",()=>{
  const scene=buildDeepSkyScene(["2026-09-20T13:00:00Z","2026-09-21T01:00:00Z"],{
    wgs84:{latitude:22.6,longitude:114.5,system:"WGS84"},altitudeM:30,
  });
  assert.equal(scene.state,"AVAILABLE");assert.equal(scene.catalog?.imageRegistration,"ICRS_TAN_NORTH_0_1_V1");
  assert.match(deepSkySceneCacheKey(),/@1\.0\.1\+/);
  for(const frame of scene.frames){
    assert.equal(frame.points?.length,51);
    assert.ok(frame.points?.some(p=>p[2]<0));assert.ok(frame.points?.some(p=>p[2]>0));
    assert.ok(frame.points?.some(p=>Math.abs(p[1]*1000-Math.round(p[1]*1000))>.01));
  }
});

test("report carries exact catalog centers without borrowing image centers or filling missing axes", () => {
  const catalog = loadDeepSkyCatalog();
  const scene = buildDeepSkyScene(["2026-09-30T20:00:00.000Z"], {
    wgs84: { latitude: 22.4826799, longitude: 114.5557147, system: "WGS84" }, altitudeM: 0,
  });
  assert.equal(scene.state, "AVAILABLE");
  assert.equal(scene.catalog!.catalogHash, catalog.catalogHash, "report enrichment does not reidentify unchanged catalog bytes");
  assert.equal(scene.catalog!.entries.length, catalog.rows.length);
  for (const [index, row] of catalog.rows.entries()) {
    const entry: DeepSkySceneCatalogEntry = scene.catalog!.entries[index]!;
    assert.equal(entry.objectRef, row.objectRef);
    assert.deepEqual(entry.icrsCenter, { raDeg: row.raDeg, decDeg: row.decDeg });
    assert.equal(entry.majorAxisArcmin, row.majorAxisArcmin);
    assert.equal(entry.minorAxisArcmin, row.minorAxisArcmin);
    assert.equal(entry.positionAngleDeg, row.positionAngleDeg);
  }
  const m51 = scene.catalog!.entries.find(entry => entry.objectRef === "M:51")!;
  assert.deepEqual(m51.icrsCenter, { raDeg: 202.46962499999998, decDeg: 47.195166666666665 });
  assert.equal(scene.catalog!.entries.find(entry => entry.objectRef === "M:42")!.positionAngleDeg, null);
  assert.equal(scene.catalog!.entries.filter(entry => entry.minorAxisArcmin === null).length, 6);
  assert.equal(scene.catalog!.entries.filter(entry => entry.positionAngleDeg === null).length, 12);
  assert.equal(deepSkySceneCacheKey(), `${catalog.catalogVersion}:${catalog.catalogHash}:starward-fixed-icrs-projection@1.0.1+astronomy-engine@2.1.19:catalog-icrs-center-v1`,
    "server report caches must not serve the prior shape forever under the unchanged catalog identity");
});
