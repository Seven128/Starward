import assert from 'node:assert/strict';
import test from 'node:test';
import type { StellarGeometryFrame } from '@starward/miniapp-contracts';
import { createSkyViewBasis } from './sky-view-projection';
import { selectSkyStellarTiles, type StellarTileBounds } from './sky-stellar-tile-selection';

const frame:StellarGeometryFrame={format:'bsc5p-stellar-geometry-v1',referenceAt:'2000-01-01T12:00:00.000Z',
  catalogVersion:'bsc5p-bright-stars.v2',catalogHash:'a'.repeat(64),at:'2000-01-01T12:00:00.000Z',
  observer:{latitude:0,longitude:0,elevationM:0},julianYears:0,equatorialToEnu:[0,1,0,-1,0,0,0,0,1]};
const input={frame,expected:{catalog:frame,observer:frame.observer,at:frame.at},basis:createSkyViewBasis(180,90,0)!,width:390,height:650,verticalFovDeg:3};
const tiles:StellarTileBounds[]=[{id:'east-equatorial',centerEqj:[1,0,0],radiusRad:0,maxMotionRadPerYear:0,minMagnitude:9},
  {id:'opposite-equatorial',centerEqj:[-1,0,0],radiusRad:0,maxMotionRadPerYear:0,minMagnitude:9}];

test('view selects the inverse-transformed EQJ region and zoom hides its faint tier',()=>{
  assert.deepEqual(selectSkyStellarTiles(tiles,input).map(t=>t.id),['east-equatorial']);
  assert.deepEqual(selectSkyStellarTiles(tiles,{...input,verticalFovDeg:45}),[]);
  assert.deepEqual(selectSkyStellarTiles(tiles,{...input,basis:createSkyViewBasis(0,90,0)!}).map(t=>t.id),['opposite-equatorial']);
});

test('proper-motion bounds follow the exact selected epoch and wrong frame cannot select stale tiles',()=>{
  const radians=4*Math.PI/180;
  const moving:StellarTileBounds={id:'moving',centerEqj:[Math.cos(radians),Math.sin(radians),0],radiusRad:0,maxMotionRadPerYear:.004,minMagnitude:9};
  assert.equal(selectSkyStellarTiles([moving],input).length,0);
  const future={...frame,at:new Date(Date.parse(frame.referenceAt)+25*365.25*86400000).toISOString(),julianYears:25};
  assert.equal(selectSkyStellarTiles([moving],{...input,frame:future,expected:{...input.expected,at:future.at}}).length,1);
  assert.throws(()=>selectSkyStellarTiles([moving],{...input,frame:future}),/time_binding/);
  assert.throws(()=>selectSkyStellarTiles(tiles,{...input,expected:{...input.expected,observer:{...frame.observer,longitude:20}}}),/observer_binding/);
});
