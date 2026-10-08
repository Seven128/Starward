import assert from "node:assert/strict";
import test from "node:test";
import { projectConstellationLabels } from "./sky-constellation-labels.ts";
import { createSkyViewBasis, projectSkyDirection, skyHorizontalDirection, type SkyViewBasis } from "./sky-view-projection.ts";
import type { ConstellationFrame } from "./sky-constellation-scene.ts";

const basis:SkyViewBasis={right:[1,0,0],up:[0,0,1],forward:[0,1,0]};
const frame:ConstellationFrame={at:'2026-09-23T21:00:00.000Z',lines:[],images:[],labels:[
  {iau:'Ori',nameEn:'Orion',nameZh:'猎户座',direction:skyHorizontalDirection(0,5)!},
  {iau:'Gem',nameEn:'Gemini',nameZh:'双子座',direction:skyHorizontalDirection(2,5)!},
  {iau:'Cru',nameEn:'Crux',nameZh:'南十字座',direction:skyHorizontalDirection(180,-20)!},
]};

test('same stereographic camera places one real name, while zoom/intent and viewport gate it',()=>{
  const view={basis,verticalFovDeg:25};
  const expected=projectSkyDirection(0,5,basis,360,640,25)!;
  const shown=projectConstellationLabels(frame,view,360,640,true);
  assert.equal(shown.length,1,'nearby name collides and the opposite name is outside the viewport');
  assert.equal(shown[0]!.iau,'Ori');
  assert.ok(Math.abs(shown[0]!.x-expected.x)<1e-9);
  assert.ok(Math.abs(shown[0]!.y-expected.y)<1e-9);
  assert.equal(shown[0]!.opacity,1);
  const identification=projectConstellationLabels(frame,{...view,verticalFovDeg:84.63316191100171},390.4,844,true);
  assert.equal(identification[0]?.iau,'Ori');
  assert.equal(identification[0]?.opacity,1);
  assert.deepEqual(projectConstellationLabels(frame,{...view,verticalFovDeg:180},360,640,true),[]);
  assert.deepEqual(projectConstellationLabels(frame,view,360,640,false),[]);
  assert.deepEqual(projectConstellationLabels(null,view,360,640,true),[]);
  assert.deepEqual(projectConstellationLabels(frame,view,0,640,true),[]);
});

test('a below-horizon constellation retains its identity at the actual camera position',()=>{
  const current={basis:createSkyViewBasis(180,70,0)!,verticalFovDeg:25};
  const expected=projectSkyDirection(180,-20,current.basis,360,640,25)!;
  const labels=projectConstellationLabels(frame,current,360,640,true);
  assert.equal(labels.length,1);
  assert.equal(labels[0]!.iau,'Cru');
  assert.ok(Math.abs(labels[0]!.x-expected.x)<1e-9);
  assert.ok(Math.abs(labels[0]!.y-expected.y)<1e-9);
});

test('interactive object labels keep priority over constellation names',()=>{
  const view={basis,verticalFovDeg:25};
  const star=projectSkyDirection(0,5,basis,360,640,25)!;
  const labels=projectConstellationLabels(frame,view,360,640,true,[[star.x,star.y]]);
  assert.ok(labels.some(label=>label.iau==='Ori'));
  for(const label of labels)assert.ok(Math.hypot(label.x-star.x,label.y-star.y)>=60);
});

test('a centred constellation name follows the local fade and returns without changing identity',()=>{
  const view={basis:createSkyViewBasis(0,95,0)!,verticalFovDeg:25};
  const initial=projectConstellationLabels(frame,view,360,640,true);
  assert.equal(initial.length,1);
  assert.equal(initial[0]!.iau,'Ori');
  const fading=projectConstellationLabels(frame,{...view,verticalFovDeg:15},360,640,true);
  const centred=fading.find(label=>label.iau==='Ori');
  assert.ok(centred,'the centred identity remains while nearby label collisions change with zoom');
  assert.ok(centred.opacity>0 && centred.opacity<initial[0]!.opacity);
  assert.deepEqual(projectConstellationLabels(frame,{...view,verticalFovDeg:8.89},360,640,true),[],
    'an on-screen anchor does not bypass the shared local display window');
  assert.deepEqual(projectConstellationLabels(frame,view,360,640,true),initial);
});

test('a close interactive star does not permanently remove a centred constellation name',()=>{
  const view={basis:createSkyViewBasis(0,95,0)!,verticalFovDeg:15};
  const single={...frame,labels:[frame.labels[0]!]};
  const original=projectConstellationLabels(single,view,360,640,true)[0]!;
  const shown=projectConstellationLabels(single,view,360,640,true,[[original.x+10,original.y]]);
  assert.equal(shown.length,1);
  assert.equal(shown[0]!.iau,original.iau);
  assert.equal(shown[0]!.opacity,original.opacity);
  assert.ok(Math.hypot(shown[0]!.x-original.x-10,shown[0]!.y-original.y)>=60,
    'the interactive object keeps its clear area');
  assert.ok(Math.hypot(shown[0]!.x-original.x,shown[0]!.y-original.y)<=72,
    'the name stays close to its own projected constellation');
  assert.deepEqual(projectConstellationLabels(single,view,360,640,true),[original]);
});

test('fallback names preserve the original visible names and their exact coordinates',()=>{
  const view={basis:createSkyViewBasis(0,95,0)!,verticalFovDeg:25};
  const neighbour={...frame.labels[1]!,direction:skyHorizontalDirection(5,5)!};
  const original=projectConstellationLabels({...frame,labels:[neighbour]},view,360,640,true);
  const blocked=projectSkyDirection(0,5,view.basis,360,640,25)!;
  const shown=projectConstellationLabels({...frame,labels:[frame.labels[0]!,neighbour]},view,360,640,true,[[blocked.x,blocked.y]]);
  assert.deepEqual(shown.slice(0,original.length),original);
  assert.ok(shown.some(label=>label.iau==='Ori'),'the previously hidden name has a clear nearby position');
  for(const label of shown)assert.ok(Math.hypot(label.x-blocked.x,label.y-blocked.y)>=60);
  for(let i=0;i<shown.length;i++)for(let j=i+1;j<shown.length;j++)
    assert.ok(Math.hypot(shown[i]!.x-shown[j]!.x,shown[i]!.y-shown[j]!.y)>=72);
});
