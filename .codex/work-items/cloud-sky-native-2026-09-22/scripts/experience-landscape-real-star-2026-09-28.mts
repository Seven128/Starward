// Choose a real current-frame catalog object covered by the original virtual
// scene; then exercise public search/location controls. Route identifiers stay
// in memory and are never printed or saved. No API/sensor/private-state mocks.
import sdk from "miniprogram-automator";
import assert from "node:assert/strict";
import { boundedWechatConnect, boundWechatProtocol } from "../../../../tools/miniapp/wechat-protocol.mjs";
import { attachSkyCatalog, resolveSkySceneFrame } from "../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts";
import { skyHorizontalDirection } from "../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts";
import { skyLandscapeOccludes } from "../../../../apps/wechat-miniapp/src/features/sky/sky-landscape-geometry.ts";
import { skyStarAppearance } from "../../../../apps/wechat-miniapp/src/features/sky/sky-star-appearance.ts";
const action=process.argv[2]??"inspect";
if(!["inspect","locate"].includes(action))throw Error("invalid_action");
const expectedMarker=process.argv[3]??"LAND2SEP28",port=Number(process.argv[4]??9432);
const ports={LAND0928:9431,LAND2SEP28:9432};if(ports[expectedMarker as keyof typeof ports]!==port)throw Error("unexpected_task_candidate");
const program=await boundedWechatConnect(()=>sdk.launcher.connectTool({wsEndpoint:`ws://127.0.0.1:${port}`}),5000);
boundWechatProtocol(program,5000);
async function until(read:any,accepts:any,label:string) {
  const end=Date.now()+8000;
  while(Date.now()<end){const value=await read();if(accepts(value))return value;await new Promise(resolve=>setTimeout(resolve,100));}
  throw Error(label);
}
async function json(relative:string){
  const response=await fetch("http://127.0.0.1:8787/v2"+relative,{signal:AbortSignal.timeout(5000)});
  if(!response.ok)throw Error(`local_data_status_${response.status}`);
  return response.json() as Promise<any>;
}
try {
  const page=await program.currentPage();assert.equal(page?.path,"sky/detail/index");
  const marker=await (await page.$(".sky-zoom-status"))?.outerWxml()??"";
  assert.ok(marker.includes(expectedMarker));
  const description=await (await page.$(".sky-orientation-canvas"))?.attribute("aria-label")??"";
  const at=description.match(/场景时刻 ([0-9T:.Z-]+)/)?.[1];assert.ok(at&&description.includes("已呈现"));
  const spotId=decodeURIComponent(String(page.query.spotId??page.query.spot_id??""));
  const contextId=decodeURIComponent(String(page.query.contextId??page.query.context_id??""));
  assert.ok(spotId.startsWith("spot:")&&contextId);
  const raw=await json(`/spots/${encodeURIComponent(spotId)}/sky?contextId=${encodeURIComponent(contextId)}&catalogVersion=bsc5p-bright-stars.v3`);
  const reference=raw.data.skyScene.catalog;assert.ok(reference);
  const publication=await json(`/sky/catalogs/${encodeURIComponent(reference.catalogVersion)}/${encodeURIComponent(reference.catalogHash)}`);
  const report=attachSkyCatalog(raw.data,publication.data);
  const frame=resolveSkySceneFrame(report.skyScene,at);assert.ok(frame,"route report must actually contain the current canvas instant");
  const sunAltitude=report.hourly.find(row=>row.at===at)?.sunAltitudeDeg;
  assert.equal(typeof sunAltitude,"number");
  const candidates=frame.points.flatMap(([index,azimuthDeg,altitudeDeg])=>{
    const entry=report.skyScene.catalog!.entries[index];
    return entry&&altitudeDeg>0&&(skyStarAppearance(entry.magnitude,45,sunAltitude!,altitudeDeg)?.opacity??0)>=.1&&
      skyLandscapeOccludes(skyHorizontalDirection(azimuthDeg,altitudeDeg)!)
      ?[{reference:entry.objectRef,name:entry.displayName,magnitude:entry.magnitude,azimuthDeg,altitudeDeg}]:[];
  }).sort((a,b)=>a.magnitude-b.magnitude);
  const chosen=candidates[0];assert.ok(chosen);
  if(action==="locate") {
    const dock=await (await page.$(".sky-control-dock"))?.outerWxml()??"";
    const list=dock.match(/<button id="([^"]+)"[^>]*>天体列表<\/button>/);assert.ok(list);
    await (await page.$(`#${list[1]}`))!.tap();
    const input=await until(()=>page.$(".sky-object-search__input"),(value:any)=>Boolean(value),"search_missing");
    await input.input(chosen.reference.replace(":"," "));
    const result=await until(async()=>{
      for(const row of await page.$$(".sky-object-search__result"))
        if((await row.outerWxml()).includes(chosen.reference.replace(":"," ")))return row;
      return null;
    },(value:any)=>Boolean(value),"real_star_not_found");
    await result.tap();
    await (await until(()=>page.$(".sky-object-locate"),(value:any)=>Boolean(value),"locate_missing")).tap();
    await until(async()=>await (await page.$(".sky-located-object"))?.attribute("aria-label")??"",
      (value:string)=>value.includes("模拟地景遮挡"),"model_occlusion_not_disclosed");
  }
  const after=await program.currentPage();assert.equal(after?.path,page.path);
  assert.ok((await (await after.$(".sky-zoom-status"))?.outerWxml()??"").includes(expectedMarker));
  console.log(JSON.stringify({scope:"development_observation",marker:expectedMarker,port,action,at,
    frameMatched:true,coveredCatalogObjects:candidates.length,chosen,
    locatedLabel:await (await after.$(".sky-located-object"))?.attribute("aria-label")??null}));
} finally {program.disconnect();}
