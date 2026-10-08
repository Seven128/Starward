import assert from "node:assert/strict";import test from "node:test";
import type {OpticalHipsManifestData} from "@starward/miniapp-contracts";
import {skyHipsSourceCredit,sameSkyHipsCompletion} from "./sky-hips-source-credit";
import {registerSkyNativeImageLifetime} from "./sky-artwork-loader";
import type {SkyHipsCanvasTile} from "./sky-scene-render";
const publication={publicationHash:"a".repeat(64),sources:[{id:"ps1",provider:"original PS1 / processed CDS"},{id:"other",provider:"not painted"}]} as OpticalHipsManifestData;
test("immutable HiPS caption derives only from live completed tiles and captures exact source route",()=>{
  const image={},retire=registerSkyNativeImageLifetime(image,()=>true),tile:SkyHipsCanvasTile={layer:"OPTICAL",sourceId:"ps1",order:0,pixel:4,image,publication};
  assert.equal(skyHipsSourceCredit([]),null);
  const credit=skyHipsSourceCredit([tile])!;assert.equal(credit.credit,"original PS1 / processed CDS");
  assert.deepEqual(credit.sourceIds,["ps1"]);assert.equal(credit.sourceRoute,`/sky/sources/index?hipsPublicationHash=${publication.publicationHash}&hipsSourceIds=ps1`);
  assert.equal(skyHipsSourceCredit([{...tile,sourceId:"foreign"}]),null);
  assert.equal(skyHipsSourceCredit([tile,{...tile,publication:{...publication,publicationHash:"b".repeat(64)}}]),null);
  assert(sameSkyHipsCompletion([tile],[tile]));assert(!sameSkyHipsCompletion([tile],[]));
  retire();assert.equal(skyHipsSourceCredit([tile]),null,"retirement removes authority immediately");
});
