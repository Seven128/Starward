import assert from "node:assert/strict";
import test from "node:test";
import {pix2VecNest} from "healpix-ts";
import {OBSERVATION_FRAME_FORMAT,type OpticalHipsIndexData,type OpticalHipsManifestData,type SkyObservationFrame} from "@starward/miniapp-contracts";
import {publishedOpticalCoverageComplete,resolvePublishedOpticalTiles,
  selectPublishedOpticalCandidates,selectPublishedOpticalTiles} from "./sky-optical-tile-selection";
import {selectSkyHipsTiles} from "./sky-hips-tile-selection";

const frame:SkyObservationFrame={format:OBSERVATION_FRAME_FORMAT,at:"2026-09-23T00:00:00.000Z",
  observer:{latitude:0,longitude:0,elevationM:0},equatorialToEnu:[1,0,0,0,1,0,0,0,1]};
const forward=pix2VecNest(256,43345),h=Math.hypot(forward[0],forward[1]);
const basis={forward,right:[forward[1]/h,-forward[0]/h,0],
  up:[-forward[2]*forward[0]/h,-forward[2]*forward[1]/h,h]} as const;
const publication={sources:[{id:"ps1-dr1",maxOrder:11,format:"jpeg"}],
  shards:[{sourceId:"ps1-dr1",order:8,dir:40000}]} as OpticalHipsManifestData;
const opticalReference=selectSkyHipsTiles({frame,view:{basis,verticalFovDeg:.25},
  width:390,height:844,maxOrder:8});
if(opticalReference.state!=="SELECTED")throw new Error("test_view_not_selected");

test("the real order-8 M31 tile can be requested only at an intersecting, bounded view",()=>{
  const fine=selectPublishedOpticalTiles(publication,frame,{basis,verticalFovDeg:.25},390,844);
  assert.equal(fine?.sourceId,"ps1-dr1");
  assert.equal(fine?.order,8);
  assert.ok(fine?.pixels.includes(43345));
  assert.deepEqual(fine?.dirs,[40000]);
  assert.equal(selectPublishedOpticalTiles(publication,frame,{basis,verticalFovDeg:2},390,844),null,
    "a single fine tile is not a wide-field mosaic");
  assert.equal(selectPublishedOpticalTiles({...publication,shards:[]},frame,
    {basis,verticalFovDeg:.25},390,844),null,"a source label alone is no coverage");
});

test("a first-source fine shard missing its image discovers the published coarse image",()=>{
  const lower={...publication,shards:[...publication.shards,
    {sourceId:"ps1-dr1",order:7,dir:10000}]} as OpticalHipsManifestData;
  const view={basis,verticalFovDeg:.25};
  const candidates=selectPublishedOpticalCandidates(lower,frame,view,390,844);
  assert.deepEqual(candidates.map(candidate=>candidate.order),[8,7]);
  const parent=Math.floor(43345/4);
  assert.ok(candidates[1]!.pixels.includes(parent));
  const independentlyQueried=selectSkyHipsTiles({frame,view,width:390,height:844,maxOrder:7});
  assert.equal(independentlyQueried.state,"SELECTED");
  if(independentlyQueried.state==="SELECTED")assert.deepEqual(candidates[1]!.pixels,
    independentlyQueried.pixels.filter(pixel=>Math.floor(pixel/10000)*10000===10000),
    "nested ancestors keep the independently selected coarse viewport pixels");
  const fine:OpticalHipsIndexData={schemaVersion:"starward-optical-hips-shard-v1",
    publicationHash:"test",sourceId:"ps1-dr1",order:8,dir:40000,tiles:[]};
  const coarse:OpticalHipsIndexData={...fine,order:7,dir:10000,
    tiles:[{pixel:parent,sha256:"coarse",bytes:100,downloadUrl:"/v2/sky/optical/test/coarse"}]};
  assert.equal(resolvePublishedOpticalTiles(candidates,[fine],opticalReference).length,0);
  const selected=resolvePublishedOpticalTiles(candidates,[fine,coarse],opticalReference);
  assert.equal(selected.find(tile=>tile.pixel===parent)?.sourceId,"ps1-dr1");
  assert.equal(publishedOpticalCoverageComplete(opticalReference,selected),false,
    "one coarse tile cannot claim full viewport coverage");
});

test("a listed shard with a missing pixel falls through to the next published source",()=>{
  const both={...publication,
    sources:[...publication.sources,{id:"skymapper-dr4",maxOrder:8,format:"png"}],
    shards:[...publication.shards,{sourceId:"skymapper-dr4",order:8,dir:40000}]} as OpticalHipsManifestData;
  const candidates=selectPublishedOpticalCandidates(both,frame,{basis,verticalFovDeg:.25},390,844);
  assert.deepEqual(candidates.map(candidate=>candidate.sourceId),["ps1-dr1","skymapper-dr4"]);
  const index=(sourceId:string,pixels:number[]):OpticalHipsIndexData=>({
    schemaVersion:"starward-optical-hips-shard-v1",publicationHash:"test",sourceId,order:8,dir:40000,
    tiles:pixels.map(pixel=>({pixel,sha256:`${sourceId}-${pixel}`,bytes:100,
      downloadUrl:`/v2/sky/optical/test/${sourceId}/8/40000/${pixel}`})),
  });
  const primary=index("ps1-dr1",candidates[0]!.pixels.filter(pixel=>pixel!==43345));
  const fallback=index("skymapper-dr4",[43345]);
  const selected=resolvePublishedOpticalTiles(candidates,[primary,fallback],opticalReference);
  assert.equal(selected.find(tile=>tile.pixel===43345)?.sourceId,"skymapper-dr4");
  assert.equal(selected.filter(tile=>tile.pixel===43345).length,1);
  assert.ok(selected.length<=12);
  assert.equal(resolvePublishedOpticalTiles(candidates,[primary],opticalReference)
    .some(tile=>tile.pixel===43345),false,
    "a shard reference cannot invent the absent image");
  assert.equal(resolvePublishedOpticalTiles(candidates,[index("ps1-dr1",[43345]),fallback],opticalReference)
    .find(tile=>tile.pixel===43345)?.sourceId,"ps1-dr1","first source keeps priority");
  assert.equal(publishedOpticalCoverageComplete(opticalReference,
    resolvePublishedOpticalTiles(candidates,[index("ps1-dr1",[...candidates[0]!.pixels])],opticalReference)),true,
    "full first-source coverage ends lower-priority index discovery");
  const parent=Math.floor(43345/4);
  const coarser={...candidates[1]!,order:7,pixels:[parent],dirs:[10000]};
  const coarseIndex={...fallback,order:7,dir:10000,
    tiles:[{pixel:parent,sha256:"coarse",bytes:100,downloadUrl:"/v2/sky/optical/test/coarse"}]};
  assert.equal(resolvePublishedOpticalTiles([candidates[0]!,coarser],[primary,coarseIndex],opticalReference)
    .some(tile=>tile.sourceId==="skymapper-dr4"&&tile.pixel===parent),true,
    "a lower-resolution published source can fill a missing fine pixel");
});

test("a full image budget favors the coarse tile that closes a real viewport gap",()=>{
  const referencePixels=Array.from({length:12},(_,pixel)=>pixel);
  const candidates=[
    {sourceId:"ps1-dr1",format:"jpeg" as const,order:2,pixels:referencePixels.slice(0,11),dirs:[0]},
    {sourceId:"ps1-dr1",format:"jpeg" as const,order:1,pixels:[0,2],dirs:[0]},
  ];
  const index=(order:number,pixels:number[]):OpticalHipsIndexData=>({
    schemaVersion:"starward-optical-hips-shard-v1",publicationHash:"test",sourceId:"ps1-dr1",
    order,dir:0,tiles:pixels.map(pixel=>({pixel,sha256:`${order}-${pixel}`,
      bytes:100,downloadUrl:`/v2/sky/optical/test/${order}/${pixel}`})),
  });
  const selected=resolvePublishedOpticalTiles(candidates,
    [index(2,referencePixels.slice(0,11)),index(1,[0,2])],{order:2,pixels:referencePixels});
  assert.ok(selected.length<=12);
  assert.ok(referencePixels.every(pixel=>selected.some(tile=>tile.order<=2&&
    Math.floor(pixel/4**(2-tile.order))===tile.pixel)),
    "the selected lower-order image must cover pixel 11, even when another lower-order image was listed first");
});

test("covering one hole preserves available first-source detail",()=>{
  const referencePixels=Array.from({length:12},(_,pixel)=>pixel);
  const candidates=[
    {sourceId:"ps1-dr1",format:"jpeg" as const,order:2,pixels:referencePixels.slice(0,11),dirs:[0]},
    {sourceId:"skymapper-dr4",format:"png" as const,order:1,pixels:[0,1,2],dirs:[0]},
  ];
  const index=(sourceId:string,order:number,pixels:number[]):OpticalHipsIndexData=>({
    schemaVersion:"starward-optical-hips-shard-v1",publicationHash:"test",sourceId,
    order,dir:0,tiles:pixels.map(pixel=>({pixel,sha256:`${sourceId}-${order}-${pixel}`,
      bytes:100,downloadUrl:`/v2/sky/optical/test/${sourceId}/${order}/${pixel}`})),
  });
  const selected=resolvePublishedOpticalTiles(candidates,[
    index("ps1-dr1",2,referencePixels.slice(0,11)),index("skymapper-dr4",1,[0,1,2]),
  ],{order:2,pixels:referencePixels});
  assert.equal(selected.length,12);
  assert.equal(selected.filter(tile=>tile.sourceId==="ps1-dr1").length,11,
    "the secondary source should fill pixel 11 without displacing available primary fine tiles");
  assert.ok(selected.some(tile=>tile.sourceId==="skymapper-dr4"&&tile.pixel===2));
});

test("published base faces remain selectable in a full-dome view and missing faces fall through",()=>{
  const domeBasis={right:[1,0,0],up:[0,-1,0],forward:[0,0,1]} as const;
  const view={basis:domeBasis,verticalFovDeg:267.8};
  const root={sources:[{id:"primary",maxOrder:0,format:"jpeg"},
    {id:"secondary",maxOrder:0,format:"png"}],
    shards:[{sourceId:"primary",order:0,dir:0},
      {sourceId:"secondary",order:0,dir:0}]} as OpticalHipsManifestData;
  const candidates=selectPublishedOpticalCandidates(root,frame,view,390,844);
  assert.deepEqual(candidates.map(candidate=>candidate.sourceId),["primary","secondary"]);
  assert.deepEqual(candidates[0]?.pixels,Array.from({length:12},(_,pixel)=>pixel));
  const reference=selectSkyHipsTiles({frame,view,width:390,height:844,maxOrder:0,minOrder:0});
  assert.equal(reference.state,"SELECTED");
  if(reference.state!=="SELECTED")return;
  const index=(sourceId:string,pixels:number[]):OpticalHipsIndexData=>({
    schemaVersion:"starward-optical-hips-shard-v1",publicationHash:"test",sourceId,order:0,dir:0,
    tiles:pixels.map(pixel=>({pixel,sha256:`${sourceId}-${pixel}`,bytes:100,
      downloadUrl:`/v2/sky/optical/test/${sourceId}/0/${pixel}`})),
  });
  const first=index("primary",[0,1,2,3,4,5]);
  assert.equal(publishedOpticalCoverageComplete(reference,
    resolvePublishedOpticalTiles(candidates,[first],reference)),false);
  const selected=resolvePublishedOpticalTiles(candidates,[first,index("secondary",[6,7,8,9,10,11])],reference);
  assert.equal(selected.length,12);
  assert.equal(publishedOpticalCoverageComplete(reference,selected),true);
});
