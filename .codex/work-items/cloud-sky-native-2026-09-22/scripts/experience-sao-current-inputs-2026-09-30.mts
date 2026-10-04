import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createSaoCatalogClient} from '../../../../apps/wechat-miniapp/src/services/sao-catalog-client.ts';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import {attachSkyCatalog,resolveSkySceneFrame} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';
import {presentSkyTime} from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts';
import {supplementGeometry,resolveSkyStellarSupplement} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-supplement-scene.ts';
import {selectSkyStellarTiles} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-tile-selection.ts';
import {createSkyViewBasis} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
import {drawSkyScene} from '../../../../apps/wechat-miniapp/src/features/sky/sky-scene-render.ts';
import {skySolarLightAt} from '../../../../apps/wechat-miniapp/src/features/sky/sky-solar-light.ts';
const task='.codex/work-items/cloud-sky-native-2026-09-22',reads:any[]=[];
const sha=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
async function get(route:string,signal?:AbortSignal){
 const response=await fetch('http://127.0.0.1:60065'+route,{signal:signal??AbortSignal.timeout(15000)});
 const bytes=Buffer.from(await response.arrayBuffer());assert.equal(response.status,200,route);
 reads.push({route,bytes:bytes.length,sha256:sha(bytes)});return JSON.parse(bytes.toString());
}
const raw=projectAdoptedSkyCatalog(JSON.parse(await fs.readFile(task+'/tmp/v49-current-public-report.json','utf8'))).data;
const stars=(await get(`/v2/sky/catalogs/${raw.skyScene.catalog!.catalogVersion}/${raw.skyScene.catalog!.catalogHash}`)).data;
const report=attachSkyCatalog(presentSkyTime(raw,raw.context.at)!.report,stars);
const frame=resolveSkySceneFrame(report.skyScene,raw.context.at)!;
const altairIndex=report.skyScene.catalog!.entries.findIndex(entry=>entry.objectRef==='HR:7557');
const altair=frame.points.find(point=>point[0]===altairIndex)!;
assert.ok(altair,'current published catalog must resolve Altair');
const basis=createSkyViewBasis(altair[1],90+altair[2],0)!;
let invalidated=0;
const client=createSaoCatalogClient({index:signal=>get('/v2/sky/supplements/sao/v2',signal),
 tile:(hash,id,signal)=>get(`/v2/sky/supplements/sao/v2/${hash}/tiles/${id}`,signal),invalidateIndex(){invalidated++;},invalidateTile(){invalidated++;}});
const index=await client.getIndex(),publication=index.data,tiles=new Map(),rows=[];
for(const fov of [84.63316191100171,45,9.1,1.8,.3]){
 const wanted=selectSkyStellarTiles(publication.index.tiles,{basis,width:390,height:844,verticalFovDeg:fov,
  frame:supplementGeometry(publication,report.skyScene,raw.context.at)!,sunAltitudeDeg:skySolarLightAt(report.hourly,raw.context.at)?.altitudeDeg,
  expected:{catalog:report.skyScene.publication!,at:raw.context.at,observer:report.skyScene.observer!}});
 const bytes=wanted.reduce((sum,tile)=>sum+tile.bytes,0);
 let snapshot:any,baseSnapshot:any;
 // Counts only at this stage; the composed actual GPU check follows separately.
 if(bytes<=6*1024*1024)for(const tile of wanted)if(!tiles.has(tile.id))tiles.set(tile.id,(await client.getTile(publication,tile.id)).data);
 const supplement=resolveSkyStellarSupplement(publication,wanted.filter(tile=>tiles.has(tile.id)).map(tile=>tiles.get(tile.id)),report.skyScene,raw.context.at)!;
 const surface=new Proxy({},{get:(_target,key)=>['sun','moon','planet','galacticBand','landscapePanorama','artwork'].includes(String(key))?()=>true:()=>undefined});
 const args:any[]=[surface,report,raw.context.at,null,null,390,844,'DAY',(value:any)=>snapshot=value,undefined,fov,null,basis];
 args[16]=supplement;drawSkyScene(...args as Parameters<typeof drawSkyScene>);
 args[8]=(value:any)=>baseSnapshot=value;args[16]=null;drawSkyScene(...args as Parameters<typeof drawSkyScene>);
 rows.push({fov,wanted:wanted.map(tile=>tile.id),wantedBytes:bytes,points:supplement.points.length,
  basePainted:baseSnapshot.objects.length,supplementPainted:snapshot.objects.filter((object:any)=>object.reference.startsWith('SAO:')).length});
}
assert.equal(invalidated,0);
await fs.writeFile(task+'/tmp/sao-current-inputs-0930.json',JSON.stringify({scope:'Current real HTTP client/selection/resolver plus stub-surface counts; not rendered or native evidence',
 report,basis,index,tiles:[...tiles.values()],reads,rows},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({catalogVersion:publication.index.catalogVersion,base:publication.index.baseCatalogVersion,rows,reads:reads.length}));
