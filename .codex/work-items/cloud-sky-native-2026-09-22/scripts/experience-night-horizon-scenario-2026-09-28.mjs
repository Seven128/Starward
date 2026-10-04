// Reproduce the public-spot midnight/Vega/85-degree scene through official
// UI/Canvas handlers on the task-specific DevTools port. No private-state edits.
import sdk from "miniprogram-automator";
import { boundedWechatConnect, boundWechatProtocol } from "../../../../tools/miniapp/wechat-protocol.mjs";

const expectedMarker = process.argv[2] ?? "NIGHT0928";
const port = Number(process.argv[3] ?? 9428);
const ports = { NIGHT0928: 9428, SEARCH0928: 9429, FLOW0928: 9430, LAND0928: 9431, LAND2SEP28:9432, IMGSEP28:9433 };
if (ports[expectedMarker] !== port) throw new Error("unexpected_task_candidate");
const program = await boundedWechatConnect(() => sdk.launcher.connectTool({ wsEndpoint: `ws://127.0.0.1:${port}` }), 5000);
boundWechatProtocol(program, 5000);
async function until(read, accepts, label) {
  const end = Date.now()+8000;
  while (Date.now()<end) {
    const value = await read();
    if (accepts(value)) return value;
    await new Promise(resolve=>setTimeout(resolve,150));
  }
  throw new Error(label);
}
const pageAt = expected => until(()=>program.currentPage(),page=>page?.path===expected,"unexpected_page");
const element = (page,selector) => until(()=>page.$(selector),value=>Boolean(value),"missing_element");
try {
  let page = await pageAt("pages/map/index");
  await (await element(page,".map-search-entry")).tap();
  page = await pageAt("spot/search/index");
  await (await element(page,".spot-search-field__input")).input("示例观星点");
  const suggestion = await element(page,".spot-search-suggestion");
  if (!(await suggestion.outerWxml()).includes("示例观星点")) throw new Error("wrong_public_spot");
  await suggestion.tap();
  page = await pageAt("pages/map/index");
  await until(async()=>await (await element(page,".spot-panel__title")).text(),value=>value==="示例观星点","spot_not_ready");
  await (await element(page,".spot-panel__action--cloud")).tap();
  page = await pageAt("sky/detail/index");
  await (await element(page,".sky-orientation-recovery__defer")).tap();
  const marker = await (await element(page,".sky-zoom-status")).outerWxml();
  if (!marker.includes(expectedMarker)) throw new Error("wrong_candidate");
  await (await element(page,".sky-control-dock__button--time")).tap();
  const track = await (await element(page,".sky-orientation-time-ruler__track")).outerWxml();
  const tick = [...track.matchAll(/<button id="([^"]+)"[^>]*aria-label="([^"]+)"/g)].find(match=>match[2].startsWith("00:00，"));
  if (!tick) throw new Error("midnight_tick_missing");
  await (await element(page,`#${tick[1]}`)).tap();
  await until(async()=>await (await element(page,".sky-orientation-canvas")).attribute("aria-label"),value=>value.includes("2026-09-28T16:00:00.000Z"),"midnight_not_presented");
  await (await element(page,".sky-control-dock__button--time")).tap();
  const dock = await (await element(page,".sky-control-dock")).outerWxml();
  const list = dock.match(/<button id="([^"]+)"[^>]*>天体列表<\/button>/);
  if (!list) throw new Error("list_button_missing");
  await (await element(page,`#${list[1]}`)).tap();
  await (await element(page,".sky-object-search__input")).input("织女星");
  const result = await until(async()=>{
    const row = await page.$(".sky-object-search__result");
    return row && (await row.outerWxml()).includes("HR 7001") ? row : null;
  },value=>Boolean(value),"vega_search_not_ready");
  await result.tap();
  await (await element(page,".sky-object-locate")).tap();
  await until(async()=>await (await element(page,".sky-located-object")).attribute("aria-label"),value=>value.startsWith("Vega"),"vega_not_located");
  const surface = await element(page,"#spot-night-sky-scene");
  const endDistance = 200*Math.tan(45*Math.PI/720)/Math.tan(85*Math.PI/720);
  const touches = distance=>[0,1].map((identifier)=>({identifier,
    x:195.2+(identifier===0?-1:1)*distance/2,y:420,
    clientX:195.2+(identifier===0?-1:1)*distance/2,clientY:420}));
  await surface.touchstart({touches:touches(200),changedTouches:touches(200)});
  await surface.touchmove({touches:touches(endDistance),changedTouches:touches(endDistance)});
  await surface.touchend({touches:[],changedTouches:touches(endDistance)});
  const description = await until(async()=>await (await element(page,".sky-orientation-canvas")).attribute("aria-label"),value=>value.includes("85.0 度"),"fov_not_presented");
  const located = await (await element(page,".sky-located-object")).outerWxml();
  console.log(JSON.stringify({scope:"development_observation",channel:"official_miniprogram_sdk",
    marker:expectedMarker,port,description,locatedStyle:located.match(/style="([^"]+)"/)?.[1]??null}));
} finally {
  program.disconnect();
}
