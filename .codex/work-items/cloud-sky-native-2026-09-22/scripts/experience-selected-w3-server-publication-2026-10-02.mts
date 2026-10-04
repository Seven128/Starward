/** Authored current/archive public identity path. Offline HTTP injection/FS, no source acquisition or pixel processing. */
import 'reflect-metadata';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { assertDeepSkyImageDiscovery } from '@starward/miniapp-contracts';
import { MiniappController } from '../../../../workers/miniapp-api/src/controller.ts';
import { MiniappService } from '../../../../workers/miniapp-api/src/miniapp-service.ts';
import { createTestMiniappService } from '../../../../workers/miniapp-api/src/test-fixtures/create-test-service.ts';
import { exportSkyPublicAssets } from '../../../../workers/miniapp-api/src/sky-public-asset-export.ts';
import { validateSkyStaticBundle } from '../../../../tools/deployment/sky-static-bundle.mjs';
const ROOT=fileURLToPath(new URL('../../../../',import.meta.url));
const hash=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
const bind=(name:string)=>{const b=fs.readFileSync(path.join(ROOT,name));return {path:name,bytes:b.length,sha256:hash(b)}};
let output='output/selected-w3-server-publication-1002-r1';for(let n=2;fs.existsSync(path.join(ROOT,output));n++)output=`output/selected-w3-server-publication-1002-r${n}`;
const dir=path.join(ROOT,output);fs.mkdirSync(dir);
const save=(name:string,value:unknown)=>fs.writeFileSync(path.join(dir,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const files=['packages/miniapp-contracts/src/deep-sky-image-publication.ts','packages/miniapp-contracts/src/api-shapes.ts',
 'packages/miniapp-contracts/src/index-types.ts','packages/miniapp-contracts/src/index.ts',
 'packages/miniapp-contracts/api/miniapp.operations.json','packages/miniapp-contracts/src/generated/miniapp-api.generated.ts',
 'workers/miniapp-api/src/deep-sky-imagery.ts','workers/miniapp-api/src/deep-sky-imagery.test.ts',
 'workers/miniapp-api/src/deep-sky-image-http.test.ts','workers/miniapp-api/src/controller.ts',
 'workers/miniapp-api/src/sky-public-asset-headers.ts','workers/miniapp-api/src/sky-public-asset-export.ts','tools/deployment/sky-static-bundle.mjs'];
const before=files.map(bind);files.forEach((n,i)=>fs.copyFileSync(path.join(ROOT,n),path.join(dir,`${i}-${path.basename(n)}.txt`),fs.constants.COPYFILE_EXCL));
fs.copyFileSync(fileURLToPath(import.meta.url),path.join(dir,'executed-script.mts.txt'),fs.constants.COPYFILE_EXCL);
const walk=(name:string):ReturnType<typeof bind>[]=>fs.readdirSync(path.join(ROOT,name),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(name+'/'+e.name):e.isFile()?[bind(name+'/'+e.name)]:[]);
const assets=walk('workers/miniapp-api/assets/deep-sky');assert.equal(assets.length,201);
const preserved=JSON.parse(fs.readFileSync(path.join(ROOT,'.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json'),'utf8'));
for(const item of preserved)assert.equal(bind(item.path).sha256,item.sha256);
let app:NestFastifyApplication|undefined;
try{
 const exportResult=await exportSkyPublicAssets(path.join(dir,'export'));
 const bundle=await validateSkyStaticBundle(exportResult.output);
 const selectedRecords=bundle.records.filter((r:{route:string})=>r.route.startsWith('/v2/sky/deep-sky/'));
 assert.equal(selectedRecords.length,765);assert.equal(bundle.files,901);
 const current=JSON.parse(fs.readFileSync(path.join(ROOT,'workers/miniapp-api/assets/deep-sky/manifest.json'),'utf8'));
 const publicationHashes=[hash(JSON.stringify(current)),...current.previousPublicationHashes];
 const metadata=publicationHashes.map(h=>({hash:h,value:h===publicationHashes[0]?current:JSON.parse(fs.readFileSync(path.join(ROOT,`workers/miniapp-api/assets/deep-sky/publications/${h}.json`),'utf8'))}));
 const selectedByRoute=new Map(selectedRecords.map((r:any)=>[r.route,r]));
 const actualInput=[];
 for(const pub of metadata){assert.equal(hash(JSON.stringify(pub.value)),pub.hash);
  for(const entry of pub.value.entries)for(const [level,a] of Object.entries(entry.levels) as [string,any][]){
   const route=`/v2/sky/deep-sky/${pub.hash}/${a.file}`,record:any=selectedByRoute.get(route);
   assert.ok(record,route);assert.equal(record.bytes,a.bytes);assert.equal(record.sha256,a.sha256);
   const original=await fsp.readFile(path.join(ROOT,'workers/miniapp-api/assets/deep-sky',a.file));
   assert.equal(original.length,a.bytes);assert.equal(hash(original),a.sha256);
   const exported=await fsp.readFile(path.join(exportResult.output,'files',route));assert.ok(original.equals(exported));
   assert.equal(record.headers['x-starward-image-publication-hash'],pub.hash);
   assert.equal(record.headers['x-starward-image-source-id'],`imagery:${pub.value.publicationId}:${pub.hash}`);
   const support=record.headers['x-starward-image-display-support'];
   assert.deepEqual(support?JSON.parse(support):undefined,a.displaySupport);
   actualInput.push({route,reference:entry.objectRef,level,inputFile:a.file,sha256:a.sha256,bytes:a.bytes,originalSupport:a.displaySupport??null});
  }
 }
 const service=createTestMiniappService();class TestModule{};
 Module({controllers:[MiniappController],providers:[{provide:MiniappService,useValue:service}]})(TestModule);
 app=await NestFactory.create<NestFastifyApplication>(TestModule,new FastifyAdapter(),{logger:false});await app.init();
 const http=app.getHttpAdapter().getInstance(),httpReadbacks=[];
 for(const record of selectedRecords){
  const r=await http.inject({method:'GET',url:record.route});assert.equal(r.statusCode,200,record.route);
  assert.equal(hash(r.rawPayload),record.sha256);assert.equal(r.rawPayload.length,record.bytes);
  for(const [name,value] of Object.entries(record.headers))assert.equal(r.headers[name],value,record.route+':'+name);
  httpReadbacks.push({route:record.route,status:r.statusCode,sha256:hash(r.rawPayload),bytes:r.rawPayload.length,headers:r.headers});
 }
 const discoveries=[];
 for(const entry of current.entries){const response=await http.inject({method:'GET',url:`/v2/sky/deep-sky/selected/${encodeURIComponent(entry.objectRef)}?imageVersion=source-finite-v3`});
  assert.equal(response.statusCode,200);assert.equal(response.headers['cache-control'],'no-cache');
  const d=response.json();assertDeepSkyImageDiscovery(d,entry.objectRef);assert.equal(d.publicationHash,publicationHashes[0]);
  for(const [level,a] of Object.entries(entry.levels) as [string,any][]){const descriptor=d.levels[level];
   assert.equal(descriptor.sha256,a.sha256);assert.equal(descriptor.bytes,a.bytes);assert.equal(descriptor.fieldDegrees,a.fieldDegrees);
   assert.equal(descriptor.pixels,a.pixels);assert.equal(descriptor.coverageState,'NOT_MEASURED');assert.equal(descriptor.validFraction,null);
   assert.deepEqual(descriptor.sourceFiniteMask,a.sourceFiniteMask);assert.deepEqual(descriptor.displaySupport,a.displaySupport);
  }
  discoveries.push({reference:entry.objectRef,status:response.statusCode,bodyBytes:response.rawPayload.length,bodySha256:hash(response.rawPayload),discovery:d});
 }
 const oldHash='87ab6341b43d660e3c93a2430994c0f38b409dafa86216e7e3313e98cdbbc073';
 const old=service.deepSkyImages.manifest(oldHash).entries.find((e:any)=>e.objectRef==='M:42')!.levels.DETAIL;
 const stable=await service.deepSkyImages.getByFile(oldHash,old.file),legacy=await service.deepSkyImages.get('M:42','DETAIL',oldHash);
 assert.deepEqual(stable.bytes,legacy.bytes);assert.equal(stable.displaySupport,undefined);assert.ok(legacy.displaySupport);
 const mutation={sameBytes:hash(stable.bytes)===hash(legacy.bytes),samePublication:stable.publicationHash===legacy.publicationHash,
  archivedSupport:old.displaySupport??null,immutableSupport:stable.displaySupport??null,legacyRefinement:legacy.displaySupport,
  incorrectDelegateDetected:!Object.is(stable.displaySupport,legacy.displaySupport)};
 const run=spawnSync(process.execPath,[path.join(ROOT,'tools/run-node.cjs'),'--import','tsx','--test','src/deep-sky-imagery.test.ts','src/deep-sky-image-http.test.ts','src/sky-public-asset-export.test.ts'],
  {cwd:path.join(ROOT,'workers/miniapp-api'),encoding:'utf8',timeout:60000,maxBuffer:2*1024*1024});
 fs.writeFileSync(path.join(dir,'focused-checks.txt'),(run.stdout??'')+(run.stderr??''),{flag:'wx'});assert.equal(run.status,0);
 assert.deepEqual(files.map(bind),before);assert.deepEqual(walk('workers/miniapp-api/assets/deep-sky'),assets);
 for(const item of preserved)assert.equal(bind(item.path).sha256,item.sha256);
 save('result.json',{status:'PASS',sourceBindings:before,exportResult,bundle:{files:bundle.files,bytes:bundle.bytes,publicationHash:bundle.publicationHash},
  selectedFiles:selectedRecords.length,publicationHashes,actualInput,httpReadbacks,discoveries,snapshotMutation:mutation,
  checks:{exitCode:run.status,log:bind(output+'/focused-checks.txt')},preservedUnchanged:preserved,historicalAssetsUnchanged:assets,
  scope:['All 765 current/allowed-archive W3 route records checked against original admitted raw manifests and exact local source bytes; full fresh bundle validated/read back.',
   'All 765 actual in-process Nest/Fastify HTTP route bytes/headers match exported files; 51 current discovery responses match their selected raw metadata.',
   'No upstream request, image processing/decode/source acquisition, cloud deployment/image build, Caddy/native runtime or quality acceptance. Shared static JSON escaping/Caddy roundtrip is parent-owned pending evidence.',
   'Archive metadata mutation oracle distinguishes identical-byte legacy refinements from the new immutable route; all old 201 assets and six retained files unchanged.']});
}catch(error){save('failure.json',{status:'FAILED',message:String(error),stack:(error as Error).stack,sourceBindings:before});process.exitCode=1;}
finally{await app?.close();}
console.log(JSON.stringify({output,result:bind(output+(fs.existsSync(path.join(dir,'result.json'))?'/result.json':'/failure.json'))},null,2));
