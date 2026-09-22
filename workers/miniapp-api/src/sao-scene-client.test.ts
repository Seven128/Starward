import assert from 'node:assert/strict';
import test from 'node:test';
import type {SkyReport} from '@starward/miniapp-contracts';
import {TEST_PUBLISHED_SPOT} from '@starward/miniapp-contracts/test-fixtures';
import {buildSkyScene,createBsc5pSkyCatalogProvider} from './sky-scene-catalog.ts';
import {StellarCatalogPublicationService} from './stellar-catalog-publication.ts';
import {SaoPublicationService} from './sao-publication.ts';
import {CelestialObjectInformationService} from './celestial-object-information.ts';
import {attachSkyCatalog} from '../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';
import {resolveSkyStellarSupplement,currentStellarSupplement} from '../../../apps/wechat-miniapp/src/features/sky/sky-stellar-supplement-scene.ts';
import {selectSkyStellarTiles} from '../../../apps/wechat-miniapp/src/features/sky/sky-stellar-tile-selection.ts';
import {SKY_STELLAR_VIEW_BYTES} from '../../../apps/wechat-miniapp/src/features/sky/sky-stellar-tile-loader.ts';
import {createSkyViewBasis} from '../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
import {drawSkyScene,skyPickIdentity} from '../../../apps/wechat-miniapp/src/features/sky/sky-scene-render.ts';
import {pickPaintedSkyObjects,skyObjectMagnitudeLabel,type SkyPickSnapshot} from '../../../apps/wechat-miniapp/src/features/sky/sky-object-picking.ts';
import type {SkyRenderSurface} from '../../../apps/wechat-miniapp/src/features/sky/sky-render-surface.ts';

test('real published stars reach drawing and picking with the selected observer/time; zoom hides faint stars without changing BSC',async()=>{
  const at=['2026-09-19T13:00:00.000Z','2026-09-19T14:00:00.000Z'];
  const scene=buildSkyScene({provider:createBsc5pSkyCatalogProvider(),hourlyAt:at,spot:TEST_PUBLISHED_SPOT});
  const base=new StellarCatalogPublicationService().get(scene.catalog!).data;
  const report=attachSkyCatalog({skyScene:scene,targetFrames:at.map(at=>({at,targets:[]}))} as unknown as SkyReport,base);
  const service=new SaoPublicationService(),publication=(await service.get()).data;
  const view={basis:createSkyViewBasis(0,135,0)!,width:390,height:650,verticalFovDeg:3};
  const geometry=scene.frames[0]!.geometry!;
  const selected=selectSkyStellarTiles(publication.index.tiles,{...view,frame:geometry,expected:{catalog:base,at:at[0]!,observer:scene.observer!}});
  assert(selected.length>0);assert(selected.reduce((sum,t)=>sum+t.bytes,0)<SKY_STELLAR_VIEW_BYTES);
  const tiles=await Promise.all(selected.map(async t=>(await service.tile(publication.publicationHash,t.id)).data));
  const supplement=resolveSkyStellarSupplement(publication,tiles,report.skyScene,at[0])!;assert(supplement.points.length>0);
  const surface:SkyRenderSurface={begin(){},image(){return true;},artwork(){return true;},segments(){},disc(){},finish(){}};
  function paint(fov:number,layer:typeof supplement|null,when=at[0]!){
    let snapshot:SkyPickSnapshot|null=null;
    drawSkyScene(surface,report,when,null,null,390,650,'NIGHT',s=>{snapshot=s;},undefined,fov,null,view.basis,undefined,undefined,undefined,layer);
    assert(snapshot);return snapshot as SkyPickSnapshot;
  }
  const before=paint(3,null),after=paint(3,supplement);
  const faint=after.objects.find(o=>o.reference.startsWith('SAO:')&&o.magnitude!>8.5);assert(faint,'actual faint source must become a rendered selectable point');
  assert.deepEqual(after.objects.filter(o=>!o.reference.startsWith('SAO:')),before.objects,'SAO arrival preserves every existing BSC/deep-sky point');
  assert.equal(faint.magnitudeBand,'VISUAL');assert(!skyObjectMagnitudeLabel(faint).includes('V 波段'));
  const chosen=pickPaintedSkyObjects(after,{x:faint.x,y:faint.y,frameAt:at[0]!,...skyPickIdentity(report,supplement)});
  assert(chosen.some(o=>o.reference===faint.reference));
  const detail=new CelestialObjectInformationService().get(faint.reference);
  assert.equal(detail.data.facts[0]!.value,faint.magnitude!.toFixed(2));
  assert(!paint(45,supplement).objects.some(o=>o.reference===faint.reference));
  assert(paint(3,supplement).objects.some(o=>o.reference===faint.reference));
  assert.equal(currentStellarSupplement(supplement,report.skyScene,at[1]),null);
  assert(!paint(3,supplement,at[1]!).objects.some(o=>o.reference.startsWith('SAO:')),'old selected time cannot paint at the next hour');
  const changed=resolveSkyStellarSupplement(publication,tiles,report.skyScene,at[1])!;
  assert.notDeepEqual(changed.points,supplement.points);
  assert.throws(()=>resolveSkyStellarSupplement(publication,tiles,{...report.skyScene,observer:{...scene.observer!,longitude:0}},at[0]),/observer_binding/);
  assert.throws(()=>resolveSkyStellarSupplement({...publication,index:{...publication.index,baseAssetSha256:'0'.repeat(64)}},tiles,report.skyScene,at[0]),/base_catalog_mismatch/);
  for(const fov of [1.5,3,15,45,120,270])for(const heading of [0,90,180,270]){
    const wanted=selectSkyStellarTiles(publication.index.tiles,{...view,basis:createSkyViewBasis(heading,135,0)!,verticalFovDeg:fov,
      frame:geometry,expected:{catalog:base,at:at[0]!,observer:scene.observer!}});
    assert(wanted.reduce((sum,t)=>sum+t.bytes,0)<SKY_STELLAR_VIEW_BYTES,`view ${fov}/${heading} exceeds bounded working set`);
  }
});
