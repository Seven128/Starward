// Task-only retention diagnosis. Uses the previously verified public fixture
// and real production Scene owners. Node GC is an observation tool, not a fix.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog';
import {createStellarCatalogClient} from '../../../../apps/wechat-miniapp/src/services/stellar-catalog-client';
import {presentSkyTime} from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation';
import {attachSkyCatalog,resolveSkySceneFrame} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene';
import {resolveSkyStellarSupplement,supplementGeometry} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-supplement-scene';
import {selectSkyStellarTiles} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-tile-selection';
import {resolveConstellationFrame} from '../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-scene';
import {createSkyViewBasis} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection';
import {drawSkyScene} from '../../../../apps/wechat-miniapp/src/features/sky/sky-scene-render';
import {createSkyStarTransitions} from '../../../../apps/wechat-miniapp/src/features/sky/sky-star-transition';
import {createSkyReadyImages} from '../../../../apps/wechat-miniapp/src/features/sky/sky-ready-presentation';
import {createSkyNameLayouts} from '../../../../apps/wechat-miniapp/src/features/sky/sky-name-layout';
import {projectSkyCatalogNames,projectSkyConstellationNames} from '../../../../apps/wechat-miniapp/src/features/sky/sky-label-presentation';
import {assertSaoIndexPublication,assertSaoTilePublication} from '@starward/miniapp-contracts';

const root=path.resolve(import.meta.dirname,'../../../..');
const [inputFile,outputFile]=process.argv.slice(2);
if(!inputFile||!outputFile)throw Error('input_and_new_output_required');
const gc=(globalThis as any).gc as undefined|(()=>void);
if(!gc)throw Error('local_expose_gc_required');
const sha=(value:Buffer|string)=>createHash('sha256').update(value).digest('hex');
const inputBytes=await fs.readFile(inputFile),input=JSON.parse(inputBytes.toString('utf8'));
if(input.envelope?.data?.context?.spotId!=='spot:test-published')throw Error('existing_public_fixture_required');
if(sha(inputBytes)!=='9ce8706d36586ed4c0cb5e074c6b66efa396ec634320a2c4015bfb4d255011b0')throw Error('input_changed_from_stellar_equivalence_run');
const report=projectAdoptedSkyCatalog(input.envelope).data;
const client=createStellarCatalogClient({request:async()=>input.catalog,invalidate(){throw Error('catalog_invalid');}});
const catalog=(await client(report.skyScene.catalog!)).data;
const sourceRoot=path.join(root,'workers/miniapp-api/assets/sao-v2');
const index=JSON.parse(await fs.readFile(path.join(sourceRoot,'index.json'),'utf8'));
const manifest=JSON.parse(await fs.readFile(path.join(sourceRoot,'publication.json'),'utf8'));
const publication={publicationHash:manifest.publicationHash,index};assertSaoIndexPublication(publication);
const tiles=new Map<string,any>();
const night=report.hourly.find(row=>row.sunAltitudeDeg!=null&&row.sunAltitudeDeg<-18);
if(!night)throw Error('night_required');
const width=390,height=844,fov=10.8,basis=createSkyViewBasis(45,110,0)!;
const insets={top:0,right:0,bottom:0,left:0};
const starTransitions=createSkyStarTransitions(),readyImages=createSkyReadyImages(),nameLayouts=createSkyNameLayouts();
let published:any=null;
let submittedStars=0,pickedBsc=0,pickedSao=0,sceneFinishes=0,committedTransitions=0,committedNames=0;
let maxSelectedTiles=0,maxLoadedSaoRows=0,maxObjects=0,maxNames=0;
let lastNumericFingerprint=0;
const surfaceMethods:Record<string,(...args:any[])=>any>={
 disc(...args){if(args[6]==='star')submittedStars++;return true;},
 finish(){sceneFinishes++;return true;},
};
const success=()=>true;
const surface:any=new Proxy(surfaceMethods,{get(target,key){return target[String(key)]??success;}});
const emptyImages=new Map();
const measureText=(text:string)=>({width:text.length*7,left:0,right:text.length*7,ascent:9,descent:3});
// The latest snapshot/report/supplement is retained as the page does; no array
// stores old frames. Actual React/Taro scheduling and native callbacks are absent.
async function frame(frameIndex:number){
 const at=new Date(Date.parse(night!.at)+1000+Math.round(frameIndex*1000/60)).toISOString();
 const presentation=presentSkyTime(report,at);if(!presentation)throw Error('time_unavailable');
 const attached=attachSkyCatalog(presentation.report,catalog);
 const stellar=resolveSkySceneFrame(attached.skyScene,at);if(!stellar||stellar.pointCount!==8404)throw Error('full_bsc_unavailable');
 const geometry=supplementGeometry(publication,attached.skyScene,at)!;
 const selected=selectSkyStellarTiles(index.tiles,{frame:geometry,expected:{catalog,at,observer:attached.skyScene.observer!},
  basis,width,height,verticalFovDeg:fov,sunAltitudeDeg:presentation.row.sunAltitudeDeg!,mode:'NIGHT'});
 for(const reference of selected)if(!tiles.has(reference.id)){
  const tile=JSON.parse(await fs.readFile(path.join(sourceRoot,reference.file),'utf8'));
  const value={publicationHash:publication.publicationHash,tile};assertSaoTilePublication(value,publication,reference);tiles.set(reference.id,value);
 }
 const supplement=resolveSkyStellarSupplement(publication,selected.map(row=>tiles.get(row.id)),attached.skyScene,at)!;
 maxSelectedTiles=Math.max(maxSelectedTiles,selected.length);maxLoadedSaoRows=Math.max(maxLoadedSaoRows,supplement.pointCount!);
 const constellations=resolveConstellationFrame(input.constellations.data,attached.skyScene,at);
 const now=frameIndex*1000/60;
 const transitionFrame=starTransitions.prepare({context:attached.context,at,mode:'NIGHT'},now);
 const imageFrame=readyImages.prepare(now);
 const nameLayout=nameLayouts.prepare({context:attached.context,mode:'NIGHT'},now,width,height,insets);
 const args:any[]=[surface,attached,at,null,null,width,height,'NIGHT',
  (snapshot:any,sources:any)=>{
   if(!snapshot||snapshot.frameAt!==at)throw Error('real_scene_snapshot_required');
   const names=projectSkyCatalogNames(attached.skyScene,at,snapshot,snapshot.namedStars,snapshot.deepSkyAuxiliaryDecisions,insets,true,nameLayout.retainedCatalogReferences);
   for(const name of names)nameLayout.catalog(name,measureText(name.displayName));
   const constellationLabels=projectSkyConstellationNames(constellations,at,snapshot,true,[],insets,true,nameLayout.retainedConstellationIds);
   for(const name of constellationLabels)nameLayout.constellation(name.iau,{text:name.text,x:name.x,y:name.y,opacity:name.opacity,font:'12px sans-serif',color:'#DCE4EF',letterSpacing:0,textAlign:'center'},measureText(name.text));
   pickedBsc+=snapshot.objects.filter((o:any)=>o.reference.startsWith('HR:')).length;
   pickedSao+=snapshot.objects.filter((o:any)=>o.reference.startsWith('SAO:')).length;
   maxObjects=Math.max(maxObjects,snapshot.objects.length);maxNames=Math.max(maxNames,nameLayout.names.length);
   lastNumericFingerprint=snapshot.objects.reduce((sum:number,o:any)=>sum+o.x+o.y,0);
   if(!transitionFrame.commit())throw Error('transition_commit_failed');committedTransitions++;
   imageFrame.commit(now);if(!nameLayout.commit(now))throw Error('name_commit_failed');committedNames++;
   published={data:attached,at,supplement,constellations,snapshot,sources,names:nameLayout.names,controls:nameLayout.controls};
  },undefined,fov,null,basis,undefined,undefined,{frame:constellations,images:emptyImages,enabled:true,failed(){}},supplement];
 // These are the current drawSkyScene's actual optional owner slots, as used
 // by spot-sky-page. There is no cloned renderer or extracted Scene function.
 args[41]=transitionFrame;args[42]=imageFrame;
 (drawSkyScene as (...args:any[])=>void)(...args);
}
const started=performance.now();
const samples:any[]=[];
async function sample(frame:number){
 const allocated=process.memoryUsage();
 gc!();await new Promise<void>(resolve=>setImmediate(resolve));gc!();
 const retained=process.memoryUsage();
 const row={frame,elapsedMs:performance.now()-started,allocated,retained,loadedTileObjects:tiles.size,
  latestObjects:published?.snapshot.objects.length??0,latestNames:published?.names.length??0,lastNumericFingerprint};
 samples.push(row);
 console.log(JSON.stringify({frame,retainedHeapUsed:retained.heapUsed,external:retained.external,arrayBuffers:retained.arrayBuffers,rss:retained.rss,loadedTileObjects:tiles.size}));
}
const warmupFrames=120,measuredFrames=1800;
for(let i=0;i<warmupFrames;i++)await frame(i);
await sample(0);
for(let i=1;i<=measuredFrames;i++){
 await frame(warmupFrames+i-1);
 if(i%100===0)await sample(i);
}
if(!submittedStars||!pickedBsc||!pickedSao||sceneFinishes!==warmupFrames+measuredFrames||committedTransitions!==sceneFinishes||committedNames!==sceneFinishes)throw Error('nonempty_complete_scene_required');
published=null;starTransitions.reset();readyImages.reset();nameLayouts.reset();
await sample(measuredFrames+1);
const sourceFiles=['sky-time-presentation.ts','sky-stellar-scene.ts','sky-stellar-supplement-scene.ts','sky-stellar-transform.ts','sky-scene-render.ts','sky-star-transition.ts','sky-ready-presentation.ts','sky-name-layout.ts','sky-label-presentation.ts'];
const sources=await Promise.all(sourceFiles.map(async name=>{const file='apps/wechat-miniapp/src/features/sky/'+name;return{path:file,sha256:sha(await fs.readFile(path.join(root,file)))};}));
const result={scope:'LOCAL_NODE_GC_RETAINED_JS_REAL_SCENE_NO_NATIVE_GPU_OR_REACT_TARO',node:process.version,
 inputSha256:sha(inputBytes),sourceOwners:sources,saoPublicationHash:publication.publicationHash,
 baseCatalogRows:catalog.rows.length,saoPublicationRows:index.rowCount,fov,width,height,warmupFrames,measuredFrames,
 exactInstantStepMs:'round(index*1000/60)',totalUniqueFrames:warmupFrames+measuredFrames,
 maxSelectedTiles,maxLoadedSaoRows,maxObjects,maxNames,submittedStars,pickedBsc,pickedSao,sceneFinishes,committedTransitions,committedNames,
 samples,postResetSampleFrame:measuredFrames+1,
 limitations:['Node/V8 local retention diagnosis only; does not measure the phone JS heap or classify Android Unknown PSS',
 'Real full drawSkyScene traversal and current-frame publication shape, with actual transition/readiness/name owners; Canvas/GPU methods use a successful CPU port',
 'No native GL, native images/text glyph measurement, actual page React hooks, Taro setData, native callbacks, network or physical FPS',
 'All real BSC rows retained; actual selected SAO tile objects stay in one bounded diagnostic working set; no full-SA0 expansion',
 'Controlled text metrics exercise name ownership but are not target appearance evidence; optional no-image resource owners have no real image workload',
 'Forced GC is local evidence only, never a product repair or runtime acceptance condition']};
await fs.writeFile(outputFile,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({complete:true,samples:samples.length,frames:sceneFinishes,maxLoadedSaoRows,output:outputFile}));
