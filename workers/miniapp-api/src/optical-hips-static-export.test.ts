import assert from "node:assert/strict";
import test from "node:test";
import {OpticalHipsPublicationService} from "./optical-hips-publication.ts";
import {opticalHipsTrialSkyPublicAssets} from "./sky-public-asset-export.ts";
import {opticalHipsPublicAssetHeaders} from "./sky-public-asset-headers.ts";

test("conditional static enumerator rejects disabled and non-TRIAL publication owners",async()=>{
  await assert.rejects(async()=>{for await(const _ of opticalHipsTrialSkyPublicAssets(new OpticalHipsPublicationService())){}},/unavailable/);
  const production={manifest:()=>({scope:"PRODUCTION"}),publishedAssets:async function*(){throw new Error("must not enumerate");}};
  await assert.rejects(async()=>{for await(const _ of opticalHipsTrialSkyPublicAssets(production as unknown as OpticalHipsPublicationService)){}},/optical_trial_scope_invalid/);
});

test("shared HiPS response headers never attribute metadata to a fabricated tile or infrared source",()=>{
  assert.equal(opticalHipsPublicAssetHeaders("image/jpeg","ps1-dr1")["x-starward-image-source"],"ps1-dr1");
  assert.equal(opticalHipsPublicAssetHeaders("application/json; charset=utf-8")["x-starward-image-source"],undefined);
  for(const [type,source] of [["image/jpeg",undefined],["text/plain","ps1-dr1"],["application/json; charset=utf-8","ps1-dr1"],["image/png","../outside"]])
    assert.throws(()=>opticalHipsPublicAssetHeaders(type!,source),/identity_invalid/);
});
