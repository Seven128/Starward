import 'reflect-metadata';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {Module} from '@nestjs/common';
import {NestFactory} from '@nestjs/core';
import {FastifyAdapter,type NestFastifyApplication} from '@nestjs/platform-fastify';
import {assertDeepSkyImageDiscovery} from '@starward/miniapp-contracts';
import {DeepSkyImageryService} from '../../../../workers/miniapp-api/src/deep-sky-imagery.ts';
import {MiniappController} from '../../../../workers/miniapp-api/src/controller.ts';
import {MiniappService} from '../../../../workers/miniapp-api/src/miniapp-service.ts';
import {createTestMiniappService} from '../../../../workers/miniapp-api/src/test-fixtures/create-test-service.ts';

const root=fileURLToPath(new URL('../../../../',import.meta.url)),file=(p:string)=>path.join(root,p);
const sha=(v:Uint8Array|string)=>createHash('sha256').update(v).digest('hex');
const bind=(p:string)=>{const b=fs.readFileSync(file(p));return{path:p,bytes:b.length,sha256:sha(b)}};
const out=process.argv[2];assert.match(out??'',/^output\/[a-z0-9-]+$/);assert.ok(!fs.existsSync(file(out)));fs.mkdirSync(file(out));
const save=(p:string,v:unknown)=>fs.writeFileSync(file(out+'/'+p),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
fs.copyFileSync(fileURLToPath(import.meta.url),file(out+'/executed-script.mts.txt'),fs.constants.COPYFILE_EXCL);
const sourceNames=['packages/miniapp-contracts/src/deep-sky-image-publication.ts','packages/miniapp-contracts/src/sky-image-display-support.ts',
 'packages/miniapp-contracts/api/miniapp.operations.json','packages/miniapp-contracts/src/generated/miniapp-api.generated.ts',
 'workers/miniapp-api/src/deep-sky-imagery.ts','workers/miniapp-api/src/controller.ts','workers/miniapp-api/src/miniapp-service.ts',
 'workers/miniapp-api/src/test-fixtures/create-test-service.ts','workers/miniapp-api/src/sky-public-asset-headers.ts',
 'packages/astronomy-core/src/deep-sky-catalog.ts','packages/astronomy-core/src/deep-sky-catalog-data.ts',
 'packages/astronomy-core/data/opengc-messier-deep-sky.v1.json','packages/astronomy-core/data/opengc-messier-deep-sky.v1.manifest.json'];
const sources=sourceNames.map(bind);for(let i=0;i<sourceNames.length;i++)fs.copyFileSync(file(sourceNames[i]!),file(out+'/'+i+'-'+path.basename(sourceNames[i]!)+'.txt'),fs.constants.COPYFILE_EXCL);
const protectedFiles=[...sources];
const baseline=JSON.parse(fs.readFileSync(file('.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json'),'utf8'));
for(const b of baseline){assert.equal(bind(b.path).sha256,b.sha256);protectedFiles.push(bind(b.path))}
for(const p of fs.readdirSync(file('workers/miniapp-api/assets/deep-sky'),{recursive:true,withFileTypes:true}) as any[])if(p.isFile())protectedFiles.push(bind(path.relative(root,path.join(p.parentPath,p.name)).replaceAll('\\','/')));
const current=JSON.parse(fs.readFileSync(file('workers/miniapp-api/assets/deep-sky/manifest.json'),'utf8')),currentHash=sha(JSON.stringify(current));
assert.equal(currentHash,'8b970f207d1b99b3b92e74eb68f0aa6a7ca1f7b5ac51ad86e9d0c6e239540054');
const publications=[{hash:currentHash,raw:current},...current.previousPublicationHashes.map((hash:string)=>({hash,raw:JSON.parse(fs.readFileSync(file('workers/miniapp-api/assets/deep-sky/publications/'+hash+'.json'),'utf8'))}))];
assert.equal(publications.length,5);for(const p of publications)assert.equal(sha(JSON.stringify(p.raw)),p.hash);
const levels=['OVERVIEW','MEDIUM','DETAIL'] as const,cases:any[]=[],httpResults:any[]=[],selected:any[]=[];
let app:NestFastifyApplication|undefined;
try{
 const images=new DeepSkyImageryService(),service=createTestMiniappService({deepSkyImages:images});class ReviewModule{};
 Module({controllers:[MiniappController],providers:[{provide:MiniappService,useValue:service}]})(ReviewModule);
 app=await NestFactory.create<NestFastifyApplication>(ReviewModule,new FastifyAdapter(),{logger:false});await app.init();const http=app.getHttpAdapter().getInstance();
 for(const publication of publications){
  for(const reference of ['M:42','M:31']){
   const entry=publication.raw.entries.find((e:any)=>e.objectRef===reference);assert.ok(entry);
   for(const level of levels){
    const raw=entry.levels[level],route=`/v2/sky/deep-sky/${publication.hash}/${raw.file}`,original=fs.readFileSync(file('workers/miniapp-api/assets/deep-sky/'+raw.file));
    assert.equal(original.length,raw.bytes);assert.equal(sha(original),raw.sha256);
    const reply=await http.inject({method:'GET',url:route});assert.equal(reply.statusCode,200);assert.deepEqual(reply.rawPayload,original);
    const expectedHeaders:Record<string,string>={'content-type':raw.imageFormat==='png'?'image/png':'image/jpeg','cache-control':'public, max-age=31536000, immutable',
     'x-content-type-options':'nosniff','x-starward-image-source':'NASA/IPAC IRSA - AllWISE W3 12um','x-starward-image-field-degrees':String(raw.fieldDegrees),
     'x-starward-image-publication-hash':publication.hash,'x-starward-image-source-id':`imagery:${publication.raw.publicationId}:${publication.hash}`,'x-starward-image-pixels':String(raw.pixels)};
    if(raw.sourceFiniteMask)expectedHeaders['x-starward-image-missing-pixels']=String(raw.sourceFiniteMask.missingPixels);
    if(raw.displaySupport)expectedHeaders['x-starward-image-display-support']=JSON.stringify(raw.displaySupport);
    for(const [key,value]of Object.entries(expectedHeaders))assert.equal(reply.headers[key],value,route+':'+key);
    for(const key of ['x-starward-image-missing-pixels','x-starward-image-display-support'])if(!Object.hasOwn(expectedHeaders,key))assert.equal(reply.headers[key],undefined,route+':'+key);
    const actual=await images.getByFile(publication.hash,raw.file);assert.equal(actual.descriptor.validFraction,null);assert.equal(actual.descriptor.coverageState,'NOT_MEASURED');
    assert.equal(actual.descriptor.downloadUrl,route);assert.equal(actual.descriptor.width,raw.pixels);assert.equal(actual.descriptor.height,raw.pixels);
    assert.deepEqual(actual.descriptor.sourceFiniteMask,raw.sourceFiniteMask);assert.deepEqual(actual.descriptor.displaySupport,raw.displaySupport);
    httpResults.push({route,reference,level,status:reply.statusCode,bytes:reply.rawPayload.length,sha256:sha(reply.rawPayload),headers:reply.headers,expectedHeaders});
   }
  }
 }
 cases.push({name:'actual immutable HTTP source metadata stays at each original raw publication',status:'PASS',publications:5,objectsPerPublication:2,images:httpResults.length});
 for(const entry of current.entries){
  const discovered=images.discovery(entry.objectRef);assertDeepSkyImageDiscovery(discovered,entry.objectRef);
  assert.equal(discovered.publicationHash,currentHash);assert.equal(discovered.publicationId,current.publicationId);assert.equal(discovered.sourceId,`imagery:${current.publicationId}:${currentHash}`);
  assert.equal(discovered.source.id,discovered.sourceId);assert.deepEqual(discovered.center,entry.center);assert.equal(discovered.orientation,entry.orientation);
  for(const level of levels){const actual=discovered.levels[level],raw=entry.levels[level];
   for(const key of ['file','sha256','bytes','fieldDegrees','pixels'])assert.equal((actual as any)[key],raw[key]);
   assert.equal(actual.format,raw.imageFormat==='png'?'png':'jpeg');assert.equal(actual.downloadUrl,`/v2/sky/deep-sky/${currentHash}/${raw.file}`);
   assert.equal(actual.validFraction,null);assert.equal(actual.coverageState,'NOT_MEASURED');assert.deepEqual(actual.sourceFiniteMask,raw.sourceFiniteMask);assert.deepEqual(actual.displaySupport,raw.displaySupport);
  }
  selected.push({reference:entry.objectRef,publicationHash:discovered.publicationHash,bytes:Buffer.byteLength(JSON.stringify(discovered)),snapshot:discovered});
 }
 assert.equal(selected.length,51);cases.push({name:'all current selected discovery descriptors independently match raw manifest',status:'PASS',entries:selected.length});
 const archive=publications.find(p=>p.hash==='87ab6341b43d660e3c93a2430994c0f38b409dafa86216e7e3313e98cdbbc073');assert.ok(archive);
 const archived=archive.raw.entries.find((e:any)=>e.objectRef==='M:42').levels.DETAIL;
 const immutable=await images.getByFile(archive.hash,archived.file),legacy=await images.get('M:42','DETAIL',archive.hash);
 const now=await images.getByFile(currentHash,current.entries.find((e:any)=>e.objectRef==='M:42').levels.DETAIL.file);
 assert.deepEqual(immutable.bytes,now.bytes);assert.deepEqual(immutable.bytes,legacy.bytes);assert.equal(archived.displaySupport,undefined);assert.equal(immutable.displaySupport,undefined);assert.ok(legacy.displaySupport);
 let detected=false;try{assert.deepEqual({...immutable.descriptor,displaySupport:legacy.displaySupport}.displaySupport,archived.displaySupport)}catch{detected=true}assert.ok(detected);
 cases.push({name:'same encoded bytes cannot license immutable archive to inherit legacy refinement',status:'PASS',archive:archive.hash,sha256:sha(immutable.bytes),rawSupport:archived.displaySupport??null,
  immutableSupport:immutable.displaySupport??null,legacySupport:legacy.displaySupport,incorrectDelegateDetected:detected});
 const metadataOnly=new DeepSkyImageryService();let imageReads=0;(metadataOnly as any).readAsset=()=>{imageReads++;throw Error('independent_unexpected_image_read')};
 const metadata=metadataOnly.discovery('M:42');assertDeepSkyImageDiscovery(metadata,'M:42');assert.equal(imageReads,0);
 await assert.rejects(metadataOnly.getByFile(currentHash,metadata.levels.DETAIL.file),/independent_unexpected_image_read/);assert.equal(imageReads,1);
 metadata.center.raDeg=0;metadata.levels.DETAIL.fieldDegrees=8;metadata.source.limitations=[];
 const fresh=metadataOnly.discovery('M:42'),rawM42=current.entries.find((e:any)=>e.objectRef==='M:42');assert.deepEqual(fresh.center,rawM42.center);assert.equal(fresh.levels.DETAIL.fieldDegrees,rawM42.levels.DETAIL.fieldDegrees);assert.ok(fresh.source.limitations.length);
 cases.push({name:'metadata discovery precedes image bytes and caller mutations do not rewrite publisher state',status:'PASS',imageReadsAtDiscovery:0,imageReadTrapTriggeredByActualImage:1});
 const invalid:any[]=[];
 const reject=(name:string,change:(v:any)=>void)=>{const data=JSON.parse(JSON.stringify(images.discovery('M:42')));change(data);let error:string|undefined;try{assertDeepSkyImageDiscovery(data,'M:42')}catch(e){error=String(e)}assert.ok(error,name);invalid.push({name,error})};
 reject('another object',v=>v.objectRef='M:31');reject('another publication source',v=>v.sourceId='imagery:other:'+v.publicationHash);
 reject('cross object URL',v=>v.levels.DETAIL.downloadUrl=v.levels.DETAIL.downloadUrl.replace('/M-42/','/M-31/'));
 reject('query changes immutable identity',v=>v.levels.DETAIL.downloadUrl+='?level=OVERVIEW');reject('impossible dimension',v=>v.levels.DETAIL.width=256);
 reject('false scientific full coverage',v=>v.levels.DETAIL.validFraction=1);reject('nonfinite total inconsistent',v=>v.levels.DETAIL.sourceFiniteMask.finitePixels++);
 reject('different display bytes',v=>v.levels.DETAIL.displaySupport.sourceSha256='0'.repeat(64));reject('source finite mask conflates JPEG',v=>{v.levels.DETAIL.format='jpeg';v.levels.DETAIL.file='M-42/M-42-detail.jpg';v.levels.DETAIL.downloadUrl=`/v2/sky/deep-sky/${v.publicationHash}/${v.levels.DETAIL.file}`});
 cases.push({name:'contract rejects false identity/coverage/shape/metadata coupling',status:'PASS',rejected:invalid});
 const missing=Array.from({length:110},(_,i)=>'M:'+(i+1)).find(ref=>!current.entries.some((e:any)=>e.objectRef===ref));assert.ok(missing);
 const statusCases=[
  [`/v2/sky/deep-sky/selected/${encodeURIComponent(missing)}?imageVersion=source-finite-v3`,404],
  ['/v2/sky/deep-sky/selected/M%3A42?imageVersion=unsupported',400],
  [`/v2/sky/deep-sky/${'0'.repeat(64)}/${rawM42.levels.DETAIL.file}`,404],
  [`/v2/sky/deep-sky/${currentHash}/M-31/${path.basename(rawM42.levels.DETAIL.file)}`,404],
  [`/v2/sky/deep-sky/${currentHash}/M-42/source.fits`,404],
  [`/v2/sky/deep-sky/${currentHash}/M-42/manifest.json`,404],
 ] as const;
 const failures=[];for(const [route,status]of statusCases){const response=await http.inject({method:'GET',url:route});assert.equal(response.statusCode,status,route);failures.push({route,status:response.statusCode,body:response.body})}
 const discoveredHttp=await http.inject({method:'GET',url:'/v2/sky/deep-sky/selected/M%3A42?imageVersion=source-finite-v3'});assert.equal(discoveredHttp.statusCode,200);assert.equal(discoveredHttp.headers['cache-control'],'no-cache');assertDeepSkyImageDiscovery(discoveredHttp.json(),'M:42');
 const legacyHttp=await http.inject({method:'GET',url:'/v2/celestial-objects/M%3A42/image?level=DETAIL'});assert.equal(legacyHttp.statusCode,200);assert.equal(legacyHttp.headers['x-starward-image-publication-hash'],current.legacyPublicationHash);assert.equal(legacyHttp.headers['content-type'],'image/jpeg');
 cases.push({name:'actual HTTP discovery/legacy compatibility and restricted routes',status:'PASS',failures,discovery:{headers:discoveredHttp.headers,body:discoveredHttp.json()},legacy:{headers:legacyHttp.headers,sha256:sha(legacyHttp.rawPayload)}});
 const corruptDirectory=file(out+'/corrupt');fs.mkdirSync(corruptDirectory);fs.mkdirSync(path.join(corruptDirectory,'M-42'));
 const corrupted=Buffer.from(now.bytes);corrupted[100]=corrupted[100]!^1;fs.writeFileSync(path.join(corruptDirectory,rawM42.levels.DETAIL.file),corrupted,{flag:'wx'});fs.writeFileSync(path.join(corruptDirectory,'manifest.json'),JSON.stringify(current),{flag:'wx'});
 await assert.rejects(new DeepSkyImageryService(pathToFileURL(path.join(corruptDirectory,'manifest.json'))).getByFile(currentHash,rawM42.levels.DETAIL.file),/asset_invalid/);
 const shapeDirectory=file(out+'/wrong-shape');fs.mkdirSync(shapeDirectory);fs.mkdirSync(path.join(shapeDirectory,'M-42'));const wrongShape=Buffer.from(now.bytes);wrongShape.writeUInt32BE(256,16);
 const shapePublication=structuredClone(current),shapeAsset=shapePublication.entries.find((e:any)=>e.objectRef==='M:42').levels.DETAIL;shapeAsset.sha256=sha(wrongShape);shapeAsset.file=`M-42/M-42-detail.${shapeAsset.sha256}.png`;shapeAsset.displaySupport.sourceSha256=shapeAsset.sha256;
 fs.writeFileSync(path.join(shapeDirectory,shapeAsset.file),wrongShape,{flag:'wx'});fs.writeFileSync(path.join(shapeDirectory,'manifest.json'),JSON.stringify(shapePublication),{flag:'wx'});
 await assert.rejects(new DeepSkyImageryService(pathToFileURL(path.join(shapeDirectory,'manifest.json'))).getByFile(sha(JSON.stringify(shapePublication)),shapeAsset.file),/asset_invalid/);
 cases.push({name:'actual readAsset refuses a changed SHA and a matching-SHA wrong PNG shape',status:'PASS',corrupt:{publishedSHA:rawM42.levels.DETAIL.sha256,actualSHA:sha(corrupted)},shape:{encodedWidth:256,publishedPixels:shapeAsset.pixels,sha256:sha(wrongShape)}});
 const operations=JSON.parse(fs.readFileSync(file('packages/miniapp-contracts/api/miniapp.operations.json'),'utf8')).operations;
 const operationIds=['celestialObjectImageGet','deepSkyManifestGet','deepSkyImageDiscoveryGet','deepSkyImageImmutableGet'],generated=fs.readFileSync(file('packages/miniapp-contracts/src/generated/miniapp-api.generated.ts'),'utf8'),sdk=[];
 for(const id of operationIds){const op=operations.find((o:any)=>o.id===id);assert.ok(op);assert.equal(op.responseEnvelope,false);assert.ok(generated.includes(`${id}: { request: void; response: ${op.responseType} };`));sdk.push(op)}
 cases.push({name:'old and new actually-bare SDK operations retain the bare response contract',status:'PASS',sdk});
 save('result.json',{status:'PASS',scope:'Independent actual current service/contracts/Nest HTTP injection; 5 original raw publication snapshots, 30 real representative payloads, 51 actual metadata discoveries, task-only corrupt file controls. Not whole901 export/TLS/deployment/WEAPP/science quality/capacity.',sources,currentHash,publications:publications.map(p=>({hash:p.hash,publicationId:p.raw.publicationId,entries:p.raw.entries.length})),cases,httpResults,selected});
}catch(e){save('failure.json',{message:String(e),stack:(e as Error).stack,sources,cases,httpResults,selected});throw e}
finally{await app?.close();const after=protectedFiles.map(b=>bind(b.path));save('binding.json',{script:bind(out+'/executed-script.mts.txt'),inputsBefore:protectedFiles,inputsAfter:after,unchanged:JSON.stringify(after)===JSON.stringify(protectedFiles)});assert.deepEqual(after,protectedFiles)}
console.log(JSON.stringify({result:bind(out+'/result.json'),binding:bind(out+'/binding.json'),cases:cases.length,images:httpResults.length,discoveries:selected.length}));
