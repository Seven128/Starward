// Public WEAPP browse/layer inputs plus real file readback. Encoded file bytes
// and declared RGBA sizes are not a measurement of native/GPU allocations.
import assert from "node:assert/strict";
import sdk from "miniprogram-automator";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { boundedWechatConnect, boundWechatProtocol } from "../../../../tools/miniapp/wechat-protocol.mjs";
const root=path.resolve("."),evidence=path.join(root,".codex/work-items/cloud-sky-native-2026-09-22/evidence");
const destination=path.join(evidence,"experience-working-clean-v5-native-2026-09-28.json");
assert.ok(!await fs.access(destination).then(()=>true,()=>false),"preserve native evidence");
const candidate=JSON.parse(await fs.readFile(path.join(evidence,"experience-combined-clean-v5-candidate-2026-09-28.json"),"utf8"));
const baseline=JSON.parse(await fs.readFile(path.join(evidence,"experience-working-v5-native-file-baseline-2026-09-28.json"),"utf8"));
const oldNames=new Set(baseline.files.map(file=>file.name));
async function identity(){for(const file of candidate.fingerprint.files)
  assert.equal(createHash("sha256").update(await fs.readFile(path.join(root,candidate.bundle,file.path))).digest("hex"),file.sha256,"candidate changed");}
await identity();
const program=await boundedWechatConnect(()=>sdk.launcher.connectTool({wsEndpoint:"ws://127.0.0.1:9438"}),5000);boundWechatProtocol(program,5000);
async function until(read,accept,label){const deadline=Date.now()+12000;while(Date.now()<deadline){const value=await read();if(accept(value))return value;
  await new Promise(resolve=>setTimeout(resolve,120));}throw Error(label);}
async function inventory(){
  const files=await program.evaluate(function(){
    const manager=wx.getFileSystemManager();
    return manager.readdirSync(wx.env.USER_DATA_PATH).filter(name=>name.startsWith("sky-art-")||name.startsWith("deep-sky-")).map(name=>{
      const file=wx.env.USER_DATA_PATH+"/"+name,raw=manager.statSync(file),stat=raw.stats||raw;let width=null,height=null;
      try{const bytes=new Uint8Array(manager.readFileSync(file));
        if(bytes[0]===137&&bytes[1]===80&&bytes.length>=24){width=((bytes[16]*256+bytes[17])*256+bytes[18])*256+bytes[19];height=((bytes[20]*256+bytes[21])*256+bytes[22])*256+bytes[23];}
        else if(bytes[0]===255&&bytes[1]===216){let at=2;while(at+3<bytes.length){if(bytes[at]!==255)break;
          while(bytes[at]===255)at++;const marker=bytes[at++];if(marker===217||marker===218)break;
          if(marker===216||marker===1||(marker>=208&&marker<=215))continue;
          const length=bytes[at]*256+bytes[at+1];if(length<2||at+length>bytes.length)break;
          if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)){height=bytes[at+3]*256+bytes[at+4];width=bytes[at+5]*256+bytes[at+6];break;}at+=length;}}
      }catch{}
      return {name,bytes:Number(stat.size)||0,width,height};
    });
  });
  const added=files.filter(file=>!oldNames.has(file.name));
  return {baselinePresent:files.filter(file=>oldNames.has(file.name)).length,count:added.length,encodedBytes:added.reduce((sum,file)=>sum+file.bytes,0),
    declaredRgbaBytes:added.reduce((sum,file)=>sum+(file.width&&file.height?file.width*file.height*4:0),0),
    dimensionsUnknown:added.filter(file=>!file.width||!file.height).length,
    skyArtwork:added.filter(file=>file.name.startsWith("sky-art-")).length,
    deepSky:added.filter(file=>file.name.startsWith("deep-sky-")).length,files:added};
}
async function state(page){return {description:await (await page.$(".sky-orientation-canvas"))?.attribute("aria-label")??"",
  located:await (await page.$(".sky-located-object"))?.attribute("aria-label")??null,
  sources:await (await page.$(".sky-image-status-group"))?.text()??"",
  modal:Boolean(await page.$(".sky-object-modal")),choices:Boolean(await page.$(".sky-object-choice")),
  list:Boolean(await page.$(".sky-object-search__input"))};}
async function select(page,name){const dock=await (await page.$(".sky-control-dock")).outerWxml();
  const button=dock.match(/<button id="([^"]+)"[^>]*>天体列表<\/button>/);assert.ok(button);await(await page.$("#"+button[1])).tap();
  await(await until(()=>page.$(".sky-object-search__input"),Boolean,"search missing")).input(name);
  const row=await until(async()=>{for(const row of await page.$$(".sky-object-search__result"))if((await row.text()).includes(name))return row;},Boolean,"result missing");
  await row.tap();await(await until(()=>page.$(".sky-object-locate"),Boolean,"locate missing")).tap();
  await until(()=>state(page),value=>value.located?.includes("Vega"),"Vega not located");}
async function zoom(page,target){const initial=Number((await state(page)).description.match(/垂直视场 ([\d.]+) 度/)?.[1]);
  assert.ok(Number.isFinite(initial));const ratio=Math.tan(initial*Math.PI/720)/Math.tan(target*Math.PI/720),start=Math.min(220,358/ratio),end=start*ratio;
  const touches=distance=>[0,1].map(identifier=>({identifier,x:195.2+(identifier?1:-1)*distance/2,y:420,clientX:195.2+(identifier?1:-1)*distance/2,clientY:420}));
  const canvas=await page.$("#spot-night-sky-scene");await canvas.touchstart({touches:touches(start),changedTouches:touches(start)});
  await canvas.touchmove({touches:touches(end),changedTouches:touches(end)});await canvas.touchend({touches:[],changedTouches:touches(end)});
  await until(()=>state(page),value=>Math.abs(Number(value.description.match(/垂直视场 ([\d.]+) 度/)?.[1])-target)<(target<1?.011:.11),"zoom not presented");}
async function toggle(page,prefix){const buttons=await page.$$(".sky-view-mode__button");
  for(const button of buttons)if((await button.attribute("aria-label")??"").startsWith(prefix)){await button.tap();return;}throw Error("public layer control missing");}
try{
  const page=await program.currentPage();assert.equal(page.path,"sky/detail/index");
  const initial=await state(page);assert.ok(initial.description.includes("2026-09-28T16:00:00.000Z"));
  await select(page,"Vega");const rows=[];
  async function record(label){await new Promise(resolve=>setTimeout(resolve,700));const visible=await state(page),files=await inventory();
    assert.ok(visible.description.includes("已呈现")&&visible.description.includes("2026-09-28T16:00:00.000Z"));
    assert.equal(visible.modal,false);assert.equal(visible.choices,false);assert.equal(visible.list,false);
    assert.equal(files.baselinePresent,baseline.files.length,"historical candidates must keep their files");
    rows.push({label,...visible,files});}
  for(let cycle=1;cycle<=3;cycle++){
    for(const fov of [.05,1,5,25,39.9,85,267.8]){await zoom(page,fov);await record(`cycle-${cycle}-fov-${fov}`);}
    await toggle(page,"开启历史 W3");await record(`cycle-${cycle}-all-sky-w3-on`);
    await toggle(page,"关闭历史 W3");await record(`cycle-${cycle}-all-sky-w3-off`);
    await zoom(page,25);await toggle(page,"关闭星座连线");await record(`cycle-${cycle}-detail-constellations-off`);
    await toggle(page,"开启星座连线");await record(`cycle-${cycle}-detail-constellations-on`);
  }
  const beforeHide=await state(page),size=await(await page.$("#spot-night-sky-scene")).size();
  await program.navigateTo("/content/settings/index");await until(()=>program.currentPage(),value=>value.path==="content/settings/index","settings missing");
  const hidden=await until(inventory,value=>value.skyArtwork===0,"live Canvas files remain after hide");
  await program.navigateBack();await until(()=>program.currentPage(),value=>value.pageId===page.pageId,"page identity changed");
  await until(()=>state(page),value=>JSON.stringify(value)===JSON.stringify(beforeHide),"browse context did not restore");
  await record("after-hide-show");assert.deepEqual(await(await page.$("#spot-night-sky-scene")).size(),size);await identity();
  const result={scope:"Exact CLI-bound clean-v5/9438; official SDK public browse/layer inputs and real filesystem; header-derived RGBA sizes are estimates, not live bitmap/GPU peak, phone FPS or settled acceptance",
    candidateHash:candidate.fingerprint.sha256,canvasSize:size,initial,baselineFiles:baseline.files.length,rows,
    hidden,restoredSamePage:true,restoredSameScene:true,candidateFilesUnchanged:true};
  await fs.writeFile(destination,JSON.stringify(result,null,2)+"\n",{flag:"wx"});
  console.log(JSON.stringify({scope:result.scope,rows:rows.length,peakEncodedBytes:Math.max(...rows.map(row=>row.files.encodedBytes)),
    peakDeclaredRgbaBytes:Math.max(...rows.map(row=>row.files.declaredRgbaBytes)),hiddenFiles:hidden.count,final:rows.at(-1),candidateFilesUnchanged:true}));
}finally{await program.disconnect();}
