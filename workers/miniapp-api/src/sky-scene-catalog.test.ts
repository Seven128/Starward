import assert from "node:assert/strict";
import test from "node:test";
import { BSC5P_PROJECTION_ALGORITHM, loadBsc5pStarCatalog } from "@starward/astronomy-core/bsc5p-catalog";
import { STELLAR_SCENE_FORMAT, skySceneSerializedBytes } from "@starward/miniapp-contracts";
import { TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import { buildSkyScene, createBsc5pSkyCatalogProvider, type SkyCatalogProvider } from "./sky-scene-catalog.ts";
import { bsc5pCatalogSources } from "./sky-scene-catalog-provider.ts";
import { createBsc5pGeometryFrame } from "./stellar-geometry-provider.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";
import { InMemoryTestRepository } from "./test-fixtures/in-memory-repository.ts";
import { MemoryCache } from "./cache.ts";
const spot = { wgs84: TEST_PUBLISHED_SPOT.wgs84, altitudeM: TEST_PUBLISHED_SPOT.altitudeM };
const hourlyAt = Array.from({length:49}, (_,i)=> new Date(Date.parse("2026-09-04T04:00:00Z")+i*1800000).toISOString());

test("full-day real report sends one exact transform per time without repeated star rows", () => {
  const provider=createBsc5pSkyCatalogProvider();
  const first=buildSkyScene({provider,hourlyAt,spot});
  assert.equal(first.state,"AVAILABLE");
  assert.equal(first.catalog?.rowCount,8404);
  assert.equal(first.catalog?.catalogVersion,"bsc5p-bright-stars.v2");
  assert.equal(first.frames.length,49);
  assert.deepEqual(first,buildSkyScene({provider,hourlyAt,spot}));
  assert.deepEqual(first.frames.map(f=>f.at),hourlyAt);
  assert.notDeepEqual(first.frames[0]!.geometry!.equatorialToEnu,first.frames[1]!.geometry!.equatorialToEnu);
  assert.ok(!("entries" in first.catalog!));
  assert.ok(first.frames.every(f=>f.geometry && !("points" in f)));
  assert.ok(skySceneSerializedBytes(first)<300000, String(skySceneSerializedBytes(first)));
  assert.equal(first.observer?.longitude, spot.wgs84.longitude);
});

test("unavailable or invalid star geometry retains independent deep sky without fallback stars", () => {
  const original=createBsc5pSkyCatalogProvider();
  const failures: Partial<SkyCatalogProvider>[]=[
    {load:()=>{throw Error("missing");}},
    {load:()=>({...original.load(),rowCount:8405})},
    {load:()=>({...original.load(),catalogHash:"bad"})},
    {load:()=>({...original.load(),sources:[{...original.load().sources[0]!,limitations:["x".repeat(3000000)]}]})},
    {frame:input=>({...original.frame(input),at:hourlyAt[48]!})},
    {frame:input=>({...original.frame(input),observer:{...input,longitude:0}})},
    {frame:input=>({...original.frame(input),equatorialToEnu:[-1,0,0,0,1,0,0,0,1]})},
  ];
  for (const failure of failures){
    const scene=buildSkyScene({provider:{...original,...failure},hourlyAt,spot});
    assert.equal(scene.state,"UNAVAILABLE");assert.equal(scene.catalog,null);
    assert.ok(scene.frames.every(f=>f.state==="UNAVAILABLE" && f.geometry===null));
    assert.equal(scene.deepSky?.state,"AVAILABLE");
  }
  assert.equal(buildSkyScene({provider:original,hourlyAt:[],spot}).unavailableReason,"NO_TIME_SLICES");
});

test("report cache identity includes wire format, source publication and projection algorithm",()=>{
 const provider=createBsc5pSkyCatalogProvider(),catalog=provider.load();
 assert.equal(provider.cacheKey(),[STELLAR_SCENE_FORMAT,catalog.catalogVersion,catalog.catalogHash,BSC5P_PROJECTION_ALGORITHM].join(":"));
});

test("SkyReport cache invalidates v1/v2 publication changes and their geometry",async()=>{
 let owner=loadBsc5pStarCatalog("bsc5p-bright-stars.v1"),calls=0;
 const provider:SkyCatalogProvider={load:()=>({catalogVersion:owner.catalogVersion,catalogHash:owner.catalogHash,magnitudeLimit:owner.magnitudeLimit,rowCount:owner.rows.length,sources:bsc5pCatalogSources(owner)}),
  frame:input=>{calls++;return createBsc5pGeometryFrame({...input.catalog,format:"bsc5p-stellar-geometry-v1",referenceAt:"2000-01-01T12:00:00.000Z"},input);},
  cacheKey:()=>owner.catalogHash};
 const service=createTestMiniappService({repository:new InMemoryTestRepository([TEST_PUBLISHED_SPOT]),skyCatalog:provider,cache:new MemoryCache()});
 try{
 const context=(await service.resolveObservationContext({location:{kind:"FORMAL_SPOT",spotId:TEST_PUBLISHED_SPOT.spotId},localDate:"2026-09-04"})).data;
 const first=await service.getSky(TEST_PUBLISHED_SPOT.spotId,context.contextId),firstCalls=calls;
 assert.equal(first.data.skyScene.catalog?.rowCount,1630);assert.ok(firstCalls>0);
 await service.getSky(TEST_PUBLISHED_SPOT.spotId,context.contextId);assert.equal(calls,firstCalls);
 owner=loadBsc5pStarCatalog("bsc5p-bright-stars.v2");
 const second=await service.getSky(TEST_PUBLISHED_SPOT.spotId,context.contextId);
 assert.ok(calls>firstCalls);assert.equal(second.data.skyScene.catalog?.rowCount,8404);
 assert.equal(second.data.skyScene.catalog?.catalogHash,owner.catalogHash);
 assert.notEqual(second.data.context.dataRevision,first.data.context.dataRevision);
 } finally{await service.onModuleDestroy();}
});
