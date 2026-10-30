import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {skyPagePaintCommit} from './sky-optical-page-test-support';
import {createSkyViewBasis} from './sky-view-projection';
import {createSkyNameLayouts,pickSkyControlName} from './sky-name-layout';
import {PROCEDURAL_SKY_LANDSCAPE} from './sky-landscape-mask';

const source=ts.createSourceFile('spot-sky-page.tsx',readFileSync(new URL('./spot-sky-page.tsx',import.meta.url),'utf8'),
  ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const at='2026-10-13T13:00:00.000Z';
const context={spotId:'spot:test',contextId:'ctx',contextRevision:1,contextFingerprint:'fp',dataRevision:'data',algorithmVersion:'algo'};
const target={targetId:'target:milky-way',type:'MILKY_WAY',displayName:'银河中心方向',direction:'西南',azimuthDeg:0,altitudeDeg:45};
const object={reference:'M:31',displayName:'仙女座星系',kind:'GALAXY' as const};
const catalog={catalogVersion:'cat',catalogHash:'hash'};
function setup(selected=false,below=false,failCopy=false) {
  const basis=createSkyViewBasis(0,below?60:135,0)!,fov=45;
  const data={context,hourly:[],skyScene:{state:'UNAVAILABLE',catalog:null,frames:[]},
    targetFrames:[{at,targets:selected?[]:[target]}]};
  const snapshot={width:390,height:844,frameAt:at,catalogVersion:'',catalogHash:'',objects:[],namedStars:[],
    view:{basis,verticalFovDeg:fov,landscape:below?PROCEDURAL_SKY_LANDSCAPE:null}};
  const position={data:{...context,reference:object.reference,at,position:{...catalog,azimuthDeg:0,altitudeDeg:below?-30:45}},catalog,report:data};
  let selection=selected?object:null,accepted:any=null;
  const positionRef={current:selected?position:null};
  const copies:{reticle:any;captions:any[];selectionActive:boolean}[]=[],owner=createSkyNameLayouts();
  const paint=skyPagePaintCommit(source,{basis,zoomRef:{current:fov},reducedMotionRef:{current:true},nameLayouts:owner,
    objectSelection:{snapshot:()=>({object:selection,spotId:context.spotId})},skySelectionPositionRef:positionRef,
    frame:{data,frameAt:at,mode:'NIGHT',sceneReady:true,constellations:null,constellationsEnabled:false},
    canvasSurfaceRef:{current:{present(reticle:any,captions:any[],selectionActive:boolean){if(failCopy)throw Error('controlled-copy-failure');copies.push({reticle,captions,selectionActive});}}},
    setPresentedCamera(){},setPresentedSkyFrame(update:(previous:any)=>any){accepted=update(accepted);}});
  return {paint,snapshot,data,owner,copies,get accepted(){return accepted;},clearSelection(){selection=null;},
    pendingPosition(){positionRef.current=null;},restorePosition(){positionRef.current=position;}};
}

test('actual page copies complete guide text/metadata before publishing its independent current-frame action',()=>{
  const run=setup();run.paint.stage(run.snapshot,{});
  assert.deepEqual([run.accepted],[null]);assert.equal(run.copies.length,0);
  run.paint.complete();assert.equal(run.copies.length,1);
  assert.deepEqual(Array.from(run.copies[0]!.captions,caption=>caption.text),['银河中心方向','西南 · 45°']);
  const name=run.accepted.controlNames[0];assert.equal(name.action.kind,'target');assert.equal(name.action.target,target);
  assert.equal(pickSkyControlName(run.accepted.controlNames,name.bounds.left+10,422)?.action,name.action);
  assert.equal(run.accepted.catalogNames.length,0,'no bright catalog is required for a valid direction guide');
});

test('actual selected below-horizon name shares the reticle copy and keeps the full honest notice above foreground',()=>{
  const run=setup(true,true);run.paint(run.snapshot,{});
  assert(run.copies[0]!.reticle);assert.equal(run.copies[0]!.captions[0].text,'仙女座星系 · 地平线以下');
  const name=run.accepted.controlNames[0];assert.equal(name.action.object,object);
  assert.equal(pickSkyControlName(run.accepted.controlNames,195,422)?.action,name.action);
});

test('failed copy and a replaced selection never publish unpainted selected text or action',()=>{
  const failed=setup(true,false,true);failed.paint.stage(failed.snapshot,{});
  assert.throws(()=>failed.paint.complete(),/controlled-copy-failure/);assert.equal(failed.accepted,null);
  const stale=setup(true);stale.paint.stage(stale.snapshot,{});stale.clearSelection();stale.paint.complete();
  assert.equal(stale.copies[0]!.reticle,null);assert.equal(stale.copies[0]!.captions.length,0);
  assert.equal(stale.copies[0]!.selectionActive,false,'publication uses the current selection, not the staged one');
  assert.equal(stale.accepted.controlNames.length,0);
});

test('actual page preserves live selection ownership while its exact-time position is pending',()=>{
  const run=setup(true);run.pendingPosition();run.paint(run.snapshot,{});
  assert.equal(run.copies[0]!.reticle,null);
  assert.equal(run.copies[0]!.captions.length,0,'pending position cannot publish an old selected name');
  assert.equal(run.copies[0]!.selectionActive,true,'missing coordinates do not retire the selected object');
  run.restorePosition();run.paint(run.snapshot,{});
  assert(run.copies[1]!.reticle);
  assert.equal(run.copies[1]!.selectionActive,true);
});
