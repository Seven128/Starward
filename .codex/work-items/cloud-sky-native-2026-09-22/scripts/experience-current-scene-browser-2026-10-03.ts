/** Task-only migration of saved software GL instrumentation. Exported function
 * sources are saved before injection. No production policy is substituted. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {completeGpuExecutor,completeJourneyExecutor} from './experience-complete-resource-browser-2026-10-02';
function migrate(source:string,before:string,after:string){assert.equal(source.split(before).length,2,before.slice(0,90));return source.replace(before,after);}
const historical=ts.transpileModule(fs.readFileSync(new URL('./experience-complete-resource-browser-2026-10-02.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const ast=ts.createSourceFile('executor.js',historical,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const sourceOf=(name:string)=>ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name)!.getText(ast).replace(/^export /,'');

function installResourceObserver(){
 const w=(globalThis as any).__controlled,api=(globalThis as any).fullHookProbe;
 w.resourceEvents=[];w.resourcePeaks={ownerRgbaModel:0,registeredRgbaModel:0,pendingRgbaModel:0,filesBytes:0,leases:0};
 w.resourceSnapshot=()=>{
  const owners:any[]=[],references:any[]=[];
  for(const [name,h] of w.hooks){const entries=h.owner?.__measure()??[];
   owners.push({name,active:h.active,wanted:h.wanted.map((a:any)=>a.id),entries:entries.map((e:any)=>({...e,image:e.image?w.imageInfo(e.image):null}))});
   for(const e of entries)if(e.image&&e.current)references.push({owner:name,role:'loader',image:e.image});
   for(const [id,image] of h.value.images)references.push({owner:name,role:'ready:'+id,image});
   for(const [id,image] of h.value.retainedImages??[])references.push({owner:name,role:'retained:'+id,image});
  }
  const selected=w.lastPageResult?.canvasDeepSkyImage;
  if(selected?.image)references.push({owner:'selected-W3',role:'page-state',image:selected.image});
  const unique=[...new Map(references.filter(r=>api.taskNativeImageMembership(r.image)==='CURRENT').map(r=>[w.identity(r.image),r.image])).values()] as any[];
  const registered=w.images.filter((r:any)=>api.taskNativeImageMembership(r.image)==='CURRENT');
  const pending=w.images.filter((r:any)=>r.status==='pending');
  const cache=w.caches.map((c:any)=>c.inspect()),files=[...w.files].map(([path,b]:any)=>({path,bytes:b.byteLength}));
  const bytes=(a:any[])=>a.reduce((n,r)=>{const i=r.image?w.imageInfo(r.image):w.imageInfo(r);return n+(i?.width??0)*(i?.height??0)*4;},0);
  return {owners,references:references.map(r=>({owner:r.owner,role:r.role,...w.imageInfo(r.image),membership:api.taskNativeImageMembership(r.image)})),
   ownerRgbaModel:bytes(unique),ownerImages:unique.length,registeredRgbaModel:bytes(registered),registeredImages:registered.length,
   pendingRgbaModel:pending.reduce((n:any,r:any)=>n+r.width*r.height*4,0),pendingDecodes:pending.length,
   filesBytes:files.reduce((n,r)=>n+r.bytes,0),files,cache,leases:cache.reduce((n:any,c:any)=>n+(c.leased??0),0),
   retired:w.images.filter((r:any)=>['RETIRED','STALE'].includes(api.taskNativeImageMembership(r.image))).length,
   unregistered:w.images.filter((r:any)=>api.taskNativeImageMembership(r.image)==='UNREGISTERED').length,
   diagnosticStrongImages:w.images.length,diagnosticOfferedBytes:[...w.offers.values()].reduce((n:any,a:any)=>n+a.bytes.byteLength,0),
   scope:'Deduplicated actual owner graph, separate native registration and in-flight decode RGBA models. Encoded MapFS includes staging. Diagnostic images/offers retained by harness. No physical GC/native/driver/RSS claim.'};
 };
 w.sampleResources=(reason:string)=>{const s=w.resourceSnapshot();for(const k of Object.keys(w.resourcePeaks))w.resourcePeaks[k]=Math.max(w.resourcePeaks[k],s[k]);
  w.resourceEvents.push({reason,index:w.resourceEvents.length,at:performance.now(),ownerRgbaModel:s.ownerRgbaModel,registeredRgbaModel:s.registeredRgbaModel,pendingRgbaModel:s.pendingRgbaModel,filesBytes:s.filesBytes,leases:s.leases,ownerImages:s.ownerImages,registeredImages:s.registeredImages,pendingDecodes:s.pendingDecodes,retired:s.retired});return s;};
 for(const name of ['writeFile','rename','unlink']){const fs=w.Taro.getFileSystemManager(),original=fs[name];fs[name]=(o:any)=>original({...o,success:(...args:any[])=>{w.sampleResources('fs-'+name);o.success?.(...args);}});}
 w.sampleResources('observer-start');
}
let gpu=sourceOf('completeGpuExecutor');
gpu=migrate(gpu,'const actual = api.createSkyGpuRenderer','let actual = api.createSkyGpuRenderer');
gpu=migrate(gpu,'Reflect.get(target, key, receiver)','Reflect.get(actual, key, actual)');
gpu=migrate(gpu,'Reflect.apply(value, target, args)','Reflect.apply(value, actual, args)');
gpu=migrate(gpu,'w.actualRenderer = actual;',`w.actualRenderer = actual;w.replaceRenderer=()=>{actual=api.createSkyGpuRenderer(gl,1,{imageFailed:(image:any)=>{w.gpuFailures??=[];w.gpuFailures.push(w.imageInfo(image));}});w.actualRenderer=actual;w.rendererWasReleased=false;};`);
// Function source is already transpiled JavaScript. Keep injected additions JS.
gpu=gpu.replace('(image:any)','(image)');
gpu=gpu.slice(0,gpu.lastIndexOf('}'))+'('+installResourceObserver.toString()+')();\n}';
export const currentGpuExecutor=Function('return ('+gpu+')')() as typeof completeGpuExecutor;

let journey=sourceOf('completeJourneyExecutor');
journey=migrate(journey,'{ current, figures, at } = w.stable',`{ current:baseReport, figures, at:baseAt } = w.stable;
 const at=new Date(Date.parse(baseAt)+(requested.timeSeconds??0)*1000).toISOString();
 const current=(requested.timeSeconds??0)===0?baseReport:api.presentSkyTime(baseReport,at).report;
 const position=w.stable.positions[requested.timeSeconds??0]?.data;
 const positionCatalog=current.skyScene.deepSky.catalog;
 if(requested.tracking){if(!w.objectTracking.snapshot().target)w.objectTracking.start({reference:'M:51',displayName:'M51',kind:'DEEP_SKY'},current.context.spotId);}
 else w.objectTracking.stop();`);
journey=migrate(journey,'const queuedBasis = api.createSkyViewBasis(...requested.pose);',`const frame=current.hourly.find(r=>r.at===at),body=requested.body==='MOON'?{azimuthDeg:frame.moonAzimuthDeg,altitudeDeg:frame.moonAltitudeDeg}:frame?.planets?.find(p=>p.body===requested.body);
 const geometry=requested.body?body:position?.position;
 const queuedBasis=requested.target||requested.body?api.createSkyViewBasis(geometry.azimuthDeg+(requested.offsetAz??0),90+geometry.altitudeDeg,0):api.createSkyViewBasis(...requested.pose);
 w.manualBasisRef.current=null;`);
journey=migrate(journey,'requestedFov: requested.fov,','requestedFov: requested.fov,');
journey=migrate(journey,'wideFieldEnabled: true,','wideFieldEnabled: requested.wideFieldEnabled??true,mode:requested.mode??"DAY",constellationsEnabled:requested.constellationsEnabled??true,landscapeEnabled:requested.landscapeEnabled??true,');
journey=migrate(journey,'const startRequest = w.requests.length,',`if(requested.tracking){api.applyActualTrackedPosition(position,input);if(w.objectTracking.snapshot().position?.at!==at||!w.manualBasisRef.current)throw Error('actual tracking did not accept current position');
 if(requested.timeSeconds){const before=w.manualBasisRef.current;api.applyActualTrackedPosition(w.stable.positions[0].data,input);if(w.manualBasisRef.current!==before||w.objectTracking.snapshot().position?.at!==at)throw Error('stale tracking changed actual camera');}}
 const conditionStart=performance.now();
 const startRequest = w.requests.length,`);
journey=migrate(journey,'const commit = () => {',`const commit = () => {input.canvasRevision=w.canvasGenerationRef.current;w.lastPageInput=input;`);
journey=migrate(journey,'const value = inspect(),','w.sampleResources("page-commit");const value = inspect(),');
journey=migrate(journey,'w.presentedSkyFrame?.data !== current','w.presentedSkyFrame?.data !== current');
journey=migrate(journey,'const record = {','const record = {elapsedFromConditionMs:performance.now()-conditionStart,resources:w.sampleResources("accepted-frame"),');
journey=migrate(journey,'(!result.landscapeImage.panorama || result.landscapeImage.opacity >= 1)','true');
journey=migrate(journey,'result.landscapeImage.opacity >= 1','true');
journey=migrate(journey,'ready: inspect(),','ready: {...inspect(),at,resources:w.sampleResources("condition-ready")},');
journey=migrate(journey,'if (result.stellarSupplement.failed || result.stellarSupplement.loading || !result.stellarSupplement.frame)','if (result.stellarSupplement.failed || result.stellarSupplement.loading || !result.stellarSupplement.frame)');
export const currentJourneyExecutor=Function('return ('+journey+')')() as typeof completeJourneyExecutor;

export async function currentHideExecutor({source}:any){
 const w=(globalThis as any).__controlled,api=(globalThis as any).fullHookProbe;
 let credit:any=null;
 if(source){credit=api.presentedImageFacts(w.lastPageResult,w.presentedSkyFrame,w.lastPageInput).opticalImageCredit;
  if(!credit)throw Error('actual accepted optical source unavailable');await api.openActualOpticalSources(credit);
  if(w.navigationEvents.at(-1)?.url!==credit.sourceRoute)throw Error('actual source route differs');}
 const before=w.sampleResources('before-hide');w.lifecycle.hide();w.rendererWasReleased=true;
 w.commit(()=>api.pageImages({...w.lastPageInput,pageVisible:false,canvasRevision:w.canvasGenerationRef.current}));
 await new Promise(r=>setTimeout(r,30));const resources=w.sampleResources('after-hide');
 return {source,credit,navigation:w.navigationEvents,before,resources,cache:{leased:resources.leases},
  current:w.images.filter((r:any)=>api.taskNativeImageMembership(r.image)==='CURRENT').map((r:any)=>w.imageInfo(r.image)),presented:w.presentedSkyFrame,
  gpu:w.gpu.snapshot(),tracking:w.objectTracking.snapshot(),scope:'Actual page hide and hook effects; no component-unmount cleanup during source route hide.'};
}
export function currentShowExecutor(){const w=(globalThis as any).__controlled;w.lifecycle.show();return {generation:w.canvasGenerationRef.current};}
export async function currentFinalExecutor(){
 const w=(globalThis as any).__controlled,api=(globalThis as any).fullHookProbe;
 const before={gpu:w.gpu.snapshot(),resources:w.sampleResources('before-unmount')};
 w.lifecycle.hide();w.commit(()=>api.pageImages({...w.lastPageInput,pageVisible:false}));
 for(const s of w.slots)s?.cleanup?.();await new Promise(r=>setTimeout(r,30));
 const afterHide={gpu:w.gpu.snapshot(),cache:w.caches.map((c:any)=>c.inspect()),resources:w.sampleResources('after-unmount'),
  nativeCurrent:w.images.map((r:any)=>({...w.imageInfo(r.image),membership:api.taskNativeImageMembership(r.image)})),presented:w.presentedSkyFrame,counters:w.counters()};
 const clear=await api.clearSkyPublicImageCache();w.lifecycle.dispose();
 const afterClear={gpu:w.gpu.snapshot(),cache:w.caches.map((c:any)=>c.inspect()),resources:w.sampleResources('after-clear'),counters:w.counters(),files:[...w.files].map(([path,b]:any)=>({path,bytes:b.byteLength})),sao:w.stellarLoaders.map((l:any)=>l.__measure())};
 w.assertStableOwners({afterRelease:true});return {before,afterHide,clear,afterClear,fullGlLedger:w.gpu.full(),resourcePeaks:w.resourcePeaks,resourceEvents:w.resourceEvents,saoClientEvents:w.saoClientEvents,fsOperations:w.fsCalls,requests:w.requests,comparisons:[],bridgeMetadataRetention:w.queryRetention(),scope:'Controlled software development journey, logical owner/handle retirement. Physical native/GC/driver/RSS and WeChat composition unverified.'};
}
