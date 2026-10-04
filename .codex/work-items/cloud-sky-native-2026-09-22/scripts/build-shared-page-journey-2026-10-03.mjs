/** Reuse camera/readiness repairs and actual lifecycle; only changed joint file path cases. */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));let s=fs.readFileSync(path.join(dir,'experience-live-manual-material-fade-2026-10-03.mts'),'utf8').replaceAll('\r','');
const once=(before,after)=>{assert.equal(s.split(before).length,2,before.slice(0,90));s=s.replace(before,after);};
once('current-execution-state-2026-10-03-r44.json','current-execution-state-2026-10-03-r46.json');
once("source=${path.join(root,'infrastructure/deployment/sky-static-empty.caddy')}","source=${path.join(root,'output/sky-sao-public-files-1003-r1/standard-export/publication/delivery.caddy')}");
once("'--mount',`type=bind,source=${path.join(root,'infrastructure/deployment/sky-resource-logging.caddy')},target=/etc/caddy/sky-resource-logging.caddy,readonly`];","'--mount',`type=bind,source=${path.join(root,'infrastructure/deployment/sky-resource-logging.caddy')},target=/etc/caddy/sky-resource-logging.caddy,readonly`,\n    '--mount',`type=bind,source=${path.join(root,'output/sky-sao-public-files-1003-r1/standard-export/publication/files')},target=/srv/sky-public/files,readonly`];");
once('r.contentEncoding=encoding;',"r.contentEncoding=encoding;r.skyDelivery=response.headers['x-starward-sky-delivery']??null;r.publicDataSource=response.headers['x-starward-data-source']??null;");
once("type:o.responseType==='arraybuffer'?'image':'metadata'","type:route.includes('/supplements/sao/v2/')&&route.includes('/assets/')?'json-file':o.responseType==='arraybuffer'?'image':'metadata'");
const start=s.indexOf(' const conditions=['),end=s.indexOf(' const sceneRows:',start);assert(start>0&&end>start);
s=s.slice(0,start)+` const conditions=[
 {name:'joint-cold-wide',manualPan:true,pose:[0,105,0],fov:85,reference:null},
 {name:'joint-full-sphere',manualPan:true,pose:[0,105,0],fov:'DOME',reference:null},
 {name:'joint-selected-fine',manualPan:true,target:'M:51',fov:.05,reference:'M:51'},
 {name:'joint-source-back-warm',manualPan:true,target:'M:51',fov:.05,reference:'M:51',sourceRoundTrip:true},
 {name:'joint-hide-wide-warm',manualPan:true,pose:[0,105,0],fov:85,reference:null,hideRoundTrip:true}];
 save('conditions.json',{conditions,scope:'Affected final SAO+image shared-owner actual page/Scene path. One live fixture renderer; cold/wide, numeric dome, selected fine, controlled source hide/Back and pure hide return. No old ninecondition/full cold matrix or native gesture/UI/capacity claim.'});
`+s.slice(end);
once("encoding==='gzip'?gunzipSync(response.raw):response.raw","encoding==='gzip'&&response.raw.length?gunzipSync(response.raw):response.raw");
const marker=" const bootstrapPromise=bootstrap(pages[0],0);";
once(marker,` const staticPublication=JSON.parse(fs.readFileSync(path.join(root,'workers/miniapp-api/assets/sao-v2/publication.json'),'utf8'));
 const staticIndex=JSON.parse(fs.readFileSync(path.join(root,'workers/miniapp-api/assets/sao-v2/index.json'),'utf8')),staticTile=staticIndex.tiles[0];
 const staticRoute='/v2/sky/supplements/sao/v2/'+staticPublication.publicationHash+'/assets/'+staticTile.id;
 const rawGet=await wire({id:'static-get',client:0,route:staticRoute,binary:true,method:'GET',phase:'static-json-contract',header:{}});
 assert.equal(rawGet.status,200);assert.equal(rawGet.decodedBodyBytes,staticTile.bytes);assert.equal(sha(Buffer.from(rawGet.base64,'base64')),staticTile.sha256);
 const rawHead=await wire({id:'static-head',client:0,route:staticRoute,binary:true,method:'HEAD',phase:'static-json-contract',header:{}});
 assert.equal(rawHead.status,200);assert.equal(rawHead.decodedBodyBytes,0);assert.equal(rawHead.header['x-starward-sky-delivery'],'static');
 const rawConditional=await wire({id:'static-304',client:0,route:staticRoute,binary:true,method:'GET',phase:'static-json-contract',header:{'If-None-Match':rawGet.header.etag}});
 assert.equal(rawConditional.status,304);assert.equal(rawConditional.decodedBodyBytes,0);
 save('static-json-contract.json',{publicationHash:staticPublication.publicationHash,tileId:staticTile.id,sourceSha256:staticTile.sha256,
  get:{status:rawGet.status,bytes:rawGet.decodedBodyBytes,etag:rawGet.header.etag,delivery:rawGet.header['x-starward-sky-delivery'],source:rawGet.header['x-starward-data-source']},
  head:{status:rawHead.status,bytes:rawHead.decodedBodyBytes},conditional:{status:rawConditional.status,bytes:rawConditional.decodedBodyBytes},scope:'Actual same static mount; contract responses excluded from page client demands.'});
`+marker);
const gpu=" await page.evaluate(currentGpuExecutor);";
once(gpu,gpu+`
 await page.evaluate(()=>{const w=globalThis.__controlled,base=w.resourceSnapshot;
  w.resourceSnapshot=()=>{const s=base(),stellar=w.stellarLoaders.map(l=>l.__measure()).filter(l=>!l.disposed);
   const loaded=stellar.flatMap(l=>l.loaded),sourceFiles=s.files.filter(f=>/\\/[a-f0-9]{64}-[a-f0-9]{64}-.*\\.json$/.test(f.path));
   return {...s,stellar,stellarTuples:loaded.reduce((n,t)=>n+t.tuples,0),stellarNumericPayloadModel:loaded.reduce((n,t)=>n+t.tupleNumericPayloadModel,0),
    stellarPublicationJsonBytes:loaded.reduce((n,t)=>n+t.decodedPublicationJsonBytes,0),stellarJsObjectBytes:null,jsonSourceEncodedBytes:sourceFiles.reduce((n,f)=>n+f.bytes,0),
    publicEncodedOwners:(w.publicFileOwners??[]).length,scope:s.scope+' SAO parsed-publication JSON/numeric models kept separate from encoded files and RGBA; not physical total.'};};
 });`);
const facts="const bounded={...row,passes,actualFacts};";
once(facts,"const jointOwner=await page.evaluate(()=>{const w=globalThis.__controlled;if(w.caches.length!==1||w.publicFileOwners.length!==1||w.caches[0]!==w.publicFileOwners[0])throw Error('duplicate encoded owner or budget');return {owners:1,cache:w.caches[0].inspect(),resources:w.resourceSnapshot()};});\n  "+facts.replace('actualFacts};','actualFacts,jointOwner};'));
once("status:'LIVE_MANUAL_INTERSECTING_MATERIAL_FADE_RETURN_DEVELOPMENT'","status:'LIVE_FINAL_SAO_IMAGE_SINGLE_OWNER_PAGE_SCENE_DEVELOPMENT'");
const oldScope="scope:'One current real software renderer; no ordinary clients in this new combination lane.";assert(s.includes(oldScope));
const tail=s.indexOf(oldScope),tailEnd=s.indexOf("'});",tail);assert(tailEnd>tail);
s=s.slice(0,tail)+"scope:'Final source full API and extracted actual page/effects/lifecycle/Scene, one shared encoded owner for images+SAO across explicit task module forwarding. Live isolated HTTP/static bytes, controlled React/Taro/MapFS/native UTF8/clock/software GL, fixture report-weather-business/testastronomy, no preloaded responses/images. Five newly affected joint cases plus static JSON GET/HEAD/304; no ninecondition/full cold matrix replay. Source Back uses actual source opener + lifecycle hide/show with controlled navigation, not full native UI. Encoded/parsed JSON-numeric/decoded-native/GPU owner models separate, no physical total. Active outstanding page cancellation or full public time/gesture/follow/calibration, independent review/devices/quality/production-cost/capacity unverified."+s.slice(tailEnd);
once("assert.equal(access.reduce((sum,r)=>sum+r.size,0),success.reduce((sum,r)=>sum+r.encodedBodyBytes,0));","const loggedNonHead=access.slice(3).map(r=>r.status+':'+r.size),receivedNonHead=success.slice(3).map(r=>r.status+':'+r.encodedBodyBytes);\n for(const value of receivedNonHead){const i=loggedNonHead.indexOf(value);assert(i>=0,'successful non-HEAD receipt missing from log');loggedNonHead.splice(i,1);}\n assert.equal(loggedNonHead.length,rows.filter(r=>r.aborted).length);\n const deliveryAccounting={receivedSuccessfulBytes:success.reduce((n,r)=>n+r.encodedBodyBytes,0),loggedSize:access.reduce((n,r)=>n+r.size,0),head:{loggedSize:access[1].size,receivedBytes:rows[1].encodedBodyBytes},unmatchedCancelledLogStatusSizes:loggedNonHead,cancelledPhysicalReceiptBytes:null};\n save('delivery-accounting.json',deliveryAccounting);");
once(" const final=await page.evaluate(currentFinalExecutor);"," save('warm-entry.json',warm);\n const final=await page.evaluate(currentFinalExecutor);");
once('actualCaddySizeMatchesEncodedBodies:true','deliveryAccounting,successfulNonHeadCaddyStatusSizeMultisetMatches:true');
fs.writeFileSync(path.join(dir,'experience-shared-page-journey-2026-10-03.mts'),s,{flag:'wx'});
console.log(JSON.stringify({generated:'experience-shared-page-journey-2026-10-03.mts',productionChanged:false}));
