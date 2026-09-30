import assert from "node:assert/strict";
import test from "node:test";
import { BSC5P_PROJECTION_ALGORITHM, loadBsc5pStarCatalog } from "@starward/astronomy-core/bsc5p-catalog";
import { assertSkyObservationFrames, STELLAR_SCENE_FORMAT, skySceneSerializedBytes } from "@starward/miniapp-contracts";
import { TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import { buildSkyScene, createBsc5pSkyCatalogProvider, type SkyCatalogProvider } from "./sky-scene-catalog.ts";
import { bsc5pCatalogSources } from "./sky-scene-catalog-provider.ts";
import { createBsc5pGeometryFrame } from "./stellar-geometry-provider.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";
import { InMemoryTestRepository } from "./test-fixtures/in-memory-repository.ts";
import { MemoryCache } from "./cache.ts";
import { StellarCatalogPublicationService } from "./stellar-catalog-publication.ts";
import { SaoPublicationService } from "./sao-publication.ts";
import { attachSkyCatalog, resolveSkySceneFrame } from "../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts";
import { resolveSkyStellarSupplement, supplementGeometry } from "../../../apps/wechat-miniapp/src/features/sky/sky-stellar-supplement-scene.ts";
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

test("one Observation Context can serve isolated BSC v2 and Acrux v3 reports without cache cross-talk",async()=>{
 const service=createTestMiniappService({repository:new InMemoryTestRepository([TEST_PUBLISHED_SPOT]),cache:new MemoryCache()});
 try{
  const context=(await service.resolveObservationContext({location:{kind:"FORMAL_SPOT",spotId:TEST_PUBLISHED_SPOT.spotId},localDate:"2026-09-04"})).data;
  const old=(await service.getSky(TEST_PUBLISHED_SPOT.spotId,context.contextId)).data;
  const revised=(await service.getSky(TEST_PUBLISHED_SPOT.spotId,context.contextId,undefined,"bsc5p-bright-stars.v3")).data;
  const oldAgain=(await service.getSky(TEST_PUBLISHED_SPOT.spotId,context.contextId)).data;
  const v3=loadBsc5pStarCatalog("bsc5p-bright-stars.v3");
  assert.equal(old.skyScene.catalog?.catalogVersion,"bsc5p-bright-stars.v2");
  assert.equal(revised.skyScene.catalog?.catalogVersion,v3.catalogVersion);
  assert.equal(revised.skyScene.catalog?.catalogHash,v3.catalogHash);
  assert.equal(revised.skyScene.catalog?.rowCount,8404);
  assert.notEqual(revised.context.dataRevision,old.context.dataRevision);
  assert.equal(oldAgain.skyScene.catalog?.catalogVersion,old.skyScene.catalog?.catalogVersion);
  assert.equal(oldAgain.skyScene.catalog?.catalogHash,old.skyScene.catalog?.catalogHash);
  assert.equal(oldAgain.context.catalogVersion,old.context.catalogVersion);
  assert.deepEqual(revised.hourly.map(row=>row.at),old.hourly.map(row=>row.at));
 }finally{await service.onModuleDestroy();}
});

test("v3 report, published BSC and SAO tile compose in the Mini scene while old SAO is rejected",async()=>{
 const service=createTestMiniappService({repository:new InMemoryTestRepository([TEST_PUBLISHED_SPOT]),cache:new MemoryCache()});
 try{
  const context=(await service.resolveObservationContext({location:{kind:"FORMAL_SPOT",spotId:TEST_PUBLISHED_SPOT.spotId},localDate:"2026-09-04"})).data;
  const report=(await service.getSky(TEST_PUBLISHED_SPOT.spotId,context.contextId,undefined,"bsc5p-bright-stars.v3")).data;
  const staticCatalog=new StellarCatalogPublicationService().get(report.skyScene.catalog!).data;
  const scene=attachSkyCatalog(report,staticCatalog).skyScene;
  assert.equal(scene.state,"AVAILABLE");
  const at=report.hourly[0]!.at;
  assert.ok(resolveSkySceneFrame(scene,at));
  const saoOwner=new SaoPublicationService(new URL("../assets/sao-v2/",import.meta.url));
  const sao=await saoOwner.get();
  assert.ok(supplementGeometry(sao.data,scene,at));
  const visibleTile=sao.data.index.tiles.find(tile=>tile.id==="00-09-10-0");
  assert.ok(visibleTile);
  const first=await saoOwner.tile(sao.data.publicationHash,visibleTile.id);
  const supplement=resolveSkyStellarSupplement(sao.data,[first.data],scene,at);
  assert.equal(supplement?.catalogVersion,"sao-visual-supplement.v2");
  assert.equal(supplement?.geometry.at,at);
  assert.equal(supplement?.points.length,4);
  const old=await new SaoPublicationService().get();
  assert.throws(()=>supplementGeometry(old.data,scene,at),/sao_base_catalog_mismatch/u);
 }finally{await service.onModuleDestroy();}
});

test("report observation frames survive a failed bright-star catalog and match the real star transform",async()=>{
 const starless:SkyCatalogProvider={load:()=>{throw new Error("test_catalog_unavailable");},
  frame:()=>{throw new Error("test_catalog_unavailable");},cacheKey:()=>"test-catalog-unavailable"};
 const unavailable=createTestMiniappService({repository:new InMemoryTestRepository([TEST_PUBLISHED_SPOT]),skyCatalog:starless});
 const available=createTestMiniappService({repository:new InMemoryTestRepository([TEST_PUBLISHED_SPOT]),skyCatalog:createBsc5pSkyCatalogProvider()});
 try{
  const request={location:{kind:"FORMAL_SPOT" as const,spotId:TEST_PUBLISHED_SPOT.spotId},localDate:"2026-09-04"};
  const a=(await unavailable.resolveObservationContext(request)).data;
  const b=(await available.resolveObservationContext(request)).data;
  const failed=(await unavailable.getSky(TEST_PUBLISHED_SPOT.spotId,a.contextId)).data;
  const good=(await available.getSky(TEST_PUBLISHED_SPOT.spotId,b.contextId)).data;
  assert.equal(failed.skyScene.state,"UNAVAILABLE");
  assertSkyObservationFrames(failed.observationFrames,failed.hourly.map(row=>row.at));
  assertSkyObservationFrames(good.observationFrames,good.hourly.map(row=>row.at));
  assert.deepEqual(failed.observationFrames,good.observationFrames);
  assert.deepEqual(good.observationFrames[0]!.equatorialToEnu,good.skyScene.frames[0]!.geometry!.equatorialToEnu);
 }finally{await unavailable.onModuleDestroy();await available.onModuleDestroy();}
});
