import test from "node:test";import assert from "node:assert/strict";
import {pix2VecNest} from "healpix-ts";
import type {SkyObservationFrame} from "@starward/miniapp-contracts";
import * as owner from "./sky-optical-tile-selection";
import type {PublishedOpticalTile} from "./sky-optical-tile-selection";
import type {SkyArtworkView} from "./sky-artwork-registration";
const matrix=[.5818722449315614,.8132787297017187,-.0015486746151292343,-.3085821322916905,.2225406663098116,.9247987453866374,.7524637919585356,-.5376368287730514,.3804535216530894] as const;
const frame:SkyObservationFrame={format:"eqj-enu-observer-v1",at:"2026-10-06T13:00:00.000Z",observer:{latitude:22.4826799,longitude:114.5557147,elevationM:0},equatorialToEnu:matrix};
const view:SkyArtworkView={verticalFovDeg:.25,basis:{right:[.1045353015321234,.9945211766139462,0],up:[-.7071732575320304,.07433182062875353,.7031221545887679],forward:[-.6992698724849544,.07350108644385314,-.7110690794335306]}};
const pixels=[401307,401328,401329,401330,401331,401332,401334];
const tiles=pixels.map(pixel=>({id:`skymapper-dr4:8:${pixel}`,sourceId:"skymapper-dr4",sourcePriority:0,order:8,pixel,format:"png",width:512,height:512,bytes:600000,sha256:String(pixel),downloadUrl:`/exact/${pixel}`} as PublishedOpticalTile));
// Before the owner has a camera ordering responsibility the actual loader
// receives resolvePublishedOpticalTiles' numerical order unchanged.
const order=(assets:readonly PublishedOpticalTile[],v=view)=>(owner as unknown as {orderPublishedOpticalTilesForView?:(assets:readonly PublishedOpticalTile[],frame:SkyObservationFrame,view:SkyArtworkView)=>PublishedOpticalTile[]}).orderPublishedOpticalTilesForView?.(assets,frame,v)??[...assets];
test("real M104 camera loads the visible centre before two conservative off-viewport cells",()=>{const result=order(tiles);assert.equal(result[0]!.pixel,401329);assert.deepEqual(result.slice(0,4).map(a=>a.pixel).sort(),[401329,401331,401332,401334]);});
test("ordering retains every immutable asset and existing source/coarse grouping",()=>{const before=structuredClone(tiles),coarse={...tiles[0]!,id:"coarse",order:3,pixel:391},fallback={...tiles[0]!,id:"fallback",sourcePriority:1};const input=[...tiles,coarse,fallback],result=order(input);assert.deepEqual(tiles,before);assert.deepEqual([...result].map(a=>a.id).sort(),input.map(a=>a.id).sort());assert(result.every(a=>input.includes(a)));assert.equal(result[0],fallback);assert.equal(result[1],coarse);});
test("the same asset set reorders with the current camera rather than stale target identity",()=>{const eq=pix2VecNest(256,401307),forward=[matrix[0]!*eq[0]+matrix[1]!*eq[1]+matrix[2]!*eq[2],matrix[3]!*eq[0]+matrix[4]!*eq[1]+matrix[5]!*eq[2],matrix[6]!*eq[0]+matrix[7]!*eq[1]+matrix[8]!*eq[2]] as [number,number,number];const moved={...view,basis:{...view.basis,forward}};assert.equal(order(tiles,moved)[0]!.pixel,401307);assert.equal(order(tiles)[0]!.pixel,401329);});
