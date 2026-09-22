import assert from "node:assert/strict";
import test from "node:test";
import { TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import type { SkyReport } from "@starward/miniapp-contracts";
import { attachSkyCatalog, resolveSkySceneFrame, skySceneHasContent } from "../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts";
import { buildSkyScene, createBsc5pSkyCatalogProvider } from "./sky-scene-catalog.ts";
import { StellarCatalogPublicationService } from "./stellar-catalog-publication.ts";
const at=["2026-09-19T13:00:00.000Z","2026-09-19T14:00:00.000Z"];
function setup(){
 const scene=buildSkyScene({provider:createBsc5pSkyCatalogProvider(),hourlyAt:at,spot:TEST_PUBLISHED_SPOT});
 assert.equal(scene.state,"AVAILABLE");
 const publication=new StellarCatalogPublicationService().get(scene.catalog!).data;
 const report={skyScene:scene,hourly:at.map(at=>({at})),targetFrames:at.map(at=>({at,targets:[]})),weatherEvidence:{marker:"preserved"}} as unknown as SkyReport;
 return {report,publication};
}
test("current-frame resolution reuses gestures, switches exact time, and never borrows across time or catalog",()=>{
 const {report,publication}=setup(), resolved=attachSkyCatalog(report,publication);
 const first=resolveSkySceneFrame(resolved.skyScene,at[0])!;
 assert.ok(first.points.length>3000);
 assert.equal(resolveSkySceneFrame(resolved.skyScene,at[0]),first,"gestures must not recompute unchanged astronomy");
 const second=resolveSkySceneFrame(resolved.skyScene,at[1])!;
 assert.notDeepEqual(first.points,second.points);
 const revisited=resolveSkySceneFrame(resolved.skyScene,at[0]);
 assert.notEqual(revisited,first,"only current frame is retained");assert.deepEqual(revisited,first);
 assert.equal(resolveSkySceneFrame(resolved.skyScene,"2026-09-19T13:30:00.000Z"),undefined);
 assert.equal(resolveSkySceneFrame({...resolved.skyScene,frames:[report.skyScene.frames[0]!,report.skyScene.frames[0]!] },at[0]),undefined);
 for(const change of [{catalogHash:"b".repeat(64)},{catalogVersion:"bsc5p-bright-stars.v1"}]){
  const wrong=attachSkyCatalog(report,{...publication,...change});
  assert.equal(wrong.skyScene.state,"UNAVAILABLE");assert.equal(resolveSkySceneFrame(wrong.skyScene,at[0]),undefined);
 }
 const changed={...resolved.skyScene,frames:report.skyScene.frames.map(f=>({...f,geometry:{...f.geometry!,observer:{...f.geometry!.observer,longitude:0}}}))};
 assert.equal(resolveSkySceneFrame(changed,at[0]),undefined);
 assert.equal(resolveSkySceneFrame({...resolved.skyScene,observer:{...resolved.skyScene.observer!,longitude:0}},at[0]),undefined);
 assert.ok(!("entries" in report.skyScene.catalog!) && report.skyScene.frames.every(f=>!("points" in f)),"shared wire cache stays compact");
});
test("static failure preserves independent data and usable deep-sky interaction; recovery restores stars",()=>{
 const {report,publication}=setup(), missing=attachSkyCatalog(report,undefined);
 assert.equal(missing.skyScene.state,"UNAVAILABLE");
 assert.equal(missing.hourly,report.hourly);assert.equal(missing.targetFrames,report.targetFrames);
 assert.equal(missing.weatherEvidence,report.weatherEvidence);assert.equal(missing.skyScene.deepSky,report.skyScene.deepSky);
 assert.equal(skySceneHasContent(missing.skyScene,at[0],report.targetFrames[0]),true);
 assert.equal(skySceneHasContent(missing.skyScene,"unknown",report.targetFrames[0]),false);
 assert.equal(resolveSkySceneFrame(missing.skyScene,at[0]),undefined);
 const restored=attachSkyCatalog(report,publication);
 assert.equal(restored.skyScene.state,"AVAILABLE");assert.ok(resolveSkySceneFrame(restored.skyScene,at[0])!.points.length>3000);
});
