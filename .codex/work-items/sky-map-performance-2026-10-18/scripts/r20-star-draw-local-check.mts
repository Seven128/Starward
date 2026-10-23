// Task-only bounded comparison. Does not install a cache in production.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {createHash} from 'node:crypto';
import {loadBsc5pStarCatalog,bsc5pHorizontalFrame} from '../../../../packages/astronomy-core/src/bsc5p-catalog.ts';
import {StellarCatalogPublicationService} from '../../../../workers/miniapp-api/src/stellar-catalog-publication.ts';
import {createStellarCatalogClient} from '../../../../apps/wechat-miniapp/src/services/stellar-catalog-client.ts';
import {attachSkyCatalog,resolveSkySceneFrame} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';
import {resolveSkyStellarSupplement,currentStellarSupplement} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-supplement-scene.ts';
import {createSkyViewBasis,createSkyDirectionProjector,sameSkyViewBasis} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
import {createSkyStarAppearance,skyStarMagnitudeLimit,skyStarDisplayColor} from '../../../../apps/wechat-miniapp/src/features/sky/sky-star-appearance.ts';
import {createSkyStarTransitions} from '../../../../apps/wechat-miniapp/src/features/sky/sky-star-transition.ts';
import {selectSkyStellarTiles} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-tile-selection.ts';
import {assertSaoIndexPublication,assertSaoTilePublication,assertStellarGeometryFrame} from '@starward/miniapp-contracts';

const root=path.resolve(import.meta.dirname,'../../../..');
const out=process.argv[2];if(!out)throw Error('private_output_required');
const sha=(v:Buffer|string)=>createHash('sha256').update(v).digest('hex');
const files=['sky-scene-render.ts','sky-stellar-transform.ts','sky-stellar-scene.ts','sky-stellar-supplement-scene.ts','sky-view-projection.ts','sky-star-appearance.ts','sky-star-transition.ts','sky-gpu-renderer.ts'];
const bindings=await Promise.all(files.map(async file=>{const relative=`apps/wechat-miniapp/src/features/sky/${file}`;return {path:relative,sha256:sha(await fs.readFile(path.join(root,relative)))};}));
const source=await fs.readFile(path.join(root,bindings[0]!.path),'utf8');
const block=source.slice(source.indexOf('  const catalog = data.skyScene.state'),source.indexOf('  const solarDisc=skySunDiscAt'));
assert(block.startsWith('  const catalog = data.skyScene.state')&&block.includes('paintSupplementPoint'));
const emitStart=block.indexOf('  const paintStar ='),emitEnd=block.indexOf('  if (catalog &&',emitStart);
const emitCode=block.slice(emitStart,emitEnd);
const helpers={resolveSkySceneFrame,currentStellarSupplement,createSkyStarAppearance,skyStarMagnitudeLimit,skyStarDisplayColor};
const scopeNames=['data','frameAt','verticalFovDeg','mode','sun','palette','paintedObjects','starTransitions','projector','project','supplement','context','prepared'];
function executable(text:string){const js=ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  return new Function(...Object.keys(helpers),...scopeNames,js).bind(null,...Object.values(helpers));}
const baseline=executable(block+'return {paintedObjects,namedStars};');
const prepare=executable(block.slice(0,emitStart)+'const paintStar=(star,projection,pickable=true)=>prepared.push({star,projection,pickable});\n'+block.slice(emitEnd)+'return prepared;');
const replay=executable('const namedStars=[];'+emitCode+`
  const base=starTransitions.layer('catalog',data.skyScene.catalog);
  const extra=currentStellarSupplement(supplement,data.skyScene,frameAt);
  const supplemental=starTransitions.layer('supplement',extra?extra.catalogVersion+':'+extra.publicationHash:null);
  for(const value of prepared)paintStar((value.star.reference.startsWith('HR:')?base:supplemental).point(value.star),value.projection);
  for(const layer of [base,supplemental])for(const star of layer.exits()){const projection=project(star.azimuthDeg,star.altitudeDeg);if(projection)paintStar(star,projection,false);}
  return {paintedObjects,namedStars};`);
const owner=loadBsc5pStarCatalog('bsc5p-bright-stars.v3'),envelope=new StellarCatalogPublicationService().get(owner);
const catalogs=await Promise.all([0,1].map(async()=>{const client=createStellarCatalogClient({request:async()=>structuredClone(envelope),invalidate(){throw Error('invalid');}});return (await client(owner)).data;}));
const saoRoot=path.join(root,'workers/miniapp-api/assets/sao-v2'),indexBytes=await fs.readFile(path.join(saoRoot,'index.json'));
const manifest=JSON.parse(await fs.readFile(path.join(saoRoot,'publication.json'),'utf8'));
const publication={publicationHash:manifest.publicationHash,index:JSON.parse(indexBytes.toString())};assertSaoIndexPublication(publication);
const tileBytes=new Map<string,Buffer>(),inputBindings=[];
const observer={latitude:22.6,longitude:114.5,elevationM:30};
const width=384,height=796.800048828125,fov=264.3550889449854,basis=createSkyViewBasis(0,180,0)!;
const rawJobs=[];
for(let i=0;i<12;i++){
  const at=new Date(Date.parse('2026-09-19T23:59:00Z')-i*86400000).toISOString();
  const geometry={format:'bsc5p-stellar-geometry-v1',referenceAt:'2000-01-01T12:00:00.000Z',catalogVersion:owner.catalogVersion,catalogHash:owner.catalogHash,observer,...bsc5pHorizontalFrame({...observer,at})};
  assertStellarGeometryFrame(geometry,{catalog:catalogs[0]!,at,observer});
  const selected=selectSkyStellarTiles(publication.index.tiles,{frame:geometry,expected:{catalog:catalogs[0]!,at,observer},basis,width,height,verticalFovDeg:fov,sunAltitudeDeg:-24,mode:'NIGHT'});
  for(const reference of selected)if(!tileBytes.has(reference.id)){const bytes=await fs.readFile(path.join(saoRoot,reference.file));assert.equal(bytes.length,reference.bytes);assert.equal(sha(bytes),reference.sha256);tileBytes.set(reference.id,bytes);inputBindings.push({file:reference.file,bytes:bytes.length,sha256:sha(bytes)});}
  rawJobs.push({at,geometry,selected});
}
function job(index:number,variant:number,settings:any={}){
  const raw=rawJobs[index%rawJobs.length]!,geometry=structuredClone(raw.geometry);
  const report:any={skyScene:{state:'AVAILABLE',catalog:{catalogVersion:owner.catalogVersion,catalogHash:owner.catalogHash},observer,frames:[{at:raw.at,state:'AVAILABLE',geometry}]}};
  const data=attachSkyCatalog(report,catalogs[variant]);
  const tiles=raw.selected.map(reference=>{const tile={publicationHash:publication.publicationHash,tile:JSON.parse(tileBytes.get(reference.id)!.toString())};assertSaoTilePublication(tile,publication,reference);return tile;});
  const supplement=resolveSkyStellarSupplement(publication,tiles,data.skyScene,raw.at)!;
  return {data,frameAt:raw.at,supplement,basis,width,height,verticalFovDeg:fov,mode:'NIGHT',sunAltitude:-24,...settings};
}
function drawRunner(candidate:boolean){
  const transitions=createSkyStarTransitions(),scope={};let cached:any=null,builds=0,hits=0,maxPrepared=0;
  const reset=()=>{transitions.reset();cached=null;};
  const run=(j:any,now:number,commit=true,record=false)=>{
    const frame=resolveSkySceneFrame(j.data.skyScene,j.frameAt),extra=currentStellarSupplement(j.supplement,j.data.skyScene,j.frameAt);
    const key=[frame,extra,j.width,j.height,j.verticalFovDeg,j.mode,j.sunAltitude,j.center?.x??j.width/2,j.center?.y??j.height/2];
    const match=!!cached&&key.every((v,i)=>v===cached.key[i])&&sameSkyViewBasis(j.basis,cached.basis);
    const projector=createSkyDirectionProjector(j.basis,j.width,j.height,j.verticalFovDeg,j.center)!;
    const project=(az:number,alt:number)=>projector?.project(az,alt)??null;
    const stars:any[]=[],vertices:number[]=[];let checksum=0;
    const palette=j.mode==='OBSERVATION'?{target:'#D84A3C',text:'#FF6B58'}:{target:'#AABCCA',text:'#DCE4EF'};
    const colors=new Map<string,number[]>();
    const context={disc(x:number,y:number,radius:number,hex:string,opacity:number,stroke:number,profile:string){let rgb=colors.get(hex);if(!rgb){rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);colors.set(hex,rgb);}vertices.push(x,y,radius,stroke,profile==='star'?1:0,...rgb,opacity);if(record)stars.push([x,y,radius,hex,opacity,stroke,profile]);}};
    const transition=transitions.prepare({context:scope,at:j.frameAt,mode:j.mode},now,j.reducedMotion??false,j.paused??false);
    const args=[j.data,j.frameAt,j.verticalFovDeg,j.mode,{altitudeDeg:j.sunAltitude},palette,[],transition,projector,project,j.supplement,context,[]];
    let result;
    const start=performance.now();
    if(candidate){
      if(!match){const prepared:any[]=[];const preparedArgs=args.slice();preparedArgs[7]=undefined;preparedArgs[12]=prepared;prepare(...preparedArgs);cached={key,basis:structuredClone(j.basis),prepared};builds++;maxPrepared=Math.max(maxPrepared,prepared.length);}else hits++;
      args[12]=cached.prepared;result=replay(...args);
    }else result=baseline(...args);
    const typed=new Float32Array(vertices);
    for(let i=0;i<typed.length;i+=9)checksum+=typed[i]!+typed[i+1]!+typed[i+8]!;
    const elapsed=performance.now()-start;
    if(commit)assert(transition.commit());
    return {elapsed,checksum,vertices:typed.length,objects:result.paintedObjects.length,names:result.namedStars.length,animating:transition.animating,
      ...(record?{trace:{stars,typed:[...typed],...result}}:{})};
  };
  return {run,reset,stats:()=>({builds,hits,maxPrepared,retainedModels:cached?1:0,retainedPrepared:cached?.prepared.length??0})};
}
const equality={frames:0,submitted:0,picked:0,named:0,pickedBsc:0,pickedSao:0,maximumPrepared:0};
const a=drawRunner(false),b=drawRunner(true);let clock=0;
for(const settings of [{},{basis:createSkyViewBasis(20,120,10)!},{verticalFovDeg:10.8},{mode:'OBSERVATION'},
  {sunAltitude:-10},{center:{x:width*.48,y:height*.47}},{reducedMotion:true},{paused:true}]){
  const ja=job(2,0,settings),jb=job(2,1,settings);
  for(const step of [0,40,80,120,160,200]){clock+=step;const x=a.run(ja,clock,step!==120,true),y=b.run(jb,clock,step!==120,true);
    assert.deepEqual(y.trace,x.trace);assert.equal(y.animating,x.animating);assert(Object.is(y.checksum,x.checksum));equality.frames++;equality.submitted+=x.vertices/9;equality.picked+=x.objects;equality.named+=x.names;
    equality.pickedBsc+=x.trace.paintedObjects.filter((p:any)=>p.reference.startsWith('HR:')).length;
    equality.pickedSao+=x.trace.paintedObjects.filter((p:any)=>p.reference.startsWith('SAO:')).length;}
}
assert(equality.pickedBsc>0&&equality.pickedSao>0&&equality.named>0,'nonempty real consumer evidence');
equality.maximumPrepared=b.stats().maxPrepared;const beforeReset=b.stats();a.reset();b.reset();assert.equal(b.stats().retainedModels,0);
function median(v:number[]){const x=[...v].sort((a,b)=>a-b);return x[Math.floor(x.length/2)]!;}
const results=[];
for(const repeats of process.argv.includes('--equality-only')?[]:[1,5]){
  const samples=[];
  for(let round=-3;round<12;round++){
    const pair:any={};
    for(const candidate of ((round+3)%2?[true,false]:[false,true])){
      const runner=drawRunner(candidate);let elapsed=0,checksum=0,vertices=0,paintCount=0;
      for(let i=0;i<12;i++){const j=job(i,candidate?1:0);
        for(let n=0;n<repeats;n++){const v=runner.run(j,(i*repeats+n)*40);elapsed+=v.elapsed;checksum+=v.checksum;vertices+=v.vertices;paintCount++;}}
      pair[candidate?'candidate':'baseline']={elapsed,checksum,vertices,paintCount,...runner.stats()};runner.reset();assert.equal(runner.stats().retainedModels,0);
    }
    assert(Object.is(pair.baseline.checksum,pair.candidate.checksum));assert.equal(pair.baseline.vertices,pair.candidate.vertices);
    if(round>=0)samples.push(pair);
  }
  results.push({repeats,interpretation:repeats===1?'new exact time every paint; no cache reuse':'new exact time then four unchanged-view continuation paints; not measured phone hit ratio',samples,
    medianBaselineMs:median(samples.map(v=>v.baseline.elapsed)),medianCandidateMs:median(samples.map(v=>v.candidate.elapsed)),
    medianPairedReduction:median(samples.map(v=>1-v.candidate.elapsed/v.baseline.elapsed))});
}
for(const binding of bindings)assert.equal(sha(await fs.readFile(path.join(root,binding.path))),binding.sha256);
const result={scope:'LOCAL_STAR_BLOCK_ONLY_NOT_NATIVE_CPU_GPU_MEMORY_ACCEPTANCE',node:process.version,bindings,
  input:{baseHash:owner.catalogHash,baseRows:owner.rows.length,saoPublicationHash:publication.publicationHash,indexSha256:sha(indexBytes),tiles:inputBindings,
    observer,times:rawJobs.map(v=>v.at),selectedTiles:rawJobs.map(v=>v.selected.length),view:{basis,width,height,verticalFovDeg:fov},sunAltitude:-24},
  candidate:'one current prepared star+screen projection array, exact frame/supplement/view/appearance key; existing transition and pick/name/Float32 emission always rerun',
  equality,beforeReset,afterReset:b.stats(),results,limitations:['Local star loop extraction with original production imports, not full Scene/native/React performance','Controlled night solar altitude, site and dates from existing R17 fixture convention; not phone snapshot replay','Candidate adds one array and owned star/projection records; logical item counts do not measure heap bytes or prove no leak','No production owner/lifecycle integration, no change to production source','No GPU calls, asset traffic, phone frame rate, heap/GC or retained graph measured']};
await fs.mkdir(path.dirname(path.resolve(out)),{recursive:true});await fs.writeFile(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({equality,results:results.map(({samples,...v})=>v),beforeReset,afterReset:b.stats()}));
