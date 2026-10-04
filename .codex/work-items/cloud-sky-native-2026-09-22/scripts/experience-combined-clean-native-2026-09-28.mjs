// Public UI journey on the immutable local combined candidate. The exact
// project is also observed through official project-addressed MCP tools.
// No private state edits, sensor mocks, phone or release acceptance claim.
import sdk from "miniprogram-automator";
import assert from "node:assert/strict";
import {readFile, writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import path from "node:path";
import {boundedWechatConnect, boundWechatProtocol} from "../../../../tools/miniapp/wechat-protocol.mjs";

const stage=process.argv[2];
assert.ok(["browse","imagery","tracking"].includes(stage));
const root=path.resolve(".codex/work-items/cloud-sky-native-2026-09-22/evidence");
const project=path.resolve("apps/wechat-miniapp/dist/weapp-check-sky-combined-clean-0928");
const candidate=JSON.parse(await readFile(path.join(root,"experience-combined-clean-candidate-2026-09-28.json"),"utf8"));
const digest=value=>createHash("sha256").update(value).digest("hex");
async function fixedCandidate(){
  for(const file of candidate.fingerprint.files)
    assert.equal(digest(await readFile(path.join(project,file.path))),file.sha256,"compiled_candidate_changed:"+file.path);
}
await fixedCandidate();
const program=await boundedWechatConnect(()=>sdk.launcher.connectTool({wsEndpoint:"ws://127.0.0.1:9434"}),5000);
boundWechatProtocol(program,5000);
const events=[];
async function until(read,accept,label){const end=Date.now()+10000;while(Date.now()<end){const value=await read();
  if(accept(value))return value;await new Promise(resolve=>setTimeout(resolve,100));}throw Error(label);}
const pageAt=expected=>until(()=>program.currentPage(),value=>value?.path===expected,"page_not_settled");
const element=(page,selector)=>until(()=>page.$(selector),Boolean,"element_missing:"+selector);
async function state(page){
  const description=await (await element(page,".sky-orientation-canvas")).attribute("aria-label");
  assert.ok(description?.includes("已呈现"));
  assert.ok(!/验证 [A-Z0-9]{6,16}/.test(await (await page.$(".sky-zoom-status"))?.text()??""));
  return {description,located:await (await page.$(".sky-located-object"))?.attribute("aria-label")??null,
    sources:await (await page.$(".sky-image-status-group"))?.text()??"",
    landscape:await (await page.$(".sky-view-mode__landscape"))?.attribute("aria-label")??null,
    skyClass:await (await page.$(".sky-orientation-page"))?.attribute("class")??null};
}
async function capture(page,label){
  await new Promise(resolve=>setTimeout(resolve,650));
  const before=await state(page),active=await program.currentPage();assert.equal(active,page);
  const bytes=Buffer.from(await program.screenshot(),"base64");
  assert.equal(await program.currentPage(),page);assert.deepEqual(await state(page),before);await fixedCandidate();
  const filename=`experience-combined-clean-${label}-2026-09-28.png`;
  await writeFile(path.join(root,filename),bytes,{flag:"wx"});
  const record={...before,filename,bytes:bytes.length,sha256:digest(bytes)};events.push(record);return record;
}
async function buttons(page,selector,label){
  for(const button of await page.$$(selector))if((await button.attribute("aria-label")??"").startsWith(label))return button;
  return null;
}
async function select(page,name){
  if(await page.$(".sky-object-modal__close"))await (await page.$(".sky-object-modal__close")).tap();
  if(!await page.$(".sky-object-search__input")){
    const dock=await (await element(page,".sky-control-dock")).outerWxml();
    const button=dock.match(/<button id="([^"]+)"[^>]*>天体列表<\/button>/);assert.ok(button);
    await (await page.$(`#${button[1]}`)).tap();
  }
  await (await element(page,".sky-object-search__input")).input(name);
  const result=await until(async()=>{for(const row of await page.$$(".sky-object-search__result"))
    if((await row.text()).includes(name))return row;},Boolean,"search_result_missing");
  await result.tap();await (await element(page,".sky-object-locate")).tap();
  await until(()=>state(page),value=>Boolean(value.located),"located_object_missing");
}
async function time(page,clock){
  if(!await page.$(".sky-orientation-time-ruler__track"))await (await element(page,".sky-control-dock__button--time")).tap();
  const track=await (await element(page,".sky-orientation-time-ruler__track")).outerWxml();
  const tick=[...track.matchAll(/<button id="([^"]+)"[^>]*aria-label="([^"]+)"/g)].find(row=>row[2].startsWith(clock+"，"));assert.ok(tick);
  await (await page.$(`#${tick[1]}`)).tap();
  await until(()=>state(page),value=>value.description.endsWith("所选观测时刻 "+clock),"time_not_presented");
  await until(async()=>await (await page.$(".sky-orientation-time-ruler__current-state"))?.text()??"",
    value=>!value.includes("保存中")&&!value.includes("预览"),"time_not_committed");
  await (await page.$(".sky-control-dock__button--time")).tap();
}
async function zoom(page,target){
  const from=Number((await state(page)).description.match(/垂直视场 (\d+(?:\.\d+)?) 度/)?.[1]);assert.ok(Number.isFinite(from));
  const ratio=Math.tan(from*Math.PI/720)/Math.tan(target*Math.PI/720);
  const start=Math.min(220,358/ratio),end=start*ratio;
  const touches=distance=>[0,1].map(identifier=>({identifier,x:195.2+(identifier===0?-1:1)*distance/2,y:420,
    clientX:195.2+(identifier===0?-1:1)*distance/2,clientY:420}));
  assert.ok(start>0&&end>0&&start<=358&&end<=358.01);
  const canvas=await element(page,"#spot-night-sky-scene");
  await canvas.touchstart({touches:touches(start),changedTouches:touches(start)});
  await canvas.touchmove({touches:touches(end),changedTouches:touches(end)});
  await canvas.touchend({touches:[],changedTouches:touches(end)});
  await until(()=>state(page),value=>Math.abs(Number(value.description.match(/垂直视场 (\d+(?:\.\d+)?) 度/)?.[1])-target)<.11,"zoom_not_presented");
}
async function sourceBack(page,reference,label,requiredText){
  const before=await capture(page,label+"-source-before");
  await (await element(page,".sky-located-object")).tap();
  const modal=await element(page,".sky-object-modal");
  assert.ok((await (await page.$(".sky-object-modal__kind"))?.text()??"").includes(reference.replace(":"," ")));
  const button=await until(()=>buttons(modal,"button","查看天体资料来源与许可"),Boolean,"source_button_missing");await button.tap();
  const sourcePage=await pageAt("sky/sources/index");
  assert.equal(decodeURIComponent(String(sourcePage.query.reference)),reference);
  const text=await until(async()=>await (await sourcePage.$("view"))?.text()??"",value=>requiredText.every(v=>value.includes(v)),"source_version_or_license_missing");
  if(reference==="SOLAR:MOON")assert.equal(sourcePage.query.moonTextureVersion,"coverage-v2");
  events.push({sourceReference:reference,requiredTextPresent:requiredText,moonTextureVersion:reference==="SOLAR:MOON"?sourcePage.query.moonTextureVersion:null});
  await program.navigateBack();page=await pageAt("sky/detail/index");
  if(await page.$(".sky-object-modal__close"))await (await page.$(".sky-object-modal__close")).tap();
  await until(()=>state(page),value=>value.description===before.description,"return_frame_not_restored");
  const after=await capture(page,label+"-source-after");
  for(const key of ["description","located","sources","landscape","skyClass"])assert.equal(after[key],before[key],key);
  return page;
}
try{
  let page=await pageAt("sky/detail/index");await state(page);
  if(stage==="browse"){
    assert.ok((await state(page)).description.endsWith("所选观测时刻 21:00"));
    await time(page,"00:00");await select(page,"织女星");
    assert.ok((await state(page)).located.startsWith("Vega"));await zoom(page,25);
    await capture(page,"vega-25-constellations");
    await zoom(page,267.8);await capture(page,"all-sky");
    await zoom(page,25);await capture(page,"vega-25-return");
    const off=await buttons(page,".sky-view-mode__button","关闭星座连线");assert.ok(off);await off.tap();
    await capture(page,"vega-25-no-constellations");
    const on=await buttons(page,".sky-view-mode__button","开启星座连线");assert.ok(on);await on.tap();
    await capture(page,"vega-25-restored");
    await select(page,"M 31");await zoom(page,3);
    await until(()=>state(page),value=>value.sources.includes("AllWISE W3")&&!value.sources.includes("载入")&&!value.sources.includes("失败"),"W3_not_presented");
    await capture(page,"m31-current-api");
  }else if(stage==="imagery"){
    assert.ok((await state(page)).located.startsWith("M 31"));
    page=await sourceBack(page,"M:31","m31",["AllWISE W3","ODbL-1.0","未测量源数据有效覆盖比例"]);
    await select(page,"月球");await zoom(page,1);
    await until(()=>state(page),value=>value.sources.includes("Clementine")&&!value.sources.includes("载入")&&!value.sources.includes("失败"),"Moon_coverage_not_presented");
    page=await sourceBack(page,"SOLAR:MOON","moon",["Clementine","USGS","缺测"]);
  }else{
    assert.ok((await state(page)).located.startsWith("月球"));
    await (await element(page,".sky-located-object")).tap();await (await element(page,".sky-object-track")).tap();
    await time(page,"00:30");await capture(page,"moon-tracked-0030");
    const start=await buttons(page,".sky-view-mode__button","恢复手机方向跟随");assert.ok(start);await start.tap();
    await until(()=>buttons(page,".sky-view-mode__button","取消恢复手机跟随"),Boolean,"follow_intent_missing");
    const before=await state(page);assert.ok(before.description.includes("手动视角"));
    await program.navigateTo("/content/settings/index");await pageAt("content/settings/index");
    await program.navigateBack();page=await pageAt("sky/detail/index");
    const cancel=await until(()=>buttons(page,".sky-view-mode__button","取消恢复手机跟随"),Boolean,"follow_intent_lost");await cancel.tap();
    assert.deepEqual(await state(page),before);await capture(page,"foreground-manual-recovered");
    await program.navigateBack();const map=await pageAt("pages/map/index");
    assert.equal(await (await element(map,".spot-panel__title")).text(),"示例观星点");
    await (await element(map,".spot-panel__action--cloud")).tap();page=await pageAt("sky/detail/index");
    const defer=await page.$(".sky-orientation-recovery__defer");if(defer)await defer.tap();
    await until(()=>state(page),value=>value.description.endsWith("所选观测时刻 00:30"),"Map_reentry_time_not_restored");
    await capture(page,"map-reentry");
  }
  await fixedCandidate();
  const result={scope:"Clean fixed local DevTools development journey, explicit memory/weather fixture BFF; not physical-device, OS-background, calibration, performance or final acceptance",
    stage,port:9434,candidateHash:candidate.fingerprint.sha256,temporaryDiagnostics:false,events,final:await state(page)};
  await writeFile(path.join(root,`experience-combined-clean-${stage}-2026-09-28.json`),JSON.stringify(result,null,2)+"\n",{flag:"wx"});
  console.log(JSON.stringify({...result,events:events.map(v=>v.sourceReference?v:{filename:v.filename,description:v.description,located:v.located,sources:v.sources,sha256:v.sha256})}));
}finally{program.disconnect();}
