import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { PNG } from "pngjs";
import sdk from "miniprogram-automator";
import { fingerprintBundle } from "../../../../tools/miniapp/release-bundle-artifact.mjs";
import { boundedWechatConnect, boundWechatProtocol } from "../../../../tools/miniapp/wechat-protocol.mjs";

const root = path.resolve("."), evidence = path.join(root, ".codex/work-items/cloud-sky-native-2026-09-22/evidence");
const output = path.join(evidence, "experience-imagery-combined-binding-2026-09-28.json");
assert.equal(await fs.access(output).then(() => true, () => false), false, "preserve previous evidence");
const read = async file => JSON.parse(await fs.readFile(path.join(evidence, file), "utf8"));
const actual = await read("experience-imagery-combined-native-2026-09-28.json");
const candidate = await read("experience-combined-clean-v11-candidate-2026-09-28.json");
const guide = await read(actual.inputGuide);
const fingerprint = await fingerprintBundle(path.join(root, candidate.bundle));
assert.equal(fingerprint.sha256, candidate.fingerprint.sha256);
assert.equal(fingerprint.sha256, actual.candidateSha256);
assert.equal(fingerprint.fileCount, 257);
assert.ok(actual.moon.partialCondition.source.includes(guide.publicationHash + "/panorama-1024.png"));
assert.ok(actual.moon.coordinatePick.result.includes("SOLAR MOON"));
assert.ok(actual.moon.sourcePage.renderedText.includes("measured-area coverage"));
assert.ok(actual.final.paintedLandscapeSource.includes(guide.publicationHash + "/panorama-2048.png"));
const images = new Map(), captureBinding = [];
for (const item of [...actual.captures, actual.moon.sourcePage]) {
  assert.match(item.filename, /^[a-z0-9-]+\.png$/);
  const bytes = await fs.readFile(path.join(evidence, item.filename)), image = PNG.sync.read(bytes);
  assert.equal(image.width, item.width); assert.equal(image.height, item.height);
  images.set(item.filename, image);
  captureBinding.push({ filename: item.filename, width: image.width, height: image.height, bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex") });
}
const comparison = actual.moon.comparison;
assert.equal(comparison.before.description, comparison.off.description);
assert.equal(comparison.before.description, comparison.restored.description);
assert.notEqual(comparison.before.landscape, comparison.off.landscape);
assert.equal(comparison.before.landscape, comparison.restored.landscape);
const before = images.get(comparison.before.filename), off = images.get(comparison.off.filename), restored = images.get(comparison.restored.filename);
assert.equal(before.width, off.width); assert.equal(before.height, off.height);
assert.equal(before.width, restored.width); assert.equal(before.height, restored.height);
function compare(a, b, insideMoon = false) {
  let differentPixels = 0, maximumChannelDifference = 0, checkedPixels = 0;
  const row = guide.rows.find(row => row.at === actual.moon.partialCondition.at); assert.ok(row);
  const scaleX = a.width / guide.canvasSize.width, scaleY = a.height / guide.canvasSize.height;
  for (let y = Math.ceil(a.height * .14); y < Math.floor(a.height * .93); y++) for (let x = 0; x < a.width; x++) {
    if (insideMoon && Math.hypot((x + .5) / scaleX - row.disc.x, (y + .5) / scaleY - row.disc.y) > row.disc.radiusPx * .85) continue;
    checkedPixels++; let changed = false;
    for (let c = 0; c < 3; c++) {
      const difference = Math.abs(a.data[(y * a.width + x) * 4 + c] - b.data[(y * b.width + x) * 4 + c]);
      maximumChannelDifference = Math.max(maximumChannelDifference, difference); changed ||= difference > 0;
    }
    differentPixels += Number(changed);
  }
  return { checkedPixels, differentPixels, maximumChannelDifference };
}
const pixelChecks = { onOffScene: compare(before, off), onOffMoonInterior: compare(before, off, true), restoredScene: compare(before, restored) };
assert.ok(pixelChecks.onOffScene.differentPixels > 0, "the foreground switch must affect actual pixels");
assert.ok(pixelChecks.onOffMoonInterior.differentPixels > 0, "the actual foreground must compose over the visible Moon");
assert.equal(pixelChecks.restoredScene.differentPixels, 0, "same-condition panorama restoration must restore its actual scene");

const program = await boundedWechatConnect(() => sdk.launcher.connectTool({ wsEndpoint: "ws://127.0.0.1:9444" }), 5000);
boundWechatProtocol(program, 5000);
try {
  const page = await program.currentPage(); assert.equal(page.path, "sky/detail/index");
  const state = await program.callWxMethod("getStorageSync", "starward.wechat-miniapp.state.current");
  const active = state.observationContext; assert.equal(active.location.kind, "FORMAL_SPOT");
  assert.equal(active.location.spotId, decodeURIComponent(page.query.spotId));
  assert.equal(active.contextId, decodeURIComponent(page.query.contextId));
  const contextResponse = await fetch("http://127.0.0.1:8789/v2/observation-contexts/" + encodeURIComponent(active.contextId), { signal: AbortSignal.timeout(8000) });
  assert.equal(contextResponse.status, 200); const context = (await contextResponse.json()).data;
  assert.equal(context.selectedAtUtc, active.selectedAtUtc); assert.equal(context.revision, active.revision);
  assert.equal(context.selectedAtUtc, "2026-09-28T16:00:00.000Z");
  const description = await (await page.$(".sky-orientation-canvas")).attribute("aria-label");
  assert.equal(description, actual.final.state.description);
  assert.ok(description.includes(context.selectedAtUtc));
  assert.equal(await (await page.$(".sky-located-object")).attribute("aria-label"), actual.final.state.located);
  assert.equal(await page.$(".sky-object-modal"), null);
  assert.equal(await page.$(".sky-object-tracking-status"), null);
  assert.equal(await page.$(".sky-orientation-time-ruler__track"), null);
  const snapshotStartedAtMs = Date.now();
  const reportResponse = await fetch(`http://127.0.0.1:8789/v2/spots/${encodeURIComponent(active.location.spotId)}/sky?contextId=${encodeURIComponent(active.contextId)}&catalogVersion=bsc5p-bright-stars.v3`, { signal: AbortSignal.timeout(10000) });
  assert.equal(reportResponse.status, 200);
  const reportBytes = Buffer.from(await reportResponse.arrayBuffer()), report = JSON.parse(reportBytes.toString("utf8")).data;
  assert.equal(report.context.contextId, active.contextId);
  assert.ok(report.hourly.some(row => row.at === context.selectedAtUtc));
  const reportElapsedMs = Date.now() - snapshotStartedAtMs;
  const landscape = await (await fetch("http://127.0.0.1:8789/v2/sky/landscape/manifest", { signal: AbortSignal.timeout(8000) })).json();
  const moon = await (await fetch("http://127.0.0.1:8789/v2/sky/moon/coverage/manifest", { signal: AbortSignal.timeout(8000) })).json();
  assert.equal(landscape.publicationHash, guide.publicationHash);
  assert.equal(moon.publicationHash, guide.moonCoverage.publicationHash);
  const proxy = await (await fetch("http://127.0.0.1:8791/__sky_test/context-status", { signal: AbortSignal.timeout(5000) })).json();
  assert.equal(proxy.mode, "pass");
  const firstRender = actual.entry.manualReadyEntries.find(entry => entry.name === "firstRender" && entry.path === "sky/detail/index");
  assert.ok(firstRender); assert.equal(firstRender.duration, 132);
  const record = { scope: "Current clean-v11 file identity, actual captured pixel comparison and public current storage/route/BFF/Canvas readback. Files and local page render/agent HTTP measurements are not target memory/FPS/wire traffic or full quality acceptance.",
    candidate: { bundle: candidate.bundle, ...fingerprint, rawPackageBytes: candidate.rawPackageBytes },
    source: { landscapePublicationHash: landscape.publicationHash, partialPanoramaResource: "overview", restoredNormalResource: "detail", moonPublicationHash: moon.publicationHash, moonImageHash: moon.image.sha256 },
    pixelChecks, captureBinding,
    current: { selectedAtUtc: context.selectedAtUtc, localDate: context.localDate, timezone: context.timezone, revision: context.revision, locationKind: context.location.kind, entryRouteMatchesAcceptedContext: true,
      description, canvasSize: await (await page.$(".sky-orientation-canvas")).size(), theme: await (await page.$(".sky-orientation-page")).attribute("class"), proxy },
    developmentMeasurements: { firstRender, manualInputToObservedReadyIncludingSDKMs: actual.entry.observedWithSDKReadMs,
      encodedFileRelease: { historicalBaselineCount: actual.entry.files.baselineFileCount, currentBeforeExit: actual.entry.files.currentBeforeExit.length, currentOnMap: actual.entry.files.currentAfterExit.length,
        currentAfterManual: actual.entry.files.currentAfterManual.length, currentAfterFinalNormal: actual.entry.files.currentFinal.length, historicalPreserved: actual.entry.files.historicalBaselineRetainedOnManual },
      agentDirectReportRead: { status: reportResponse.status, decodedResponseBytes: reportBytes.length, contentEncoding: reportResponse.headers.get("content-encoding"), contentLengthHeader: reportResponse.headers.get("content-length"), elapsedMs: reportElapsedMs,
        scope: "One direct Node agent request to owned local BFF; decoded byte size/agent elapsed time are not native wire traffic, cloud cost or sky first paint." } },
    independentReview: "unavailable", phoneAcceptance: "unverified", goal: "active, unbudgeted, incomplete" };
  await fs.writeFile(output, JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ candidateHash: fingerprint.sha256, captures: captureBinding.length, pixelChecks,
    selectedAtUtc: context.selectedAtUtc, revision: context.revision, firstRenderMs: firstRender.duration,
    fileRelease: record.developmentMeasurements.encodedFileRelease, directLocalReport: record.developmentMeasurements.agentDirectReportRead }));
} finally { await program.disconnect(); }
