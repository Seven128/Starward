// Compare actual output at exactly restored scale; a rounded ARIA FOV is
// suitable for user readout, but cannot reconstruct an inverse pinch ratio.
import sdk from "miniprogram-automator";
import assert from "node:assert/strict";
import path from "node:path";
import {readFile,writeFile,access} from "node:fs/promises";
import {createHash} from "node:crypto";
import {PNG} from "pngjs";
import {boundedWechatConnect,boundWechatProtocol} from "../../../../tools/miniapp/wechat-protocol.mjs";

const root=path.resolve("."),evidence=path.join(root,".codex/work-items/cloud-sky-native-2026-09-22/evidence");
const output=path.join(evidence,"experience-combined-clean-v5-exact-zoom-2026-09-28.json");
assert.ok(!await access(output).then(()=>true,()=>false),"preserve exact-scale observation");
const candidate=JSON.parse(await readFile(path.join(evidence,"experience-combined-clean-v5-candidate-2026-09-28.json"),"utf8"));
const digest=bytes=>createHash("sha256").update(bytes).digest("hex");
async function fixed(){for(const file of candidate.fingerprint.files)assert.equal(digest(await readFile(path.join(root,candidate.bundle,file.path))),file.sha256);}
await fixed();
const program=await boundedWechatConnect(()=>sdk.launcher.connectTool({wsEndpoint:"ws://127.0.0.1:9438"}),5000);boundWechatProtocol(program);
const events=[];
async function until(read,accept,label){const end=Date.now()+12000;while(Date.now()<end){const value=await read();if(accept(value))return value;await new Promise(resolve=>setTimeout(resolve,120));}throw Error(label);}
const page=await program.currentPage();assert.equal(page.path,"sky/detail/index");
const element=selector=>until(()=>page.$(selector),Boolean,"missing public control:"+selector);
async function state(){return {description:await(await element(".sky-orientation-canvas")).attribute("aria-label"),
 located:await(await page.$(".sky-located-object"))?.attribute("aria-label")??null,
 locatedStyle:await(await page.$(".sky-located-object"))?.attribute("style")??null,
 tracking:await(await page.$(".sky-object-tracking-status"))?.text()??null};}
async function pinch(from,to){const ratio=Math.tan(from*Math.PI/720)/Math.tan(to*Math.PI/720),start=Math.min(220,358/ratio),end=start*ratio;
 const points=d=>[0,1].map(identifier=>({identifier,clientX:195.2+(identifier?1:-1)*d/2,clientY:420}));
 const canvas=await element("#spot-night-sky-scene");await canvas.touchstart({touches:points(start),changeTouches:points(start)});
 await canvas.touchmove({touches:points(end),changeTouches:points(end)});await canvas.touchend({touches:[],changeTouches:points(end)});
 events.push({action:"public pinch",from,toRequested:to,startSeparation:start,endSeparation:end});}
async function selectVega(){const dock=await element(".sky-control-dock");let button;
 for(const item of await dock.$$("button"))if(await item.text()==="天体列表"){button=item;break;}assert.ok(button);await button.tap();
 await(await element(".sky-object-search__input")).input("Vega");
 const item=await until(async()=>{const item=await page.$(".sky-object-search__result");return item&&(await item.text()).includes("Vega")?item:null;},Boolean,"current Vega missing");
 await item.tap();await until(async()=>await(await page.$(".sky-object-modal__kind"))?.text()??"",v=>v.includes("HR 7001"),"wrong identity");
 await(await element(".sky-object-locate")).tap();await until(state,v=>v.description.includes("45.0 度")&&v.located?.startsWith("Vega"),"public locate did not canonicalize scale");}
async function capture(label){await new Promise(resolve=>setTimeout(resolve,1400));const before=await state();
 const bytes=Buffer.from(await program.screenshot(),"base64");assert.equal((await program.currentPage()).pageId,page.pageId);assert.deepEqual(await state(),before);await fixed();
 const filename=`experience-combined-clean-v5-exact-zoom-${label}-2026-09-28.png`;await writeFile(path.join(evidence,filename),bytes,{flag:"wx"});
 events.push({capture:label,filename,sha256:digest(bytes),state:before});return PNG.sync.read(bytes);}
try{
 const initial=await state();assert.ok(initial.description.includes("2026-09-28T16:00:00.000Z")&&initial.description.includes("25.0 度"));assert.equal(initial.tracking,null);
 // A public locate clamps any wider view to the actual canonical 45 degrees;
 // this establishes known input without reading or writing private state.
 await pinch(25,85);await until(state,v=>Number(v.description.match(/垂直视场 ([\d.]+) 度/)?.[1])>45,"wider view missing");
 await selectVega();await pinch(45,25);await until(state,v=>v.description.includes("25.0 度"),"known 25 degree scale missing");
 await(await element(".sky-located-object")).tap();await(await element(".sky-object-track")).tap();await until(state,v=>v.tracking?.includes("跟踪中"),"tracking missing");
 const metrics=await program.evaluate(function(){return new Promise(resolve=>wx.createSelectorQuery()
  .select("#spot-night-sky-scene").boundingClientRect().select("#sky-bottom-controls").boundingClientRect()
  .select(".sky-orientation-back-layer").boundingClientRect().select(".sky-orientation-notification").boundingClientRect()
  .exec(rows=>resolve({canvas:rows[0],dock:rows[1],back:rows[2],notification:rows[3],capsule:wx.getMenuButtonBoundingClientRect(),screenHeight:wx.getSystemInfoSync().screenHeight})));});
 const {canvas,dock,back,notification,capsule}=metrics;
 const insets={top:Math.max(0,Math.max(canvas.top,back.bottom,notification?.bottom??0,capsule.bottom)-canvas.top+8),bottom:Math.max(0,canvas.bottom-dock.top+8)};
 const shortSide=Math.min(canvas.width,canvas.height-insets.top-insets.bottom);assert.ok(shortSide>0);
 const maximum=720/Math.PI*Math.atan(canvas.height/(shortSide*.92));
 const before=await capture("before");await pinch(25,300);
 await until(state,v=>v.description.includes(maximum.toFixed(1)+" 度")&&v.tracking?.includes("全天总览中保留跟踪"),"full actual dome missing");
 await capture("all-sky");await pinch(maximum,25);
 await until(state,v=>v.description.includes("25.0 度")&&v.tracking?.includes("跟踪中"),"detail return missing");
 const after=await capture("after");assert.equal(after.width,before.width);assert.equal(after.height,before.height);
 const crop={x:4,y:Math.ceil(capsule.bottom*before.height/metrics.screenHeight)+4,right:before.width-4,bottom:before.height-15};
 let skyChanged=0,maxSkyChannelDelta=0;
 for(let y=crop.y;y<crop.bottom;y++)for(let x=crop.x;x<crop.right;x++){const offset=(y*before.width+x)*4;let delta=0;
  for(let c=0;c<4;c++)delta=Math.max(delta,Math.abs(before.data[offset+c]-after.data[offset+c]));if(delta)skyChanged++;maxSkyChannelDelta=Math.max(maxSkyChannelDelta,delta);}
 const result={scope:"Exact clean-v5 public locate canonical scale and native Canvas pinch; same actual 25 degree frame/UTC/identity, public viewport-derived full dome. Actual PNG comparison; no sensor, physical gesture, phone composition, resource or performance acceptance",candidateHash:candidate.fingerprint.sha256,metrics,insets,fullDomeFov:maximum,events,crop,skyChanged,maxSkyChannelDelta,candidateFilesUnchanged:true};
 await writeFile(output,JSON.stringify(result,null,2)+"\n",{flag:"wx"});console.log(JSON.stringify({fullDomeFov:maximum,insets,crop,skyChanged,maxSkyChannelDelta}));
 assert.equal(skyChanged,0,"same exact-scale sky output changed across full-dome return");
}finally{if(await page.$(".sky-object-tracking-stop"))await(await page.$(".sky-object-tracking-stop")).tap();program.disconnect();}
