import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { assertSkyTimeModel, validSkyPlanetGeometry, validMoonBodyFrame,
  SKY_LUMINARY_CATALOG_HASH, SKY_LUMINARY_CATALOG_VERSION } from "@starward/miniapp-contracts";
import { TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import { Body, Observer, Equator, Horizon } from "../../../packages/astronomy-core/src/astronomy-engine-runtime.ts";
import { evaluateSkyTimeModel, skyReportTimeGeometry } from "@starward/astronomy-core/sky-time-model";
import { positionBsc5pCatalog, loadBsc5pStarCatalog } from "@starward/astronomy-core/bsc5p-catalog";
import { positionDeepSkyCatalog } from "@starward/astronomy-core/deep-sky-catalog";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";
import { createBsc5pSkyCatalogProvider } from "./sky-scene-catalog-provider.ts";
import { buildSkyTimeModel } from "./sky-time-model-provider.ts";
import { celestialObjectPosition } from "./celestial-object-position.ts";
import { MiniappController } from "./controller.ts";
import { MiniappService } from "./miniapp-service.ts";
import { loadSaoCatalog } from "./sao-catalog-provider.ts";
import { matchingCelestialPositionResponse } from "../../../apps/wechat-miniapp/src/services/celestial-position-response.ts";
import { projectAdoptedSkyCatalog } from "../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts";
import { presentSkyTime, skyPresentationTimeModel } from "../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts";
import { attachSkyCatalog } from "../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts";
import { skyPresentationPosition } from "../../../apps/wechat-miniapp/src/features/sky/sky-presentation-position.ts";
import { resolveSkySceneFrame } from "../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts";
import { StellarCatalogPublicationService } from "./stellar-catalog-publication.ts";

const start = "2026-09-29T13:00:00.000Z", end = "2026-09-29T13:30:00.000Z";
const observer = { latitude: 22.4826799, longitude: 114.5557147, elevationM: 0 };
const model = buildSkyTimeModel({ observer, hourlyAt: [start, end] });
const fineAt = "2026-09-29T13:00:01.000Z";
const direction = (az: number, alt: number) => {
  const rad = Math.PI / 180, a = az*rad, b = alt*rad;
  return [Math.sin(a)*Math.cos(b),Math.cos(a)*Math.cos(b),Math.sin(b)];
};
const angularError = (a: { azimuthDeg: number; altitudeDeg: number }, b: { azimuthDeg: number; altitudeDeg: number }) => {
  const left = direction(a.azimuthDeg,a.altitudeDeg), right = direction(b.azimuthDeg,b.altitudeDeg);
  const cross = [left[1]!*right[2]!-left[2]!*right[1]!,left[2]!*right[0]!-left[0]!*right[2]!,left[0]!*right[1]!-left[1]!*right[0]!];
  return Math.atan2(Math.hypot(...cross),left.reduce((sum,value,index)=>sum+value*right[index]!,0))*180/Math.PI*3600;
};

test("provided time geometry moves all bodies coherently and avoids coarse lunar interpolation error", () => {
  assertSkyTimeModel(model, { observer, hourlyAt: [start,end] });
  const engineObserver = new Observer(observer.latitude, observer.longitude, observer.elevationM);
  const bodies = [Body.Sun,Body.Moon,Body.Mercury,Body.Venus,Body.Mars,Body.Jupiter,Body.Saturn,Body.Uranus,Body.Neptune];
  for (const seconds of [0,1,60,900,1799,1800]) {
    const at = new Date(Date.parse(start)+seconds*1000).toISOString();
    const frame = evaluateSkyTimeModel(model,at)!;
    assert.equal(frame.at,at); assert.equal(frame.observationFrame.at,at); assert.equal(frame.hourly.at,at);
    assert(frame.hourly.planets?.every(validSkyPlanetGeometry));
    assert(validMoonBodyFrame(frame.hourly.moonBodyFrame));
    const positions = [{azimuthDeg:frame.hourly.sunAzimuthDeg!,altitudeDeg:frame.hourly.sunAltitudeDeg!},
      {azimuthDeg:frame.hourly.moonAzimuthDeg!,altitudeDeg:frame.hourly.moonAltitudeDeg!},...frame.hourly.planets!];
    bodies.forEach((body,index)=>{
      const equator = Equator(body,new Date(at),engineObserver,true,true);
      const truth = Horizon(new Date(at),engineObserver,equator.ra,equator.dec,"");
      // Numeric regression bound from the same-input trial; not a global
      // ephemeris/viewport accuracy promise or a newly added product Gate.
      assert(angularError(positions[index]!,{azimuthDeg:truth.azimuth,altitudeDeg:truth.altitude})<.01,`${body}/${seconds}`);
    });
  }
  assert.notDeepEqual(evaluateSkyTimeModel(model,start)!.hourly,evaluateSkyTimeModel(model,fineAt)!.hourly);
});

test("time coverage, observer and handedness are enforced instead of borrowing a frame", () => {
  for (const at of ["2026-09-29T12:59:59.999Z","2026-09-29T13:30:00.001Z","2026-09-29T13:01:00Z","invalid"])
    assert.equal(evaluateSkyTimeModel(model,at),null);
  for (const mutate of [
    (value: typeof model) => { value.observer.latitude += 1; },
    (value: typeof model) => { value.knots[1]!.at = "2026-09-29T13:31:00.000Z"; value.endAt=value.knots[1]!.at; },
    (value: typeof model) => { value.knots[1]!.equatorialToEnu = value.knots[1]!.equatorialToEnu.map((v,index)=>index<3?-v:v) as any; },
    (value: typeof model) => { value.knots[0]!.bodies[1]!.velocityEqjPerSecond=[NaN,0,0]; },
    (value: typeof model) => { value.knots[1]!.bodies[1]!.body="SUN"; },
    (value: typeof model) => { const axes=value.knots[0]!.bodies[1]!.bodyFrameEqj!;
      value.knots[0]!.bodies[1]!.bodyFrameEqj={primeMeridianEnu:axes.primeMeridianEqj,poleEnu:axes.poleEqj} as any; },
    (value: typeof model) => { delete (value.knots[0]!.bodies as any[])[1]; },
    (value: typeof model) => { delete (value.knots as any[])[0]; },
  ]) {
    const invalid=structuredClone(model); mutate(invalid);
    assert.throws(()=>assertSkyTimeModel(invalid,{observer,hourlyAt:[start,end]}));
  }
  const gap=structuredClone(model); gap.knots[1]!.at="2026-09-29T13:31:00.000Z"; gap.endAt=gap.knots[1]!.at;
  assert.throws(()=>assertSkyTimeModel(gap,{observer,hourlyAt:[start,gap.endAt]}),/time_binding/);
});

test("lunar phase unwraps across zero and unsupported surface/ring axes remain absent", () => {
  const crossing = structuredClone(model);
  crossing.knots[0]!.bodies[1]!.phaseAngleDeg=359.8; crossing.knots[1]!.bodies[1]!.phaseAngleDeg=.2;
  crossing.knots[1]!.bodies[4]!.bodyFrameEqj=null; // A missing endpoint cannot invent Mars texture orientation.
  crossing.knots[1]!.bodies[6]!.ringSunEqj=null; // Keep valid Saturn rings; shadows remain unavailable.
  const frame=evaluateSkyTimeModel(crossing,"2026-09-29T13:15:00.000Z")!;
  assert(Math.min(frame.hourly.moonPhaseAngleDeg!,360-frame.hourly.moonPhaseAngleDeg!)<1e-9);
  assert.equal(frame.hourly.moonPhase,"NEW"); assert.equal(frame.hourly.planets![2]!.bodyFrame,null);
  assert(frame.hourly.planets![4]!.ringPoleEnu); assert.equal(frame.hourly.planets![4]!.ringSunEnu,null);
});

test("real v3 report and HTTP fine positions preserve identity, independent layers and legacy exact rows", async () => {
  const service=createTestMiniappService({skyCatalog:createBsc5pSkyCatalogProvider()});
  const context=(await service.resolveObservationContext({location:{kind:"FORMAL_SPOT",spotId:TEST_PUBLISHED_SPOT.spotId},
    localDate:"2026-09-29",selectedAt:start})).data;
  class TestModule {}
  Module({controllers:[MiniappController],providers:[{provide:MiniappService,useValue:service}]})(TestModule);
  const app=await NestFactory.create(TestModule,new FastifyAdapter(),{logger:false});
  try {
    await app.listen(0,"127.0.0.1");
    const base=await app.getUrl(), root=`/v2/spots/${encodeURIComponent(TEST_PUBLISHED_SPOT.spotId)}/sky`;
    const query=`?contextId=${encodeURIComponent(context.contextId)}&catalogVersion=bsc5p-bright-stars.v3`;
    const response=await fetch(base+root+query); assert.equal(response.status,200);
    const report=await response.json(); assert(report.data.timeModel);
    const adopted=projectAdoptedSkyCatalog(report); assert(adopted.data.timeModel);
    const localEnvelope=structuredClone(adopted);
    const localModel=skyPresentationTimeModel(localEnvelope.data);
    assert(localModel);
    const localFine=presentSkyTime(localEnvelope.data,fineAt);
    assert.equal(localFine?.mode,"MODEL");
    assert.equal(localFine.row.at,fineAt);
    assert.equal(localFine.report.hourly.length,1,"the client retains only a transient current frame");
    assert.equal(localFine.report.observationFrames?.[0]?.at,fineAt);
    assert.equal(localFine.report.skyScene.frames[0]?.at,fineAt);
    assert.equal(localFine.report.skyScene.deepSky?.frames[0]?.at,fineAt);
    assert.equal(localFine.report.targetFrames.length,0,
      "geometry-only fine supply has no target result; missing advice is not a genuine zero-target result");
    assert.deepEqual(localEnvelope.data.hourly,adopted.data.hourly,"local presentation cannot rewrite provider weather or report facts");
    const publishedStars=new StellarCatalogPublicationService().get(localFine.report.skyScene.catalog!).data;
    const localRendered=attachSkyCatalog(localFine.report,publishedStars);
    assert(resolveSkySceneFrame(localRendered.skyScene,fineAt)?.points.length,
      "the full current catalogue reaches the same rendered instant");
    const moonBinding={reference:"SOLAR:MOON",...localRendered.context,at:fineAt};
    const moon=skyPresentationPosition(moonBinding,
      {catalogVersion:SKY_LUMINARY_CATALOG_VERSION,catalogHash:SKY_LUMINARY_CATALOG_HASH},
      {source:localEnvelope,rendered:localRendered,anchorAt:localModel.startAt});
    assert(moon?.position);
    assert(angularError(moon.position,celestialObjectPosition("SOLAR:MOON",fineAt,report).data.position!)<.01);
    const deepCatalog=localRendered.skyScene.deepSky?.catalog;
    assert(deepCatalog);
    const localGalaxy=skyPresentationPosition({reference:"M:31",...localRendered.context,at:fineAt},
      {catalogVersion:deepCatalog.catalogVersion,catalogHash:deepCatalog.catalogHash},
      {source:localEnvelope,rendered:localRendered,anchorAt:localModel.startAt});
    assert(localGalaxy?.position);
    assert(angularError(localGalaxy.position,celestialObjectPosition("M:31",fineAt,report).data.position!)<.001);
    const localStar=skyPresentationPosition({reference:"HR:7557",...localRendered.context,at:fineAt},
      {catalogVersion:publishedStars.catalogVersion,catalogHash:publishedStars.catalogHash},
      {source:localEnvelope,rendered:localRendered,anchorAt:localModel.startAt});
    assert(localStar?.position);
    assert(angularError(localStar.position,celestialObjectPosition("HR:7557",fineAt,report).data.position!)<.001);
    const failedStars=attachSkyCatalog(localFine.report,undefined);
    assert.equal(skyPresentationPosition({reference:"HR:7557",...failedStars.context,at:fineAt},
      {catalogVersion:publishedStars.catalogVersion,catalogHash:publishedStars.catalogHash},
      {source:localEnvelope,rendered:failedStars,anchorAt:localModel.startAt}),null);
    assert(skyPresentationPosition(moonBinding,
      {catalogVersion:SKY_LUMINARY_CATALOG_VERSION,catalogHash:SKY_LUMINARY_CATALOG_HASH},
      {source:localEnvelope,rendered:failedStars,anchorAt:localModel.startAt})?.position);
    assert.equal(adopted.data.timeModel.format,"sky-time-model-v1");
    assert.equal(report.data.context.at,start); assert.equal(report.data.hourly.some((row:any)=>row.at===fineAt),false);
    const fine=skyReportTimeGeometry(report.data,fineAt)!; assert(fine);
    const sao=loadSaoCatalog("bsc5p-bright-stars.v3").catalog;
    const references=["HR:7557",sao.references().next().value!,"M:31","SOLAR:SUN","SOLAR:MOON","PLANET:VENUS"];
    for(const reference of references){
      const lookup=await fetch(base+root+"/objects/"+encodeURIComponent(reference)+query+"&at="+encodeURIComponent(fineAt));
      assert.equal(lookup.status,200,reference);
      const result=await lookup.json(); assert(result.data.position,reference);
      const catalogue=result.data.position;
      matchingCelestialPositionResponse(result,{reference,...report.data.context,at:fineAt},catalogue);
      assert.equal(result.data.at,fineAt); assert.equal(result.data.timeModelAlgorithmVersion,report.data.timeModel.algorithmVersion);
      const previous=celestialObjectPosition(reference,start,report);
      assert.notDeepEqual(previous.data.position,result.data.position,reference);
    }
    const bright=celestialObjectPosition("HR:7557",fineAt,report);
    const truth=positionBsc5pCatalog({...report.data.timeModel.observer,at:fineAt,catalog:loadBsc5pStarCatalog("bsc5p-bright-stars.v3")}).find(row=>row.sourceId==="HR:7557")!;
    assert(angularError(bright.data.position!,truth)<.001);
    const galaxy=celestialObjectPosition("M:31",fineAt,report);
    const deepTruth=positionDeepSkyCatalog({...report.data.timeModel.observer,at:fineAt}).find(row=>row.objectRef==="M:31")!;
    assert(angularError(galaxy.data.position!,deepTruth)<.001);
    const independent=structuredClone(report); independent.data.skyScene.state="UNAVAILABLE"; independent.data.skyScene.catalog=null;
    assert(celestialObjectPosition("SOLAR:MOON",fineAt,independent).data.position);
    assert(celestialObjectPosition("M:31",fineAt,independent).data.position);
    assert.equal(celestialObjectPosition("HR:7557",fineAt,independent).data.position,null);
    for(const changed of [undefined,null,{...report.data.timeModel,format:"unknown"}]){
      const old=structuredClone(report); old.data.timeModel=changed;
      assert.throws(()=>celestialObjectPosition("HR:7557",fineAt,old),/time_outside_report/);
      assert(celestialObjectPosition("HR:7557",start,old).data.position);
    }
    const malformed=structuredClone(report); malformed.data.timeModel.knots[0].bodies[0].directionEqj=[0,0,0];
    const degraded=projectAdoptedSkyCatalog(malformed);
    assert.equal(degraded.data.timeModel,null); assert.equal(degraded.dataState,"SAMPLE_DATA");
    assert.equal(projectAdoptedSkyCatalog({...malformed,dataState:"FRESH"}).dataState,"PARTIAL");
    assert.deepEqual(degraded.data.hourly,malformed.data.hourly);
    assert.deepEqual(degraded.data.skyScene,malformed.data.skyScene);
    assert(malformed.data.timeModel,"projection cannot mutate the cached representation");
    assert(projectAdoptedSkyCatalog(report).data.timeModel,"a genuine new valid report restores the capability");
    const failed=celestialObjectPosition("SOLAR:MOON",fineAt,{...report,dataState:"EXPIRED"});
    assert.equal(failed.data.position,null); assert.equal(failed.data.unavailableReason,"SKY_UNAVAILABLE");
    const stale=celestialObjectPosition("SOLAR:MOON",fineAt,{...report,dataState:"STALE_USABLE"});
    assert.equal(stale.dataState,"STALE_USABLE");
    const invalid=await fetch(base+root+"/objects/HR%3A7557"+query+"&at=2026-09-28T13%3A00%3A00.000Z"); assert.equal(invalid.status,400);
    const privateResponse=await fetch(base+root.replace(encodeURIComponent(TEST_PUBLISHED_SPOT.spotId),"contribution%3Aother-account")+"/objects/HR%3A7557"+query+"&at="+encodeURIComponent(fineAt));
    assert.notEqual(privateResponse.status,200); assert.equal((await privateResponse.json()).data?.position,undefined);
    const overview=await service.getSpotOverview(TEST_PUBLISHED_SPOT.spotId,context.contextId);
    assert.equal((overview.data as any).timeModel,undefined,"geometry publication is Sky-specific");
    report.data.timeModel.knots[0].bodies[0].directionEqj=[0,0,0];
    const next=await service.getSky(TEST_PUBLISHED_SPOT.spotId,context.contextId,null,"bsc5p-bright-stars.v3");
    assert(skyReportTimeGeometry(next.data,fineAt),"returned data cannot mutate the geometry cache");
  } finally {await app.close();await service.onModuleDestroy();}
});
