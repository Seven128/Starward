// Research-only comparison of exact vector projection and the current angle path.
// This does not change the production renderer, cache, clock or catalogue.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog';
import {presentSkyTime} from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation';
import {selectSkyStellarTiles} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-tile-selection';
import {createSkyViewBasis,createSkyDirectionProjector,prepareSkyDirection} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection';
import {skyStarMagnitudeLimit,createSkyStarAppearance} from '../../../../apps/wechat-miniapp/src/features/sky/sky-star-appearance';
import {stellarDirectionAt,rotateStellarDirection,projectStellarMotion} from '../../../../packages/astronomy-core/src/stellar-vectors';
import {assertSaoIndexPublication,assertSaoTilePublication} from '@starward/miniapp-contracts';

const [inputFile,outputFile]=process.argv.slice(2);
if(!inputFile||!outputFile)throw Error('input_and_new_output_required');
const inputBytes=await fs.readFile(inputFile);
const input=JSON.parse(inputBytes.toString('utf8'));
if(input.envelope.data.context.spotId!=='spot:test-published')throw Error('public_fixture_required');
const report=projectAdoptedSkyCatalog(input.envelope).data;
const night=report.hourly.find(row=>row.sunAltitudeDeg!=null&&row.sunAltitudeDeg<-18)!;
const root=path.resolve(import.meta.dirname,'../../../../workers/miniapp-api/assets/sao-v2');
const index=JSON.parse(await fs.readFile(path.join(root,'index.json'),'utf8'));
const manifest=JSON.parse(await fs.readFile(path.join(root,'publication.json'),'utf8'));
const publication={publicationHash:manifest.publicationHash,index};assertSaoIndexPublication(publication);
const basis=createSkyViewBasis(45,110,0)!,width=390,height=844,tiles=new Map();
const results=[];
for(const fov of [45,10.8]){
 let maximumPixelDifference=0,maximumCandidateCount=0,visibleCount=0,angleCalls=0;
 const before:number[]=[],after:number[]=[];
 for(let frame=0;frame<80;frame++){
  const at=new Date(Date.parse(night.at)+1000+frame*17000).toISOString();
  const p=presentSkyTime(report,at)!;
  const geometry=p.report.skyScene.frames[0]!.geometry!;
  const selected=selectSkyStellarTiles(index.tiles,{frame:geometry,expected:{catalog:input.catalog.data,at,observer:report.skyScene.observer!},
   basis,width,height,verticalFovDeg:fov,sunAltitudeDeg:p.row.sunAltitudeDeg!,mode:'NIGHT'});
  for(const t of selected)if(!tiles.has(t.id)){
   const tile=JSON.parse(await fs.readFile(path.join(root,t.file),'utf8'));
   assertSaoTilePublication({publicationHash:publication.publicationHash,tile},publication,t);tiles.set(t.id,tile);
  }
  const rows:Array<{reference:string;magnitude:number;motion:any}>=input.catalog.data.rows.map((r:any)=>({reference:r[0],magnitude:r[2],motion:r.slice(4,10)}));
  for(const tile of selected)for(const r of tiles.get(tile.id).rows)rows.push({reference:r[0],magnitude:r[1],motion:r.slice(2,8)});
  maximumCandidateCount=Math.max(maximumCandidateCount,rows.length);
  const projector=createSkyDirectionProjector(basis,width,height,fov)!;
  const limit=skyStarMagnitudeLimit(fov,p.row.sunAltitudeDeg!,'NIGHT')!;
  const appearance=createSkyStarAppearance(fov,p.row.sunAltitudeDeg!,'NIGHT');
  const run=(optimized:boolean)=>{
   const found=[];let converted=0;
   for(const row of rows){
    let position;
    if(!optimized){position=projectStellarMotion(row.motion,geometry.julianYears,geometry.equatorialToEnu);converted++;}
    if(row.magnitude>=limit)continue;
    let projected;
    if(optimized){
     const vector=rotateStellarDirection(stellarDirectionAt(row.motion,geometry.julianYears),geometry.equatorialToEnu);
     projected=projector.prepared({vector,degrees:0,altitude:0});
     if(!projected)continue;
     // Reuse exact current formulas for accepted angular/appearance facts.
     position=projectStellarMotion(row.motion,geometry.julianYears,geometry.equatorialToEnu);converted++;
    }else projected=projector.prepared(prepareSkyDirection(position!.azimuthDeg,position!.altitudeDeg)!);
    if(!projected)continue;
    const shown=appearance(row.magnitude,position!.altitudeDeg);if(!shown||shown.opacity<=0)continue;
    found.push({reference:row.reference,x:projected.x,y:projected.y,position,appearance:shown});
   }
   return {found,converted};
  };
  let t=performance.now();const a=run(false);const prior=performance.now()-t;
  t=performance.now();const b=run(true);const next=performance.now()-t;
  if(frame>=10){before.push(prior);after.push(next);}
  if(a.found.length!==b.found.length)throw Error('visible_count_changed');
  for(let i=0;i<a.found.length;i++){
   const x=a.found[i]!,y=b.found[i]!;
   if(x.reference!==y.reference||JSON.stringify(x.position)!==JSON.stringify(y.position)||JSON.stringify(x.appearance)!==JSON.stringify(y.appearance))throw Error('accepted_fact_changed');
   maximumPixelDifference=Math.max(maximumPixelDifference,Math.hypot(x.x-y.x,x.y-y.y));
  }
  visibleCount+=a.found.length;angleCalls+=b.converted;
 }
 const summary=(values:number[])=>{const sorted=values.toSorted((a,b)=>a-b);return {medianMs:sorted[Math.floor(sorted.length*.5)],p95Ms:sorted[Math.floor(sorted.length*.95)]};};
 results.push({fov,frames:80,measuredFrames:70,maximumCandidateCount,totalVisibleAcrossFrames:visibleCount,
  optimizedAngularEvaluations:angleCalls,maximumPixelDifference,before:summary(before),candidate:summary(after)});
}
const result={scope:'ISOLATED_EXACT_VECTOR_CULLING_RESEARCH_NOT_PRODUCTION_OR_PHONE',
 inputSha256:createHash('sha256').update(inputBytes).digest('hex'),results,
 limits:['No production integration or cache/lifetime verification','No GL, React, names-layout or whole-frame speed claim','Original angle/appearance formulas retained for every visible candidate','Actual view-boundary and shared-consumer regression still required before adoption']};
await fs.writeFile(outputFile,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result));
