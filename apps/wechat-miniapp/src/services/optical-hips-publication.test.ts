import assert from "node:assert/strict";
import test from "node:test";
import {assertOpticalHipsIndex,assertOpticalHipsManifest} from "./optical-hips-publication";

const hash="a".repeat(64),sha="b".repeat(64);
function publication(){return {
  schemaVersion:"starward-optical-hips-v1",publicationId:"fixture",publicationHash:hash,
  scope:"TRIAL",processing:"local test",limitations:["single tile"],
  sources:[{id:"ps1-dr1",title:"PS1",provider:"CDS",originalDataUrl:"https://example.org/original",
    originalRights:"Data use",originalRightsUrl:"https://example.org/rights",
    hipsRecordUrl:"https://example.org/hips",hipsLicense:"ODbL-1.0",hipsDoi:"10.1/test",
    format:"jpeg",tileWidth:512,maxOrder:11}],
  shards:[{sourceId:"ps1-dr1",order:8,dir:40000,file:"ps1-dr1/Norder8/Dir40000/index.json",
    sha256:sha,bytes:203,tileCount:1,indexUrl:`/v2/sky/optical/${hash}/ps1-dr1/8/40000/index`}],
};}
function index(){return {schemaVersion:"starward-optical-hips-shard-v1",publicationHash:hash,
  sourceId:"ps1-dr1",order:8,dir:40000,tiles:[{pixel:43345,sha256:sha,bytes:141203,
    downloadUrl:`/v2/sky/optical/${hash}/ps1-dr1/8/43345`}]};}

test("a changed publication identity or injected URL cannot become a native tile request",()=>{
  const good=publication();assertOpticalHipsManifest(good);
  const tile=index();assertOpticalHipsIndex(tile,good,"ps1-dr1",8,40000);
  for(const mutate of [
    (value:any)=>value.shards[0].indexUrl="https://untrusted.example/tile",
    (value:any)=>value.shards[0].file="../secret/index.json",
    (value:any)=>value.shards[0].tileCount=10001,
    (value:any)=>value.sources[0].format="raw",
  ]){const wrong=structuredClone(good);mutate(wrong);assert.throws(()=>assertOpticalHipsManifest(wrong),/optical_publication_invalid/u);}
  for(const mutate of [
    (value:any)=>value.publicationHash="0".repeat(64),
    (value:any)=>value.tiles[0].downloadUrl="https://untrusted.example/image.jpg",
    (value:any)=>value.tiles[0].pixel=50000,
    (value:any)=>value.tiles[0].sha256="0",
  ]){const wrong=structuredClone(tile);mutate(wrong);assert.throws(()=>assertOpticalHipsIndex(wrong,good,"ps1-dr1",8,40000),/optical_index_invalid/u);}
});

test("bounded order-zero optical base faces keep same-origin identity checks",()=>{
  const good=publication();
  good.sources[0]!.maxOrder=0;
  good.shards[0]={...good.shards[0]!,order:0,dir:0,file:"ps1-dr1/Norder0/Dir0/index.json",
    indexUrl:`/v2/sky/optical/${hash}/ps1-dr1/0/0/index`};
  assertOpticalHipsManifest(good);
  const base={...index(),order:0,dir:0,
    tiles:[{pixel:11,sha256:sha,bytes:141203,downloadUrl:`/v2/sky/optical/${hash}/ps1-dr1/0/11`}]};
  assertOpticalHipsIndex(base,good,"ps1-dr1",0,0);
  assert.throws(()=>assertOpticalHipsIndex({...base,tiles:[{...base.tiles[0],pixel:12}]},
    good,"ps1-dr1",0,0),/optical_index_invalid/u);
});
