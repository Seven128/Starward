// Read the actual shared Context after session recovery; the entry route ID
// can deliberately remain obsolete. No state injection, routes or IDs saved.
import sdk from "miniprogram-automator";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { boundedWechatConnect, boundWechatProtocol } from "../../../../tools/miniapp/wechat-protocol.mjs";
const phase = process.argv[2];
assert.ok(["recovered", "tracked-loss", "final"].includes(phase));
const output = path.resolve(`.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-context-atomic-native-${phase}-2026-09-28.json`);
assert.equal(await fs.access(output).then(() => true, () => false), false);
const program = await boundedWechatConnect(() => sdk.launcher.connectTool({ wsEndpoint: "ws://127.0.0.1:9444" }), 5000);
boundWechatProtocol(program, 5000);
try {
  const page = await program.currentPage(); assert.equal(page.path, "sky/detail/index");
  const persisted = await program.callWxMethod("getStorageSync", "starward.wechat-miniapp.state.current");
  const active = persisted.observationContext; assert.ok(active);
  const routeId = decodeURIComponent(page.query.contextId);
  const response = await fetch("http://127.0.0.1:8789/v2/observation-contexts/" + encodeURIComponent(active.contextId), { signal: AbortSignal.timeout(5000) });
  assert.equal(response.status, 200);
  const context = (await response.json()).data;
  assert.equal(context.revision, active.revision); assert.equal(context.selectedAtUtc, active.selectedAtUtc);
  assert.equal(context.location.kind, "FORMAL_SPOT");
  assert.equal(context.location.spotId, decodeURIComponent(page.query.spotId));
  const routeResponse = routeId === context.contextId ? response : await fetch("http://127.0.0.1:8789/v2/observation-contexts/" + encodeURIComponent(routeId), { signal: AbortSignal.timeout(5000) });
  const canvas = await page.$(".sky-orientation-canvas"); assert.ok(canvas);
  const description = await canvas.attribute("aria-label"); assert.ok(description.includes("已呈现"));
  assert.ok(description.includes(context.selectedAtUtc), "the actual painted instant must equal the accepted and persisted Context");
  const optionalText = async selector => { const element = await page.$(selector); return element ? await element.text() : null; };
  const located = await page.$(".sky-located-object");
  const proxy = await (await fetch("http://127.0.0.1:8791/__sky_test/context-status", { signal: AbortSignal.timeout(5000) })).json();
  const record = { phase, scope: "Actual unchanged clean-v11 DevTools Canvas, native durable storage read, active same-location Context and updated owned BFF HTTP readback. The entry route may retain an obsolete ID after accepted recovery; IDs remain only in memory. No phone, production database or final experience acceptance.", sdkPort: 9444,
    entryRoute: { sameContextAsAccepted: routeId === context.contextId, httpStatus: routeResponse.status },
    acceptedAndPersisted: { revision: active.revision, selectedAtUtc: active.selectedAtUtc, localDate: active.localDate },
    description, canvasSize: await canvas.size(), theme: await (await page.$(".sky-orientation-page")).attribute("class"),
    located: located ? await located.attribute("aria-label") : null, trackingStatus: await optionalText(".sky-object-tracking-status"),
    rulerState: await optionalText(".sky-orientation-time-ruler__current-state"), inlineNotification: await optionalText(".notification--inline"),
    context: { schemaVersion: context.schemaVersion, revision: context.revision, locationKind: context.location.kind, timezone: context.timezone, localDate: context.localDate,
      selectedAtUtc: context.selectedAtUtc, nightStartUtc: context.nightStartUtc, nightEndUtc: context.nightEndUtc, eventSelected: context.eventInstanceId !== null, weatherView: context.weatherView, algorithmVersions: context.algorithmVersions }, proxy };
  await fs.writeFile(output, JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify(record));
} finally { await program.disconnect(); }
