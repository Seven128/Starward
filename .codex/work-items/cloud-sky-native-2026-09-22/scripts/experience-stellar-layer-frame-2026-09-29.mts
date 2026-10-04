import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import {attachSkyCatalog,resolveSkySceneFrame,resolveSkyDeepSkyScene} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';
import {createSaoCatalogClient} from '../../../../apps/wechat-miniapp/src/services/sao-catalog-client.ts';
import {resolveSkyStellarSupplement,supplementGeometry} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-supplement-scene.ts';
import {selectSkyStellarTiles} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-tile-selection.ts';
import {createSkyViewBasis} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
import {drawSkyScene} from '../../../../apps/wechat-miniapp/src/features/sky/sky-scene-render.ts';
import {pickPaintedSkyObjects} from '../../../../apps/wechat-miniapp/src/features/sky/sky-object-picking.ts';
import {skySolarLightAt} from '../../../../apps/wechat-miniapp/src/features/sky/sky-solar-light.ts';
import {skyStarAppearance} from '../../../../apps/wechat-miniapp/src/features/sky/sky-star-appearance.ts';

const task=path.resolve('.codex/work-items/cloud-sky-native-2026-09-22');
const output=path.join(task,'evidence/experience-stellar-layer-frame-2026-09-29.json');
await assert.rejects(fs.access(output),{code:'ENOENT'});
const project=path.resolve('apps/wechat-miniapp/dist/weapp-check-sky-combined-clean-v30-0929').replaceAll('\\','/');
// The opaque ID is used only in memory for the existing authorized local GET.
const context=JSON.parse(execFileSync('pwsh',['-NoProfile','-Command',`
 $r=(& 'E:/微信web开发者工具/wechatide.cmd' -c codex automation_evaluate --project '${project}' --fn-source "function(){var s=wx.getStorageSync('starward.wechat-miniapp.state.current');return s&&s.observationContext;}")|ConvertFrom-Json;
 if(-not $r.ok){throw 'Native Context read failed'};
 $v=$r.result;while($v -is [pscustomobject] -and $v.PSObject.Properties.Name -contains 'result'){$v=$v.result};
 $v|ConvertTo-Json -Compress -Depth 8;
`],{encoding:'utf8',windowsHide:true}));
assert.equal(context.revision,3);assert.equal(context.location.spotId,'spot:test-published');
const at='2026-09-29T13:00:00.000Z';assert.equal(Date.parse(context.selectedAtUtc),Date.parse(at));
async function json(route:string){const r=await fetch('http://127.0.0.1:8791'+route,{headers:{'x-starward-measurement-probe':'1'},signal:AbortSignal.timeout(15000)});assert.equal(r.status,200);return r.json();}
const suffix=`?contextId=${encodeURIComponent(context.contextId)}&catalogVersion=bsc5p-bright-stars.v3`;
const raw=projectAdoptedSkyCatalog(await json('/v2/spots/spot%3Atest-published/sky'+suffix));
const stars=(await json(`/v2/sky/catalogs/${raw.data.skyScene.catalog!.catalogVersion}/${raw.data.skyScene.catalog!.catalogHash}`)).data;
const report=attachSkyCatalog(raw.data,stars);
const selected=await json(`/v2/spots/spot%3Atest-published/sky/objects/SAO%3A67132${suffix}&at=${encodeURIComponent(at)}`);
const position=selected.data.position;assert(position);
const basis=createSkyViewBasis(position.azimuthDeg,90+position.altitudeDeg,0)!;
const sao=createSaoCatalogClient({index:()=>json('/v2/sky/supplements/sao/v2'),tile:(hash,id)=>json(`/v2/sky/supplements/sao/v2/${hash}/tiles/${id}`),invalidateIndex(){},invalidateTile(){}});
const publication=(await sao.getIndex()).data;
const sun=skySolarLightAt(report.hourly,at)!;
const width=390.3999938964844,height=844;
const results=[];
for(const fov of [45,9.1,1.8]){
 const wanted=selectSkyStellarTiles(publication.index.tiles,{basis,width,height,verticalFovDeg:fov,
  frame:supplementGeometry(publication,report.skyScene,at)!,sunAltitudeDeg:sun.altitudeDeg,
  expected:{catalog:stars,at,observer:report.skyScene.observer!}});
 const tiles=await Promise.all(wanted.map(t=>sao.getTile(publication,t.id).then(r=>r.data)));
 const supplement=resolveSkyStellarSupplement(publication,tiles,report.skyScene,at)!;
 const target=supplement.points.find(p=>p[0]==='SAO:67132');
 let snapshot:any;
 const surface:any={begin(){},image(){return true;},skyImageMesh(){return true;},artwork(){return true;},solarLight(){return true;},galacticBand(){return true;},landscape(){return false;},sun(){return true;},moon(){return true;},planet(){return true;},saturnRings(){return true;},segments(){},disc(){},finish(){}};
 drawSkyScene(surface,report,at,null,null,width,height,'DAY',s=>snapshot=s,undefined,fov,null,basis,undefined,undefined,undefined,supplement);
 const painted=snapshot.objects.find((o:any)=>o.reference==='SAO:67132');
 const choices=pickPaintedSkyObjects(snapshot,{x:width/2,y:height/2,frameAt:at,catalogVersion:snapshot.catalogVersion,catalogHash:snapshot.catalogHash});
 results.push({fov,wanted:wanted.map(t=>({id:t.id,bytes:t.bytes})),loadedPoints:supplement.points.length,target,
  appearance:target?skyStarAppearance(target[1],fov,sun.altitudeDeg,target[3]):null,painted:painted??null,picks:choices.map(o=>o.reference),
  counts:{HR:snapshot.objects.filter((o:any)=>o.reference.startsWith('HR:')).length,SAO:snapshot.objects.filter((o:any)=>o.reference.startsWith('SAO:')).length}});
}
assert(results.at(-1)!.painted);assert(results.at(-1)!.picks.includes('SAO:67132'));
const scene=resolveSkySceneFrame(report.skyScene,at)!;
const deep=resolveSkyDeepSkyScene(report.skyScene,at)!.frame!.points!.filter(p=>p[2]>0).length;
const row=report.hourly.find(r=>r.at===at)!;
const record={scope:'Actual local current-Context report and source tiles through production resolver/painter/picker in Node; stub surface is not GPU/native output.',
 contextIdSha256:createHash('sha256').update(context.contextId).digest('hex'),revision:context.revision,at,observer:report.skyScene.observer,
 starFrameAt:scene.at,geometryAt:supplementGeometry(publication,report.skyScene,at)!.at,sunAltitudeDeg:sun.altitudeDeg,
 selectedPosition:position,results,baseListCounts:{HR:scene.points.length,deep,planets:row.planets.filter(p=>p.altitudeDeg>0).length},
 limits:['Native missing selected point remains unresolved; a Node pass does not close it.','No state injection, shared service replacement, source edit or new catalogue data.']};
assert(!JSON.stringify(record).includes(context.contextId));
await fs.writeFile(output,JSON.stringify(record,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,geometryAt:record.geometryAt,sunAltitudeDeg:record.sunAltitudeDeg,baseListCounts:record.baseListCounts,
 results:results.map(r=>({fov:r.fov,tiles:r.wanted.length,bytes:r.wanted.reduce((s,t)=>s+t.bytes,0),appearance:r.appearance,painted:r.painted,picks:r.picks,counts:r.counts}))}));
