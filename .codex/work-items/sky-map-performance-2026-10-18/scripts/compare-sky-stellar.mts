// Full production-owner CPU comparison. Baseline sources stay in an external
// task cache; no second renderer, clock or catalogue enters the application.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog';
import {createStellarCatalogClient} from '../../../../apps/wechat-miniapp/src/services/stellar-catalog-client';
import {presentSkyTime} from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation';
import {resolveConstellationFrame} from '../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-scene';
import {selectSkyStellarTiles} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-tile-selection';
import {createSkyViewBasis} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection';
import {assertSaoIndexPublication,assertSaoTilePublication} from '@starward/miniapp-contracts';
import * as currentBase from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene';
import * as currentSupplement from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-supplement-scene';
import * as currentRender from '../../../../apps/wechat-miniapp/src/features/sky/sky-scene-render';
import {createSkySceneFrameIdentity,type SkyScenePaintResult} from '../../../../apps/wechat-miniapp/src/features/sky/sky-scene-frame';

const root=path.resolve(import.meta.dirname,'../../../..');
const require=createRequire(import.meta.url);
const sha=(bytes:Buffer|string)=>createHash('sha256').update(bytes).digest('hex');
const sourcePaths=[
 'apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts',
 'apps/wechat-miniapp/src/features/sky/sky-stellar-supplement-scene.ts',
 'apps/wechat-miniapp/src/features/sky/sky-scene-render.ts',
 'apps/wechat-miniapp/src/features/sky/sky-scene-frame.ts',
 'apps/wechat-miniapp/src/features/sky/sky-view-projection.ts',
 'packages/astronomy-core/src/stellar-vectors.ts',
];
const [inputFile,outputFile,baselineDirectory]=process.argv.slice(2);
if(inputFile==='capture'){
 if(!outputFile)throw Error('external_baseline_directory_required');
 const directory=path.resolve(outputFile);
 if(directory.startsWith(root+path.sep))throw Error('baseline_must_stay_outside_repository');
 await fs.mkdir(directory,{recursive:true});
 const destinations=new Map(sourcePaths.map(file=>[path.resolve(root,file),path.join(directory,path.basename(file,'.ts')+'.mts')]));
 const records=[];
 for(const relative of sourcePaths){
  const source=path.resolve(root,relative),bytes=await fs.readFile(source),original=bytes.toString('utf8');
  const requests=[...original.matchAll(/from\s*(['"])([^'"]+)\1/g)];
  let transformed=original;
  for(const match of requests){
   const specifier=match[2]!;
   let dependency:string;
   if(specifier.startsWith('.')){
    const base=path.resolve(path.dirname(source),specifier);
    dependency=await fs.access(base).then(()=>base).catch(()=>base+'.ts');
   }else dependency=require.resolve(specifier);
   transformed=transformed.replace(match[0],match[0].replace(specifier,pathToFileURL(destinations.get(dependency)??dependency).href));
  }
  await fs.writeFile(destinations.get(source)!,transformed,{flag:'wx'});
  records.push({path:relative,sha256:sha(bytes),bytes:bytes.length});
 }
 await fs.writeFile(path.join(directory,'sources.json'),JSON.stringify(records,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({capturedSources:records}));
 process.exit(0);
}
if(!inputFile||!outputFile||!baselineDirectory)throw Error('input_output_baseline_required');
const baselineSources=JSON.parse(await fs.readFile(path.join(baselineDirectory,'sources.json'),'utf8'));
const oldBase=await import(pathToFileURL(path.join(baselineDirectory,'sky-stellar-scene.mts')).href);
const oldSupplement=await import(pathToFileURL(path.join(baselineDirectory,'sky-stellar-supplement-scene.mts')).href);
const oldRender=await import(pathToFileURL(path.join(baselineDirectory,'sky-scene-render.mts')).href);
const candidatePaths=[...sourcePaths,'apps/wechat-miniapp/src/features/sky/sky-stellar-transform.ts',
 'apps/wechat-miniapp/src/features/sky/sky-scene-frame-facts.ts'];
const paths=await Promise.all(candidatePaths.map(async file=>({path:file,sha256:sha(await fs.readFile(path.join(root,file)))})));
const inputBytes=await fs.readFile(inputFile),input=JSON.parse(inputBytes.toString('utf8'));
if(input.envelope?.data?.context?.spotId!=='spot:test-published')throw Error('public_fixture_required');
const report=projectAdoptedSkyCatalog(input.envelope).data;
const sourceRoot=path.join(root,'workers/miniapp-api/assets/sao-v2');
const index=JSON.parse(await fs.readFile(path.join(sourceRoot,'index.json'),'utf8'));
const manifest=JSON.parse(await fs.readFile(path.join(sourceRoot,'publication.json'),'utf8'));
const publication={publicationHash:manifest.publicationHash,index};assertSaoIndexPublication(publication);
const night=report.hourly.find(row=>row.sunAltitudeDeg!=null&&row.sunAltitudeDeg<-18)!;
const width=390,height=844,tiles=new Map<string,any>(),tileText=new Map<string,string>();
const admitted=async()=>{
 const client=createStellarCatalogClient({request:async()=>structuredClone(input.catalog),invalidate(){throw Error('catalog_invalid');}});
 return (await client(report.skyScene.catalog!)).data;
};
type Owners={base:typeof currentBase;supplement:typeof currentSupplement;render:typeof currentRender};
const owners:Record<string,Owners>={baseline:{base:oldBase,supplement:oldSupplement,render:oldRender},
 candidate:{base:currentBase,supplement:currentSupplement,render:currentRender}};
const baselineHasNamedFrame=baselineSources.some((source:{path:string})=>source.path.endsWith('/sky-scene-frame.ts'));
function drawComparedFrame(name:string,surface:any,data:any,at:string,fov:number,basis:any,constellations:any,supplement:any,
 painted?:(result:Pick<SkyScenePaintResult,'snapshot'|'sources'>)=>void){
 const layers={frame:constellations,images:new Map(),enabled:true};
 if(name==='baseline'&&!baselineHasNamedFrame){
  // An explicitly identified, immutable pre-refactor external baseline keeps
  // its historical call shape. No application API accepts positional inputs.
  oldRender.drawSkyScene(surface,data,at,null,null,width,height,'NIGHT',
   painted?((snapshot:any,sources:any)=>painted({snapshot,sources})):undefined,
   undefined,fov,null,basis,undefined,undefined,{...layers,failed(){}},supplement);
  return;
 }
 owners[name]!.render.drawSkyScene(surface,{identity:createSkySceneFrameIdentity({
  observation:{data,frameAt:at,stellarSupplement:supplement,constellations},
  view:{heading:null,pose:null,manualBasis:basis,mode:'NIGHT',verticalFovDeg:fov},
  canvas:{generation:1,width,height},
 }),layers:{constellations:{images:layers.images,enabled:layers.enabled}}},painted?{painted}:{});
}
const stages=['presentation','base','selection','supplement','constellations','draw','total'] as const;
const summary=(values:number[])=>{const sorted=values.toSorted((a,b)=>a-b);return {samples:values.length,
 medianMs:sorted[Math.floor(sorted.length*.5)],p95Ms:sorted[Math.floor(sorted.length*.95)]};};
const results=[];
let comparedFrames=0,maximumNumericDifference=0;
function equal(left:any,right:any,location='frame'){
 if(typeof left==='number'&&typeof right==='number'){
  const difference=Math.abs(left-right);maximumNumericDifference=Math.max(maximumNumericDifference,difference);
  if(difference>1e-9)throw Error(`numeric_difference:${location}:${difference}`);
 }else if(left===null||right===null||typeof left!=='object'||typeof right!=='object'){
  if(left!==right)throw Error(`fact_changed:${location}`);
 }else{
  const keys=Object.keys(left);if(keys.join('|')!==Object.keys(right).join('|'))throw Error(`shape_changed:${location}`);
  for(const key of keys)equal(left[key],right[key],`${location}.${key}`);
 }
}
for(const fov of [45,10.8]){
 const jobs=[];
 for(let i=0;i<100;i++){
  const at=new Date(Date.parse(night.at)+1000+i*17000).toISOString();
  const presentation=presentSkyTime(report,at)!;
  const geometry=presentation.report.skyScene.frames[0]!.geometry!;
  const basis=createSkyViewBasis(45,110,0)!;
  const selected=selectSkyStellarTiles(index.tiles,{frame:geometry,expected:{catalog:input.catalog.data,at,observer:report.skyScene.observer!},
   basis,width,height,verticalFovDeg:fov,sunAltitudeDeg:presentation.row.sunAltitudeDeg!,mode:'NIGHT'});
  for(const reference of selected)if(!tiles.has(reference.id)){
   const text=await fs.readFile(path.join(sourceRoot,reference.file),'utf8'),tile=JSON.parse(text);
   const value={publicationHash:publication.publicationHash,tile};assertSaoTilePublication(value,publication,reference);
   tiles.set(reference.id,value);tileText.set(reference.id,text);
  }
  jobs.push({at,basis,selected});
 }
 for(const phase of ['coldPreparation','timeChange','sameTimeCamera'] as const){
  const timings=Object.fromEntries(Object.keys(owners).map(key=>[key,Object.fromEntries(stages.map(stage=>[stage,[] as number[]]))]));
  const catalogs={baseline:await admitted(),candidate:await admitted()};
  const stable=new Map<string,{report:any;supplement:any;constellations:any}>();
  let maximumLoaded=0,maximumTiles=0,submittedStars=0,pickedBase=0,pickedSao=0,namedBase=0;
  const trace=createHash('sha256'),count=phase==='coldPreparation'?20:100;
  for(let i=0;i<count;i++){
   const job=jobs[phase==='sameTimeCamera'?0:i]!;
   const basis=phase==='sameTimeCamera'?createSkyViewBasis(45+3*Math.sin(i/11),110+2*Math.cos(i/13),0)!:job.basis;
   // Alternating order makes JIT/GC and changing host load visible to both paths.
   const order=i%2?['candidate','baseline']:['baseline','candidate'];
   const rendered:Record<string,any>={};
   for(const name of order){
    const owner=owners[name]!;
    let started=performance.now(),beginning=started;
    const sample=(stage:string)=>{const now=performance.now();if(i>=5)timings[name]![stage]!.push(now-started);started=now;};
    const presentation=presentSkyTime(report,job.at)!;sample('presentation');
    const catalog=phase==='coldPreparation'?await admitted():catalogs[name as keyof typeof catalogs];
    const cached=stable.get(name);
    const attached=phase==='sameTimeCamera'&&cached?cached.report:owner.base.attachSkyCatalog(presentation.report,catalog);
    const frame=owner.base.resolveSkySceneFrame(attached.skyScene,job.at);if(!frame)throw Error('base_unavailable');
    // This is the page's real cheap availability/count read, never a full object-list request.
    const count=frame.pointCount??frame.points.length;if(count!==catalog.rows.length)throw Error('base_count_changed');
    sample('base');
    const geometry=owner.supplement.supplementGeometry(publication,attached.skyScene,job.at)!;
    const selected=selectSkyStellarTiles(index.tiles,{frame:geometry,expected:{catalog,at:job.at,observer:attached.skyScene.observer!},
     basis,width,height,verticalFovDeg:fov,sunAltitudeDeg:presentation.row.sunAltitudeDeg!,mode:'NIGHT'});sample('selection');
    const values=selected.map(reference=>{
     if(phase!=='coldPreparation')return tiles.get(reference.id);
     const value={publicationHash:publication.publicationHash,tile:JSON.parse(tileText.get(reference.id)!)};
     assertSaoTilePublication(value,publication,reference);return value;
    });
    const supplement=phase==='sameTimeCamera'&&cached?cached.supplement:owner.supplement.resolveSkyStellarSupplement(publication,values,attached.skyScene,job.at)!;
    maximumLoaded=Math.max(maximumLoaded,supplement.pointCount??supplement.points.length);maximumTiles=Math.max(maximumTiles,selected.length);sample('supplement');
    const constellations=phase==='sameTimeCamera'&&cached?cached.constellations:resolveConstellationFrame(input.constellations.data,attached.skyScene,job.at);sample('constellations');
    const surface:any=new Proxy({}, {get(){return ()=>true;}});
    drawComparedFrame(name,surface,attached,job.at,fov,basis,constellations,supplement);sample('draw');
    if(i>=5)timings[name]!.total!.push(performance.now()-beginning);
    if(phase==='sameTimeCamera')stable.set(name,{report:attached,supplement,constellations});
    // A second untimed draw records full same-frame consumers after cache setup.
    const stars:any[]=[],calls:any[]=[];let snapshot:any,sources:any;
    const recording:any=new Proxy({}, {get(_target,key){return (...args:any[])=>{
     if(key==='disc'&&args[6]==='star')stars.push(args);
     // Non-stellar geometry is a separate owner. Retain its call identities;
     // snapshots below include its real accepted objects and source identities.
     if(key==='disc'||key==='finish'||key==='begin')calls.push([key,args]);return true;
    };}});
    drawComparedFrame(name,recording,attached,job.at,fov,basis,constellations,supplement,({snapshot:value,sources:source})=>{
     // Admission identity is separately verified at the frame/Canvas owner.
     // Keep every pre-existing scientific, pick, name and source output here.
     if(value){const {identity:_admission,...scientific}=value;snapshot=scientific;}else snapshot=value;
     sources=source;
    });
    rendered[name]={stars,calls,snapshot,sources,...(i===count-1?{completeLegacyPoints:{base:frame.points,supplement:supplement.points}}:{})};
   }
   equal(rendered.baseline,rendered.candidate);comparedFrames++;
   const actual=rendered.candidate;
   submittedStars+=actual.stars.length;pickedBase+=actual.snapshot.objects.filter((o:any)=>o.reference.startsWith('HR:')).length;
   pickedSao+=actual.snapshot.objects.filter((o:any)=>o.reference.startsWith('SAO:')).length;namedBase+=actual.snapshot.namedStars?.length??0;
   trace.update(JSON.stringify(actual));
  }
  if(!submittedStars||!pickedBase||!pickedSao)throw Error('nonempty_base_sao_consumers_required');
  results.push({fov,phase,frames:count,maximumLoadedSaoRows:maximumLoaded,maximumSelectedTiles:maximumTiles,
   submittedStars,pickedBase,pickedSao,namedBase,consumerTraceSha256:trace.digest('hex'),
   timings:Object.fromEntries(Object.entries(timings).map(([name,values])=>[name,Object.fromEntries(Object.entries(values).map(([stage,values])=>[stage,summary(values)]))]))});
 }
}
const result={scope:'LOCAL_CPU_FULL_STELLAR_OWNERS_NOT_NATIVE_REACT_OR_GPU',inputSha256:sha(inputBytes),baselineSources,candidateSources:paths,
 baseCatalogRows:input.catalog.data.rows.length,saoPublicationRows:index.rowCount,comparedFrames,maximumNumericDifference,results,
 limitations:['No native GPU, React/Taro, image/texture preparation, file/network latency or physical FPS claim',
 'Cold preparation includes in-memory JSON decode/admission and static render-model construction; input file I/O excluded',
 'Time/camera CPU samples use already admitted publications and loaded actual view tiles',
 'Same-time camera test intentionally retains its loaded tile set; separate tile selection is still measured',
 'Full legacy points/list access remains supported and is verified separately']};
await fs.writeFile(outputFile,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(result));
