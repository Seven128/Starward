// Actual public UI, production HTTP failure, native decode/draw and retry.
// No route identifiers, credentials, private-state edits or API/sensor mocks.
import sdk from "miniprogram-automator";
import assert from "node:assert/strict";
import {readFile,writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {createRequire} from "node:module";
import path from "node:path";
import {boundedWechatConnect,boundWechatProtocol} from "../../../../tools/miniapp/wechat-protocol.mjs";
const action=process.argv[2],run=process.argv[3]??"r1";
assert.ok(["setup","recover"].includes(action)&&/^r[1-9][0-9]*$/.test(run));
const marker="IMGSEP28",port=9433,root=path.resolve(".codex/work-items/cloud-sky-native-2026-09-22/evidence");
const project=path.resolve("apps/wechat-miniapp/dist/weapp-check-sky-imagery-flow-0928");
const configuration=await readFile(path.join(project,"project.config.json"));
const program=await boundedWechatConnect(()=>sdk.launcher.connectTool({wsEndpoint:`ws://127.0.0.1:${port}`}),5000);
boundWechatProtocol(program,5000);
const {PNG}=createRequire(import.meta.url)("pngjs");
async function compareScene(first,second){
  const a=PNG.sync.read(await readFile(path.join(root,first.name))),b=PNG.sync.read(await readFile(path.join(root,second.name)));
  assert.equal(a.width,b.width);assert.equal(a.height,b.height);
  let changedPixels=0,maximumChannelDelta=0;
  // Exclude the observed simulator's OS clock/notch/menu and home indicator.
  for(let y=50;y<a.height-15;y++)for(let x=3;x<a.width-3;x++) {
    const index=(y*a.width+x)*4;let changed=false;
    for(const channel of [0,1,2]){const delta=Math.abs(a.data[index+channel]-b.data[index+channel]);
      changed ||= delta>0;maximumChannelDelta=Math.max(maximumChannelDelta,delta);}
    if(changed)changedPixels++;
  }
  return {changedPixels,maximumChannelDelta,scope:"scene pixels excluding known simulator system chrome"};
}
async function until(read,accept,label){const end=Date.now()+10000;while(Date.now()<end){const value=await read();
  if(accept(value))return value;await new Promise(resolve=>setTimeout(resolve,100));}throw Error(label);}
async function httpStatus(){const r=await fetch("http://127.0.0.1:8788/__sky_test/status");assert.ok(r.ok);return r.json();}
async function state(page){
  assert.ok((await (await page.$(".sky-zoom-status"))?.text()??"").includes(marker));
  const description=await (await page.$(".sky-orientation-canvas"))?.attribute("aria-label")??"";
  assert.ok(description.includes("已呈现")&&description.includes("2026-09-28T22:30:00.000Z"));
  return {description,sources:await (await page.$(".sky-image-status-group"))?.text()??"",
    located:await (await page.$(".sky-located-object"))?.attribute("aria-label")??""};
}
async function capture(page,label){
  const before=await state(page),bytes=Buffer.from(await program.screenshot(),"base64"),after=await state(page);
  assert.deepEqual(after,before);assert.equal((await program.currentPage())?.pageId,page.pageId);
  assert.ok((await readFile(path.join(project,"project.config.json"))).equals(configuration));
  const name=`experience-imagery-${label}-native-2026-09-28-${run}.png`;
  await writeFile(path.join(root,name),bytes,{flag:"wx"});
  return {name,bytes:bytes.length,sha256:createHash("sha256").update(bytes).digest("hex"),...before};
}
async function zoom(page,target){
  const from=Number((await state(page)).description.match(/垂直视场 (\d+(?:\.\d+)?) 度/)?.[1]);
  assert.ok(Number.isFinite(from));
  const start=target>from?200:Math.min(50,358*Math.tan(target*Math.PI/720)/Math.tan(from*Math.PI/720));
  const end=start*Math.tan(from*Math.PI/720)/Math.tan(target*Math.PI/720);
  const touches=distance=>[0,1].map(identifier=>({identifier,x:195.2+(identifier===0?-1:1)*distance/2,y:420,
    clientX:195.2+(identifier===0?-1:1)*distance/2,clientY:420}));
  const canvas=await page.$("#spot-night-sky-scene");
  await canvas.touchstart({touches:touches(start),changedTouches:touches(start)});
  await canvas.touchmove({touches:touches(end),changedTouches:touches(end)});
  await canvas.touchend({touches:[],changedTouches:touches(end)});
  await until(()=>state(page),value=>Math.abs(Number(value.description.match(/垂直视场 (\d+(?:\.\d+)?) 度/)?.[1])-target)<.01,"zoom_not_presented");
}
async function landscape(page,on){
  const current=await state(page);if(current.located.includes("模拟地景遮挡")===on)return;
  await (await page.$(".sky-view-mode__landscape")).tap();
  await until(()=>state(page),value=>value.located.includes("模拟地景遮挡")===on,"landscape_not_presented");
}
try {
  const page=await program.currentPage();assert.equal(page?.path,"sky/detail/index");await state(page);
  let result;
  if(action==="setup") {
    const initialFault=await httpStatus();assert.equal(initialFault.mode,"fail");
    const dock=await (await page.$(".sky-control-dock")).outerWxml();
    const button=dock.match(/<button id="([^"]+)"[^>]*>天体列表<\/button>/);assert.ok(button);
    await (await page.$(`#${button[1]}`)).tap();
    const input=await until(()=>page.$(".sky-object-search__input"),Boolean,"search_missing");await input.input("M 51");
    const row=await until(async()=>{for(const candidate of await page.$$(".sky-object-search__result"))
      if((await candidate.text()).includes("M 51"))return candidate;return null;},Boolean,"M51_missing");
    await row.tap();await (await until(()=>page.$(".sky-object-locate"),Boolean,"locate_missing")).tap();
    await until(()=>state(page),value=>value.located.startsWith("M 51"),"wrong_identity");
    // Stay inside the overview band; rounded 0.30° from a scripted pinch can
    // sit just outside its exact upper request boundary.
    await zoom(page,5);await landscape(page,false);await zoom(page,.29);
    await until(()=>state(page),value=>value.sources.includes("Sloan Digital Sky Survey"),"overview_not_painted");
    await zoom(page,.1);
    await until(httpStatus,value=>value.forwarded.MEDIUM>0,"medium_not_served");
    await new Promise(resolve=>setTimeout(resolve,700));
    await until(()=>state(page),value=>value.sources.includes("Sloan Digital Sky Survey")&&!value.sources.includes("正在载入"),"coarse_not_presented");
    await zoom(page,.05);
    await until(()=>state(page),value=>value.sources.includes("影像更新失败，保留已载图")&&value.sources.includes("Sloan Digital Sky Survey"),"fine_failure_lost_retry_or_coarse");
    const failedOpen=await capture(page,"failed-open");
    assert.ok(!failedOpen.sources.includes("AllWISE W3"),"opaque optical footprint must not claim hidden infrared pixels");
    const fault=await httpStatus();assert.equal(fault.blocked,initialFault.blocked+1);
    await landscape(page,true);
    await until(()=>state(page),value=>!value.sources.includes("Sloan Digital Sky Survey")&&!value.sources.includes("AllWISE W3"),"covered_image_kept_credit");
    const failedCovered=await capture(page,"failed-covered");
    await landscape(page,false);
    await until(()=>state(page),value=>value.sources.includes("影像更新失败，保留已载图"),"uncover_lost_retry");
    const uncovered=await capture(page,"failed-uncovered");
    const terrainRestorePixels=await compareScene(failedOpen,uncovered);
    assert.equal(terrainRestorePixels.changedPixels,0,"terrain toggles restore the same retained image pixels");
    await zoom(page,.06);await zoom(page,.05);
    const afterCameraUpdates=await httpStatus();assert.equal(afterCameraUpdates.blocked,fault.blocked,"camera changes cannot loop failed downloads");
    const restoredOpen=await capture(page,"failed-restored-open");
    assert.equal(restoredOpen.description,failedOpen.description);assert.equal(restoredOpen.located,failedOpen.located);
    const zoomRestorePixels=await compareScene(failedOpen,restoredOpen);
    assert.ok(zoomRestorePixels.maximumChannelDelta<=1,"same-level round-trip differs only by 8-bit rounding, not image replacement");
    result={failedOpen,failedCovered,uncovered,restoredOpen,terrainRestorePixels,zoomRestorePixels,initialFault,fault,afterCameraUpdates};
  } else {
    const before=await state(page);assert.ok(before.sources.includes("影像更新失败，保留已载图"));
    const old=JSON.parse(await readFile(path.join(root,`experience-imagery-setup-2026-09-28-${run}.json`),"utf8"));
    const changed=await fetch("http://127.0.0.1:8788/__sky_test/detail-mode",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:"pass"})});assert.ok(changed.ok);
    let retry;
    for(const candidate of await page.$$(".sky-image-status button"))if((await candidate.text()).includes("影像更新失败"))retry=candidate;
    assert.ok(retry,"retry must come from the actual visible image status");await retry.tap();
    await until(httpStatus,value=>value.forwarded.DETAIL>0,"detail_retry_not_served");
    await until(()=>state(page),value=>value.sources.includes("Sloan Digital Sky Survey")&&!value.sources.includes("影像更新失败"),"retry_not_presented");
    const recovered=await capture(page,"recovered-detail");
    assert.equal(recovered.description,old.failedOpen.description);assert.equal(recovered.located,old.failedOpen.located);
    const refinementPixels=await compareScene(old.failedOpen,recovered);
    assert.ok(refinementPixels.changedPixels>0&&refinementPixels.maximumChannelDelta>1,"detail recovery must replace actual coarse pixels");
    assert.ok(!recovered.sources.includes("AllWISE W3"));
    await landscape(page,true);
    await until(()=>state(page),value=>!value.sources.includes("Sloan Digital Sky Survey")&&!value.sources.includes("AllWISE W3"),"recovered_covered_credit_wrong");
    const covered=await capture(page,"recovered-covered");
    const coveredPixels=await compareScene(old.failedCovered,covered);
    assert.equal(coveredPixels.changedPixels,0,"foreground result stays stable across independent image recovery");
    await zoom(page,45);
    result={recovered,covered,refinementPixels,coveredPixels,final:await state(page),http:await httpStatus()};
  }
  const record={scope:"Official DevTools SDK + real local BFF through one controlled JPEG HTTP failure; not phone acceptance",marker,port,action,run,...result};
  await writeFile(path.join(root,`experience-imagery-${action}-2026-09-28-${run}.json`),JSON.stringify(record,null,2)+"\n",{flag:"wx"});
  console.log(JSON.stringify(record));
} finally {program.disconnect();}
