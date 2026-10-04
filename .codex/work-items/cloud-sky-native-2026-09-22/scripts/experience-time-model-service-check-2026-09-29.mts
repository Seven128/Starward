import 'reflect-metadata';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { build } from 'esbuild';
import { TEST_PUBLISHED_SPOT } from '@starward/miniapp-contracts/test-fixtures';
import { buildSkyTimeModel } from '../../../../workers/miniapp-api/src/sky-time-model-provider.ts';
import { createTestMiniappService } from '../../../../workers/miniapp-api/src/test-fixtures/create-test-service.ts';
import { createBsc5pSkyCatalogProvider } from '../../../../workers/miniapp-api/src/sky-scene-catalog-provider.ts';
import { MiniappController } from '../../../../workers/miniapp-api/src/controller.ts';
import { MiniappService } from '../../../../workers/miniapp-api/src/miniapp-service.ts';
import { evaluateSkyTimeModel, skyReportTimeGeometry } from '../../../../packages/astronomy-core/src/sky-time-model.ts';
import { Body, Observer, Equator, Horizon } from '../../../../packages/astronomy-core/src/astronomy-engine-runtime.ts';

const root=fileURLToPath(new URL('../../../../',import.meta.url));
const output=fileURLToPath(new URL('../evidence/experience-time-model-service-validation-2026-09-29.json',import.meta.url));
const publication=fileURLToPath(new URL('../evidence/experience-time-model-published-candidate-2026-09-29.json',import.meta.url));
await assert.rejects(fs.access(output),{code:'ENOENT'}); await assert.rejects(fs.access(publication),{code:'ENOENT'});
const sha=(value:string|Uint8Array)=>createHash('sha256').update(value).digest('hex');
const summarize=(values:number[])=>{const sorted=[...values].sort((a,b)=>a-b);return {samples:values.length,medianMs:sorted[Math.floor(sorted.length/2)],p95Ms:sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*.95)-1)],maxMs:Math.max(...values)};};
const service=createTestMiniappService({skyCatalog:createBsc5pSkyCatalogProvider()});
const selectedAt='2026-09-29T13:00:00.000Z', fineAt='2026-09-29T13:00:01.000Z';
const context=(await service.resolveObservationContext({location:{kind:'FORMAL_SPOT',spotId:TEST_PUBLISHED_SPOT.spotId},localDate:'2026-09-29',selectedAt})).data;
class TestModule {}
Module({controllers:[MiniappController],providers:[{provide:MiniappService,useValue:service}]})(TestModule);
const app=await NestFactory.create(TestModule,new FastifyAdapter(),{logger:false});
try {
  await app.listen(0,'127.0.0.1');
  const base=await app.getUrl(), route=`/v2/spots/${encodeURIComponent(TEST_PUBLISHED_SPOT.spotId)}/sky`;
  const query=`?contextId=${encodeURIComponent(context.contextId)}&catalogVersion=bsc5p-bright-stars.v3`;
  let started=performance.now();
  const cold=await fetch(base+route+query); assert.equal(cold.status,200);
  const bytes=Buffer.from(await cold.arrayBuffer()), report=JSON.parse(bytes.toString('utf8'));
  const coldHttpMs=performance.now()-started; assert(report.data.timeModel);
  started=performance.now(); const warm=await fetch(base+route+query); assert.equal(warm.status,200);
  const warmBody=await warm.json(); const warmHttpMs=performance.now()-started;
  assert.equal(warmBody.data.context.dataRevision,report.data.context.dataRevision);
  const model=report.data.timeModel, at=model.knots.map((knot:any)=>knot.at);
  const providerMs=[];
  for(let index=0;index<8;index++) {started=performance.now();buildSkyTimeModel({observer:model.observer,hourlyAt:at});providerMs.push(performance.now()-started);}
  const evaluateMs=[], boundMs=[];
  for(let index=0;index<600;index++){
    const instant=new Date(Date.parse(selectedAt)+index*(1000/30)).toISOString();
    started=performance.now();const frame=evaluateSkyTimeModel(model,instant);evaluateMs.push(performance.now()-started);assert(frame?.hourly.planets?.length===7);
    started=performance.now();assert(skyReportTimeGeometry(report.data,instant));boundMs.push(performance.now()-started);
  }
  const http=[];
  for(const reference of ['HR:7557','SOLAR:MOON','M:31','PLANET:SATURN']){
    started=performance.now(); const response=await fetch(base+route+'/objects/'+encodeURIComponent(reference)+query+'&at='+encodeURIComponent(fineAt));
    const data=await response.json(); assert.equal(response.status,200);assert(data.data.position);
    http.push({reference,at:data.data.at,status:response.status,atMatches:data.data.at===fineAt,
      identityMatches:data.data.reference===reference&&data.data.contextRevision===context.revision&&data.data.contextFingerprint===context.contextFingerprint,
      modelAlgorithmVersion:data.data.timeModelAlgorithmVersion,position:data.data.position,elapsedMs:performance.now()-started});
  }
  const boundary=await fetch(base+route+'/objects/HR%3A7557'+query+'&at='+encodeURIComponent(new Date(Date.parse(model.endAt)+1).toISOString()));assert.equal(boundary.status,400);
  const file=path.join(root,'packages/astronomy-core/src/sky-time-model.ts'), source=await fs.readFile(file,'utf8');
  const begin=source.indexOf('function directionBetween('), end=source.indexOf('function vectorBetween(',begin);assert(begin>=0&&end>begin);
  const mutated=source.slice(0,begin)+`function directionBetween(left: SkyTimeBody, right: SkyTimeBody, amount: number, _seconds: number) {
    return unit(left.directionEqj.map((value,index)=>value+(right.directionEqj[index]!-value)*amount));
  }\n`+source.slice(end);
  const bundled=await build({stdin:{contents:mutated,resolveDir:path.dirname(file),sourcefile:file,loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
  const mutant=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles![0]!.text).toString('base64'));
  const midpoint='2026-09-29T13:15:00.000Z', production=evaluateSkyTimeModel(model,midpoint)!, changed=mutant.evaluateSkyTimeModel(model,midpoint);
  const engineObserver=new Observer(model.observer.latitude,model.observer.longitude,model.observer.elevationM);
  const eq=Equator(Body.Moon,new Date(midpoint),engineObserver,true,true), truth=Horizon(new Date(midpoint),engineObserver,eq.ra,eq.dec,'');
  const direction=(az:number,alt:number)=>{const r=Math.PI/180,a=az*r,b=alt*r;return[Math.sin(a)*Math.cos(b),Math.cos(a)*Math.cos(b),Math.sin(b)];};
  const error=(row:any)=>{const a=direction(row.moonAzimuthDeg,row.moonAltitudeDeg),b=direction(truth.azimuth,truth.altitude);
    const cross=[a[1]!*b[2]!-a[2]!*b[1]!,a[2]!*b[0]!-a[0]!*b[2]!,a[0]!*b[1]!-a[1]!*b[0]!];
    return Math.atan2(Math.hypot(...cross),a.reduce((sum,v,i)=>sum+v*b[i]!,0))*180/Math.PI*3600;};
  const productionErrorArcsec=error(production.hourly), mutationErrorArcsec=error(changed.hourly);
  assert(productionErrorArcsec<.01);assert.throws(()=>assert(mutationErrorArcsec<.01),{code:'ERR_ASSERTION'});
  const published={scope:'Actual new-code Sky report time model, from isolated HTTP production controller/service with deterministic spot/weather fixture. Not the running v33 native candidate or a deployed service.',
    selectedAt,contextSha256:sha(context.contextId),observer:model.observer,timeModel:model};
  await fs.writeFile(publication,JSON.stringify(published,null,2)+'\n',{flag:'wx'});
  const inputs=['packages/miniapp-contracts/src/types.ts','packages/miniapp-contracts/src/api-shapes.ts',
    'packages/miniapp-contracts/src/sky-time-model.ts','packages/miniapp-contracts/src/sky-lunar-phase.ts',
    'packages/astronomy-core/src/sky-time-model.ts','packages/astronomy-core/src/observation-frame.ts',
    'packages/astronomy-core/src/stellar-vectors.ts','packages/astronomy-core/src/astronomy-engine-runtime.ts',
    'workers/miniapp-api/src/sky-time-model-provider.ts','workers/miniapp-api/src/astronomy-engine-adapter.ts',
    'workers/miniapp-api/src/astronomy-service.ts','workers/miniapp-api/src/celestial-object-position.ts',
    'workers/miniapp-api/src/sky-time-model.test.ts','workers/miniapp-api/src/stellar-scene-client.test.ts',
    'apps/wechat-miniapp/src/services/sky-report-catalog.ts','apps/wechat-miniapp/src/services/sky-report-time-model.ts',
    'packages/astronomy-core/package.json','package-lock.json','node_modules/quaternion/dist/quaternion.mjs'];
  const record={scope:published.scope,contextSha256:published.contextSha256,selectedAt,observer:model.observer,
    publishedCandidate:{file:path.relative(root,publication).replaceAll('\\','/'),sha256:sha(await fs.readFile(publication))},
    sourceState:report.dataState,catalogVersion:report.data.skyScene.catalog.catalogVersion,catalogHash:report.data.skyScene.catalog.catalogHash,
    model:{format:model.format,method:model.method,algorithmVersion:model.algorithmVersion,startAt:model.startAt,endAt:model.endAt,knots:model.knots.length,bodiesPerKnot:9,jsonRawBytes:Buffer.byteLength(JSON.stringify(model))},
    http:{coldReportRawBytes:bytes.length,coldHttpMs,warmHttpMs,finePositions:http,afterCoverageStatus:boundary.status},
    nodeMeasurements:{provider:summarize(providerMs),evaluator:summarize(evaluateMs),validatedBoundaryAndEvaluator:summarize(boundMs)},
    boundedMutation:{sourceSha256:sha(source),replacement:'Normalized linear direction instead of provider derivative Hermite; bundled in memory, production file untouched.',productionErrorArcsec,mutationErrorArcsec,regressionThresholdArcsec:.01,mutationRejected:true},
    inputs:await Promise.all(inputs.map(async file=>({file,sha256:sha(await fs.readFile(path.join(root,file)))}))),
    limits:['Actual ephemeral local HTTP and genuine astronomy/catalogue paths; deterministic fixture point/weather are SAMPLE_DATA and are not field weather or target acceptance.',
      'The existing v33/s9 native candidate and8791 runtime were not replaced. New model/API support is not continuous page playback, a new Context clock, phone acceptance or final review.',
      'Node timings and raw JSON bytes are not device frame time, whole-renderer memory, compressed cloud traffic, fees or an accepted performance budget.',
      'The model publishes geometry only. Public time intent, target/advice/weather/source semantics, image queues, selection/tracking, pause/commit/cancel/hide/midnight and final UI composition remain to integrate.']};
  assert(!JSON.stringify(record).includes(context.contextId));
  await fs.writeFile(output,JSON.stringify(record,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({output:path.relative(root,output),sha256:sha(await fs.readFile(output)),model:record.model,nodeMeasurements:record.nodeMeasurements,mutation:record.boundedMutation,http:{rawBytes:bytes.length,coldHttpMs,warmHttpMs,statuses:http.map(row=>row.status),afterCoverageStatus:boundary.status}}));
} finally {await app.close();await service.onModuleDestroy();}
