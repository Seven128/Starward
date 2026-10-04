import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import {attachSkyCatalog} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';
import {createSaoCatalogClient} from '../../../../apps/wechat-miniapp/src/services/sao-catalog-client.ts';
import {resolveSkyStellarSupplement,supplementGeometry} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-supplement-scene.ts';
import {selectSkyStellarTiles} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-tile-selection.ts';
import {createSkyViewBasis} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
import {drawSkyScene} from '../../../../apps/wechat-miniapp/src/features/sky/sky-scene-render.ts';
import {pickPaintedSkyObjects} from '../../../../apps/wechat-miniapp/src/features/sky/sky-object-picking.ts';
import {skySolarLightAt} from '../../../../apps/wechat-miniapp/src/features/sky/sky-solar-light.ts';
import {skyStarAppearance} from '../../../../apps/wechat-miniapp/src/features/sky/sky-star-appearance.ts';

const output=path.resolve('.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-stellar-layer-off-marker-2026-09-29.json');
await assert.rejects(fs.access(output),{code:'ENOENT'});
const project=path.resolve('apps/wechat-miniapp/dist/weapp-check-sky-combined-clean-v30-0929').replaceAll('\\','/');
// Authorized read-only native state. Opaque Context ID is kept in memory only.
const context=JSON.parse(execFileSync('pwsh',['-NoProfile','-Command',`
 $r=(& 'E:/微信web开发者工具/wechatide.cmd' -c codex automation_evaluate --project '${project}' --fn-source "function(){var s=wx.getStorageSync('starward.wechat-miniapp.state.current');return s&&s.observationContext;}")|ConvertFrom-Json;
 if(-not $r.ok){throw 'Native Context read failed'};
 $v=$r.result;while($v -is [pscustomobject] -and $v.PSObject.Properties.Name -contains 'result'){$v=$v.result};
 $v|ConvertTo-Json -Compress -Depth 8;
`],{encoding:'utf8',windowsHide:true}));
assert.equal(context.revision,3);assert.equal(context.location.spotId,'spot:test-published');
const at='2026-09-29T13:00:00.000Z';assert.equal(Date.parse(context.selectedAtUtc),Date.parse(at));
async function json(route:string){
 const response=await fetch('http://127.0.0.1:8791'+route,{headers:{'x-starward-measurement-probe':'1'},signal:AbortSignal.timeout(15000)});
 assert.equal(response.status,200);return response.json();
}
const suffix=`?contextId=${encodeURIComponent(context.contextId)}&catalogVersion=bsc5p-bright-stars.v3`;
const raw=projectAdoptedSkyCatalog(await json('/v2/spots/spot%3Atest-published/sky'+suffix));
const stars=(await json(`/v2/sky/catalogs/${raw.data.skyScene.catalog!.catalogVersion}/${raw.data.skyScene.catalog!.catalogHash}`)).data;
const report=attachSkyCatalog(raw.data,stars);
const anchor=(await json(`/v2/spots/spot%3Atest-published/sky/objects/HR%3A7001${suffix}&at=${encodeURIComponent(at)}`)).data;
assert(anchor.position);
const basis=createSkyViewBasis(anchor.position.azimuthDeg,90+anchor.position.altitudeDeg,0)!;
const sao=createSaoCatalogClient({index:()=>json('/v2/sky/supplements/sao/v2'),tile:(hash,id)=>json(`/v2/sky/supplements/sao/v2/${hash}/tiles/${id}`),invalidateIndex(){},invalidateTile(){}});
const publication=(await sao.getIndex()).data;
const sun=skySolarLightAt(report.hourly,at)!;
const width=390.3999938964844,height=844;
const targetReference='SAO:67132';
const results=[];
// The native aria FOV is rounded to one decimal. Keep the entire interval,
// rather than presenting that rounded value as an exact internal camera.
for(const fov of [4.55,4.6,4.65]){
 const wanted=selectSkyStellarTiles(publication.index.tiles,{basis,width,height,verticalFovDeg:fov,
  frame:supplementGeometry(publication,report.skyScene,at)!,sunAltitudeDeg:sun.altitudeDeg,
  expected:{catalog:stars,at,observer:report.skyScene.observer!}});
 const tiles=await Promise.all(wanted.map(tile=>sao.getTile(publication,tile.id).then(result=>result.data)));
 const supplement=resolveSkyStellarSupplement(publication,tiles,report.skyScene,at)!;
 const target=supplement.points.find(point=>point[0]===targetReference);assert(target);
 let snapshot:any;
 const surface:any={begin(){},image(){return true;},skyImageMesh(){return true;},artwork(){return true;},solarLight(){return true;},galacticBand(){return true;},landscape(){return false;},sun(){return true;},moon(){return true;},planet(){return true;},saturnRings(){return true;},segments(){},disc(){},finish(){}};
 drawSkyScene(surface,report,at,null,null,width,height,'DAY',value=>snapshot=value,undefined,fov,null,basis,undefined,undefined,undefined,supplement);
 const painted=snapshot.objects.find((object:any)=>object.reference===targetReference);assert(painted);
 const picks=pickPaintedSkyObjects(snapshot,{x:painted.x,y:painted.y,frameAt:at,catalogVersion:snapshot.catalogVersion,catalogHash:snapshot.catalogHash});
 assert.deepEqual(picks.map(object=>object.reference),[targetReference]);
 assert(Math.hypot(painted.x-width/2,painted.y-height/2)>80);
 results.push({fov,wanted:wanted.map(tile=>({id:tile.id,bytes:tile.bytes})),loadedPoints:supplement.points.length,
  target,appearance:skyStarAppearance(target[1],fov,sun.altitudeDeg,target[3]),painted,picks:picks.map(object=>object.reference),
  paintedObjects:snapshot.objects,counts:{HR:snapshot.objects.filter((object:any)=>object.reference.startsWith('HR:')).length,
   SAO:snapshot.objects.filter((object:any)=>object.reference.startsWith('SAO:')).length}});
}
const record={scope:'Production resolver/painter/picker with actual current-Context self-service inputs in Node; stub surface is not GPU/native output.',
 contextIdSha256:createHash('sha256').update(context.contextId).digest('hex'),revision:context.revision,at,
 observer:report.skyScene.observer,anchor:{reference:'HR:7001',position:anchor.position},width,height,
 nativeRoundedFov:4.6,fovInterval:[4.55,4.65],geometryAt:supplementGeometry(publication,report.skyScene,at)!.at,
 publicationHash:publication.index.publicationHash,sunAltitudeDeg:sun.altitudeDeg,targetReference,results,
 limits:['Public Vega Locate supplies the camera anchor; native exact FOV is not exposed, so its rounding interval is retained.',
  'Off-marker input and native star pixels require separate actual evidence; this calculation alone does not certify either.',
  'No injected state, mock APIs, source changes, phone input or new scientific data.']};
assert(!JSON.stringify(record).includes(context.contextId));
await fs.writeFile(output,JSON.stringify(record,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,anchor:record.anchor,results:results.map(result=>({fov:result.fov,painted:result.painted,
 appearance:result.appearance,picks:result.picks,counts:result.counts}))}));
