import sdk from "miniprogram-automator";
import assert from "node:assert/strict";
import {writeFile} from "node:fs/promises";
import path from "node:path";
import {boundedWechatConnect,boundWechatProtocol} from "../../../../tools/miniapp/wechat-protocol.mjs";
const root=path.resolve(".codex/work-items/cloud-sky-native-2026-09-22/evidence");
const run=process.argv[2]??"r2";assert.ok(/^r[1-9][0-9]*$/.test(run));
const program=await boundedWechatConnect(()=>sdk.launcher.connectTool({wsEndpoint:"ws://127.0.0.1:9433"}),5000);boundWechatProtocol(program,5000);
async function until(read,accept,label){const end=Date.now()+10000;while(Date.now()<end){const value=await read();
  if(accept(value))return value;await new Promise(resolve=>setTimeout(resolve,100));}throw Error(label);}
async function state(page){assert.ok((await (await page.$(".sky-zoom-status"))?.text()??"").includes("IMGSEP28"));
  return {description:await (await page.$(".sky-orientation-canvas"))?.attribute("aria-label"),
    located:await (await page.$(".sky-located-object"))?.attribute("aria-label"),sources:await (await page.$(".sky-image-status-group"))?.text()};}
async function capture(page,name){const before=await state(page),bytes=Buffer.from(await program.screenshot(),"base64");
  assert.deepEqual(await state(page),before);await writeFile(path.join(root,name),bytes,{flag:"wx"});return before;}
try {
  let page=await program.currentPage();assert.equal(page?.path,"sky/detail/index");
  if(await page.$(".sky-object-modal__close"))await (await page.$(".sky-object-modal__close")).tap();
  const start=await state(page);assert.ok(start.description.includes("0.05 度")&&start.description.includes("2026-09-28T22:30:00.000Z"));
  if(start.located.includes("模拟地景遮挡"))await (await page.$(".sky-view-mode__landscape")).tap();
  await until(()=>state(page),value=>value.sources?.includes("Sloan Digital Sky Survey"),"optical_not_presented");
  const before=await capture(page,`experience-imagery-source-before-native-2026-09-28-${run}.png`);
  await (await page.$(".sky-located-object")).tap();
  const modal=await until(()=>page.$(".sky-object-modal"),Boolean,"modal_missing");
  assert.ok((await (await page.$(".sky-object-modal__kind"))?.text()??"").includes("M 51"));
  let sourceButton;
  await until(async()=>{for(const button of await modal.$$("button"))
    if((await button.attribute("aria-label"))==="查看天体资料来源与许可")return sourceButton=button;return null;},Boolean,"source_action_missing");
  await sourceButton.tap();
  const sourcePage=await until(()=>program.currentPage(),value=>value?.path==="sky/sources/index","source_route_missing");
  assert.equal(decodeURIComponent(String(sourcePage.query.reference)),"M:51");
  await until(async()=>await (await sourcePage.$("view"))?.text()??"",value=>
    value.includes("Sloan Digital Sky Survey")&&value.includes("CC BY 4.0"),"actual_optical_source_missing");
  await program.navigateBack();page=await until(()=>program.currentPage(),value=>value?.path==="sky/detail/index","sky_return_missing");
  if(await page.$(".sky-object-modal__close"))await (await page.$(".sky-object-modal__close")).tap();
  await until(()=>state(page),value=>value.sources?.includes("Sloan Digital Sky Survey"),"optical_return_not_presented");
  const after=await capture(page,`experience-imagery-source-after-native-2026-09-28-${run}.png`);
  assert.deepEqual(after,before,"source Back preserves current time/camera/object and image credit");
  const result={scope:"Actual official DevTools UI/source route/native image return; not phone evidence",marker:"IMGSEP28",port:9433,
    reference:"M:51",sourcePath:sourcePage.path,sourceOpticalCredit:true,sourceLicense:true,before,after};
  await writeFile(path.join(root,`experience-imagery-source-return-2026-09-28-${run}.json`),JSON.stringify(result,null,2)+"\n",{flag:"wx"});
  console.log(JSON.stringify(result));
}finally{program.disconnect();}
