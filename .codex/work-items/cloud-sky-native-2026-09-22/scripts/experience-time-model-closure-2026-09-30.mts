import 'reflect-metadata';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { TEST_PUBLISHED_SPOT } from '@starward/miniapp-contracts/test-fixtures';
import { evaluateSkyTimeModel } from '@starward/astronomy-core/sky-time-model';
import { MiniappController } from '../../../../workers/miniapp-api/dist/controller.js';
import { MiniappService } from '../../../../workers/miniapp-api/dist/miniapp-service.js';
import { createTestRuntimeConfig } from '../../../../workers/miniapp-api/dist/runtime-config.js';
import { createBsc5pSkyCatalogProvider } from '../../../../workers/miniapp-api/dist/sky-scene-catalog-provider.js';
import { DisabledPlaceSearchAdapter } from '../../../../workers/miniapp-api/dist/place-provider.js';
import { DisabledRouteAdapter } from '../../../../workers/miniapp-api/dist/route-provider.js';
import { MemoryMediaObjectStore } from '../../../../workers/miniapp-api/dist/media-object-store.js';
import { DeterministicWeatherTestAdapter } from '../../../../workers/miniapp-api/src/test-fixtures/deterministic-weather-adapter.ts';
import { InMemoryTestRepository } from '../../../../workers/miniapp-api/src/test-fixtures/in-memory-repository.ts';
import { createResponseCache, RESPONSE_CACHE_LIMITS, RESPONSE_CACHE_STORAGE_KEY } from '../../../../apps/wechat-miniapp/src/services/response-cache.ts';
import { projectSkyTimeModel } from '../../../../apps/wechat-miniapp/src/services/sky-report-time-model.ts';

const root=fileURLToPath(new URL('../../../../',import.meta.url));
const output=fileURLToPath(new URL('../evidence/experience-time-model-closure-2026-09-30.json',import.meta.url));
await assert.rejects(fs.access(output),{code:'ENOENT'});
assert(process.execArgv.includes('--conditions=production'),'Run with production package exports');
const sha=(value:string|Uint8Array)=>createHash('sha256').update(value).digest('hex');
const prior=JSON.parse(await fs.readFile(new URL('../evidence/experience-time-model-service-bound-2026-09-29.json',import.meta.url),'utf8'));
const publication=JSON.parse(await fs.readFile(path.join(root,prior.publishedCandidate.file),'utf8'));
const changedInputs=[];
const inputs=[];
for(const input of prior.inputs) {
  const current=sha(await fs.readFile(path.join(root,input.file)));
  inputs.push({file:input.file,sha256:current});
  if(current!==input.sha256) changedInputs.push({file:input.file,priorSha256:input.sha256,sha256:current});
}
assert.deepEqual(changedInputs.map(input=>input.file).sort(),[
  'packages/miniapp-contracts/src/sky-time-model.ts','workers/miniapp-api/src/sky-time-model.test.ts'].sort());
const service=new MiniappService({config:createTestRuntimeConfig(),repository:new InMemoryTestRepository(),
  weather:new DeterministicWeatherTestAdapter(),route:new DisabledRouteAdapter(),placeSearch:new DisabledPlaceSearchAdapter(),
  mediaStore:new MemoryMediaObjectStore(),skyCatalog:createBsc5pSkyCatalogProvider()});
const selectedAt=publication.selectedAt, fineAt=new Date(Date.parse(selectedAt)+1000).toISOString();
const context=(await service.resolveObservationContext({location:{kind:'FORMAL_SPOT',spotId:TEST_PUBLISHED_SPOT.spotId},localDate:'2026-09-29',selectedAt})).data;
class CheckModule {}
Module({controllers:[MiniappController],providers:[{provide:MiniappService,useValue:service}]})(CheckModule);
const app=await NestFactory.create(CheckModule,new FastifyAdapter(),{logger:false});
try {
  await app.listen(0,'127.0.0.1');
  const route=(await app.getUrl())+`/v2/spots/${encodeURIComponent(TEST_PUBLISHED_SPOT.spotId)}/sky`;
  const query=`?contextId=${encodeURIComponent(context.contextId)}&catalogVersion=bsc5p-bright-stars.v3`;
  const response=await fetch(route+query);assert.equal(response.status,200);
  const bytes=Buffer.from(await response.arrayBuffer()),report=JSON.parse(bytes.toString('utf8'));
  assert.deepEqual(report.data.timeModel,publication.timeModel,'Final compiled geometry equals frozen dense published model');
  const geometry=evaluateSkyTimeModel(report.data.timeModel,fineAt);assert.equal(geometry?.at,fineAt);
  const positionResponse=await fetch(route+'/objects/HR%3A7557'+query+'&at='+encodeURIComponent(fineAt));
  const position=await positionResponse.json();assert.equal(positionResponse.status,200);assert.equal(position.data.at,fineAt);

  const storageData=new Map<string,unknown>(),writes:Array<{bytes:number,sync:boolean}>=[];
  const storage={getStorageSync:(key:string)=>structuredClone(storageData.get(key)),
    getStorageInfoSync:()=>({keys:[...storageData.keys()]}),removeStorageSync:(key:string)=>{storageData.delete(key);},
    setStorageSync:(key:string,data:unknown)=>{writes.push({bytes:Buffer.byteLength(JSON.stringify(data)),sync:true});storageData.set(key,structuredClone(data));},
    setStorage:async({key,data}:{key:string,data:string})=>{writes.push({bytes:Buffer.byteLength(JSON.stringify(data)),sync:false});storageData.set(key,data);}};
  const clock=Date.parse(selectedAt),key='spot-sky:continuous-geometry-cache-check';
  const cache=createResponseCache(storage,()=>clock);cache.set(key,report);await cache.flush();
  const descriptor=(storageData.get(RESPONSE_CACHE_STORAGE_KEY) as any).entries.find((row:any)=>row[0]===key)?.[1];
  assert(descriptor);assert(descriptor.storageBytes<=RESPONSE_CACHE_LIMITS.persistedItemBytes);
  assert.equal(writes.filter(write=>write.sync).length,1,'One metadata commit, no synchronous body writes');
  const restarted=createResponseCache(storage,()=>clock+1000);restarted.load();
  const restored=restarted.get(key);assert(restored);assert.equal(restored.text,JSON.stringify(report));
  const projected=projectSkyTimeModel(restored.envelope as typeof report);
  assert.deepEqual(projected.data.timeModel,report.data.timeModel);
  assert.deepEqual(evaluateSkyTimeModel(projected.data.timeModel,fineAt),geometry);
  restarted.invalidate(candidate=>candidate===key);
  assert.equal(restarted.get(key),undefined);assert.equal(storageData.size,0);

  const releaseFiles=['workers/miniapp-api/dist/controller.js','workers/miniapp-api/dist/miniapp-service.js',
    'workers/miniapp-api/dist/astronomy-service.js','workers/miniapp-api/dist/sky-time-model-provider.js',
    'workers/miniapp-api/dist/celestial-object-position.js','packages/astronomy-core/dist/src/sky-time-model.js',
    'packages/miniapp-contracts/dist/sky-time-model.js'];
  const record={scope:'Final compiled production exports/controller/service with deterministic repository/weather fixtures. Existing cache storage API is emulated in memory; no native device/cache, running 8791 or v33 candidate modification.',
    priorBinding:{file:'.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-time-model-service-bound-2026-09-29.json',sha256:sha(await fs.readFile(new URL('../evidence/experience-time-model-service-bound-2026-09-29.json',import.meta.url)))},
    changedInputs,changeMeaning:'Array.from rejects sparse internal knot/body arrays; regression covers them. Dense geometry, evaluator and provider unchanged.',
    compiledHttp:{status:response.status,rawBytes:bytes.length,sourceState:report.dataState,modelEqualsFrozenPublication:true,finePositionStatus:positionResponse.status,fineAt:position.data.at,contextSha256:sha(context.contextId)},
    cache:{limits:RESPONSE_CACHE_LIMITS,rawBodyBytes:descriptor.bytes,serializedStorageBytes:descriptor.storageBytes,chunks:descriptor.chunks,
      maximumStorageWriteBytes:Math.max(...writes.filter(write=>!write.sync).map(write=>write.bytes)),metadataWriteBytes:writes.find(write=>write.sync)!.bytes,
      restartReadbackExact:true,projectedModelExact:true,fineGeometryReadbackExact:true,ownedInvalidationRemovedChunks:true},
    releaseFiles:await Promise.all(releaseFiles.map(async file=>({file,sha256:sha(await fs.readFile(path.join(root,file)))}))),inputs,
    limits:['No cache limit changes. This example fits existing bounds; arbitrary report growth and physical wx storage remain separately bounded/unverified.',
      'Compiled release imports and real local HTTP are verified; fixture weather remains SAMPLE_DATA. No deployment/native playback/device performance/final independent review claim.',
      'Prior numerical/byte/timing evidence remains frozen under its own source binding. Only the two enumerated validation/regression inputs changed.']};
  assert(!JSON.stringify(record).includes(context.contextId));
  await fs.writeFile(output,JSON.stringify(record,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({output:path.relative(root,output),sha256:sha(await fs.readFile(output)),compiledHttp:record.compiledHttp,cache:record.cache,changedInputs:changedInputs.map(input=>input.file)}));
} finally {await app.close();await service.onModuleDestroy();}
