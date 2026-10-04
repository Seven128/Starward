/** Observe existing cache decisions without changing limits, keys, fences or policy. */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';import {build} from 'esbuild';
const root=fileURLToPath(new URL('../../../../',import.meta.url)),dir=path.dirname(fileURLToPath(import.meta.url));
const out=path.join(root,'output/playwright/cloud-sky-live-mixed-1003-r6');assert(!fs.existsSync(out));fs.mkdirSync(out);
const sha=b=>createHash('sha256').update(b).digest('hex'),save=(name,v)=>fs.writeFileSync(path.join(out,name),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const base=path.join(root,'output/playwright/cloud-sky-live-mixed-1003-r3');
for(const name of ['bundle.js','runtime-executor.js.txt','source-binding-before.json','metafile.json'])fs.copyFileSync(path.join(base,name),path.join(out,name),fs.constants.COPYFILE_EXCL);
const owner='apps/wechat-miniapp/src/services/response-cache.ts',original=fs.readFileSync(path.join(root,owner),'utf8');let observed=original;
const patches=[];
const patch=(before,after)=>{assert.equal(observed.split(before).length,2,before);observed=observed.replace(before,after);patches.push({before,after});};
patch('  function boundMemory() {',`  const taskEvidence=(globalThis as any).__controlled.cacheEvidence??=((globalThis as any).__controlled.cacheEvidence=[]);
  const taskKeys=new Map<string,number>();
  const taskKey=(key:string)=>({keyId:taskKeys.get(key)??(taskKeys.set(key,taskKeys.size+1),taskKeys.size),family:key.split(':')[0]});
  const taskTrace=(kind:string,key:string,detail:unknown={})=>taskEvidence.push({kind,...taskKey(key),detail});
  ((globalThis as any).__controlled.cacheObservers??=[]).push({flush,snapshot:()=>({
   memory:[...memory].map(([key,v])=>({...taskKey(key),bytes:v.bytes,storedAt:v.storedAt})),
   disk:[...disk].map(([key,v])=>({...taskKey(key),bytes:v.bytes,storageBytes:v.storageBytes,chunks:v.chunks,storedAt:v.storedAt})),
   dirty:dirty.size,requests:requests.size,generation,cleanupFailed,limits:RESPONSE_CACHE_LIMITS})});
  function boundMemory() {`);
patch('        memory.delete(key);\n        dirty.delete(key);',`        taskTrace('MEMORY_EVICT',key,{count,bytesBefore:bytes,itemBytes:item.bytes,fresh:fresh(item.storedAt)});
        memory.delete(key);
        dirty.delete(key);`);
patch('if (++count > RESPONSE_CACHE_LIMITS.entries || bytes + item.storageBytes > RESPONSE_CACHE_LIMITS.persistedBytes) entries.delete(key);',`if (++count > RESPONSE_CACHE_LIMITS.entries || bytes + item.storageBytes > RESPONSE_CACHE_LIMITS.persistedBytes) {taskTrace('DISK_EVICT',key,{count,bytesBefore:bytes,itemBytes:item.storageBytes});entries.delete(key);}`);
patch('if (current && fresh(current.storedAt)) return current;',"if (current && fresh(current.storedAt)) {taskTrace('HIT_MEMORY',key);return current;}");
patch('if (!item) return undefined;',"if (!item) {taskTrace('MISS_BOTH',key);return undefined;}");
patch('      return restored;',"      taskTrace('HIT_DISK',key);return restored;");
fs.writeFileSync(path.join(out,'response-cache.original.ts'),original,{flag:'wx'});fs.writeFileSync(path.join(out,'response-cache.observed.ts'),observed,{flag:'wx'});
save('cache-observation-patches.json',{owner,originalSha256:sha(original),observedSha256:sha(observed),patches,scope:'Read-only closure snapshots and traces only. No limit/key/freshness/fence/write/retention policy changes. Diagnostic key IDs retain strings in task observer; not physical memory measurement.'});
const entry=JSON.parse(fs.readFileSync(path.join(base,'api-inputs.json'),'utf8')).entry;
const client=await build({absWorkingDir:root,stdin:{contents:entry,resolveDir:root,sourcefile:'task-live-api.ts',loader:'ts'},bundle:true,write:false,metafile:true,
 platform:'browser',format:'iife',globalName:'liveApi',target:'es2022',tsconfig:path.join(root,'apps/wechat-miniapp/tsconfig.json'),
 define:{__MINIAPP_API_BASE__:'"https://approved.fixture.invalid"',__MINIAPP_DEVELOPMENT_FIXTURE_MODE__:'false',__MINIAPP_OPERATOR_PREVIEW_TOKEN__:'""',__MINIAPP_ACCEPTANCE_DIAGNOSTICS__:'false',__MINIAPP_DEVICE_REQUEST_DIAGNOSTICS__:'false'},
 plugins:[{name:'native-port-and-read-only-cache-observer',setup(b){b.onResolve({filter:/^@tarojs\/taro$/},()=>({path:'taro',namespace:'native'}));
 b.onLoad({filter:/.*/,namespace:'native'},()=>({contents:'export default globalThis.__controlled.Taro;',loader:'ts'}));
 b.onLoad({filter:/[\\/]response-cache\.ts$/},()=>({contents:observed,loader:'ts'}));}}]});
fs.writeFileSync(path.join(out,'api-bundle.js'),client.outputFiles[0].text,{flag:'wx'});save('api-metafile.json',client.metafile);
const sourceBindings=Object.keys(client.metafile.inputs).filter(k=>!['task-live-api.ts','native:taro'].includes(k)).map(k=>{
 const relative=path.relative(root,path.resolve(root,k)).replaceAll('\\','/');assert(!relative.startsWith('../'));const b=fs.readFileSync(path.join(root,relative));return {path:relative,bytes:b.length,sha256:sha(b)};});
save('api-inputs.json',{entry,sourceBindings,virtual:['task-live-api.ts','native:taro'],observedOwner:owner,scope:'Full current API; task-only read-only cache observer and native port.'});
let runner=fs.readFileSync(path.join(dir,'experience-live-cold-dispatch-2026-10-03.mts'),'utf8');
const once=(before,after)=>{assert.equal(runner.split(before).length,2,before.slice(0,80));runner=runner.replace(before,after);};
once('current-execution-state-2026-10-03-r42.json','current-execution-state-2026-10-03-r44.json');once('client<3','client<1');
const start=runner.indexOf(' const bootstrapPromise='),end=runner.indexOf('}catch(error){',start);assert(start>0&&end>start);
runner=runner.slice(0,start)+` const boot=await bootstrap(pages[0],0);lanes.push({client:0,bootstrap:boot});
 const history=JSON.parse(fs.readFileSync(path.join(root,'output/playwright/cloud-sky-live-mixed-1003-r4/final-owner.json'),'utf8'));
 const tileIds=[...new Set(history.requests.map((r:any)=>r.route).filter((r:string)=>r.includes('/sky/supplements/sao/')&&r.includes('/tiles/')).map((r:string)=>r.split('/').at(-1)))];
 save('pressure-origin.json',{source:'output/playwright/cloud-sky-live-mixed-1003-r4/final-owner.json',sha256:sha(fs.readFileSync(path.join(root,'output/playwright/cloud-sky-live-mixed-1003-r4/final-owner.json'))),tileIds,
  scope:'Bounded actual SAO client/response-cache owner pressure using previously demanded real tile identities; no page/Scene or9condition/fullcold replay.'});
 const page=pages[0];
 const measured=await page.evaluate(async({tileIds}:any)=>{
  const w=globalThis.__controlled,api=globalThis.liveApi,observer=w.cacheObservers[0];if(w.cacheObservers.length!==1)throw Error('unexpected response cache owner count');
  await observer.flush();const initial=observer.snapshot(),snapshots:any[]=[];
  const readBase=async(phase:string)=>{w.phase=phase;const first=w.requests.length;
   const report=await api.getSkyReport(w.spotId,w.context.contextId),catalog=await api.getStellarCatalog(report.data.skyScene.catalog),figures=await api.getConstellationCatalog();
   if(JSON.stringify(report.data)!==JSON.stringify(w.reportEnvelope.data)||catalog.data.rows.length!==8404||figures.data.images.length===0)throw Error('pressure warm facts changed');
   await observer.flush();return {phase,requestCount:w.requests.length-first};};
  const beforePressure=await readBase('cache-baseline-warm');w.phase='cache-sao-pressure';
  const index=await api.saoCatalogClient.getIndex();await observer.flush();
  let consumed=0;for(const id of tileIds){if(!index.data.index.tiles.some(t=>t.id===id))throw Error('history tile not in current index');
   const response=await api.saoCatalogClient.getTile(index.data,id);if(!response.data.tile.rows.length)throw Error('empty tile does not prove pressure effect');
   await observer.flush();consumed++;const state=observer.snapshot();snapshots.push({consumed,tileId:id,state});
   if(['spot-sky','stellar-catalog','constellation-catalog'].every(f=>!state.memory.some(v=>v.family===f)&&!state.disk.some(v=>v.family===f)))break;
   if(consumed>=32)break;
  }
  const beforeWarm=observer.snapshot(),afterPressure=await readBase('cache-after-pressure-warm'),afterWarm=observer.snapshot();
  return {initial,beforePressure,snapshots,consumed,beforeWarm,afterPressure,afterWarm,events:w.cacheEvidence,
   scope:'Actual current response cache and validated real SAO client; forced flush only makes persistence observation deterministic. Serial bounded pressure is causal owner development evidence, not exact historical concurrent scheduling or native capacity/physical RSS.'};
 },{tileIds});save('cache-owner-observation.json',measured);
 const logs=docker(['logs',name]);fs.writeFileSync(path.join(out,'caddy.log'),logs+'\\n',{flag:'wx'});
 const access=logs.split(/\\r?\\n/).flatMap(line=>{try{const r=JSON.parse(line);return r.logger?.startsWith('http.log.access.')?[r]:[];}catch{return[];}});
 for(const r of access){assert.equal(r.request,undefined);assert.equal(r.resp_headers,undefined);assert([undefined,''].includes(r.user_id));}
 assert.equal(access.length,rows.length);const success=rows.filter(r=>r.completed&&!r.aborted);
 assert.equal(access.reduce((n,r)=>n+r.size,0),success.reduce((n,r)=>n+r.encodedBodyBytes,0));
 assert.deepEqual(sources.map(bind),before);save('inputs-after.json',sources.map(bind));
 for(const file of ['source-binding-before.json','api-inputs.json'])for(const r of JSON.parse(fs.readFileSync(path.join(out,file),'utf8')).sourceBindings)assert.deepEqual(bind(r.path),{path:r.path,bytes:r.bytes,sha256:r.sha256});
 assert.deepEqual(errors,[]);save('wire-requests.json',rows);
 save('result.json',{status:'LIVE_RESPONSE_CACHE_PRESSURE_OWNER_DEVELOPMENT',measured,wire:rows,privacyStatusSizeMatched:true,
  encodedSuccessfulBodyBytes:success.reduce((n,r)=>n+r.encodedBodyBytes,0),decodedSuccessfulBodyBytes:success.reduce((n,r)=>n+r.decodedBodyBytes,0),
  scope:'Current full API and real source owners, controlled native transport/storage, explicit fixture report/weather/business. Read-only cache instrumentation, bounded serial SAO pressure, no page/Scene/firstusable/9conditions/native orcapacity claim. No otherbusinesslogic/production policy change.'});
 console.log(JSON.stringify({tiles:measured.consumed,baseline:rows.filter(r=>r.phase==='cache-baseline-warm').map(r=>r.status),after:rows.filter(r=>r.phase==='cache-after-pressure-warm').map(r=>r.status),events:measured.events.length}));
`+runner.slice(end);
fs.writeFileSync(path.join(dir,'experience-live-cache-pressure-2026-10-03.mts'),runner,{flag:'wx'});
save('build-origin.json',{source:'output/playwright/cloud-sky-live-mixed-1003-r3',copiedPageBundle:true,apiRebuiltForReadOnlyCacheObserver:true,sourceBindings:sourceBindings.length});
console.log(JSON.stringify({output:path.relative(root,out),apiSourceBindings:sourceBindings.length,task:'experience-live-cache-pressure-2026-10-03.mts'}));
