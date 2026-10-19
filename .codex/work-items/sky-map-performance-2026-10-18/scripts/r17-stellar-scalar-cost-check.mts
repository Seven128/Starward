// One task-only candidate. This file never rewrites or substitutes production imports.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {projectStellarMotionDirection,createStellarMotion,stellarHorizontalPosition,
  type StellarMotion,type EquatorialToEnu,type StellarDirection} from '../../../../packages/astronomy-core/src/stellar-vectors.ts';
import {loadBsc5pStarCatalog,bsc5pHorizontalFrame} from '../../../../packages/astronomy-core/src/bsc5p-catalog.ts';
import {selectSkyStellarTiles} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-tile-selection.ts';
import {createSkyViewBasis} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
import {assertSaoIndexPublication,assertSaoTilePublication,assertStellarGeometryFrame,
  type StellarGeometryFrame,type SaoTilePublication,type SaoTileReference} from '@starward/miniapp-contracts';

/** Literal scalar replacement of only stellarDirectionAt's immediately consumed tuple.
 * Operation order and both normalizations match stellar-vectors.ts. The final
 * normalized ENU result remains a newly returned three-number array. */
export function scalarCandidate(motion:StellarMotion,julianYears:number,matrix:EquatorialToEnu):StellarDirection{
  if(!Number.isFinite(julianYears))throw new Error('stellar_epoch_delta_invalid');
  const movedX=motion[0]+motion[3]*julianYears;
  const movedY=motion[1]+motion[4]*julianYears;
  const movedZ=motion[2]+motion[5]*julianYears;
  const length=Math.hypot(movedX,movedY,movedZ);
  if(!Number.isFinite(length)||length<1e-12)throw new Error('stellar_direction_invalid');
  const x=movedX/length,y=movedY/length,z=movedZ/length;
  return normalizedFinal(matrix[0]*x+matrix[1]*y+matrix[2]*z,
    matrix[3]*x+matrix[4]*y+matrix[5]*z,
    matrix[6]*x+matrix[7]*y+matrix[8]*z);
}
function normalizedFinal(x:number,y:number,z:number):StellarDirection{
  const length=Math.hypot(x,y,z);
  if(!Number.isFinite(length)||length<1e-12)throw new Error('stellar_direction_invalid');
  return [x/length,y/length,z/length];
}

const root=path.resolve(import.meta.dirname,'../../../..');
const task=path.resolve(import.meta.dirname,'..');
const sourcePath='packages/astronomy-core/src/stellar-vectors.ts';
const sha=(v:Buffer|string)=>createHash('sha256').update(v).digest('hex');
const identity=[1,0,0,0,1,0,0,0,1] as const;
const sites=[{latitude:22.6,longitude:114.5,elevationM:30},
  {latitude:-33.9,longitude:151.2,elevationM:0},
  {latitude:90,longitude:-180,elevationM:0},{latitude:-90,longitude:180,elevationM:0}];
const times=['2000-01-01T12:00:00Z','2026-09-19T23:59:00Z','2050-06-21T00:01:00Z'];
const fv=[45,10.8];
const catalog=loadBsc5pStarCatalog('bsc5p-bright-stars.v3');
const baseMotions=catalog.rows.map(row=>createStellarMotion(row));
assert.equal(baseMotions.length,8404);
const saoDirectory=path.join(root,'workers/miniapp-api/assets/sao-v2');
const indexBytes=await fs.readFile(path.join(saoDirectory,'index.json'));
const manifest=JSON.parse(await fs.readFile(path.join(saoDirectory,'publication.json'),'utf8'));
const publication={publicationHash:manifest.publicationHash,index:JSON.parse(indexBytes.toString('utf8'))};
assertSaoIndexPublication(publication);
assert.equal(publication.index.baseCatalogVersion,catalog.catalogVersion);
assert.equal(publication.index.baseAssetSha256,catalog.catalogHash);
const tiles=new Map<string,SaoTilePublication>();
const tileMotions=new Map<string,StellarMotion[]>();
const tileIdentities=new Map<string,{path:string;sha256:string;bytes:number;rows:number}>();
function frameAt(site:typeof sites[number],at:string):StellarGeometryFrame{
  const geometry={format:'bsc5p-stellar-geometry-v1' as const,referenceAt:'2000-01-01T12:00:00.000Z' as const,
    catalogVersion:catalog.catalogVersion,catalogHash:catalog.catalogHash,observer:site,...bsc5pHorizontalFrame({...site,at})};
  assertStellarGeometryFrame(geometry,{catalog,at:geometry.at,observer:site});return geometry;
}
async function loadTile(reference:SaoTileReference){
  if(tileMotions.has(reference.id))return tileMotions.get(reference.id)!;
  const bytes=await fs.readFile(path.join(saoDirectory,reference.file));
  assert.equal(sha(bytes),reference.sha256);assert.equal(bytes.length,reference.bytes);
  const value={publicationHash:publication.publicationHash,tile:JSON.parse(bytes.toString('utf8'))};
  assertSaoTilePublication(value,publication,reference);tiles.set(reference.id,value);
  const motions:StellarMotion[]=value.tile.rows.map((row:readonly number[])=>[row[2],row[3],row[4],row[5],row[6],row[7]]);
  tileMotions.set(reference.id,motions);
  tileIdentities.set(reference.id,{path:`workers/miniapp-api/assets/sao-v2/${reference.file}`,sha256:sha(bytes),bytes:bytes.length,rows:motions.length});
  return motions;
}
async function viewRows(geometry:StellarGeometryFrame,fov:number){
  const selected=selectSkyStellarTiles(publication.index.tiles,{frame:geometry,
    expected:{catalog,at:geometry.at,observer:geometry.observer},basis:createSkyViewBasis(45,110,0)!,
    width:390,height:844,verticalFovDeg:fov,sunAltitudeDeg:-24,mode:'NIGHT'});
  const motions:StellarMotion[]=[];
  for(const reference of selected)motions.push(...await loadTile(reference));
  assert(selected.length>0&&motions.length>0,'nonempty real selected SAO required');
  return {selected,motions};
}
function equalVector(a:StellarDirection,b:StellarDirection,label:string){
  assert.equal(a.length,b.length,label);
  for(let k=0;k<3;k++)assert(Object.is(a[k],b[k]),`${label}:${k}`);
}
function outcome(fn:typeof scalarCandidate,motion:any,years:any,matrix:any){
  try{return {kind:'value' as const,value:fn(motion,years,matrix)};}
  catch(error){return {kind:'error' as const,name:(error as Error).name,message:(error as Error).message};}
}
function equalOutcome(a:ReturnType<typeof outcome>,b:ReturnType<typeof outcome>,label:string){
  assert.equal(a.kind,b.kind,label);
  if(a.kind==='value'&&b.kind==='value')equalVector(a.value,b.value,label);else assert.deepEqual(a,b,label);
}
function traced(fn:typeof scalarCandidate,options:{invalidEpoch?:boolean;zeroMotion?:boolean;throwMotion?:number;throwMatrix?:number;zeroMatrix?:boolean}={}){
  const events:unknown[]=[];
  const originalHypot=Math.hypot,originalFinite=Number.isFinite;
  const motionValues=options.zeroMotion?[0,0,0,0,0,0]:[.3,.4,.5,1e-6,-2e-6,3e-6];
  const motion=Array.from({length:6},(_,index)=>Object.defineProperty({},'x',{get(){return index;}}));
  // Getter arrays observe numeric access order, including short-circuit errors.
  for(let k=0;k<6;k++)Object.defineProperty(motion,k,{get(){events.push(['motion',k]);if(options.throwMotion===k)throw new RangeError('motion_getter');return motionValues[k];}});
  const matrix=new Array(9);
  for(let k=0;k<9;k++)Object.defineProperty(matrix,k,{get(){events.push(['matrix',k]);if(options.throwMatrix===k)throw new RangeError('matrix_getter');return options.zeroMatrix?0:identity[k];}});
  Math.hypot=(...args:number[])=>{events.push(['hypot',...args]);return originalHypot(...args);};
  Number.isFinite=(value:unknown)=>{events.push(['finite',value]);return originalFinite(value);};
  let result:ReturnType<typeof outcome>;
  try{result=outcome(fn,motion,options.invalidEpoch?NaN:26.5,matrix);}
  finally{Math.hypot=originalHypot;Number.isFinite=originalFinite;}
  return {events,result};
}
function summary(values:number[]){
  const x=values.toSorted((a,b)=>a-b),at=(p:number)=>x[Math.min(x.length-1,Math.floor(x.length*p))]!;
  return {samples:x.length,median:at(.5),p05:at(.05),p95:at(.95),minimum:x[0],maximum:x.at(-1)};
}
function interval(values:number[]){
  let state=0x173a519b;const random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296;};
  const medians=[];
  for(let i=0;i<2000;i++)medians.push(summary(values.map(()=>values[Math.floor(random()*values.length)]!)).median);
  const s=medians.toSorted((a,b)=>a-b);return {low:s[50],high:s[1950],method:'deterministic paired resampling, 2000 median samples, percentile 95% interval; host observations only'};
}
type Job={years:number;matrix:EquatorialToEnu;motions:StellarMotion[];selectedTiles:number;saoRows:number};
function block(fn:typeof scalarCandidate,jobs:Job[],passes:number,seed:number){
  let checksum=0,calls=0;
  const start=process.hrtime.bigint();
  for(let pass=0;pass<passes;pass++){
    const job=jobs[(seed+pass)%jobs.length]!;
    for(let i=0;i<job.motions.length;i++){
      const value=fn(job.motions[i]!,job.years,job.matrix);
      checksum+=value[0]+value[1]*.5+value[2]*.25;
    }
    calls+=job.motions.length;
  }
  const elapsedMs=Number(process.hrtime.bigint()-start)/1e6;
  // Observable finite result consumes every returned direction; no forced GC.
  assert(Number.isFinite(checksum));return {elapsedMs,calls,checksum,nsPerCall:elapsedMs*1e6/calls};
}
async function worker(workerIndex:number){
  const results=[];
  for(const fov of fv){
    const jobs:Job[]=[];
    for(let i=0;i<100;i++){
      const at=new Date(Date.parse(times[1]!)+1000+i*17000).toISOString();
      const geometry=frameAt(sites[0]!,at),view=await viewRows(geometry,fov);
      jobs.push({years:geometry.julianYears,matrix:geometry.equatorialToEnu,motions:baseMotions.concat(view.motions),
        selectedTiles:view.selected.length,saoRows:view.motions.length});
    }
    const passes=Math.ceil(262144/Math.max(...jobs.map(j=>j.motions.length)));
    for(let i=0;i<10;i++){
      const names=(i+workerIndex)%2?['candidate','baseline']:['baseline','candidate'];
      const values=names.map(name=>block(name==='baseline'?projectStellarMotionDirection:scalarCandidate,jobs,passes,i));
      assert(Object.is(values[0]!.checksum,values[1]!.checksum));
    }
    const comparisons:any[]=[],selfComparisons:any[]=[];
    for(let i=0;i<36;i++){
      const baselineFirst=(i+workerIndex)%2===0,seed=10+i;
      if(i%3===2){
        const first=block(projectStellarMotionDirection,jobs,passes,seed),second=block(projectStellarMotionDirection,jobs,passes,seed);
        assert(Object.is(first.checksum,second.checksum));
        const left=baselineFirst?first:second,right=baselineFirst?second:first;
        selfComparisons.push({order:baselineFirst?'left-right':'right-left',left,right,apparentSavingPercent:(left.elapsedMs-right.elapsedMs)/left.elapsedMs*100});
      }else{
        const first=block(baselineFirst?projectStellarMotionDirection:scalarCandidate,jobs,passes,seed);
        const second=block(baselineFirst?scalarCandidate:projectStellarMotionDirection,jobs,passes,seed);
        assert(Object.is(first.checksum,second.checksum));assert.equal(first.calls,second.calls);
        const baseline=baselineFirst?first:second,candidate=baselineFirst?second:first;
        comparisons.push({order:baselineFirst?'baseline-candidate':'candidate-baseline',baseline,candidate,
          savingPercent:(baseline.elapsedMs-candidate.elapsedMs)/baseline.elapsedMs*100});
      }
    }
    const changes=comparisons.map(v=>v.savingPercent);
    results.push({fov,exactTimeJobs:jobs.length,baseCatalogRows:baseMotions.length,
      selectedTileRange:summary(jobs.map(j=>j.selectedTiles)),loadedSaoRowRange:summary(jobs.map(j=>j.saoRows)),
      passesPerBlock:passes,warmPairs:10,comparisons,selfComparisons,
      baselineNsPerCall:summary(comparisons.map(v=>v.baseline.nsPerCall)),candidateNsPerCall:summary(comparisons.map(v=>v.candidate.nsPerCall)),
      savingPercent:summary(changes),savingPercentInterval:interval(changes),
      byOrder:Object.fromEntries(['baseline-candidate','candidate-baseline'].map(order=>[order,summary(comparisons.filter(v=>v.order===order).map(v=>v.savingPercent))])),
      selfNoiseAbsolutePercent:summary(selfComparisons.map(v=>Math.abs(v.apparentSavingPercent)))});
  }
  return {workerIndex,results};
}
async function child(index:number){
  return await new Promise<any>((resolve,reject)=>{
    const child=spawn(process.execPath,[...process.execArgv,fileURLToPath(import.meta.url),'--worker',String(index)],{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe']});
    let output='',errors='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>errors+=b);
    child.once('error',reject);child.once('exit',code=>{
      if(code!==0)return reject(new Error(`worker_failed:${code}:${errors.slice(-3000)}`));
      try{resolve(JSON.parse(output));}catch(error){reject(new Error(`worker_invalid_output:${String(error)}:${errors.slice(-1000)}`));}
    });
  });
}
const workerFlag=process.argv.indexOf('--worker');
if(workerFlag!==-1){console.log(JSON.stringify(await worker(Number(process.argv[workerFlag+1]))));}
else{
  const ownerFiles=[sourcePath,'apps/wechat-miniapp/src/features/sky/sky-stellar-transform.ts',
    'apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts','apps/wechat-miniapp/src/features/sky/sky-stellar-supplement-scene.ts',
    'workers/miniapp-api/src/stellar-catalog-publication.ts','packages/astronomy-core/src/stellar-vectors.test.ts',
    '.codex/work-items/sky-map-performance-2026-10-18/scripts/compare-sky-stellar.mts'];
  const owners=await Promise.all(ownerFiles.map(async p=>({path:p,sha256:sha(await fs.readFile(path.join(root,p)))})));
  let numericalVectors=0,horizontalPositions=0;
  const cases=[];
  for(let siteIndex=0;siteIndex<sites.length;siteIndex++)for(const at of times){
    const geometry=frameAt(sites[siteIndex]!,at);
    for(const motion of baseMotions){
      const old=projectStellarMotionDirection(motion,geometry.julianYears,geometry.equatorialToEnu);
      const next=scalarCandidate(motion,geometry.julianYears,geometry.equatorialToEnu);equalVector(old,next,'BSC');numericalVectors++;
      const a=stellarHorizontalPosition(old),b=stellarHorizontalPosition(next);
      assert(Object.is(a.azimuthDeg,b.azimuthDeg)&&Object.is(a.altitudeDeg,b.altitudeDeg));horizontalPositions++;
    }
    for(const fov of fv){
      const view=await viewRows(geometry,fov);
      for(const motion of view.motions){
        const old=projectStellarMotionDirection(motion,geometry.julianYears,geometry.equatorialToEnu);
        const next=scalarCandidate(motion,geometry.julianYears,geometry.equatorialToEnu);equalVector(old,next,'SAO');numericalVectors++;
        const a=stellarHorizontalPosition(old),b=stellarHorizontalPosition(next);
        assert(Object.is(a.azimuthDeg,b.azimuthDeg)&&Object.is(a.altitudeDeg,b.altitudeDeg));horizontalPositions++;
      }
      cases.push({siteIndex,at:geometry.at,fov,baseCatalogRows:baseMotions.length,selectedTiles:view.selected.length,saoRows:view.motions.length});
    }
  }
  const boundaries:any[]=[
    ['negative-zero',[-0,-0,-0,-0,-0,-0],-0,identity],
    ['signed-components',[-0,1,-0,-0,0,-0],0,identity],
    ['exact-first-threshold',[1e-12,0,0,0,0,0],0,identity],
    ['below-first-threshold',[1e-12*(1-Number.EPSILON),0,0,0,0,0],0,identity],
    ['zero-first-direction',[0,0,0,0,0,0],0,identity],
    ['overflow-after-motion',[Number.MAX_VALUE,1,0,Number.MAX_VALUE,0,0],2,identity],
    ['large-hypot-not-naive-squared',[1e308,1e308,1e308,0,0,0],0,identity],
    ['nan-first-direction',[NaN,1,0,0,0,0],0,identity],
    ['missing-motion-item',[1,0,0,0,0],0,identity],
    ['invalid-year-nan',null,NaN,null],['invalid-year-infinity',null,Infinity,null],
    ['invalid-year-negative-infinity',null,-Infinity,null],['invalid-year-string',null,'0',null],
    ['zero-final-direction',[1,0,0,0,0,0],0,new Array(9).fill(0)],
    ['exact-final-threshold',[1,0,0,0,0,0],0,[1e-12,0,0,0,0,0,0,0,0]],
    ['below-final-threshold',[1,0,0,0,0,0],0,[1e-12*(1-Number.EPSILON),0,0,0,0,0,0,0,0]],
    ['nan-matrix',[1,0,0,0,0,0],0,[NaN,0,0,0,1,0,0,0,1]],
    ['infinite-matrix',[1,0,0,0,0,0],0,[Infinity,0,0,0,1,0,0,0,1]],
  ];
  const boundaryResults=boundaries.map(([label,motion,years,matrix])=>{
    const a=outcome(projectStellarMotionDirection,motion,years,matrix),b=outcome(scalarCandidate,motion,years,matrix);
    equalOutcome(a,b,label);return {label,result:a.kind==='error'?a:{kind:'value',sameByObjectIs:true}};
  });
  const traceCases=[{}, {invalidEpoch:true},{zeroMotion:true},{throwMotion:0},{throwMotion:4},{throwMatrix:0},{throwMatrix:4},{zeroMatrix:true}];
  const traces=traceCases.map(options=>{
    const a=traced(projectStellarMotionDirection,options),b=traced(scalarCandidate,options);
    assert.deepEqual(a,b);return {options,events:a.events,result:a.result.kind==='error'?a.result:{kind:'value',sameByObjectIs:true}};
  });
  const workers=[];for(let i=0;i<3;i++)workers.push(await child(i));
  const aggregate=fv.map(fov=>{
    const runs=workers.map(w=>w.results.find((r:any)=>r.fov===fov));
    const changes=runs.flatMap(r=>r.comparisons.map((p:any)=>p.savingPercent));
    const noise=runs.flatMap(r=>r.selfComparisons.map((p:any)=>Math.abs(p.apparentSavingPercent)));
    const s=summary(changes),ci=interval(changes),n=summary(noise);
    const repeatable=runs.every(r=>r.savingPercentInterval.low>0)&&ci.low!>0&&s.median>n.p95;
    return {fov,baselineNsPerCall:summary(runs.flatMap(r=>r.comparisons.map((p:any)=>p.baseline.nsPerCall))),
      candidateNsPerCall:summary(runs.flatMap(r=>r.comparisons.map((p:any)=>p.candidate.nsPerCall))),
      savingPercent:s,savingPercentInterval:ci,selfNoiseAbsolutePercent:n,
      processMedianSavingPercent:runs.map(r=>r.savingPercent.median),
      repeatableBeyondObservedNoise:repeatable,
      decision:repeatable?'HOST_SIGNAL_ONLY_REVIEW_BEFORE_ANY_PRODUCTION_CHANGE':'DO_NOT_ADOPT_HOST_GAIN_NOT_SEPARATED_FROM_NOISE'};
  });
  for(const entry of owners)assert.equal(sha(await fs.readFile(path.join(root,entry.path))),entry.sha256,'production owner changed during check');
  const report={schemaVersion:'starward-r17-stellar-scalar-cost-check-v1',
    scope:'ONE_TASK_ONLY_NUMERIC_CANDIDATE_HOST_COST_NOT_PHONE_A_ACCEPTANCE_OR_B_MEMORY_FIX',
    generatedAt:new Date().toISOString(),host:{node:process.version,v8:process.versions.v8,platform:process.platform,arch:process.arch,cpuModel:os.cpus()[0]?.model,logicalProcessors:os.cpus().length},
    sourceOwners:owners,script:{path:path.relative(root,fileURLToPath(import.meta.url)).replaceAll(path.sep,'/'),sha256:sha(await fs.readFile(fileURLToPath(import.meta.url)))},
    candidateFunctionSha256:sha(scalarCandidate.toString()+normalizedFinal.toString()),
    inputs:{catalogVersion:catalog.catalogVersion,catalogHash:catalog.catalogHash,baseCatalogRows:baseMotions.length,
      saoCatalogVersion:publication.index.catalogVersion,saoPublicationHash:publication.publicationHash,indexBytes:indexBytes.length,indexFileSha256:sha(indexBytes),
      saoPublicationTotalRows:publication.index.rowCount,saoPublicationTiles:publication.index.tiles.length,
      sites,times,views:{fov:fv,basisArguments:[45,110,0],width:390,height:844,sunAltitudeDeg:-24,mode:'NIGHT'},cases,
      selectedTileIdentities:[...tileIdentities.values()]},
    actualChecks:{objectIsDirectionVectors:numericalVectors,objectIsComponents:numericalVectors*3,
      objectIsHorizontalPositions:horizontalPositions,boundaryResults,orderedAccessAndMathTraces:traces,allPassed:true,productionSourcesUnchanged:true},
    allocationBoundary:{baselineSuccessfulSourceArrays:{equatorialIntermediate:1,returnedEnu:1},
      candidateSuccessfulSourceArrays:{equatorialIntermediate:0,returnedEnu:1},bothHypotCalls:2,bothNormalizationDivisions:6,
      removedSourceTupleLifetime:'Produced by stellarDirectionAt, consumed immediately by rotateStellarDirection destructuring, no caller reference escapes',
      unchanged:'Caller motionAt six-number tuple, lazy exact-frame caches, freeze of final ENU array, all other transforms/positions/subscribers',
      observedPhysicalAllocationBytes:null,observedGCEvents:null,observedRetainedHeapBytes:null,
      caveat:'Source-level array expression count is not physical allocation or retention: host/target engines may scalar-replace or optimize it. Inlining also changes the helper-call shape; no second variant isolates call overhead.'},
    benchmark:{clock:'process.hrtime.bigint monotonic host elapsed; nsPerCall is elapsed/calls, not target/thread CPU',
      workload:'All 8404 BSC rows plus actual selected SAO rows per 100 exact-time jobs, starting 1000ms after existing 2026 fixture and advancing 17000ms; input preparation/selection/I/O outside timing',
      harness:'Three sequential fresh Node processes, both orders after 10 alternating warm pairs, 24 timed comparison pairs and 12 interspersed baseline/self pairs per view. Every output consumed into matching finite checksums; no forced GC, heap snapshots, device, service or network.',
      decisionRule:'Only a host signal if every process paired 95% median interval is positive, pooled interval is positive, and pooled median exceeds observed baseline/self absolute p95. This is noise screening, not a product performance budget.',workers,aggregate},
    recommendation:aggregate.every(v=>v.repeatableBeyondObservedNoise)?'REVIEWABLE_HOST_SIGNAL_ONLY_ROOT_DECIDES_NEXT_A_STEP':'DO_NOT_ADOPT_THIS_CANDIDATE_CURRENT_HOST_EVIDENCE_IS_NOISE_OR_INCONSISTENT',
    limitations:['Host Node/V8, compiler/module/function-call shapes and concurrent machine load differ from Android WeChat runtime; no physical A speedup claim.',
      'Microkernel invokes all loaded rows and excludes viewport rejection, angle/appearance/materialization, freeze, React/Taro templates, native/GPU/copy/caption and accepted-frame delivery; not full-page latency.',
      'Same-time camera reuse does not call this kernel again for already cached rays; gains do not apply to all forEachProjected samples.',
      'Object.is checks cover numeric tuple contracts and boundary errors/ordered property and Math calls. Deliberately monkey-patched Array iteration is outside the admitted numeric-data contract.',
      'No allocation sampling or physical bytes/GC/retainer attribution. One source tuple removed cannot explain the observed process footprint. B allocation dependency remains open.',
      'No production code, active phone candidate, PLAN, account/service/database/private configuration, precision, time, catalogue size, cache or renderer changed.']};
  await fs.writeFile(path.join(task,'R17-STELLAR-SCALAR-COST-CHECK.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({checks:report.actualChecks.objectIsDirectionVectors,boundaries:boundaryResults.length,orderedTraces:traces.length,aggregate,recommendation:report.recommendation}));
}
