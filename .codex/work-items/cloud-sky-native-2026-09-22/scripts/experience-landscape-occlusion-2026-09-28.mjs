// Current real Rastaban location + actual native Canvas handlers, without a
// mock catalog/pose/API or private-state mutation. This is DevTools evidence.
import sdk from "miniprogram-automator";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { boundedWechatConnect, boundWechatProtocol } from "../../../../tools/miniapp/wechat-protocol.mjs";
const root=path.resolve(".codex/work-items/cloud-sky-native-2026-09-22/evidence");
const runTag=process.argv[2]??"r3";
if(!/^r[1-9][0-9]*$/.test(runTag))throw Error("invalid_run_tag");
const expectedMarker=process.argv[3]??"LAND2SEP28",port=Number(process.argv[4]??9432);
const ports={LAND0928:9431,LAND2SEP28:9432};if(ports[expectedMarker]!==port)throw Error("unexpected_task_candidate");
const program=await boundedWechatConnect(()=>sdk.launcher.connectTool({wsEndpoint:`ws://127.0.0.1:${port}`}),5000);
boundWechatProtocol(program,5000);
async function until(read,accepts,label){
  const end=Date.now()+8000;
  while(Date.now()<end){const value=await read();if(accepts(value))return value;await new Promise(resolve=>setTimeout(resolve,100));}
  throw Error(label);
}
async function state(page){
  const marker=await (await page.$(".sky-zoom-status"))?.outerWxml()??"";assert.ok(marker.includes(expectedMarker));
  const description=await (await page.$(".sky-orientation-canvas"))?.attribute("aria-label")??"";
  assert.ok(description.includes("已呈现")&&description.includes("2026-09-28T16:00:00.000Z"));
  const located=await (await page.$(".sky-located-object"))?.outerWxml()??"";
  return {description,locatedLabel:located.match(/aria-label="([^"]+)"/)?.[1]??null,
    locatedStyle:located.match(/style="([^"]+)"/)?.[1]??null,
    modal:Boolean(await page.$(".sky-object-modal")),choices:Boolean(await page.$(".sky-object-choice"))};
}
async function capture(page,name){
  name=name.replace(".png",`-${runTag}.png`);
  const before=await state(page),bytes=Buffer.from(await program.screenshot(),"base64"),after=await state(page);
  assert.deepEqual(after,before);
  await writeFile(path.join(root,name),bytes,{flag:"wx"});
  return {name,bytes:bytes.length,sha256:createHash("sha256").update(bytes).digest("hex"),...before};
}
try {
  const page=await program.currentPage();assert.equal(page?.path,"sky/detail/index");
  // Recover the task's prior partial public attempt. Do not replace or delete
  // its valid intermediate captures after a scenario assertion fails.
  if(await page.$(".sky-object-choice__cancel"))await (await page.$(".sky-object-choice__cancel")).tap();
  if(await page.$(".sky-object-modal__close"))await (await page.$(".sky-object-modal__close")).tap();
  if(!(await state(page)).locatedLabel?.includes("模拟地景遮挡")) {
    await (await page.$(".sky-view-mode__landscape")).tap();
    await until(async()=>(await state(page)).locatedLabel,text=>text?.includes("模拟地景遮挡"),"initial_on_not_painted");
  }
  const before=await state(page);assert.ok(before.locatedLabel?.startsWith("Rastaban")&&before.locatedLabel.includes("模拟地景遮挡"));
  assert.ok(!before.modal&&!before.choices);
  const x=Number(before.locatedStyle?.match(/left: ([0-9.e+-]+)px/)?.[1]);
  const y=Number(before.locatedStyle?.match(/top: ([0-9.e+-]+)px/)?.[1]);assert.ok(Number.isFinite(x)&&Number.isFinite(y));
  const canvas=await page.$("#spot-night-sky-scene");
  async function tap(){
    const touches=[{identifier:0,x,y,clientX:x,clientY:y}];
    await canvas.touchstart({touches,changedTouches:touches});
    await canvas.touchend({touches:[],changedTouches:touches});
    await new Promise(resolve=>setTimeout(resolve,150));
  }
  const covered=await capture(page,"experience-landscape-rastaban-covered-native-2026-09-28.png");
  await tap();const coveredTap=await state(page);assert.ok(!coveredTap.modal&&!coveredTap.choices,"hidden star opened a Canvas choice");
  const toggle=await page.$(".sky-view-mode__landscape");await toggle.tap();
  await until(async()=>(await state(page)).locatedLabel,text=>text?.startsWith("Rastaban")&&!text.includes("模拟地景遮挡"),"off_not_painted");
  const open=await capture(page,"experience-landscape-rastaban-open-native-2026-09-28.png");
  await tap();
  await until(async()=>Boolean(await page.$(".sky-object-modal"))||Boolean(await page.$(".sky-object-choice")),value=>value,"visible_star_not_selected");
  const choice=await page.$(".sky-object-choice");
  const overlap=choice?await choice.text():null;
  if(choice){
    const wanted=[];
    for(const row of await page.$$(".sky-object-choice__row"))if((await row.text()).includes("HR 6536"))wanted.push(row);
    assert.equal(wanted.length,1,"the real same-frame overlap list lost Rastaban");
    await wanted[0].tap();
  }
  const information=await until(()=>page.$(".sky-object-modal"),element=>Boolean(element),"visible_star_not_selected");
  const informationText=await information.outerWxml();assert.ok(informationText.includes("HR 6536"));
  const visibleTap={modal:true,reference:"HR:6536",overlap,title:await (await page.$(".sky-object-modal__title"))?.text()??null};
  await (await page.$(".sky-object-modal__close")).tap();
  await until(()=>page.$(".sky-object-modal"),element=>!element,"information_not_closed");
  await toggle.tap();
  await until(async()=>(await state(page)).locatedLabel,text=>text?.includes("模拟地景遮挡"),"on_not_painted");
  const restored=await capture(page,"experience-landscape-rastaban-restored-native-2026-09-28.png");
  assert.equal(restored.description,covered.description);assert.equal(restored.locatedStyle,covered.locatedStyle);
  assert.equal((await program.currentPage())?.pageId,page.pageId);
  const result={scope:"Actual official DevTools Canvas handlers and UI; not phone composition or device acceptance",
    marker:expectedMarker,port,runTag,covered,coveredTap,open,visibleTap,restored};
  await writeFile(path.join(root,`experience-landscape-occlusion-2026-09-28-${runTag}.json`),JSON.stringify(result,null,2)+"\n",{flag:"wx"});
  console.log(JSON.stringify(result));
} finally {program.disconnect();}
