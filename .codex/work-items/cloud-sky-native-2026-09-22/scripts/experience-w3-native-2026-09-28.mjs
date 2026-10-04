// Observe unchanged W3 images on the fenced combined native development build.
// Source metadata from the running 8787 predecessor is recorded separately.
import sdk from "miniprogram-automator";
import assert from "node:assert/strict";
import {readFile,writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import path from "node:path";
import {boundedWechatConnect,boundWechatProtocol} from "../../../../tools/miniapp/wechat-protocol.mjs";
const root=path.resolve(".codex/work-items/cloud-sky-native-2026-09-22/evidence");
const project=path.resolve("apps/wechat-miniapp/dist/weapp-check-sky-imagery-flow-0928");
const configuration=await readFile(path.join(project,"project.config.json"));
const program=await boundedWechatConnect(()=>sdk.launcher.connectTool({wsEndpoint:"ws://127.0.0.1:9433"}),5000);boundWechatProtocol(program,5000);
async function until(read,accept,label){const end=Date.now()+12000;while(Date.now()<end){const value=await read();
  if(accept(value))return value;await new Promise(resolve=>setTimeout(resolve,120));}throw Error(label);}
async function state(page){assert.ok((await (await page.$(".sky-zoom-status"))?.text()??"").includes("IMGSEP28"));
  assert.deepEqual(await readFile(path.join(project,"project.config.json")),configuration);
  return {description:await (await page.$(".sky-orientation-canvas"))?.attribute("aria-label"),
    located:await (await page.$(".sky-located-object"))?.attribute("aria-label"),
    sources:await (await page.$(".sky-image-status-group"))?.text()??"",
    landscape:await (await page.$(".sky-view-mode__landscape"))?.attribute("aria-label")};}
async function capture(page,label){const before=await state(page);const bytes=Buffer.from(await program.screenshot(),"base64");
  assert.deepEqual(await state(page),before);const name=`experience-w3-${label}-native-2026-09-28.png`;
  await writeFile(path.join(root,name),bytes,{flag:"wx"});return {...before,name,sha256:createHash("sha256").update(bytes).digest("hex"),bytes:bytes.length};}
async function time(page,value){if(!await page.$(".sky-orientation-time-ruler__track"))await (await page.$(".sky-control-dock__button--time")).tap();
  const track=await until(()=>page.$(".sky-orientation-time-ruler__track"),Boolean,"time_missing");
  const tick=[...(await track.outerWxml()).matchAll(/<button id="([^"]+)"[^>]*aria-label="([^"]+)"/g)].find(row=>row[2].startsWith(`${value}，`));assert.ok(tick);
  await (await page.$(`#${tick[1]}`)).tap();await until(()=>state(page),valueNow=>valueNow.description?.includes(`所选观测时刻 ${value}`),"time_not_presented");
  await until(async()=>await (await page.$(".sky-orientation-time-ruler__current-state"))?.text()??"",valueNow=>valueNow!=="保存中"&&valueNow!=="预览","time_not_settled");
  await (await page.$(".sky-control-dock__button--time")).tap();}
async function select(page,name){if(await page.$(".sky-object-modal__close"))await (await page.$(".sky-object-modal__close")).tap();
  const dock=await (await page.$(".sky-control-dock")).outerWxml();const button=dock.match(/<button id="([^"]+)"[^>]*>天体列表<\/button>/);assert.ok(button);
  await (await page.$(`#${button[1]}`)).tap();
  const input=await until(()=>page.$(".sky-object-search__input"),Boolean,"search_missing");await input.input(name);
  const row=await until(async()=>{for(const candidate of await page.$$(".sky-object-search__result"))if((await candidate.text()).includes(name))return candidate;},Boolean,"object_missing");
  await row.tap();await (await until(()=>page.$(".sky-object-locate"),Boolean,"locate_missing")).tap();
  await until(()=>state(page),value=>value.located?.startsWith(name),"identity_not_presented");}
async function zoom(page,target){const from=Number((await state(page)).description.match(/垂直视场 (\d+(?:\.\d+)?) 度/)?.[1]);assert.ok(Number.isFinite(from));
  const start=target>from?200:Math.min(50,358*Math.tan(target*Math.PI/720)/Math.tan(from*Math.PI/720));
  const end=start*Math.tan(from*Math.PI/720)/Math.tan(target*Math.PI/720);
  const touches=distance=>[0,1].map(identifier=>({identifier,x:195.2+(identifier===0?-1:1)*distance/2,y:420,
    clientX:195.2+(identifier===0?-1:1)*distance/2,clientY:420}));
  const canvas=await page.$("#spot-night-sky-scene");await canvas.touchstart({touches:touches(start),changedTouches:touches(start)});
  await canvas.touchmove({touches:touches(end),changedTouches:touches(end)});await canvas.touchend({touches:[],changedTouches:touches(end)});
  await until(()=>state(page),value=>Math.abs(Number(value.description.match(/垂直视场 (\d+(?:\.\d+)?) 度/)?.[1])-target)<.01,"zoom_not_presented");}
try{
  let page=await program.currentPage();assert.equal(page?.path,"sky/detail/index");await state(page);
  if((await state(page)).landscape.startsWith("关闭"))await (await page.$(".sky-view-mode__landscape")).tap();
  const cases=[];
  for(const [name,clock] of [["M 31","00:00"],["M 42","06:30"]]){
    await time(page,clock);await select(page,name);
    for(const fov of [10,3,1]){await zoom(page,fov);
      await until(()=>state(page),value=>value.sources.includes("AllWISE W3")&&!value.sources.includes("失败")&&!value.sources.includes("载入"),"W3_not_presented");
      // This delay allows pending decode; it does not assert a hidden loader level.
      await new Promise(resolve=>setTimeout(resolve,900));
      cases.push(await capture(page,`${name.replace(" ","-").toLowerCase()}-${fov}deg`));}
  }
  const before=await capture(page,"m-42-source-before");
  await (await page.$(".sky-located-object")).tap();const modal=await until(()=>page.$(".sky-object-modal"),Boolean,"modal_missing");
  assert.ok((await (await page.$(".sky-object-modal__kind"))?.text()??"").includes("M 42"));
  let sourceButton;await until(async()=>{for(const button of await modal.$$("button"))
    if(await button.attribute("aria-label")==="查看天体资料来源与许可")return sourceButton=button;},Boolean,"source_button_missing");
  await sourceButton.tap();const sourcePage=await until(()=>program.currentPage(),value=>value?.path==="sky/sources/index","source_route_missing");
  assert.equal(decodeURIComponent(String(sourcePage.query.reference)),"M:42");
  await until(async()=>await (await sourcePage.$("view"))?.text()??"",value=>value.includes("AllWISE W3")&&value.includes("ODbL-1.0"),"actual_W3_source_missing");
  await program.navigateBack();page=await until(()=>program.currentPage(),value=>value?.path==="sky/detail/index","sky_return_missing");
  if(await page.$(".sky-object-modal__close"))await (await page.$(".sky-object-modal__close")).tap();
  await until(()=>state(page),value=>value.sources.includes("AllWISE W3"),"returned_W3_missing");await new Promise(resolve=>setTimeout(resolve,600));
  const after=await capture(page,"m-42-source-after");
  for(const key of ["description","located","sources","landscape"])assert.equal(after[key],before[key],key);
  await zoom(page,45);await select(page,"M 51");
  if((await state(page)).landscape.startsWith("开启"))await (await page.$(".sky-view-mode__landscape")).tap();
  const result={scope:"Actual DevTools W3 image/identity/zoom/source Back; predecessor BFF metadata; not phone acceptance or precise astrometry",
    marker:"IMGSEP28",port:9433,cases,sourceBack:{reference:"M:42",before,after},final:await state(page)};
  await writeFile(path.join(root,"experience-w3-native-2026-09-28.json"),JSON.stringify(result,null,2)+"\n",{flag:"wx"});
  console.log(JSON.stringify(result));
}finally{program.disconnect();}
