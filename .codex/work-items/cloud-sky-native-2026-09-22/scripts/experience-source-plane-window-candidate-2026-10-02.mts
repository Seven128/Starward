/** Task mathematics only: clip the actual source UV plane by an enclosing viewport cone. No renderer/assets changes. */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import {attachSkyCatalog} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';
import {presentSkyTime} from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts';
import {resolveConstellationFrame} from '../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-scene.ts';
import {skyArtworkTextureWindow} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-texture-window.ts';
import {skyArtworkViewRayHull} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-visibility.ts';
import {skyArtworkUvAtDirection,type SkyArtworkRegistration,type SkyArtworkView} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-registration.ts';
import {unprojectSkyPoint,type SkyVector} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
import {exactSkyTimeFrame} from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-frame.ts';
import {createStellarMotion,stellarDirectionAt,rotateStellarDirection} from '@starward/astronomy-core/stellar-vectors';
type V=readonly number[];type UV=readonly [number,number];type Matrix=number[][];
const ROOT=fileURLToPath(new URL('../../../../',import.meta.url));
const hash=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const bind=async(p:string)=>{const b=await fs.readFile(path.join(ROOT,p));return {path:p,bytes:b.length,sha256:hash(b)};};
const dot=(a:V,b:V)=>a.reduce((n,v,i)=>n+v*b[i]!,0);
const cross=(a:V,b:V)=>[a[1]!*b[2]!-a[2]!*b[1]!,a[2]!*b[0]!-a[0]!*b[2]!,a[0]!*b[1]!-a[1]!*b[0]!];
const norm=(a:V)=>Math.hypot(...a),normalize=(a:V)=>a.map(v=>v/norm(a));
const determinant=(m:Matrix)=>dot(m[0]!,cross(m[1]!,m[2]!));
const inverse=(m:Matrix)=>{const det=determinant(m);if(!Number.isFinite(det)||Math.abs(det)<1e-14)return null;
 const cols=[cross(m[1]!,m[2]!),cross(m[2]!,m[0]!),cross(m[0]!,m[1]!)];
 return [0,1,2].map(i=>cols.map(c=>c[i]!/det));};
const normInf=(m:Matrix)=>Math.max(...m.map(r=>r.reduce((n,v)=>n+Math.abs(v),0)));
const mul=(a:Matrix,b:Matrix)=>a.map(r=>[0,1,2].map(j=>r.reduce((n,v,k)=>n+v*b[k]![j]!,0)));
const corners:UV[]=[[0,0],[1,0],[1,1],[0,1]];
/** Exact affine inequality a*u+b*v+c>=0, expanded by a constant safe outer error. */
function clip(poly:UV[],plane:V):UV[]|null{
 const value=(p:UV)=>plane[0]!*p[0]+plane[1]!*p[1]+plane[2]!;
 const next:UV[]=[];
 for(let i=0;i<poly.length;i++){
  const a=poly[i]!,b=poly[(i+1)%poly.length]!,fa=value(a),fb=value(b);
  if(fa>=0)next.push(a);
  if((fa>=0)!==(fb>=0)){
   if(Math.abs(fa-fb)<=128*Number.EPSILON*Math.max(1,Math.abs(fa),Math.abs(fb)))return null;
   const t=fa/(fa-fb);if(!Number.isFinite(t)||t<0||t>1)throw Error('clip_intersection_invalid');
   next.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);
  }
 }
 return next;
}
export function sourcePlaneWindowCandidate(registration:SkyArtworkRegistration,view:SkyArtworkView,width:number,height:number,imageWidth:number,imageHeight:number,originalAnchorDirections?:readonly SkyVector[]){
 const full={x:0,y:0,width:imageWidth,height:imageHeight};
 const fallback=(reason:string,diagnostics:any={})=>({state:'FULL_UNCERTAIN',reason,window:full,...diagnostics});
 if(![imageWidth,imageHeight].every(n=>Number.isInteger(n)&&n>0))return fallback('image_dimensions');
 const hull=skyArtworkViewRayHull(view,width,height);if(!hull)return fallback('no_positive_view_hull');
 const rows=registration.rows.map(r=>[...r]),invR=inverse(rows),uvMatrix=[[1,1,1],[...registration.anchorU],[...registration.anchorV]],invUV=inverse(uvMatrix);
 if(!invR||!invUV)return fallback('matrix_inverse');
 const uvSignedArea=determinant(uvMatrix),detRows=determinant(rows);
 if(Math.abs(uvSignedArea)<1e-10||Math.abs(detRows-registration.determinant**2)>registration.determinant**2*1e-9)return fallback('uv_area_or_determinant_scale');
 const rowCond=normInf(rows)*normInf(invR),uvCond=normInf(uvMatrix)*normInf(invUV);
 const recovered=invR.map(r=>r.map(v=>v*registration.determinant));
 const identity=mul(rows,recovered),det=registration.determinant;
 const residual=Math.max(...identity.flatMap((r,i)=>r.map((v,j)=>Math.abs(v-(i===j?det:0)))));
 if(!Number.isFinite(rowCond+uvCond)||Math.abs(det)<1e-10||rowCond*uvCond*Number.EPSILON*128>1e-6||residual>Math.abs(det)*1e-9)
  return fallback('numerically_uncertain_inverse',{rowCond,uvCond,residual});
 // rows = det(D)*inverse(D); columns of D are the three original unit anchor directions.
 const anchorDirections=[0,1,2].map(j=>recovered.map(r=>r[j]!));
 if(anchorDirections.some(r=>Math.abs(norm(r)-1)>1e-8))return fallback('recovered_anchor_unit',{anchorDirections});
 const originalAnchorMaximumError=originalAnchorDirections?Math.max(...anchorDirections.flatMap((r,i)=>r.map((v,j)=>Math.abs(v-originalAnchorDirections[i]![j]!)))):null;
 if(originalAnchorMaximumError!==null&&(!Number.isFinite(originalAnchorMaximumError)||originalAnchorMaximumError>1e-8))return fallback('original_anchor_mismatch');
 const affine=mul(recovered,invUV),directionAt=(u:number,v:number)=>affine.map(r=>r[0]!+r[1]!*u+r[2]!*v);
 const sourceCorners=corners.map(([u,v])=>directionAt(u,v)),maximumLength=Math.max(...sourceCorners.map(norm));
 const planeNormal=rows.reduce((n,r)=>n.map((v,i)=>v+r[i]!),[0,0,0]);
 const sourceMinimumLengthBound=Math.abs(det)/norm(planeNormal);
 const branchAtCorners=sourceCorners.map(s=>det/dot(planeNormal,s));
 const sourceSumResidual=Math.max(...sourceCorners.map(s=>Math.abs(dot(planeNormal,s)-det)));
 if(!(sourceMinimumLengthBound>1e-6)||branchAtCorners.some(v=>!(v>0))||sourceSumResidual>Math.abs(det)*1e-9)return fallback('source_norm_or_positive_branch');
 // sum(rows * directionAt) = det everywhere on this affine source plane.
 // Its normalized denominator magnitude is |det|/|directionAt|, bounded across the whole UV square by convex norm maximum at corners.
 const minimumDenominator=Math.abs(det)/maximumLength;
 const rowMagnitude=rows.reduce((n,r)=>n+r.reduce((s,v)=>s+Math.abs(v),0),0),roundoff=64*2**-23*rowMagnitude;
 if(!(minimumDenominator>roundoff))return fallback('uniform_uv_denominator',{minimumDenominator,roundoff});
 const uvError=roundoff*(1+Math.max(...registration.anchorU.map(Math.abs),...registration.anchorV.map(Math.abs)))/(minimumDenominator-roundoff);
 // This investigates the existing owner's 64-ulp convention; a target shader error certificate is still a prerequisite before adoption.
 const expanded:UV[]=[[-uvError,-uvError],[1+uvError,-uvError],[1+uvError,1+uvError],[-uvError,1+uvError]];
 const expandedMaximumLength=Math.max(...expanded.map(([u,v])=>norm(directionAt(u,v))));
 const matrixDoubleError=128*Number.EPSILON*rowCond*uvCond*expandedMaximumLength;
 const worldOuterError=64*2**-23*expandedMaximumLength+matrixDoubleError;
 const centre=normalize(hull.reduce((sum,r)=>sum.map((v,i)=>v+r[i]!),[0,0,0]));
 const normalLengths=hull.map((r,i)=>norm(cross(r,hull[(i+1)%hull.length]!)));
 if(normalLengths.some(v=>!(v>1e-10)))return fallback('near_parallel_hull_normals');
 const normals=hull.map((r,i)=>{
  const n=normalize(cross(r,hull[(i+1)%hull.length]!));const sign=Math.sign(dot(n,centre));return n.map(v=>v*sign);
 });
 if(normals.some(n=>!n.every(Number.isFinite)||hull.some(r=>dot(n,r)<-1e-10)))return fallback('nonconvex_or_uncertain_hull');
 const coefficientDetails=[...normals,view.basis.forward].map(n=>{
  const [constant,a,b]=[0,1,2].map(j=>dot(n,affine.map(r=>r[j]!)));
  return {normal:n,exactCoefficient:[a!,b!,constant!],outerTolerance:worldOuterError,
    expandedCoefficient:[a!,b!,constant!+worldOuterError]};
 });
 const halfspaces=coefficientDetails.map(p=>p.expandedCoefficient);
 let polygon=expanded;
 for(const p of halfspaces){const clipped=clip(polygon,p);if(!clipped)return fallback('near_parallel_clip_intersection');polygon=clipped;}
 if(!polygon.length)return fallback('empty_not_used_as_demand_cull',{polygon,halfspaces});
 const edges=[imageWidth,imageHeight].map((size,axis)=>{
  const values=polygon.map(p=>p[axis]!);
  const lo=Math.max(0,Math.min(size,Math.floor(((Math.min(...values)-uvError)*size-3)/32)*32));
  const hi=Math.max(0,Math.min(size,Math.ceil(((Math.max(...values)+uvError)*size+3)/32)*32));
  return [lo,hi];
 });
 const x=edges[0]![0]!,y=edges[1]![0]!,right=edges[0]![1]!,bottom=edges[1]![1]!;
 if(!(right>x&&bottom>y))return fallback('empty_rounded_window',{polygon,halfspaces});
 const window={x,y,width:right-x,height:bottom-y};
 let inverseUvMaximumError=0,cornerDirectionMaximumError=0;
 for(let y=0;y<=16;y++)for(let x=0;x<=16;x++){
  const u=x/16,v=y/16,d=normalize(directionAt(u,v));
  const uv=skyArtworkUvAtDirection(registration,d as unknown as SkyVector);assert(uv);
  inverseUvMaximumError=Math.max(inverseUvMaximumError,Math.abs(uv[0]-u),Math.abs(uv[1]-v));
 }
 corners.forEach(([u,v],i)=>{const d=normalize(directionAt(u,v));cornerDirectionMaximumError=Math.max(cornerDirectionMaximumError,
  ...d.map((n,j)=>Math.abs(n-registration.corners[i]![j]!)));});
 return {state:window.width*window.height===imageWidth*imageHeight?'FULL_BOUNDED':'CROP_CANDIDATE',window,polygon,halfspaces,coefficientDetails,normals,affine,
  recoveredAnchorDirections:anchorDirections,sourceCorners,minimumDenominator,roundoff,uvError,worldOuterError,rowCond,uvCond,residual,
  inverseUvMaximumError,cornerDirectionMaximumError,uvSignedArea,detRows,originalAnchorDirections:originalAnchorDirections??null,originalAnchorMaximumError,
  sourceMinimumLengthBound,planeNormal,sourceSumResidual,branchAtCorners,
  polygonHalfspaceMinimumMargins:halfspaces.map(p=>Math.min(...polygon.map(uv=>p[0]!*uv[0]+p[1]!*uv[1]+p[2]!)))};
}

if(process.argv[1]&&path.resolve(process.argv[1]).toLowerCase()===fileURLToPath(import.meta.url).toLowerCase()){
 let output='output/playwright/cloud-sky-source-plane-window-candidate-1002-r1';
 for(let n=2;;n++){try{await fs.access(path.join(ROOT,output));output=`output/playwright/cloud-sky-source-plane-window-candidate-1002-r${n}`;}catch{break;}}
 const dir=path.join(ROOT,output);await fs.mkdir(dir,{recursive:true});
 const previousPath='output/playwright/cloud-sky-full-hook-resource-1002-r4/result.json';
 const previous=JSON.parse(await fs.readFile(path.join(ROOT,previousPath),'utf8'));
 assert.equal((await bind(previousPath)).sha256,'548b96c4dd399fcc88ff24cb3d73a18a09d884463890bb2a67eb24a4661ba20b');
 const row=previous.rows[2],inputs=previous.inputs;
 const bytes=await fs.readFile(path.join(ROOT,previous.report.path));assert.equal(hash(bytes),previous.report.sha256);
 const raw=projectAdoptedSkyCatalog(JSON.parse(bytes.toString())).data;
 const read=async(route:string)=>{const input=inputs.find((i:any)=>i.route===route&&i.transport==='FROZEN_LOCAL_BFF_JSON');assert(input);
  const b=await fs.readFile(path.join(ROOT,input.path));assert.equal(hash(b),input.sha256);return JSON.parse(b.toString());};
 const stars=(await read(`/v2/sky/catalogs/${raw.skyScene.catalog!.catalogVersion}/${raw.skyScene.catalog!.catalogHash}`)).data;
 const figures=(await read('/v2/sky/constellations')).data;
 const at=new Date(raw.context.at).toISOString(),report=attachSkyCatalog(presentSkyTime(raw,at)!.report,stars);
 const frame=resolveConstellationFrame(figures,report.skyScene,at)!;assert(frame);
 const instant=exactSkyTimeFrame(report.skyScene.frames,at);assert(instant?.state==='AVAILABLE'&&instant.geometry);
 // Independently replay the actual catalog/source direction inputs before registration; do not use inverse(R) as the source oracle.
 const years=instant.geometry.julianYears+(2000-figures.astrometry.epochJulianYear);
 const actualDirections=new Map<number,SkyVector>(figures.stars.map((s:any)=>[s[0],rotateStellarDirection(stellarDirectionAt(createStellarMotion({
  raDeg:s[1],decDeg:s[2],pmRaCosDecArcsecYr:s[3]/1000,pmDecArcsecYr:s[4]/1000}),years),instant.geometry!.equatorialToEnu)]));
 const wanted=row.ready.hooks.find((h:any)=>h.name==='artwork').wanted;
 const view={basis:row.condition.basis,verticalFovDeg:row.condition.fov,center:{x:195,y:422}};
 const rows=wanted.map((asset:any)=>{
  const figure=frame.images.find(f=>f.source.id===asset.id)!;assert(figure);assert.equal(figure.source.sha256,asset.sha256);
  const originalAnchors=figure.source.anchors.map(a=>({hip:a.hip,uv:[a.pixel[0]/asset.width,a.pixel[1]/asset.height],direction:actualDirections.get(a.hip)!}));
  assert(originalAnchors.every(a=>a.direction));
  const candidate=sourcePlaneWindowCandidate(figure.registration,view,390,844,asset.width,asset.height,originalAnchors.map(a=>a.direction));
  let samples=0,missing=0;const old=skyArtworkTextureWindow(figure.registration,view,390,844,asset.width,asset.height);
  // Full actual framebuffer lattice is a useful guard; the analytic enclosure is the argument, never a sampled coverage certificate.
  for(let y=0;y<844;y++)for(let x=0;x<390;x++){
   const ray=unprojectSkyPoint(x+.5,y+.5,view.basis,390,844,view.verticalFovDeg,view.center)!;
   const uv=skyArtworkUvAtDirection(figure.registration,ray);if(!uv||uv.some(v=>v<0||v>1))continue;samples++;
   const w=candidate.window;
   for(const [coordinate,origin,extent,size] of [[uv[0],w.x,w.width,asset.width],[uv[1],w.y,w.height,asset.height]]){
    const px=Math.max(0,Math.min(size!-1,coordinate!*size!-.5));
    if(Math.floor(px)<origin!||Math.ceil(px)>=origin!+extent!){missing++;break;}
   }
  }
  assert.equal(missing,0,asset.id+' actual valid fragment LINEAR neighbours retained by candidate');
  return {id:asset.id,sourceSha256:asset.sha256,imageWidth:asset.width,imageHeight:asset.height,registration:figure.registration,
   originalAnchors,previousWindow:old??null,candidate,fullBytes:asset.width*asset.height*4,candidateBytes:candidate.window.width*candidate.window.height*4,
   actualFramebufferSampleGuard:{validOriginalPlaneSamples:samples,missingLinearNeighbours:missing,notACoverageProof:true}};
 });
 const sourceBytes=rows.reduce((n:any,r:any)=>n+r.fullBytes,0),candidateBytes=rows.reduce((n:any,r:any)=>n+r.candidateBytes,0);
 const otherResident=row.passes[2].retained.filter((r:any)=>!wanted.some((a:any)=>a.id===r.source.offeredId)).reduce((n:number,r:any)=>n+r.bytes,0);
 const sourceBindings=previous.sourceBindings.filter((r:any)=>r.path.includes('sky-artwork-')||r.path.includes('sky-constellation-')||r.path.includes('sky-view-')||r.path.endsWith('sky-stellar-scene.ts')||r.path.endsWith('sky-time-presentation.ts'));
 for(const b of sourceBindings)assert.deepEqual(await bind(b.path),b);
 await fs.copyFile(fileURLToPath(import.meta.url),path.join(dir,'executed-script.mts.txt'));
 const aggregate={sourceBytes,candidateBytes,savedBytes:sourceBytes-candidateBytes,savingsFraction:(sourceBytes-candidateBytes)/sourceBytes,
  partialWindows:rows.filter((r:any)=>r.candidate.state==='CROP_CANDIDATE').length,fullFallbacks:rows.filter((r:any)=>r.candidate.state==='FULL_UNCERTAIN').length,
  otherExistingResidentBytes:otherResident,candidatePlusExistingOtherBytes:candidateBytes+otherResident,frameEndBudget:16*1024*1024,
  wouldFitCurrentFrameEndBudget:candidateBytes+otherResident<=16*1024*1024};
 await fs.writeFile(path.join(dir,'result.json'),JSON.stringify({status:'BOUNDED_MATHEMATICAL_CANDIDATE_NOT_ADOPTED',input:await bind(previousPath),
  report:previous.report,sourceBindings,algorithm:'task-source-plane-clip-v2-original-anchor-guards',condition:row.condition,view,rows,aggregate,
  rationale:'The existing positive viewport ray hull encloses the curved stereographic viewport. Each oriented cone halfspace is linear in the recovered source affine UV plane. Sutherland–Hodgman clipping yields a polygon enclosing all ideal source points inside that enclosing cone; its UV coordinate extrema occur at polygon vertices. No invalid behind-plane viewport-corner divisions are needed. Unknown/ill-conditioned/empty cases retain full source. Original source/UV/texels/alpha/coverage never change.',
  limits:['Task-only mathematics on one frozen view and 28 current images; no new GPU rendering or production change.',
   'Inverse UV grid/full framebuffer diagnostics are bounded discrepancy guards, not coverage proofs.',
   '64-ulp and 3-texel/32-block padding investigate current owner conventions. Target shader float error, copysampling and real pixels need independent review and bounded actual GPU before any adoption.',
   'Hypothetical retained byte total omits full-source upload/copy overlap and does not certify native/driver allocation, performance or capacity.',
   'DPR/view change/full-sphere uncertainty/failure/copy fallback/coarser consumers remain prerequisite scope if a useful candidate proceeds.']},null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({output,result:await bind(output+'/result.json'),aggregate},null,2));
}
