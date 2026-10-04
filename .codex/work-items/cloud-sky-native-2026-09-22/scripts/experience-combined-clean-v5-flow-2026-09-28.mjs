// Exact existing clean-v5: public controls and official SDK events. The ruler
// native scroll position exercises its real owner; this does not prove inertia,
// physical gestures, orientation, OS-background, or phone composition.
import sdk from "miniprogram-automator";
import assert from "node:assert/strict";
import path from "node:path";
import {readFile, writeFile, access} from "node:fs/promises";
import {createHash} from "node:crypto";
import {boundedWechatConnect, boundWechatProtocol} from "../../../../tools/miniapp/wechat-protocol.mjs";

const root=path.resolve("."), evidence=path.join(root,".codex/work-items/cloud-sky-native-2026-09-22/evidence");
const round=process.argv[2]??"r1";
assert.ok(["r1","r2","r3","r4","r5","r5-restore"].includes(round),"known bounded flow attempt");
const suffix=round==="r1"?"":"-"+round;
const destination=path.join(evidence,`experience-combined-clean-v5-flow${suffix}-2026-09-28.json`);
assert.ok(!await access(destination).then(()=>true,()=>false),"preserve actual flow evidence");
const candidate=JSON.parse(await readFile(path.join(evidence,"experience-combined-clean-v5-candidate-2026-09-28.json"),"utf8"));
const digest=value=>createHash("sha256").update(value).digest("hex");
async function fixed(){for(const file of candidate.fingerprint.files)
 assert.equal(digest(await readFile(path.join(root,candidate.bundle,file.path))),file.sha256,"candidate changed");}
await fixed();
const program=await boundedWechatConnect(()=>sdk.launcher.connectTool({wsEndpoint:"ws://127.0.0.1:9438"}),5000);
boundWechatProtocol(program);
const events=[];
async function until(read,accept,label){const deadline=Date.now()+12000;while(Date.now()<deadline){const value=await read();
 if(accept(value))return value;await new Promise(resolve=>setTimeout(resolve,120));}throw Error(label);}
const at=expected=>until(()=>program.currentPage(),page=>page?.path===expected,"page not ready");
const element=(page,selector)=>until(()=>page.$(selector),Boolean,"public control missing:"+selector);
async function state(page){return {description:await(await page.$(".sky-orientation-canvas"))?.attribute("aria-label")??"",
 located:await(await page.$(".sky-located-object"))?.attribute("aria-label")??null,
 locatedStyle:await(await page.$(".sky-located-object"))?.attribute("style")??null,
 tracking:await(await page.$(".sky-object-tracking-status"))?.text()??null,
 landscape:await(await page.$(".sky-view-mode__landscape"))?.attribute("aria-label")??null,
 skyClass:await(await page.$(".sky-orientation-page"))?.attribute("class")??null,
 modal:Boolean(await page.$(".sky-object-modal")),choices:Boolean(await page.$(".sky-object-choice")),
 list:Boolean(await page.$(".sky-object-search__input")),timePanel:Boolean(await page.$(".sky-orientation-time-ruler"))};}
async function record(page,label){const value=await state(page);assert.ok(value.description.includes("已呈现"));events.push({label,...value});console.log(JSON.stringify({event:label,description:value.description,tracking:value.tracking}));return value;}
async function capture(page,label){await new Promise(resolve=>setTimeout(resolve,600));const before=await state(page);
 assert.equal((await program.currentPage()).pageId,page.pageId);const bytes=Buffer.from(await program.screenshot(),"base64");
 assert.equal((await program.currentPage()).pageId,page.pageId);assert.deepEqual(await state(page),before);await fixed();
 const filename=`experience-combined-clean-v5-flow${suffix}-${label}-2026-09-28.png`;
 await writeFile(path.join(evidence,filename),bytes,{flag:"wx"});events.push({capture:label,filename,sha256:digest(bytes),state:before});return before;}
async function clockTick(page,label){return until(async()=>{
 const ticks=await page.$$(".sky-orientation-time-ruler__tick");
 for(let index=0;index<ticks.length;index++)if((await ticks[index].attribute("aria-label")??"").startsWith(label+"，"))return {tick:ticks[index],index};
 return null;
},Boolean,"clock tick not ready:"+label);}
async function clock(page,label){if(!await page.$(".sky-orientation-time-ruler"))await(await element(page,".sky-control-dock__button--time")).tap();
 const {tick}=await clockTick(page,label);
 await tick.tap();await until(()=>state(page),value=>value.description.endsWith("所选观测时刻 "+label),"clock not presented");
 await until(async()=>await(await page.$(".sky-orientation-time-ruler__current-state"))?.text()??"",value=>!value.includes("保存中")&&!value.includes("预览"),"clock not committed");
 await(await element(page,".sky-control-dock__button--time")).tap();}
async function context(page,expected){assert.ok(page.query.contextId,"context route missing");
 const response=await fetch(candidate.apiOrigin+"/v2/observation-contexts/"+encodeURIComponent(page.query.contextId),{signal:AbortSignal.timeout(8000)});
 assert.equal(response.status,200);const value=(await response.json()).data;assert.equal(value.selectedAtUtc,expected);
 return {selectedAtUtc:value.selectedAtUtc,localDate:value.localDate,timezone:value.timezone};}
async function zoom(page,target){const from=Number((await state(page)).description.match(/垂直视场 ([\d.]+) 度/)?.[1]);assert.ok(Number.isFinite(from));
 const ratio=Math.tan(from*Math.PI/720)/Math.tan(target*Math.PI/720),start=Math.min(220,358/ratio),end=start*ratio;
 const points=distance=>[0,1].map(identifier=>({identifier,x:195.2+(identifier?1:-1)*distance/2,y:420,clientX:195.2+(identifier?1:-1)*distance/2,clientY:420}));
 const canvas=await element(page,"#spot-night-sky-scene");await canvas.touchstart({touches:points(start),changedTouches:points(start)});
 await canvas.touchmove({touches:points(end),changedTouches:points(end)});await canvas.touchend({touches:[],changedTouches:points(end)});
 await until(()=>state(page),value=>Math.abs(Number(value.description.match(/垂直视场 ([\d.]+) 度/)?.[1])-target)<.11,"zoom not presented");}
async function sourceBack(page,label){const before=await capture(page,label+"-before");
 await(await element(page,".sky-located-object")).tap();
 await until(async()=>await(await page.$(".sky-object-modal__kind"))?.text()??"",value=>value.includes("HR 7001"),"wrong Vega modal identity");
 const modal=await element(page,".sky-object-modal");let sourceButton;
 for(const button of await modal.$$("button"))if((await button.attribute("aria-label")??"").startsWith("查看天体资料来源与许可")){sourceButton=button;break;}
 assert.ok(sourceButton);await sourceButton.tap();const sources=await at("sky/sources/index");
 assert.equal(decodeURIComponent(String(sources.query.reference)),"HR:7001");
 await until(async()=>await(await sources.$(".custom-nav__title"))?.text()??"",value=>value.includes("Vega"),"wrong source title identity");
 await until(async()=>await(await sources.$(".celestial-sources-content"))?.text()??"",value=>value.includes("BSC5P Bright Star Catalog")&&value.includes("HEASARC"),"actual stellar sources missing");
 events.push({label:label+"-sources",sourceReference:"HR:7001",catalogueSourceRendered:true});
 await program.navigateBack();const returned=await at("sky/detail/index");assert.equal(returned.pageId,page.pageId);
 if(await returned.$(".sky-object-modal__close"))await(await returned.$(".sky-object-modal__close")).tap();
 await until(()=>state(returned),value=>value.description===before.description&&value.tracking===before.tracking,"source return did not restore scene");
 assert.deepEqual(await state(returned),before);await capture(returned,label+"-after");return returned;}
async function selectCurrentVega(page){
 const dock=await element(page,".sky-control-dock");let listButton;
 for(const button of await dock.$$("button"))if((await button.text())==="天体列表"){listButton=button;break;}
 assert.ok(listButton,"object list entry missing");await listButton.tap();
 await(await element(page,".sky-object-search__input")).input("Vega");
 const result=await until(async()=>{const item=await page.$(".sky-object-search__result");return item&&(await item.text()).includes("Vega")?item:null;},Boolean,"current Vega search not ready");
 await result.tap();await until(async()=>await(await page.$(".sky-object-modal__kind"))?.text()??"",value=>value.includes("HR 7001"),"wrong restored Vega identity");
 await(await element(page,".sky-object-locate")).tap();
}

try{
 let page=await at("sky/detail/index");
 if(round==="r5-restore"){
  const previous=JSON.parse(await readFile(path.join(evidence,"experience-combined-clean-v5-flow-attempt-r5-2026-09-28.json"),"utf8"));
  assert.equal(previous.message,"public control missing:.sky-located-object");
  for(const label of ["tracked-preview-0100","tracked-preview-cancelled","tracked-committed-0030","tracked-all-sky","manual-pan-stopped-tracking","tracking-restarted"])
   assert.ok(previous.events.some(event=>event.label===label),"missing completed sequence:"+label);
  assert.equal(previous.events.find(event=>event.label==="uncommitted-preview-service")?.context.selectedAtUtc,"2026-09-28T16:00:00.000Z");
  assert.equal(previous.events.find(event=>event.label==="committed-service")?.context.selectedAtUtc,"2026-09-28T16:30:00.000Z");
  events.push(...previous.events,{label:"r5-observer-restoration-correction",attempt:"experience-combined-clean-v5-flow-attempt-r5-2026-09-28.json",reason:"Untracked old position is correctly withdrawn after time changes; restore through a fresh public search"});
  const resumed=await record(page,"restoration-resume-0000");
  assert.ok(resumed.description.includes("2026-09-28T16:00:00.000Z")&&resumed.description.includes("25.0 度"));
  assert.equal(resumed.tracking,null);assert.equal(resumed.modal,false);assert.equal(resumed.timePanel,false);
 }else{
 const initial=await record(page,"initial-vega-25-0000");
 assert.ok(initial.description.includes("2026-09-28T16:00:00.000Z")&&initial.description.includes("25.0 度"));
 assert.ok(initial.located?.startsWith("Vega"));assert.equal(initial.tracking,null);assert.equal(initial.modal,false);assert.equal(initial.timePanel,false);
 page=await sourceBack(page,"vega-0000");
 await(await element(page,".sky-located-object")).tap();await(await element(page,".sky-object-track")).tap();
 await until(()=>state(page),value=>value.tracking?.includes("跟踪中"),"tracking did not start");const tracked=await record(page,"tracked-vega-0000");
 await(await element(page,".sky-control-dock__button--time")).tap();
 const {index:previewIndex}=await clockTick(page,"01:00");
 const width=await program.evaluate(()=>wx.getSystemInfoSync().windowWidth), step=34*width/750;
 const viewport=await element(page,".sky-orientation-time-ruler__viewport"),touch={identifier:0,x:195.2,y:705,clientX:195.2,clientY:705};
 await viewport.touchstart({touches:[touch],changedTouches:[touch]});
 // A synthetic scroll event alone does not move the native viewport: its
 // subsequent real scroll event can restore the old offset. Move the actual
 // ScrollView while its public touch owner holds the preview interaction.
 await viewport.scrollTo(previewIndex*step,0);
 await until(async()=>await(await page.$(".sky-orientation-time-ruler__current-state"))?.text()??"",value=>value.includes("预览"),"preview not active");
 await until(()=>state(page),value=>value.description.includes("2026-09-28T17:00:00.000Z"),"preview frame not presented");
 await record(page,"tracked-preview-0100");events.push({label:"uncommitted-preview-service",context:await context(page,"2026-09-28T16:00:00.000Z")});
 await(await element(page,".sky-control-dock__button--time")).tap();
 await until(()=>state(page),value=>value.description===tracked.description&&value.tracking?.includes("跟踪中"),"preview cancel did not restore tracking");
 const cancelled=await record(page,"tracked-preview-cancelled");assert.equal(cancelled.located,tracked.located);assert.equal(cancelled.timePanel,false);
 await clock(page,"00:30");await until(()=>state(page),value=>value.tracking?.includes("跟踪中"),"tracking after commit missing");
 await record(page,"tracked-committed-0030");events.push({label:"committed-service",context:await context(page,"2026-09-28T16:30:00.000Z")});
 page=await sourceBack(page,"vega-tracked-0030");
 await zoom(page,267.8);const overview=await record(page,"tracked-all-sky");assert.ok(overview.tracking?.includes("全天总览中保留跟踪"));
 await zoom(page,25);await until(()=>state(page),value=>value.tracking?.includes("跟踪中"),"tracking detail not restored");
 await capture(page,"tracked-detail-return");
 const canvas=await element(page,"#spot-night-sky-scene"),start={identifier:0,x:200,y:410,clientX:200,clientY:410},end={identifier:0,x:235,y:435,clientX:235,clientY:435};
 await canvas.touchstart({touches:[start],changedTouches:[start]});await canvas.touchmove({touches:[end],changedTouches:[end]});
 await canvas.touchend({touches:[],changedTouches:[end]});await until(()=>state(page),value=>value.tracking===null,"manual pan did not stop tracking");
 await record(page,"manual-pan-stopped-tracking");
 await(await element(page,".sky-located-object")).tap();await(await element(page,".sky-object-track")).tap();
 await until(()=>state(page),value=>value.tracking?.includes("跟踪中"),"tracking restart failed");await record(page,"tracking-restarted");
 await(await element(page,".sky-object-tracking-stop")).tap();await clock(page,"00:00");
 }
 await selectCurrentVega(page);
 await until(()=>state(page),value=>value.description.includes("2026-09-28T16:00:00.000Z")&&value.description.includes("25.0 度")&&value.located?.startsWith("Vega")&&value.tracking===null&&!value.modal&&!value.timePanel,"final scene not restored");
 await record(page,"restored-vega-25-0000");await capture(page,"final-restored");events.push({label:"restored-service",context:await context(page,"2026-09-28T16:00:00.000Z")});await fixed();
 const result={scope:"Exact immutable clean-v5/9438, official SDK public controls/Canvas touch and native ruler scroll position, LOCAL/MEMORY_TEST/LOCAL_TEST readback; no physical gesture, sensor, OS-background, native memory/performance or final acceptance",candidateHash:candidate.fingerprint.sha256,events,final:await state(page),candidateFilesUnchanged:true};
 await writeFile(destination,JSON.stringify(result,null,2)+"\n",{flag:"wx"});
 console.log(JSON.stringify({events:events.length,final:result.final,candidateFilesUnchanged:true}));
}catch(error){await writeFile(path.join(evidence,`experience-combined-clean-v5-flow-attempt${suffix}-2026-09-28.json`),JSON.stringify({scope:"Partial SDK development attempt; completed events only",message:error.message,events},null,2)+"\n",{flag:"wx"});throw error;}
finally{program.disconnect();}
