/** Real PNGs through the standard exporter, actual API and pinned local Caddy.
 * Explicit unadopted registry; loopback payload accounting is not capacity. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const worker=path.join(root,'workers/miniapp-api'),requireWorker=createRequire(path.join(worker,'package.json'));
requireWorker('reflect-metadata');
const {Module}=requireWorker('@nestjs/common'),{NestFactory}=requireWorker('@nestjs/core');
const {FastifyAdapter}=requireWorker('@nestjs/platform-fastify');
const {MiniappController}=await import('../../../../workers/miniapp-api/src/controller.ts');
const {MiniappService}=await import('../../../../workers/miniapp-api/src/miniapp-service.ts');
const {PreparedOpticalImageryService}=await import('../../../../workers/miniapp-api/src/prepared-optical-imagery.ts');
const {createTestMiniappService}=await import('../../../../workers/miniapp-api/src/test-fixtures/create-test-service.ts');
const {exportSkyPublicAssets}=await import('../../../../workers/miniapp-api/src/sky-public-asset-export.ts');
const out=path.resolve(root,process.argv[2]);
assert.equal(path.dirname(out),path.join(root,'output'));
assert.match(path.basename(out),/^prepared-static-egress-[a-z0-9-]+$/);
fs.mkdirSync(out);
const sha=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
const save=(name:string,value:unknown)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const bind=(file:string)=>{const raw=fs.readFileSync(file);return {path:path.relative(root,file).replaceAll('\\','/'),bytes:raw.length,sha256:sha(raw)};};
const publication=path.join(root,'output/prepared-optical-publication-1003-r4/publication');
const hash='8eb8336aa5a75d104807327acab5990f38e0e22000713ab639a4c95cd443a802';
const manifestFile=path.join(publication,'manifest.json');
assert.equal(bind(manifestFile).sha256,'23faa1521ae39a6a7d92f36c87ebf691a75b6bd7b91a3654e9b24f63f4d793f1');
const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
const protectedFile=path.join(root,'.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json');
const protectedRows=JSON.parse(fs.readFileSync(protectedFile,'utf8'));
const inputs=[fileURLToPath(import.meta.url),manifestFile,protectedFile,...Object.values(manifest.levels).map((value:any)=>path.join(publication,value.file)),
  ...protectedRows.map((value:any)=>path.join(root,value.path)),...[
  'workers/miniapp-api/src/sky-public-asset-export.ts','workers/miniapp-api/src/prepared-optical-imagery.ts',
  'workers/miniapp-api/src/target-optical-image-file.ts','workers/miniapp-api/src/sky-public-asset-headers.ts',
  'workers/miniapp-api/src/controller.ts','workers/miniapp-api/src/miniapp-service.ts',
  'workers/miniapp-api/src/test-fixtures/create-test-service.ts','tools/deployment/sky-static-bundle.mjs',
  'infrastructure/deployment/Caddyfile','infrastructure/deployment/sky-resource-logging.caddy',
  'infrastructure/deployment/sky-static-empty.caddy'].map(value=>path.join(root,value))];
const before=inputs.map(bind);
for(const row of protectedRows)assert.equal(bind(path.join(root,row.path)).sha256,row.sha256);
save('inputs-before.json',before);
fs.copyFileSync(fileURLToPath(import.meta.url),path.join(out,'executed-script.mts'),fs.constants.COPYFILE_EXCL);
const descriptors=[{reference:'M:51',expectedHash:hash,manifestUrl:pathToFileURL(manifestFile)}];
assert.equal(new PreparedOpticalImageryService().hasRegisteredPublicationHash(hash),false);
const exportOwner=new PreparedOpticalImageryService(descriptors);
const exported=await exportSkyPublicAssets(path.join(out,'standard-export'),'72e65cf309d700cb7d40c5b7afd53660fd39fa35',exportOwner);
const index=JSON.parse(fs.readFileSync(path.join(exported.output,'index.json'),'utf8'));
const prepared=index.records.filter((row:any)=>row.route.startsWith('/v2/sky/prepared-optical/'));
assert.equal(prepared.length,3);
for(const row of prepared){const asset:any=Object.values(manifest.levels).find((value:any)=>row.route.endsWith('/'+value.file));
  assert.equal(row.bytes,asset.bytes);assert.equal(row.sha256,asset.sha256);
  assert.equal(bind(path.join(exported.output,'files',row.route)).sha256,asset.sha256);}
const bundleBindings=index.records.map((row:any)=>bind(path.join(exported.output,'files',row.route)));
const apiOwner=new PreparedOpticalImageryService(descriptors);
let preparedFileCalls=0,preparedFileBytes=0;
const getFile=apiOwner.getByFile.bind(apiOwner);
apiOwner.getByFile=async(...args:Parameters<typeof getFile>)=>{preparedFileCalls++;const value=await getFile(...args);preparedFileBytes+=value.bytes.length;return value;};
const service=createTestMiniappService({preparedOpticalImages:apiOwner});
class LocalModule{}
Module({controllers:[MiniappController],providers:[{provide:MiniappService,useValue:service}]})(LocalModule);
const app=await NestFactory.create(LocalModule,new FastifyAdapter(),{logger:false});
const image='caddy:2.11.4-alpine@sha256:5f5c8640aae01df9654968d946d8f1a56c497f1dd5c5cda4cf95ab7c14d58648';
const name=path.basename(out);
const docker=(args:string[],timeout=20000)=>{const result=spawnSync('docker',args,{encoding:'utf8',windowsHide:true,timeout,maxBuffer:8*1024*1024});
  if(result.error)throw result.error;if(result.status!==0)throw new Error(`docker ${args[0]} failed: ${result.stderr.trim()}`);
  return (args[0]==='logs'?result.stdout+result.stderr:result.stdout).trim();};
let running=false;
const phases:any[]=[],requests:any[]=[];
let ca:Buffer;
const request=(route:string,port:number,headers:Record<string,string>={},method='GET')=>new Promise<any>((resolve,reject)=>{
  const started=performance.now(),digest=createHash('sha256');let bytes=0;
  const req=https.request({hostname:'127.0.0.1',port,servername:'localhost',ca,path:route,method,headers:{Host:'localhost',...headers}},res=>{
    res.on('data',(part:Buffer)=>{bytes+=part.length;digest.update(part);});
    res.on('end',()=>{const result={status:res.statusCode,headers:res.headers,bodyBytes:bytes,sha256:digest.digest('hex'),elapsedMs:performance.now()-started};
      requests.push({method,status:result.status,bodyBytes:bytes,elapsedMs:result.elapsedMs,delivery:res.headers['x-starward-sky-delivery']??'api',isPreparedImage:prepared.some((row:any)=>row.route===route)});resolve(result);});
    res.on('error',reject);
  });req.setTimeout(15000,()=>req.destroy(new Error('controlled_loopback_request_timeout')));req.on('error',reject);req.end();
});
try{
  await app.listen(0,'0.0.0.0');
  const apiPort=app.getHttpAdapter().getInstance().server.address().port;
  const source=fs.readFileSync(path.join(root,'infrastructure/deployment/Caddyfile'),'utf8').replaceAll('\r','');
  const siteStart=source.indexOf('{$STARWARD_API_DOMAIN} {');assert(siteStart>0);
  const global=source.slice(0,siteStart).replace('\temail {$CADDY_EMAIL}','\temail static-egress-local@starward.invalid\n\tskip_install_trust');
  const site=(port:number,empty=false)=>source.slice(siteStart).replace('{$STARWARD_API_DOMAIN} {',`https://localhost:${port} {\n tls internal`)
    .replaceAll('api:8787',`host.docker.internal:${apiPort}`).replaceAll('health_uri /health/ready','health_uri /v2/sky/moon/coverage/manifest')
    .replaceAll('/etc/caddy/sky-static-delivery.caddy',empty?'/etc/caddy/sky-static-empty.caddy':'/etc/caddy/sky-static-delivery.caddy');
  fs.writeFileSync(path.join(out,'Caddyfile'),global+site(8443)+site(8445,true),{flag:'wx'});
  const mounts=['--mount',`type=bind,source=${exported.output},target=/srv/sky-public,readonly`,
    '--mount',`type=bind,source=${path.join(exported.output,'delivery.caddy')},target=/etc/caddy/sky-static-delivery.caddy,readonly`,
    '--mount',`type=bind,source=${path.join(root,'infrastructure/deployment/sky-static-empty.caddy')},target=/etc/caddy/sky-static-empty.caddy,readonly`,
    '--mount',`type=bind,source=${path.join(root,'infrastructure/deployment/sky-resource-logging.caddy')},target=/etc/caddy/sky-resource-logging.caddy,readonly`,
    '--mount',`type=bind,source=${path.join(out,'Caddyfile')},target=/etc/caddy/Caddyfile,readonly`];
  save('caddy-validation.json',{image,output:docker(['run','--rm','--pull','never',...mounts,image,'caddy','adapt','--config','/etc/caddy/Caddyfile','--validate'])});
  const id=docker(['run','-d','--pull','never','--name',name,'--memory','128m','--cpus','1','--pids-limit','64','--read-only',
    '--tmpfs','/data:size=16m','--tmpfs','/config:size=8m','--tmpfs','/tmp:size=8m','-p','127.0.0.1::8443','-p','127.0.0.1::8445',...mounts,image]);running=true;
  const port=(inside:string)=>Number(docker(['port',name,inside]).split(':').at(-1));
  const staticPort=port('8443/tcp'),apiOnlyPort=port('8445/tcp');
  save('container.json',{id,image,name,staticPort,apiOnlyPort,memoryLimitBytes:128*1024*1024,cpuLimit:1,meaning:'Existing cached Linux Caddy on Docker Desktop, not expected production host/configuration capacity.'});
  docker(['exec',name,'sh','-c','i=0; while [ ! -s /data/caddy/pki/authorities/local/root.crt ] && [ $i -lt 50 ]; do i=$((i+1)); sleep 0.1; done; test -s /data/caddy/pki/authorities/local/root.crt'],8000);
  ca=Buffer.from(docker(['exec',name,'cat','/data/caddy/pki/authorities/local/root.crt'])+'\n');
  fs.writeFileSync(path.join(out,'local-ca.crt'),ca,{flag:'wx'});
  const chosen=prepared.find((row:any)=>row.route.endsWith('overview.png'));assert(chosen);
  const cold=await request(chosen.route,staticPort);
  assert.equal(cold.status,200);assert.equal(cold.bodyBytes,chosen.bytes);assert.equal(cold.sha256,chosen.sha256);assert.equal(preparedFileCalls,0);
  assert.equal(cold.headers['x-starward-sky-delivery'],'static');assert(cold.headers.etag);
  const conditional=await request(chosen.route,staticPort,{'If-None-Match':String(cold.headers.etag)});
  assert.equal(conditional.status,304);assert.equal(conditional.bodyBytes,0);
  const head=await request(chosen.route,staticPort,{},'HEAD');assert.equal(head.status,200);assert.equal(head.bodyBytes,0);
  assert.equal(Number(head.headers['content-length']),chosen.bytes);assert.equal(preparedFileCalls,0);
  save('conditional-head.json',{cold,conditional,head,scope:'Actual response bytes and supplied headers; no transfer overhead/billing inference.'});
  for(const delivery of ['static','api']as const){for(const clients of [10,20]){
    const selectedPort=delivery==='static'?staticPort:apiOnlyPort;
    const startIndex=requests.length,beforeCalls=preparedFileCalls,beforeBytes=preparedFileBytes,started=performance.now();
    await Promise.all(Array.from({length:clients},async()=>{
      const info=await request(`/v2/sky/prepared-optical/${hash}/manifest`,selectedPort);assert.equal(info.status,200);
      // Three-level HTTP cohort in exporter order: detail/medium, then overview.
      // Two image slots; not the page's coarse-first journey or mixed business.
      await Promise.all(prepared.slice(0,2).map(async(row:any)=>{const image=await request(row.route,selectedPort);assert.equal(image.status,200);assert.equal(image.bodyBytes,row.bytes);assert.equal(image.sha256,row.sha256);}));
      const row=prepared[2],image=await request(row.route,selectedPort);assert.equal(image.status,200);assert.equal(image.bodyBytes,row.bytes);assert.equal(image.sha256,row.sha256);
    }));
    const completed=requests.slice(startIndex),imageRows=completed.filter(row=>row.isPreparedImage),times=imageRows.map(row=>row.elapsedMs).sort((a,b)=>a-b);
    const calls=preparedFileCalls-beforeCalls,payload=imageRows.reduce((sum,row)=>sum+row.bodyBytes,0);
    assert.equal(calls,delivery==='static'?0:clients*3);assert.equal(payload,clients*prepared.reduce((sum:number,row:any)=>sum+row.bytes,0));
    const phase={delivery,clients,clientImageSlots:2,requests:completed.length,imageRequests:imageRows.length,imageBodyBytes:payload,
      metadataBodyBytes:completed.filter(row=>!row.isPreparedImage).reduce((sum,row)=>sum+row.bodyBytes,0),preparedOwnerFileCalls:calls,
      preparedOwnerReturnedBytes:preparedFileBytes-beforeBytes,elapsedMs:performance.now()-started,
      imageElapsedMs:{p50:times[Math.floor(times.length*.5)],p95:times[Math.floor(times.length*.95)],max:times.at(-1)},
      scope:'Loopback cohort with no client file cache; host filesystem/OS caches warm, no 12Mbps throttle, no actual scene/ordinary mixed business/expected host capacity claim.'};
    phases.push(phase);console.log(JSON.stringify(phase));
  }}
  // Allow access-log writes to settle, then compare every controlled response
  // with privacy-filtered Caddy payload accounting by status/class/delivery.
  await new Promise(resolve=>setTimeout(resolve,150));
  const logs=docker(['logs',name]);fs.writeFileSync(path.join(out,'caddy.log'),logs+'\n',{flag:'wx'});
  const access=logs.split(/\r?\n/).flatMap(line=>{try{const value=JSON.parse(line);return value.logger?.startsWith('http.log.access.')?[value]:[];}catch{return[];}});
  for(const row of access){assert.equal(row.request,undefined);assert.equal(row.resp_headers,undefined);assert(!row.user_id);assert.equal(row.sky_resource_class,'optical_published');}
  assert.equal(access.length,requests.length);
  assert.equal(access.reduce((sum,row)=>sum+row.size,0),requests.reduce((sum,row)=>sum+row.bodyBytes,0));
  const groups:any[]=[];
  for(const delivery of ['static','api'])for(const status of [200,304]){const rows=access.filter(row=>row.sky_delivery===delivery&&row.status===status);
    groups.push({delivery,status,requests:rows.length,responsePayloadBytes:rows.reduce((sum,row)=>sum+row.size,0)});}
  save('request-accounting.json',{requests,groups,accessRequests:access.length,privacyFieldsRemoved:true,bodyBytesReadEqualCaddySize:true,
    meaning:'Caddy size is actual response body payload, excluding TLS/HTTP headers and transport retransmission; HEAD/304 contribute zero body. Discovery manifests share path class but are API delivery.'});
  const after=inputs.map(bind);assert.deepEqual(after,before);
  assert.deepEqual(index.records.map((row:any)=>bind(path.join(exported.output,'files',row.route))),bundleBindings);
  save('inputs-after.json',after);
  save('result.json',{status:'REAL_STANDARD_EXPORT_AND_LOCAL_CADDY_EGRESS_MEASURED_NOT_ADOPTED',inputsBeforeAfterExact:true,
    standardExport:{publicationHash:index.publicationHash,files:index.records.length,payloadBytes:index.records.reduce((sum:number,row:any)=>sum+row.bytes,0),preparedFiles:prepared.length,preparedPayloadBytes:prepared.reduce((sum:number,row:any)=>sum+row.bytes,0)},
    phases,groups,privacyFieldsRemoved:true,bodyBytesReadEqualCaddySize:true,
    defaultPreparedRegistry:'EMPTY',imageQuality:'M51_RECTANGLE_FAILED',meaning:'Real source PNG byte identity and current standard exporter/API/Caddy/logging observed. Explicit development registry only. No source reprocessing/cloud deployment/device/current-BFF restart/DAU or full resource/capacity acceptance. Driver and local API share this Node process, so process RSS/CPU would not isolate server cost; no such estimate claimed.'});
}catch(cause){save('failure.json',{error:String(cause),stack:(cause as Error).stack,phases,requests,preparedFileCalls,preparedFileBytes});throw cause;}
finally{
  if(running){if(!fs.existsSync(path.join(out,'caddy.log')))fs.writeFileSync(path.join(out,'caddy.log'),docker(['logs',name])+'\n',{flag:'wx'});
    docker(['stop','--time','5',name]);docker(['rm',name]);}
  await app.close();
  assert.deepEqual(inputs.map(bind),before);
}
console.log(JSON.stringify({result:bind(path.join(out,'result.json'))}));
