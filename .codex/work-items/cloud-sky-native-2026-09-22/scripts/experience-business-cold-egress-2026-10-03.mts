/** Isolated current HTTP owners through cached local Caddy; not deployed capacity. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import {createHash,generateKeyPairSync} from 'node:crypto';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const requireWorker=createRequire(path.join(root,'workers/miniapp-api/package.json'));
requireWorker('reflect-metadata');
const {Module}=requireWorker('@nestjs/common'),{NestFactory}=requireWorker('@nestjs/core');
const {FastifyAdapter}=requireWorker('@nestjs/platform-fastify');
const {TEST_PUBLISHED_SPOT}=requireWorker('@starward/miniapp-contracts/test-fixtures');
const {MiniappController}=await import('../../../../workers/miniapp-api/src/controller.ts');
const {MiniappService}=await import('../../../../workers/miniapp-api/src/miniapp-service.ts');
const {createTestMiniappService}=await import('../../../../workers/miniapp-api/src/test-fixtures/create-test-service.ts');
const {createTestRuntimeConfig}=await import('../../../../workers/miniapp-api/src/runtime-config.ts');
const {DeterministicRecentWeatherAdapter}=await import('../../../../workers/miniapp-api/src/test-fixtures/deterministic-recent-weather-adapter.ts');
const {QWeatherAirQualityAdapter}=await import('../../../../workers/miniapp-api/src/air-quality-provider.ts');
const {createBsc5pSkyCatalogProvider}=await import('../../../../workers/miniapp-api/src/sky-scene-catalog-provider.ts');
const {StellarCatalogController}=await import('../../../../workers/miniapp-api/src/stellar-catalog.controller.ts');
const {StellarCatalogPublicationService}=await import('../../../../workers/miniapp-api/src/stellar-catalog-publication.ts');
const {ApiExceptionFilter}=await import('../../../../workers/miniapp-api/src/api-exception.filter.ts');
const {EtagInterceptor}=await import('../../../../workers/miniapp-api/src/etag.interceptor.ts');
const out=path.resolve(root,process.argv[2]);
assert.equal(path.dirname(out),path.join(root,'output'));
assert.match(path.basename(out),/^business-cold-egress-[a-z0-9-]+$/);
fs.mkdirSync(out);
const sha=(raw:Buffer|string)=>createHash('sha256').update(raw).digest('hex');
const save=(name:string,value:unknown)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const bind=(file:string)=>{const raw=fs.readFileSync(path.join(root,file));return {path:file,bytes:raw.length,sha256:sha(raw)};};
const checkpoint=JSON.parse(fs.readFileSync(path.join(root,'.codex/work-items/cloud-sky-native-2026-09-22/evidence/current-execution-state-2026-10-03-r41.json'),'utf8'));
for(const row of [...checkpoint.protected,...checkpoint.currentSources])assert.deepEqual(bind(row.path),row);
const sources=[...new Set([...checkpoint.protected,...checkpoint.currentSources].map((row:any)=>row.path).concat([
  path.relative(root,fileURLToPath(import.meta.url)).replaceAll('\\','/'),
  'workers/miniapp-api/src/controller.ts','workers/miniapp-api/src/miniapp-service.ts',
  'workers/miniapp-api/src/auth-service.ts','workers/miniapp-api/src/observation-context-service.ts',
  'workers/miniapp-api/src/api-exception.filter.ts','workers/miniapp-api/src/etag.interceptor.ts',
  'workers/miniapp-api/src/test-fixtures/create-test-service.ts',
  'workers/miniapp-api/src/test-fixtures/in-memory-repository.ts',
  'workers/miniapp-api/src/test-fixtures/deterministic-weather-adapter.ts',
  'workers/miniapp-api/src/test-fixtures/deterministic-recent-weather-adapter.ts',
  'workers/miniapp-api/src/sky-scene-catalog-provider.ts','workers/miniapp-api/src/stellar-catalog-publication.ts',
  'workers/miniapp-api/src/stellar-catalog.controller.ts','workers/miniapp-api/src/terrain-publication.ts',
  'workers/miniapp-api/assets/terrain/publication.json','workers/miniapp-api/assets/terrain/glo30-greater-bay-area-85km.png',
  'infrastructure/deployment/Caddyfile','infrastructure/deployment/sky-resource-logging.caddy',
  'infrastructure/deployment/sky-static-empty.caddy']))];
const before=sources.map(bind);save('inputs-before.json',before);
fs.copyFileSync(fileURLToPath(import.meta.url),path.join(out,'executed-script.mts'),fs.constants.COPYFILE_EXCL);
const config=createTestRuntimeConfig({qweather:{apiHost:'test.qweatherapi.com',projectId:'isolated-test',credentialId:'isolated-test',forecastHours:24,
  privateKeyPem:generateKeyPairSync('ed25519').privateKey.export({format:'pem',type:'pkcs8'}).toString()}});
let aqCalls=0;
const fixedNow=Date.now();
const airQuality=new QWeatherAirQualityAdapter(config,async(request:any)=>{
  aqCalls++;const current=new URL(request.toString()).pathname.includes('/current/');
  const index={code:'cn-mee',name:'中国 AQI',aqi:32,aqiDisplay:'32'};
  return new Response(JSON.stringify(current?{indexes:[index]}:{hours:[{forecastTime:new Date(fixedNow).toISOString(),indexes:[index]}]}),{headers:{'content-type':'application/json'}});
},()=>fixedNow);
const service=createTestMiniappService({config,airQuality,recentWeather:new DeterministicRecentWeatherAdapter(),
  skyCatalog:createBsc5pSkyCatalogProvider('bsc5p-bright-stars.v3')});
const catalogs=new StellarCatalogPublicationService();
class LocalModule{}
Module({controllers:[MiniappController,StellarCatalogController],providers:[{provide:MiniappService,useValue:service},
  {provide:StellarCatalogPublicationService,useValue:catalogs}]})(LocalModule);
const app=await NestFactory.create(LocalModule,new FastifyAdapter(),{logger:false});
app.useGlobalFilters(new ApiExceptionFilter());app.useGlobalInterceptors(new EtagInterceptor());
const image='caddy:2.11.4-alpine@sha256:5f5c8640aae01df9654968d946d8f1a56c497f1dd5c5cda4cf95ab7c14d58648';
const name=path.basename(out);
const docker=(args:string[],timeout=20000)=>{const r=spawnSync('docker',args,{encoding:'utf8',windowsHide:true,timeout,maxBuffer:8*1024*1024});
  if(r.error)throw r.error;if(r.status!==0)throw new Error(`owned_docker_${args[0]}_failed`);
  return (args[0]==='logs'?r.stdout+r.stderr:r.stdout).trim();};
let running=false,port=0,ca:Buffer;
const rows:any[]=[];
/** Full response headers/body never persisted; proposal coordinates and tokens stay in memory. */
async function request(family:string,phase:string,route:string,options:{method?:string;body?:unknown;headers?:Record<string,string>;status?:number;recordBody?:boolean}={}) {
  const method=options.method??'GET',encoded=options.body===undefined?undefined:Buffer.from(JSON.stringify(options.body));
  const started=performance.now();
  const result=await new Promise<any>((resolve,reject)=>{
    const req=https.request({hostname:'127.0.0.1',port,servername:'localhost',ca,path:route,method,
      headers:{Host:'localhost','Accept-Encoding':'gzip',...(encoded?{'Content-Type':'application/json','Content-Length':String(encoded.length)}:{}),...options.headers}},res=>{
      const parts:Buffer[]=[];res.on('data',part=>parts.push(Buffer.from(part)));res.on('error',reject);
      res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,raw:Buffer.concat(parts)}));
    });
    req.setTimeout(15000,()=>req.destroy(new Error('isolated_business_timeout')));req.on('error',reject);req.end(encoded);
  });
  const encoding=String(result.headers['content-encoding']??'identity');assert(['gzip','identity'].includes(encoding));
  const decoded=encoding==='gzip'?gunzipSync(result.raw):result.raw;
  let body:any=null;if(decoded.length&&String(result.headers['content-type']).includes('json'))body=JSON.parse(decoded.toString());
  const row={id:rows.length+1,family,phase,method,status:result.status,requestBodyBytes:encoded?.length??0,
    acceptEncoding:options.headers?.['Accept-Encoding']??'gzip',contentEncoding:encoding,encodedBodyBytes:result.raw.length,decodedBodyBytes:decoded.length,
    encodedSha256:sha(result.raw),decodedSha256:sha(decoded),elapsedMs:performance.now()-started,
    vary:result.headers.vary??null,cacheControl:result.headers['cache-control']??null,hasEtag:!!result.headers.etag,
    dataState:body?.dataState??null,errorCode:body?.code??null,aqControlledTransportCalls:aqCalls,
    recordedBody:options.recordBody===true};
  rows.push(row);save(`request-progress-${row.id}.json`,row);
  if(options.recordBody){fs.writeFileSync(path.join(out,`response-${row.id}.encoded`),result.raw,{flag:'wx'});
    fs.writeFileSync(path.join(out,`response-${row.id}.decoded`),decoded,{flag:'wx'});}
  assert.equal(result.status,options.status??200,`${family}/${phase}: ${body?.code??'non_json'}`);
  return {body,row,headers:result.headers,raw:result.raw,decoded};
}
try {
  await app.listen(0,'0.0.0.0');const apiPort=app.getHttpAdapter().getInstance().server.address().port;
  const source=fs.readFileSync(path.join(root,'infrastructure/deployment/Caddyfile'),'utf8').replaceAll('\r','');
  const caddy=source.replace('\temail {$CADDY_EMAIL}','\temail isolated-business@starward.invalid\n\tskip_install_trust')
    .replace('{$STARWARD_API_DOMAIN} {','https://localhost:8443 {\n tls internal')
    .replaceAll('api:8787',`host.docker.internal:${apiPort}`).replaceAll('health_uri /health/ready','health_uri /v2/capabilities');
  fs.writeFileSync(path.join(out,'Caddyfile'),caddy,{flag:'wx'});
  const mounts=['--mount',`type=bind,source=${path.join(out,'Caddyfile')},target=/etc/caddy/Caddyfile,readonly`,
    '--mount',`type=bind,source=${path.join(root,'infrastructure/deployment/sky-static-empty.caddy')},target=/etc/caddy/sky-static-delivery.caddy,readonly`,
    '--mount',`type=bind,source=${path.join(root,'infrastructure/deployment/sky-resource-logging.caddy')},target=/etc/caddy/sky-resource-logging.caddy,readonly`];
  save('caddy-validation.json',{image,adaptedSha256:sha(docker(['run','--rm','--pull','never',...mounts,image,'caddy','adapt','--config','/etc/caddy/Caddyfile','--validate']))});
  const id=docker(['run','-d','--pull','never','--name',name,'--memory','128m','--cpus','1','--pids-limit','64','--read-only',
    '--tmpfs','/data:size=16m','--tmpfs','/config:size=8m','--tmpfs','/tmp:size=8m','-p','127.0.0.1::8443',...mounts,image]);running=true;
  port=Number(docker(['port',name,'8443/tcp']).split(':').at(-1));
  save('container.json',{id,name,image,port,memoryLimitBytes:128*1024*1024,cpuLimit:1,scope:'Owned loopback Docker Desktop proxy, not production deployment.'});
  docker(['exec',name,'sh','-c','i=0; while [ ! -s /data/caddy/pki/authorities/local/root.crt ] && [ $i -lt 50 ]; do i=$((i+1)); sleep 0.1; done; test -s /data/caddy/pki/authorities/local/root.crt'],8000);
  ca=Buffer.from(docker(['exec',name,'cat','/data/caddy/pki/authorities/local/root.crt'])+'\n');
  const localDate='2026-10-03',spot=encodeURIComponent(TEST_PUBLISHED_SPOT.spotId);
  const resolved=await request('context','formal_cold_resolve','/v2/observation-contexts/resolve',{method:'POST',status:201,
    body:{location:{kind:'FORMAL_SPOT',spotId:TEST_PUBLISHED_SPOT.spotId},localDate},recordBody:true});
  const context=resolved.body.data,contextQuery=encodeURIComponent(context.contextId);
  assert.equal(context.location.spotId,TEST_PUBLISHED_SPOT.spotId);
  const contextRead=await request('context','formal_cold_read',`/v2/observation-contexts/${contextQuery}`,{recordBody:true});
  assert.deepEqual(contextRead.body.data,context);
  const map=await request('map','formal_cold_normal',`/v2/map/scene?contextId=${contextQuery}&layer=NORMAL`,{recordBody:true});
  assert.equal(map.body.data.context.contextId,context.contextId);assert(map.body.data.spots.length>0);
  const overview=await request('spot_content','formal_cold_overview',`/v2/spots/${spot}/overview?contextId=${contextQuery}`,{recordBody:true});
  assert.equal(overview.body.data.spot.spotId,TEST_PUBLISHED_SPOT.spotId);
  assert.equal(overview.body.contextRevision,context.revision);assert.equal(overview.body.validAt,context.selectedAtUtc);
  await request('spot_content','formal_cold_guides',`/v2/spots/${spot}/guides`,{recordBody:true});
  await request('spot_content','formal_cold_field',`/v2/spots/${spot}/field`,{recordBody:true});
  const skyRoute=`/v2/spots/${spot}/sky?contextId=${contextQuery}&catalogVersion=bsc5p-bright-stars.v3`;
  const sky=await request('sky_report','formal_cold_v3',skyRoute,{recordBody:true});
  assert.equal(sky.body.data.context.contextId,context.contextId);assert(sky.body.data.hourly.length>0);
  const reference=sky.body.data.skyScene.catalog;assert.equal(reference.catalogVersion,'bsc5p-bright-stars.v3');
  assert(sky.body.data.skyScene.deepSky.catalog.entries.length>0);assert(sky.body.data.skyScene.frames.length>0);
  assert(sky.body.sources.some((value:any)=>value.kind==='TEST_FIXTURE'));
  const catalogRoute=`/v2/sky/catalogs/${reference.catalogVersion}/${reference.catalogHash}`;
  const catalog=await request('stellar_catalog','formal_cold_catalog',catalogRoute,{recordBody:true});
  assert.equal(catalog.body.data.catalogHash,reference.catalogHash);assert(catalog.body.data.rows.length>1000);
  const identity=await request('stellar_catalog','identity_same_publication',catalogRoute,{headers:{'Accept-Encoding':'identity'},recordBody:true});
  assert.equal(identity.row.contentEncoding,'identity');assert.deepEqual(identity.decoded,catalog.decoded);
  assert.equal(catalog.row.contentEncoding,'gzip');assert(catalog.row.encodedBodyBytes<catalog.row.decodedBodyBytes);
  for(const [family,route,original] of [['context',`/v2/observation-contexts/${contextQuery}`,contextRead],['map',`/v2/map/scene?contextId=${contextQuery}&layer=NORMAL`,map],
    ['sky_report',skyRoute,sky],['stellar_catalog',catalogRoute,catalog]]as const){
    assert(original.headers.etag);const warm=await request(family,'warm_conditional',route,{status:304,headers:{'If-None-Match':original.headers.etag}});
    assert.equal(warm.row.status,304);assert.equal(warm.row.encodedBodyBytes,0);
  }
  const recent=await request('environment','formal_cold_recent',`/v2/spots/${spot}/recent-weather`,{recordBody:true});
  assert(recent.body.sources.some((value:any)=>value.kind==='TEST_FIXTURE'));assert.equal(recent.row.cacheControl,'no-store');
  const recentWarm=await request('environment','recent_no_store_conditional',`/v2/spots/${spot}/recent-weather`,{headers:{'If-None-Match':recent.body.etag}});
  assert.equal(recentWarm.row.status,200);assert(recentWarm.row.encodedBodyBytes>0);assert.equal(recentWarm.row.hasEtag,false);
  const aq=await request('environment','formal_cold_air_fixture_transport',`/v2/spots/${spot}/air-quality`,{recordBody:true});
  assert.equal(aq.body.data.current.value.indexes[0].value,32);assert(aq.body.data.forecast.value.length>0);assert.equal(aqCalls,2);
  await request('environment','air_warm_fixture_transport',`/v2/spots/${spot}/air-quality`);assert.equal(aqCalls,2);
  const terrainManifest=JSON.parse(fs.readFileSync(path.join(root,'workers/miniapp-api/assets/terrain/publication.json'),'utf8'));
  const center=terrainManifest.centerGcj02;
  const terrain=await request('terrain','cold_overlay',`/v2/terrain/overlay?purpose=MAP&centerLat=${center.latitude}&centerLng=${center.longitude}&radiusKm=10`,{recordBody:true});
  assert.equal(terrain.body.data.publicationId,terrainManifest.publicationId);assert.equal(terrain.body.data.state,'PARTIAL');
  assert.equal(terrain.body.data.lightPollution.state,'UNAVAILABLE');
  const terrainImage=await request('terrain','cold_png',terrain.body.data.imageUrl,{recordBody:true});
  assert.equal(terrainImage.row.encodedBodyBytes,terrainManifest.image.byteSize);assert.equal(terrainImage.row.encodedSha256,terrainManifest.image.sha256);
  const cloud=await request('map','layer_change_cloud',`/v2/map/scene?contextId=${contextQuery}&layer=CLOUD&cloudLayer=TOTAL`,{recordBody:true});
  assert.equal(cloud.body.data.context.contextId,context.contextId);
  // Private proposal setup uses only current isolated owners; tokens and response bodies are not saved.
  const owner=(await service.login({code:'local:isolated-business-proposal-owner'})).data;
  const other=(await service.login({code:'local:isolated-business-proposal-other'})).data;
  const location={displayName:'隔离测试候选',region:'深圳市大鹏新区',wgs84:{system:'WGS84' as const,latitude:22.56,longitude:114.59}};
  const draft=(await service.createContributionDraft(owner.userId,{kind:'NEW_SPOT_PROPOSAL',spotId:null,candidateLocation:location,
    observedAt:null,topics:[],detail:'',rightsConfirmed:false,preciseLocationConsent:true,
    candidateProfile:{fields:{name:location.displayName,address:location.region},media:{}}},'isolated-proposal-create-0001')).data;
  const pending=(await service.submitContribution(owner.userId,draft.submissionId,draft.revision,'isolated-proposal-submit-0001')).data;
  const proposalContext=await request('context','proposal_cold_resolve','/v2/observation-contexts/resolve',{method:'POST',status:201,
    body:{location:{kind:'MAP_POINT',displayName:location.displayName,wgs84:location.wgs84,source:'MAP_VIEWPORT',timezoneHint:'Asia/Shanghai'},localDate}});
  const proposalRoute=`/v2/spots/${encodeURIComponent(pending.submissionId)}/sky?contextId=${encodeURIComponent(proposalContext.body.data.contextId)}&catalogVersion=bsc5p-bright-stars.v3`;
  const privateSky=await request('sky_report','proposal_owner',proposalRoute,{headers:{Authorization:`Bearer ${owner.accessToken}`}});
  assert.equal(privateSky.body.data.context.spotId,pending.submissionId);assert(privateSky.body.warnings.some((value:string)=>value.includes('审核中提案')));
  await request('permission','proposal_anonymous',proposalRoute,{status:403});
  await request('permission','proposal_other_account',proposalRoute,{headers:{Authorization:`Bearer ${other.accessToken}`},status:404});
  await request('permission','proposal_wrong_context',proposalRoute.replace(encodeURIComponent(proposalContext.body.data.contextId),contextQuery),{headers:{Authorization:`Bearer ${owner.accessToken}`},status:400});
  await request('permission','formal_wrong_context',skyRoute.replace(contextQuery,encodeURIComponent(proposalContext.body.data.contextId)),{status:400});
  const logs=docker(['logs',name]);fs.writeFileSync(path.join(out,'caddy.log'),logs+'\n',{flag:'wx'});
  const access=logs.split(/\r?\n/).flatMap(line=>{try{const value=JSON.parse(line);return value.logger?.startsWith('http.log.access.')?[value]:[];}catch{return[];}});
  for(const row of access){assert.equal(row.request,undefined);assert.equal(row.resp_headers,undefined);assert([undefined,''].includes(row.user_id));}
  assert.equal(access.length,rows.length);assert.equal(access.reduce((sum,row)=>sum+row.size,0),rows.reduce((sum,row)=>sum+row.encodedBodyBytes,0));
  const totals=rows.reduce((value,row)=>({requests:value.requests+1,encodedBodyBytes:value.encodedBodyBytes+row.encodedBodyBytes,decodedBodyBytes:value.decodedBodyBytes+row.decodedBodyBytes}),{requests:0,encodedBodyBytes:0,decodedBodyBytes:0});
  assert.deepEqual(sources.map(bind),before);save('inputs-after.json',sources.map(bind));
  save('requests.json',rows);
  save('result.json',{status:'ISOLATED_CURRENT_BUSINESS_COLD_ENCODED_HTTP_MEASURED_NOT_CAPACITY',totals,rows,
    catalogRows:catalog.body.data.rows.length,deepSkyRows:sky.body.data.skyScene.deepSky.catalog.entries.length,
    reportHours:sky.body.data.hourly.length,catalogIdentityMatchesGzipDecoded:true,
    caddyEncodedSizeMatchesRawResponse:true,privacyFieldsRemoved:true,inputsBeforeAfterExact:true,
    aqControlledTransportCalls:aqCalls,proposalOwnerAndContextGuardsObserved:true,
    dataScope:{publishedSpots:1,repository:'explicit InMemoryTestRepository',weather:'deterministic TEST_FIXTURE',recentWeather:'deterministic TEST_FIXTURE',
      airQuality:'actual QWeather adapter with owned synthetic transport; supplier source labels are adapter output, NOT real provider evidence',
      astronomy:'real current BSC5P v3, OpenNGC and algorithms',terrain:'real existing publication PNG; light pollution UNAVAILABLE'},
    excluded:{actualWeappAcceptEncoding:'UNVERIFIED',zstd:'UNMEASURED',providerEntitlementAndCharges:'UNVERIFIED',postgresRedisOutbox:'NOT_EXERCISED',productionPopulation:'UNKNOWN',
      mixedOrdinarySkyLoad:'NOT_YET_MEASURED',currentSharedBffLatestSource:'UNVERIFIED',cpuRss:'driver and API share process; no isolated server claim',
      twelveMbps:'NOT_THROTTLED',wholeMiniappMonthlyBytes:null,wholeMiniappMonthlyCny:null,capacityAccepted:false,independentReview:'MISSING'},
    meaning:'Payload only, excludes request/response headers,TLS,TCP,retransmission. Cold service/cache lane with warm host file cache. Warm conditional and failure probes are separate units, not one user journey. No assets republished, supplier calls, shared service restart, device, deployment or adoption.'});
} catch(error){save('failure.json',{error:String(error),stack:(error as Error).stack,rows,aqControlledTransportCalls:aqCalls});throw error;}
finally {
  if(running){if(!fs.existsSync(path.join(out,'caddy.log')))fs.writeFileSync(path.join(out,'caddy.log'),docker(['logs',name])+'\n',{flag:'wx'});
    docker(['stop','--time','5',name]);docker(['rm',name]);}
  await app.close();assert.deepEqual(sources.map(bind),before);
}
console.log(JSON.stringify({result:bind(path.relative(root,path.join(out,'result.json')).replaceAll('\\','/'))}));
