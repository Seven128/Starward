// Bounded server-calculator/camera research; no new client ephemeris or clock.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {loadBsc5pStarCatalog,bsc5pHorizontalFrame} from '../../../../packages/astronomy-core/src/bsc5p-catalog.ts';
import {createStellarMotion,projectStellarMotion} from '../../../../packages/astronomy-core/src/stellar-vectors.ts';
import {createSkyViewBasis,createSkyDirectionProjector} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
const output='.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-time-motion-probe-2026-09-29.json';
await assert.rejects(fs.access(output),{code:'ENOENT'});
const digest=(value:string|Uint8Array)=>createHash('sha256').update(value).digest('hex');
const project='E:/dev/worktrees/Starward/remote-main-20260908/apps/wechat-miniapp/dist/weapp-check-sky-combined-clean-v33-0929';
const context=JSON.parse(execFileSync('pwsh',['-NoProfile','-Command',`
 $r=(& 'E:/微信web开发者工具/wechatide.cmd' -c codex automation_evaluate --project '${project}' --fn-source "function(){var s=wx.getStorageSync('starward.wechat-miniapp.state.current');return s&&s.observationContext;}")|ConvertFrom-Json;
 if(-not $r.ok){throw 'Native Context read failed'};
 $v=$r.result;while($v -is [pscustomobject] -and $v.PSObject.Properties.Name -contains 'result'){$v=$v.result};
 $v|ConvertTo-Json -Depth 8 -Compress;
`],{encoding:'utf8',windowsHide:true}));
const contextSha256=digest(context.contextId);assert.equal(contextSha256,'1746aa900d82214c32e47f82da8ebaaed098805083f5a8db9203634ee5a50965');
const at=new Date(context.selectedAtUtc).toISOString();assert.equal(at,'2026-09-29T13:00:00.000Z');
const version='bsc5p-bright-stars.v3';
const suffix=`?contextId=${encodeURIComponent(context.contextId)}&catalogVersion=${version}`;
async function request(route:string){const response=await fetch('http://127.0.0.1:8791'+route,{headers:{'x-starward-measurement-probe':'1'},signal:AbortSignal.timeout(15000)});
 const body=await response.json();return{status:response.status,body};}
const base=await request('/v2/spots/spot%3Atest-published/sky'+suffix);assert.equal(base.status,200);
const report=base.body.data,observer=report.skyScene.observer;assert(observer);
const catalog=loadBsc5pStarCatalog(version);assert.equal(report.skyScene.catalog.catalogHash,catalog.catalogHash);
const star=catalog.rows.find(row=>row.sourceId==='HR:7557');assert(star);
const motion=createStellarMotion(star);
const instants=[0,1,60].map(seconds=>({seconds,at:new Date(Date.parse(at)+seconds*1000).toISOString()}));
const positions=instants.map(instant=>{const frame=bsc5pHorizontalFrame({...observer,at:instant.at});
 return{...instant,...projectStellarMotion(motion,frame.julianYears,frame.equatorialToEnu)};});
const http=[];
for(const instant of instants){const result=await request('/v2/spots/spot%3Atest-published/sky/objects/HR%3A7557'+suffix+'&at='+encodeURIComponent(instant.at));
 if(instant.seconds===0){assert.equal(result.status,200);assert.equal(result.body.data.at,instant.at);
  const position=result.body.data.position;assert(position);assert(Math.abs(position.azimuthDeg-positions[0]!.azimuthDeg)<1e-9);
  assert(Math.abs(position.altitudeDeg-positions[0]!.altitudeDeg)<1e-9);}
 http.push({at:instant.at,status:result.status,hasPosition:Boolean(result.body.data?.position),
  error:typeof result.body.error?.code==='string'?result.body.error.code:typeof result.body.message==='string'?result.body.message:null});
}
const first=positions[0]!,basis=createSkyViewBasis(first.azimuthDeg,90+first.altitudeDeg,0)!;
const width=390.3999938964844,height=844;
const projection=[];
for(const fov of [45,8.9,2.67,1.7,.5,.05]){
 const projector=createSkyDirectionProjector(basis,width,height,fov)!;
 const origin=projector.unclipped(first.azimuthDeg,first.altitudeDeg)!;
 const rows=positions.slice(1).map(position=>{
  const projected=projector.unclipped(position.azimuthDeg,position.altitudeDeg)!;
  const trackingBasis=createSkyViewBasis(position.azimuthDeg,90+position.altitudeDeg,0)!;
  const tracked=createSkyDirectionProjector(trackingBasis,width,height,fov)!.unclipped(position.azimuthDeg,position.altitudeDeg)!;
  return{seconds:position.seconds,displacementCssPx:Math.hypot(projected.x-origin.x,projected.y-origin.y),
   trackingCenterErrorCssPx:Math.hypot(tracked.x-width/2,tracked.y-height/2),inViewport:projector.project(position.azimuthDeg,position.altitudeDeg)!==null};});
 projection.push({fov,rows});
}
for(let index=1;index<projection.length;index++)assert(projection[index]!.rows[0]!.displacementCssPx>projection[index-1]!.rows[0]!.displacementCssPx);
for(const row of projection)for(const motion of row.rows)assert(motion.trackingCenterErrorCssPx<1e-7);
const inputs=['packages/astronomy-core/src/bsc5p-catalog.ts','packages/astronomy-core/src/observation-frame.ts',
 'packages/astronomy-core/src/stellar-vectors.ts','packages/astronomy-core/src/astronomy-engine-runtime.ts',
 'packages/astronomy-core/data/bsc5p-bright-stars.v3.json','packages/astronomy-core/data/bsc5p-bright-stars.v3.manifest.json',
 'apps/wechat-miniapp/src/features/sky/sky-view-projection.ts','workers/miniapp-api/src/celestial-object-position.ts','workers/miniapp-api/src/controller.ts'];
const record={scope:'Read-only actual current Context/report and bounded existing server calculator/camera probe. Research only; no live native playback or new client calculation.',
 contextSha256,contextFingerprint:context.contextFingerprint,at,observer,catalogVersion:version,catalogHash:catalog.catalogHash,reference:star.sourceId,
 nativeBundleSha256:'8d89d70f9c180b4652a095442a751b58d853c6929a9cbae2cd3c76edae8e3ad0',http,positions,viewport:{width,height},projection,
 inputs:await Promise.all(inputs.map(async file=>({file,sha256:digest(await fs.readFile(file))}))),
 limits:['Positive geometry at +1/+60 seconds comes from existing Node/server astronomy owners, not the current HTTP report or a client ephemeris.',
 'Same time rate and fixed ENU camera; narrower FOV increases screen displacement continuously.1.7° is not an engine switch or universal perception threshold.',
 'Off-viewport positions use the existing unclipped geometric probe only; production visibility/picking still uses the clipped owner.',
 'The current selected-time page and report are fixed/half-hour samples. Playback, backend bounded frame supply, lifecycle/failure, source/position/track consistency and target experience are not delivered by this probe.']};
assert(!JSON.stringify(record).includes(context.contextId));
await fs.writeFile(output,JSON.stringify(record,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,sha256:digest(await fs.readFile(output)),http,projection:projection.map(({fov,rows})=>({fov,...rows[0]}))}));
