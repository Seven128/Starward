import assert from 'node:assert/strict';
import {calculateMiniappNightSky} from '../../../workers/miniapp-api/src/astronomy-engine-adapter.ts';
import {createSkyViewBasis} from '../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
import {skyPlanetDiscsAt} from '../../../apps/wechat-miniapp/src/features/sky/sky-planet-disc.ts';
import {drawSkyScene} from '../../../apps/wechat-miniapp/src/features/sky/sky-scene-render.ts';
import {pickPaintedSkyObjects} from '../../../apps/wechat-miniapp/src/features/sky/sky-object-picking.ts';
import type {SkyPickSnapshot} from '../../../apps/wechat-miniapp/src/features/sky/sky-object-picking.ts';
import type {SkyRenderSurface} from '../../../apps/wechat-miniapp/src/features/sky/sky-render-surface.ts';
import type {ResolvedSkyReport} from '../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';

const at='2026-09-22T20:30:00.000Z';
const calculated=calculateMiniappNightSky({latitude:23.1291,longitude:113.2644,elevationM:20,
  timezone:'Asia/Shanghai',nightDate:'2026-09-22',target:'jupiter',additionalTimes:[at]});
const row=calculated.samples.find(sample=>sample.at===at);
assert.ok(row);
const jupiter=row.planets[3]!;
assert.equal(jupiter.body,'JUPITER');
assert.ok(jupiter.altitudeDeg>0&&jupiter.bodyFrame);
const basis=createSkyViewBasis(jupiter.azimuthDeg,90+jupiter.altitudeDeg,0);
assert.ok(basis);
const width=390,height=844,fov=.15;
const disc=skyPlanetDiscsAt([row],at,basis,width,height,fov)?.find(item=>item.body==='JUPITER');
assert.ok(disc?.oblate);
const submitted:unknown[]=[];
const surface=new Proxy({}, {get:(_target,key)=>key==='planet'
  ? (item:unknown)=>{submitted.push(item);return true;}:()=>true}) as SkyRenderSurface;
let snapshot:SkyPickSnapshot|null=null;
const report={hourly:[row],skyScene:{state:'UNAVAILABLE',frames:[]},targetFrames:[]} as unknown as ResolvedSkyReport;
drawSkyScene(surface,report,at,null,null,width,height,'NIGHT',value=>{snapshot=value;},
  undefined,fov,null,basis);
assert.ok(submitted.some(item=>(item as {body?:string}).body==='JUPITER'));
const painted=snapshot as SkyPickSnapshot|null;
assert.ok(painted);
const selected=pickPaintedSkyObjects(painted,{x:disc.x,y:disc.y,frameAt:at,
  catalogVersion:painted.catalogVersion,catalogHash:painted.catalogHash});
assert.ok(selected.some(item=>item.reference==='PLANET:JUPITER'));
console.log(JSON.stringify({at,observer:{latitude:23.1291,longitude:113.2644,elevationM:20},
  azimuthDeg:jupiter.azimuthDeg,altitudeDeg:jupiter.altitudeDeg,
  angularDiameterDeg:jupiter.angularDiameterDeg,sunAltitudeDeg:row.sunAltitudeDeg,
  poleEnu:jupiter.bodyFrame.poleEnu,center:[disc.x,disc.y],meanRadiusPx:disc.radiusPx,
  majorRadiusPx:disc.oblate.majorRadiusPx,minorRadiusPx:disc.oblate.minorRadiusPx,
  minorDirection:disc.oblate.minorDirection,paintedJupiter:true,pickedJupiter:true},null,2));
