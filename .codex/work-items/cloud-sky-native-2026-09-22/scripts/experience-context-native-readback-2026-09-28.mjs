// Read actual current native output and server state without persisting routes,
// Context IDs or credentials. Does not change app state or transport mode.
import sdk from "miniprogram-automator";
import assert from "node:assert/strict";
import { boundedWechatConnect, boundWechatProtocol } from "../../../../tools/miniapp/wechat-protocol.mjs";
const generation = process.argv[2] ?? "v10";
assert.ok(["v9", "v10", "v11"].includes(generation));
const sdkPort = { v9: 9442, v10: 9443, v11: 9444 }[generation];
const program = await boundedWechatConnect(() => sdk.launcher.connectTool({ wsEndpoint: `ws://127.0.0.1:${sdkPort}` }), 5000);
boundWechatProtocol(program, 5000);
try {
  const page = await program.currentPage(); assert.equal(page.path, "sky/detail/index");
  const response = await fetch("http://127.0.0.1:8789/v2/observation-contexts/" + encodeURIComponent(decodeURIComponent(page.query.contextId)), { signal: AbortSignal.timeout(5000) });
  assert.equal(response.status, 200); const envelope = await response.json(), context = envelope.data;
  const canvas = await page.$(".sky-orientation-canvas"); assert.ok(canvas);
  const description = await canvas.attribute("aria-label"); assert.ok(description.includes("已呈现"));
  const optionalText = async selector => { const element = await page.$(selector); return element ? await element.text() : null; };
  const located = await page.$(".sky-located-object");
  const proxy = await (await fetch("http://127.0.0.1:8791/__sky_test/context-status", { signal: AbortSignal.timeout(5000) })).json();
  console.log(JSON.stringify({
    scope: `Actual clean-${generation} native DevTools Canvas and unchanged local BFF readback. No phone or final experience acceptance.`, generation, sdkPort,
    description, canvasSize: await canvas.size(), theme: await (await page.$(".sky-orientation-page")).attribute("class"),
    located: located ? await located.attribute("aria-label") : null,
    trackingStatus: await optionalText(".sky-object-tracking-status"),
    rulerState: await optionalText(".sky-orientation-time-ruler__current-state"),
    inlineNotification: await optionalText(".notification--inline"),
    context: { schemaVersion: context.schemaVersion, revision: context.revision, locationKind: context.location.kind, timezone: context.timezone,
      localDate: context.localDate, selectedAtUtc: context.selectedAtUtc, nightStartUtc: context.nightStartUtc, nightEndUtc: context.nightEndUtc,
      eventSelected: context.eventInstanceId !== null, weatherView: context.weatherView,
      algorithmVersions: context.algorithmVersions },
    proxy,
  }));
} finally { await program.disconnect(); }
