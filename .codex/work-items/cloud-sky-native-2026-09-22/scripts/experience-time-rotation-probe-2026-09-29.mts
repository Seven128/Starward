import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import Quaternion from 'quaternion';
import {loadBsc5pStarCatalog,bsc5pHorizontalFrame} from '../../../../packages/astronomy-core/src/bsc5p-catalog.ts';
import {createStellarMotion,projectStellarMotion} from '../../../../packages/astronomy-core/src/stellar-vectors.ts';
import {skyHorizontalDirection} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
const output='.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-time-rotation-probe-2026-09-29.json';
await assert.rejects(fs.access(output),{code:'ENOENT'});
const digest=(value:string|Uint8Array)=>createHash('sha256').update(value).digest('hex');
const baseline=JSON.parse(await fs.readFile('.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-time-motion-probe-2026-09-29.json','utf8'));
const context=JSON.parse(execFileSync('pwsh',['-NoProfile','-Command',`
 $r=(& 'E:/微信web开发者工具/wechatide.cmd' -c codex automation_evaluate --project 'E:/dev/worktrees/Starward/remote-main-20260908/apps/wechat-miniapp/dist/weapp-check-sky-combined-clean-v33-0929' --fn-source "function(){var s=wx.getStorageSync('starward.wechat-miniapp.state.current');return s&&s.observationContext;}")|ConvertFrom-Json;
 if(-not $r.ok){throw 'Native Context read failed'};$v=$r.result;
 while($v -is [pscustomobject] -and $v.PSObject.Properties.Name -contains 'result'){$v=$v.result};$v|ConvertTo-Json -Depth 8 -Compress;
`],{encoding:'utf8',windowsHide:true}));
assert.equal(digest(context.contextId),baseline.contextSha256);
const response=await fetch('http://127.0.0.1:8791/v2/spots/spot%3Atest-published/sky?contextId='+encodeURIComponent(context.contextId)+'&catalogVersion='+baseline.catalogVersion,
 {headers:{'x-starward-measurement-probe':'1'},signal:AbortSignal.timeout(15000)});assert.equal(response.status,200);
const report=(await response.json()).data,catalog=loadBsc5pStarCatalog(baseline.catalogVersion);
assert.equal(catalog.catalogHash,report.skyScene.catalog.catalogHash);
const start='2026-09-29T13:00:00.000Z',end='2026-09-29T13:30:00.000Z';
const anchor=(at:string)=>{const frame=report.skyScene.frames.find((frame:any)=>frame.at===at);assert(frame?.geometry);return frame.geometry;};
const anchors=[anchor(start),anchor(end)];
const quaternion=(m:number[])=>Quaternion.fromMatrix([[m[0]!,m[1]!,m[2]!],[m[3]!,m[4]!,m[5]!],[m[6]!,m[7]!,m[8]!]]).normalize();
const rotations=anchors.map(anchor=>quaternion(anchor.equatorialToEnu));
const motions=catalog.rows.map(star=>({reference:star.sourceId,motion:createStellarMotion(star)}));
const angle=(left:readonly number[],right:readonly number[])=>Math.atan2(Math.hypot(
 left[1]!*right[2]!-left[2]!*right[1]!,left[2]!*right[0]!-left[0]!*right[2]!,left[0]!*right[1]!-left[1]!*right[0]!),
 left.reduce((sum,value,index)=>sum+value*right[index]!,0));
const samples=[];
for(const seconds of [0,1,10,60,300,600,900,1200,1500,1799,1800]){
 const at=new Date(Date.parse(start)+seconds*1000).toISOString(),amount=seconds/1800;
 const rotation=rotations[0]!.slerp(rotations[1]!)(amount).normalize();
 const columns=[[1,0,0],[0,1,0],[0,0,1]].map(vector=>rotation.rotateVector(vector));
 const matrix=[columns[0]![0]!,columns[1]![0]!,columns[2]![0]!,columns[0]![1]!,columns[1]![1]!,columns[2]![1]!,columns[0]![2]!,columns[1]![2]!,columns[2]![2]!] as const;
 const exact=bsc5pHorizontalFrame({...report.skyScene.observer,at});
 const years=anchors[0].julianYears+(anchors[1].julianYears-anchors[0].julianYears)*amount;
 let maxAngle=0,worstReference='';
 for(const star of motions){const truth=projectStellarMotion(star.motion,exact.julianYears,exact.equatorialToEnu),model=projectStellarMotion(star.motion,years,matrix);
  const error=angle(skyHorizontalDirection(truth.azimuthDeg,truth.altitudeDeg)!,skyHorizontalDirection(model.azimuthDeg,model.altitudeDeg)!);
  if(error>maxAngle){maxAngle=error;worstReference=star.reference;}}
 samples.push({at,seconds,stars:motions.length,worstReference,maxAngularErrorArcsec:maxAngle*180/Math.PI*3600,
  centeredErrorCssPxAtMinFov:844/(4*Math.tan(.05*Math.PI/720))*2*Math.tan(maxAngle/2)});
}
const inputs=['node_modules/quaternion/dist/quaternion.mjs','packages/astronomy-core/src/bsc5p-catalog.ts',
 'packages/astronomy-core/src/observation-frame.ts','packages/astronomy-core/src/stellar-vectors.ts',
 'packages/astronomy-core/src/astronomy-engine-runtime.ts','packages/astronomy-core/data/bsc5p-bright-stars.v3.json',
 'apps/wechat-miniapp/src/features/sky/sky-view-projection.ts','apps/wechat-miniapp/src/features/sky/sky-view-rotation.ts'];
const record={scope:'Bounded research of actual published EQJ→ENU anchors and existing Quaternion.js, not an adopted time model or new production interpolation.',
 contextSha256:baseline.contextSha256,catalogHash:catalog.catalogHash,observer:report.skyScene.observer,anchors,samples,
 inputs:await Promise.all(inputs.map(async file=>({file,sha256:digest(await fs.readFile(file))}))),
 limits:['All8404 adopted BSC stars, one observer and one30-minute interval; no lunar/solar/planet/target/constellation fields or missing-time coverage acceptance.',
 'Pixel error is a center-projection geometric proxy at0.05°, not whole-viewport/native performance or arbitrary dates/locations accuracy.',
 'The present exact-frame contracts still reject unprovided times. An explicit versioned provider model, valid coverage and shared time/frame/position meaning are required before production interpolation.',
 'Existing licensed Quaternion.js already serves camera/orientation composition; no new dependency or client ephemeris was added.']};
assert(!JSON.stringify(record).includes(context.contextId));await fs.writeFile(output,JSON.stringify(record,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,sha256:digest(await fs.readFile(output)),samples}));
