/** Task-only independent ideal halfspace/float32 discrepancy audit. No GPU/production changes. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import {attachSkyCatalog} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';
import {presentSkyTime} from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts';
import {resolveConstellationFrame} from '../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-scene.ts';
import {skyArtworkViewRayHull} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-visibility.ts';
import {unprojectSkyPoint,skyProjectionScale,type SkyVector} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
import {exactSkyTimeFrame} from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-frame.ts';
import {createStellarMotion,stellarDirectionAt,rotateStellarDirection} from '@starward/astronomy-core/stellar-vectors';
import {sourcePlaneWindowCandidate} from './experience-source-plane-window-candidate-2026-10-02.mts';
const root=fileURLToPath(new URL('../../../../',import.meta.url)),file=(p:string)=>path.join(root,p),sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
const bind=(p:string)=>{const b=fs.readFileSync(file(p));return{path:p,bytes:b.length,sha256:sha(b)}};
const out=process.argv[2];assert.match(out??'',/^output\/[a-z0-9-]+$/);assert(!fs.existsSync(file(out)));fs.mkdirSync(file(out));
fs.copyFileSync(fileURLToPath(import.meta.url),file(out+'/executed-script.mts.txt'),fs.constants.COPYFILE_EXCL);
const save=(p:string,v:any)=>fs.writeFileSync(file(out+'/'+p),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const r2path='output/playwright/cloud-sky-source-plane-window-candidate-1002-r2/result.json',r4path='output/playwright/cloud-sky-full-hook-resource-1002-r4/result.json';
assert.equal(bind(r2path).sha256,'307fdafeea493f676fce698b7b56a49ee9a5e38e9c92a75d3d7d3f5631ef07c8');
const candidateScript='.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-source-plane-window-candidate-2026-10-02.mts';
assert.equal(bind(candidateScript).sha256,'191db39c94f604fda03a2c1ab82f115bb5eb75c32a61c9b7a43b98e6ad95c78c');
const r2=JSON.parse(fs.readFileSync(file(r2path),'utf8')),r4=JSON.parse(fs.readFileSync(file(r4path),'utf8'));
const inputs=new Set([r2path,r4path,candidateScript,r2.report.path,
 'apps/wechat-miniapp/src/features/sky/sky-gpu-renderer.ts',
 '.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-source-plane-window-independent-2026-10-02.mts']);
for(const b of r4.sourceBindings){assert.deepEqual(bind(b.path),b);inputs.add(b.path)}
for(const b of r4.inputs)if(b.path){assert.equal(bind(b.path).sha256,b.sha256);inputs.add(b.path)}
const preserved=JSON.parse(fs.readFileSync(file('.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json'),'utf8'));
for(const b of preserved){assert.equal(bind(b.path).sha256,b.sha256);inputs.add(b.path)}
for(const e of fs.readdirSync(file('workers/miniapp-api/assets/deep-sky'),{recursive:true,withFileTypes:true}))if(e.isFile())inputs.add(path.relative(root,path.join(e.parentPath,e.name)).replaceAll('\\','/'));
const before=[...inputs].sort().map(bind);
const read=(route:string)=>{const b=r4.inputs.find((i:any)=>i.route===route&&i.transport==='FROZEN_LOCAL_BFF_JSON');assert(b);return JSON.parse(fs.readFileSync(file(b.path),'utf8'))};
const raw=projectAdoptedSkyCatalog(JSON.parse(fs.readFileSync(file(r2.report.path),'utf8'))).data;
const stars=read(`/v2/sky/catalogs/${raw.skyScene.catalog!.catalogVersion}/${raw.skyScene.catalog!.catalogHash}`).data,figures=read('/v2/sky/constellations').data;
const at=new Date(raw.context.at).toISOString(),report=attachSkyCatalog(presentSkyTime(raw,at)!.report,stars),frame=resolveConstellationFrame(figures,report.skyScene,at)!;
const instant=exactSkyTimeFrame(report.skyScene.frames,at)!;assert(instant.state==='AVAILABLE'&&instant.geometry);
const years=instant.geometry.julianYears+2000-figures.astrometry.epochJulianYear;
const directions=new Map<number,SkyVector>(figures.stars.map((s:any)=>[s[0],rotateStellarDirection(stellarDirectionAt(createStellarMotion({raDeg:s[1],decDeg:s[2],
 pmRaCosDecArcsecYr:s[3]/1000,pmDecArcsecYr:s[4]/1000}),years),instant.geometry!.equatorialToEnu)]));
const dot=(a:readonly number[],b:readonly number[])=>a.reduce((n,x,i)=>n+x*b[i]!,0),cross=(a:readonly number[],b:readonly number[])=>[a[1]!*b[2]!-a[2]!*b[1]!,a[2]!*b[0]!-a[0]!*b[2]!,a[0]!*b[1]!-a[1]!*b[0]!];
const norm=(a:readonly number[])=>Math.hypot(...a),normalized=(a:readonly number[])=>a.map(v=>v/norm(a));
const hull=skyArtworkViewRayHull(r2.view,390,844)!;assert(hull);
const centre=hull.reduce((s,r)=>s.map((x,i)=>x+r[i]!),[0,0,0]);
const normals=hull.map((a,i)=>{const n=normalized(cross(a,hull[(i+1)%hull.length]!)),sign=Math.sign(dot(n,centre));assert(sign!==0);return n.map(v=>v*sign)});
normals.push(r2.view.basis.forward);
const width=390,height=844,pixels=width*height,fp=Math.fround;
const add=(a:number,b:number)=>fp(a+b),sub=(a:number,b:number)=>fp(a-b),mul=(a:number,b:number)=>fp(a*b),div=(a:number,b:number)=>fp(a/b);
const dotF=(a:readonly number[],b:readonly number[])=>add(add(mul(a[0]!,b[0]!),mul(a[1]!,b[1]!)),mul(a[2]!,b[2]!));
const rays=new Float32Array(pixels*3),scale=fp(skyProjectionScale(height,139)!),basis=r2.view.basis;
const right=basis.right.map(fp),up=basis.up.map(fp),forward=basis.forward.map(fp);
for(let y=0;y<height;y++)for(let x=0;x<width;x++){
 const px=div(sub(fp(x+.5),fp(195)),scale),py=fp(-div(sub(fp(y+.5),fp(422)),scale)),squared=add(mul(px,px),mul(py,py)),den=add(1,squared);
 const camera=[div(mul(2,px),den),div(mul(2,py),den),div(sub(1,squared),den)],offset=(y*width+x)*3;
 for(let i=0;i<3;i++)rays[offset+i]=add(add(mul(right[i]!,camera[0]!),mul(up[i]!,camera[1]!)),mul(forward[i]!,camera[2]!));
}
const rows:any[]=[];
for(const row of r2.rows){
 const figure=frame.images.find(f=>f.source.id===row.id)!;assert(figure);assert.deepEqual(figure.registration,row.registration);
 const anchors=figure.source.anchors.map(a=>({uv:[a.pixel[0]/row.imageWidth,a.pixel[1]/row.imageHeight],direction:directions.get(a.hip)!}));
 const [a,b,c]=anchors as any[],du=b.uv[0]-a.uv[0],dv=b.uv[1]-a.uv[1],eu=c.uv[0]-a.uv[0],ev=c.uv[1]-a.uv[1],area=du*ev-eu*dv;assert(Math.abs(area)>1e-10);
 // Derive source affine directly from original catalog anchors, not inverse(R).
 const wb=[(-a.uv[0]*ev+a.uv[1]*eu)/area,ev/area,-eu/area],wc=[(-du*a.uv[1]+dv*a.uv[0])/area,-dv/area,du/area];
 const affine=[0,1,2].map(i=>[a.direction[i]+wb[0]*(b.direction[i]-a.direction[i])+wc[0]*(c.direction[i]-a.direction[i]),
  wb[1]*(b.direction[i]-a.direction[i])+wc[1]*(c.direction[i]-a.direction[i]),wb[2]*(b.direction[i]-a.direction[i])+wc[2]*(c.direction[i]-a.direction[i])]);
 const affineError=Math.max(...affine.flatMap((v,i)=>v.map((x,j)=>Math.abs(x-row.candidate.affine[i][j]))));assert(affineError<1e-12);
 const s=(u:number,v:number)=>affine.map(r=>r[0]+r[1]*u+r[2]*v);
 const planes=normals.map(n=>[dot(n,affine.map(r=>r[1])),dot(n,affine.map(r=>r[2])),dot(n,affine.map(r=>r[0]))]);
 planes.push([1,0,0],[0,1,0],[-1,0,1],[0,-1,1]);
 // Independent vertex enumeration: intersections of every constraint pair.
 // No reuse of Sutherland-Hodgman polygon or expanded coefficients.
 const vertices:number[][]=[];
 for(let i=0;i<planes.length;i++)for(let j=i+1;j<planes.length;j++){
  const p=planes[i]!,q=planes[j]!,den=p[0]!*q[1]!-q[0]!*p[1]!;if(Math.abs(den)<1e-14)continue;
  const uv=[(p[1]!*q[2]!-q[1]!*p[2]!)/den,(q[0]!*p[2]!-p[0]!*q[2]!)/den];
  if(uv.every(Number.isFinite)&&planes.every(r=>r[0]!*uv[0]!+r[1]!*uv[1]!+r[2]!>=-1e-10))vertices.push(uv);
 }
 assert(vertices.length>=3);const box={u0:Math.min(...vertices.map(v=>v[0]!)),u1:Math.max(...vertices.map(v=>v[0]!)),v0:Math.min(...vertices.map(v=>v[1]!)),v1:Math.max(...vertices.map(v=>v[1]!))};
 const w=row.candidate.window;assert(box.u0>=w.x/row.imageWidth-1e-10&&box.u1<=(w.x+w.width)/row.imageWidth+1e-10);
 assert(box.v0>=w.y/row.imageHeight-1e-10&&box.v1<=(w.y+w.height)/row.imageHeight+1e-10);
 const uvRows=figure.registration.rows.map(r=>r.map(fp)),au=figure.registration.anchorU.map(fp),av=figure.registration.anchorV.map(fp),d=fp(figure.registration.determinant);
 let valid=0,missing=0,maxUVDelta=0,badMissing=0;let example:any=null;
 for(let offset=0;offset<rays.length;offset+=3){
  const ray=[rays[offset]!,rays[offset+1]!,rays[offset+2]!],coefficients=uvRows.map(r=>dotF(r,ray)),sum=add(add(coefficients[0]!,coefficients[1]!),coefficients[2]!);
  if(Math.abs(sum)<1e-7||div(d,sum)<=0)continue;const uv=[div(dotF(coefficients,au),sum),div(dotF(coefficients,av),sum)];
  if(uv.some(v=>v<0||v>1))continue;valid++;
  const idealCoefficients=figure.registration.rows.map(r=>dot(r,ray)),idealSum=idealCoefficients.reduce((n,v)=>n+v,0);
  maxUVDelta=Math.max(maxUVDelta,Math.abs(uv[0]!-dot(idealCoefficients,figure.registration.anchorU)/idealSum),Math.abs(uv[1]!-dot(idealCoefficients,figure.registration.anchorV)/idealSum));
  let misses=false,bad=false;
  for(const [coordinate,origin,extent,size] of [[uv[0],w.x,w.width,row.imageWidth],[uv[1],w.y,w.height,row.imageHeight]]){
   const px=Math.max(0,Math.min(size!-1,coordinate!*size!-.5));if(Math.floor(px)<origin!||Math.ceil(px)>=origin!+extent!)misses=true;
   if(Math.floor(px)<Math.floor(size!/2)||Math.ceil(px)>=Math.floor(size!/2)+1)bad=true;
  }
  if(misses){missing++;example??={pixel:(offset/3),uv};}if(bad)badMissing++;
 }
 assert.equal(missing,0,row.id+' sampled float32 LINEAR neighbors');
 if(valid>0)assert(badMissing>0,row.id+' gross bad-crop discrepancy guard must detect lost source neighbors');
 rows.push({id:row.id,originalAnchorDirectAffine:affine,directVsRecoveredMaximumError:affineError,independentIdealPlanes:planes,independentIdealVertices:vertices,
  independentIdealBox:box,candidateWindow:w,fullBytes:row.fullBytes,candidateBytes:w.width*w.height*4,float32FixedLattice:{samples:pixels,valid,missingLinearNeighbors:missing,
   maxUVDifferenceAgainstDoubleUsingSamePerturbedRay:maxUVDelta,grossOneTexelCropMissingNeighbors:badMissing,example,
   limits:'Non-FMA nearest float32 arithmetic on fixed 390x844 pixel centers and fixed uniforms. Not GLSL precision/driver proof, all operation orders, varying interpolation, rotated/offset/DPR inputs or continuous coverage.'}});
}
assert.equal(rows.reduce((n,r)=>n+r.candidateBytes,0),r2.aggregate.candidateBytes);assert.equal(rows.filter(r=>r.candidateBytes<r.fullBytes).length,11);
const first=r2.rows[0]!,registration=frame.images.find(f=>f.source.id===first.id)!.registration;
const guards=[
 {name:'wider_view_hull_uncertified',result:sourcePlaneWindowCandidate(registration,{...r2.view,verticalFovDeg:274.9},390,844,512,512)},
 {name:'degenerate_uv_triangle',result:sourcePlaneWindowCandidate({...registration,anchorU:[.5,.5,.5],anchorV:[.5,.5,.5]},r2.view,390,844,512,512)},
 {name:'zero_row_inverse',result:sourcePlaneWindowCandidate({...registration,rows:[[0,0,0],[0,0,0],[0,0,0]]},r2.view,390,844,512,512)},
 {name:'wrong_original_anchor',result:sourcePlaneWindowCandidate(registration,r2.view,390,844,512,512,[[1,0,0],[0,1,0],[0,0,1]])},
];for(const g of guards){assert.equal(g.result.state,'FULL_UNCERTAIN');assert.deepEqual(g.result.window,{x:0,y:0,width:512,height:512})}
save('result.json',{status:'BOUNDED_REVIEW_PASS_NOT_ADOPTED',candidateInput:bind(r2path),candidateScript:bind(candidateScript),rows,guards,
 aggregate:{fullBytes:rows.reduce((n,r)=>n+r.fullBytes,0),candidateBytes:rows.reduce((n,r)=>n+r.candidateBytes,0),partialWindows:11,
  sampledFloat32MissingNeighbors:rows.reduce((n,r)=>n+r.float32FixedLattice.missingLinearNeighbors,0),grossBadCropDetectedImages:rows.filter(r=>r.float32FixedLattice.grossOneTexelCropMissingNeighbors>0).length,
  zeroValidSampleImages:rows.filter(r=>!r.float32FixedLattice.valid).map(r=>r.id)},
 unresolved:['Candidate 64-ulp world/UV expansions are conventions, not a universal highp shader-error bound.',
  'GLSL highp precision/interpolation, uniform rounding, near-singular division, sampler rescaling/filter footprint and copy capability/GL memory need actual target evidence or certified full fallback.',
  '139 artwork alpha is .0002368. RGBA8 zero difference alone can miss deleted contributions; actual GPU A/B needs a visible controlled counterfactual and a harmful crop mutation that fails its pixel oracle.'],
 scope:'Independent exact-math vertex enumeration from original anchor directions + bounded fixed float32 lattice guards, no GPU/native/production changes and no universal coverage or quality claim.'});
const after=before.map(b=>bind(b.path));assert.deepEqual(after,before);save('binding.json',{inputsBefore:before,inputsAfter:after,unchanged:true,executedScript:bind(out+'/executed-script.mts.txt')});
console.log(JSON.stringify({result:bind(out+'/result.json'),binding:bind(out+'/binding.json'),inputs:before.length,rows:rows.length,partial:11}));
