import sdk from "miniprogram-automator";
import { boundedWechatConnect, boundWechatProtocol } from "../../../../tools/miniapp/wechat-protocol.mjs";
const program = await boundedWechatConnect(() => sdk.launcher.connectTool({ wsEndpoint: "ws://127.0.0.1:9445" }), 5000);
boundWechatProtocol(program, 5000);
try {
  const page = await program.currentPage();
  const canvas = page ? await page.$(".sky-orientation-canvas") : null;
  const buttons = page ? await page.$$("button") : [];
  const saved = await program.callWxMethod("getStorageSync", "starward.wechat-miniapp.state.current");
  const active = saved.observationContext;
  const response = active ? await fetch("http://127.0.0.1:8789/v2/observation-contexts/" + encodeURIComponent(active.contextId), { signal: AbortSignal.timeout(5000) }) : null;
  console.log(JSON.stringify({ page: page?.path, canvas: canvas ? await canvas.attribute("aria-label") : null,
    queryKeys: Object.keys(page?.query ?? {}), timezone: page?.query.timezone, selectedAt: page?.query.selectedAt,
    contextPresent: !!active, savedTime: active?.selectedAtUtc, savedRevision: active?.revision, serverStatus: response?.status,
    sources: page ? await (await page.$(".sky-image-status-group"))?.text() : null,
    sameContext: active ? decodeURIComponent(page?.query.contextId ?? "") === active.contextId : false,
    sameLocation: active ? decodeURIComponent(page?.query.spotId ?? "") === active.location.spotId : false,
    buttons: await Promise.all(buttons.map(async button => ({ label: await button.attribute("aria-label"), class: await button.attribute("class") }))),
    inputs: page ? await Promise.all((await page.$$("input")).map(async input => ({ class: await input.attribute("class") }))) : [] }));
} finally { program.disconnect(); }
