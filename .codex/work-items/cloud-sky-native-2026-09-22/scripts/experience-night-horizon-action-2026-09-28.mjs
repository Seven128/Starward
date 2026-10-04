// Bounded composed-state actions for the fenced NIGHT0928 DevTools candidate.
import sdk from "miniprogram-automator";
import { boundedWechatConnect, boundWechatProtocol } from "../../../../tools/miniapp/wechat-protocol.mjs";
const [action,value,expectedMarker="NIGHT0928",portText="9428"] = process.argv.slice(2);
const ports={NIGHT0928:9428,SEARCH0928:9429,FLOW0928:9430,LAND0928:9431,LAND2SEP28:9432,IMGSEP28:9433};
const port=Number(portText);
if(ports[expectedMarker]!==port)throw new Error("unexpected_task_candidate");
if (!((action==="time"&&/^\d{2}:\d{2}$/.test(value)) ||
  (action==="zoom"&&Number(value)>0&&Number(value)<360) ||
  (action==="mode"&&["day","night","observation"].includes(value)))) throw new Error("invalid_action");
const program = await boundedWechatConnect(()=>sdk.launcher.connectTool({wsEndpoint:`ws://127.0.0.1:${port}`}),5000);
boundWechatProtocol(program,5000);
async function until(read,accepts,label) {
  const end=Date.now()+8000;
  while(Date.now()<end) {
    const result=await read(); if(accepts(result))return result;
    await new Promise(resolve=>setTimeout(resolve,150));
  }
  throw new Error(label);
}
async function skyPage() {
  const page=await until(()=>program.currentPage(),page=>page?.path==="sky/detail/index","unexpected_page");
  if (!(await (await page.$(".sky-zoom-status"))?.outerWxml()??"").includes(expectedMarker)) throw new Error("wrong_candidate");
  return page;
}
try {
  let page=await skyPage();
  if(action==="time") {
    if (!(await page.$(".sky-orientation-time-ruler__track"))) await (await page.$(".sky-control-dock__button--time")).tap();
    const track=await until(()=>page.$(".sky-orientation-time-ruler__track"),element=>Boolean(element),"time_panel_not_open");
    const wxml=await track.outerWxml();
    const tick=[...wxml.matchAll(/<button id="([^"]+)"[^>]*aria-label="([^"]+)"/g)].find(match=>match[2].startsWith(`${value}，`));
    if(!tick)throw new Error("time_tick_missing");
    await (await page.$(`#${tick[1]}`)).tap();
    await until(async()=>await (await page.$(".sky-orientation-canvas"))?.attribute("aria-label")??"",text=>text.includes(`所选观测时刻 ${value}`),"time_not_presented");
    await until(async()=>await (await page.$(".sky-orientation-time-ruler__current-state"))?.text()??"",text=>text!=="保存中"&&text!=="预览","time_not_settled");
    await (await page.$(".sky-control-dock__button--time")).tap();
  } else if(action==="zoom") {
    const description=await (await page.$(".sky-orientation-canvas")).attribute("aria-label");
    const from=Number(description.match(/垂直视场 (\d+(?:\.\d+)?) 度/)?.[1]);
    if(!Number.isFinite(from))throw new Error("unknown_current_fov");
    const target=Number(value);
    // Keep both fingers inside the real viewport, including dome→local.
    // An offscreen scripted spread is not a physical gesture or a pass.
    const start=target>from?200:Math.min(50,358*Math.tan(target*Math.PI/720)/Math.tan(from*Math.PI/720));
    const end=start*Math.tan(from*Math.PI/720)/Math.tan(target*Math.PI/720);
    const touches=distance=>[0,1].map(identifier=>({identifier,x:195.2+(identifier===0?-1:1)*distance/2,y:420,
      clientX:195.2+(identifier===0?-1:1)*distance/2,clientY:420}));
    const canvas=await page.$("#spot-night-sky-scene");
    await canvas.touchstart({touches:touches(start),changedTouches:touches(start)});
    await canvas.touchmove({touches:touches(end),changedTouches:touches(end)});
    await canvas.touchend({touches:[],changedTouches:touches(end)});
    await until(async()=>await (await page.$(".sky-orientation-canvas"))?.attribute("aria-label")??"",
      text=>Math.abs(Number(text.match(/垂直视场 (\d+(?:\.\d+)?) 度/)?.[1])-target)<.11,"zoom_not_presented");
  } else {
    await program.navigateTo("/content/settings/index");
    const settings=await until(()=>program.currentPage(),page=>page?.path==="content/settings/index","settings_not_open");
    const choice=await until(()=>settings.$(`#settings-mode-${value}`),element=>Boolean(element),"mode_choice_missing");
    const label=await choice.attribute("aria-label");
    if (!label.includes("当前已选")) await choice.tap();
    await until(async()=>await (await settings.$(".settings-display-mode-track"))?.attribute("class")??"",
      text=>text.includes(`settings-display-mode-track--${value}`),"mode_not_applied");
    await program.navigateBack();
    page=await skyPage();
  }
  const description=await until(async()=>await (await page.$(".sky-orientation-canvas"))?.attribute("aria-label")??"",
    text=>text.includes("已呈现")&&!text.includes("待绘制"),"scene_not_presented");
  const skyClass=await (await page.$(".sky-orientation-page")).attribute("class");
  await skyPage();
  console.log(JSON.stringify({scope:"development_observation",marker:expectedMarker,port,action,value,description,skyClass}));
} finally { program.disconnect(); }
