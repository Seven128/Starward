import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { PNG } from "pngjs";
import { fingerprintBundle } from "../../../../tools/miniapp/release-bundle-artifact.mjs";

const task = path.resolve(".codex/work-items/cloud-sky-native-2026-09-22");
const evidence = path.join(task, "evidence");
const output = path.join(evidence, "experience-sky-whole-scene-validation-2026-09-29.json");
await assert.rejects(fs.access(output), { code: "ENOENT" });
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const hash = async file => digest(await fs.readFile(file));
const traceFile = path.join(evidence, "experience-sky-whole-scene-review-native-2026-09-29.jsonl");
const events = (await fs.readFile(traceFile, "utf8")).trim().split(/\r?\n/u).map(JSON.parse);
const value = stage => {
  const event = events.findLast(item => item.stage === stage);
  assert(event, stage);
  let result = event.value;
  while (result && typeof result === "object" && "result" in result) result = result.result;
  return result;
};
const candidateFile = path.join(evidence, "experience-combined-clean-v26-candidate-2026-09-29.json");
const candidate = JSON.parse(await fs.readFile(candidateFile, "utf8"));
const fingerprint = await fingerprintBundle(path.resolve(candidate.bundle));
assert.equal(fingerprint.sha256, candidate.fingerprint.sha256);
for (const input of [...candidate.sourceInputs, ...candidate.testInputs, ...candidate.retainedSkyTests])
  assert.equal(await hash(input.file), input.sha256, input.file);
const context = value("sky-only-final-context");
for (const event of events.filter(item => item.value?.contextIdSha256)) {
  assert.equal(Date.parse(event.value.selectedAtUtc), Date.parse(context.selectedAtUtc), event.stage);
  for (const key of ["contextIdSha256", "contextFingerprint", "revision", "locationKind", "publicSpotId", "localDate", "timezone", "astronomyVersion"])
    assert.equal(event.value[key], context[key], event.stage + " " + key);
}
assert.match(value("sky-only-max-wide-frame").presentedCanvasLabel, /270\.2 度/u);
assert.match(value("sky-only-return-local-frame").presentedCanvasLabel, /45\.0 度/u);
assert.match(value("sky-only-polaris-modal-content"), /方位 359\.6° · 高度 23\.0°/u);
assert.match(value("sky-only-polaris-modal-content"), /Polaris · HR 424/u);
const marker = stage => {
  const html = value(stage);
  const coordinates = html.match(/left: ([\d.]+)px; top: ([\d.]+)px/u);
  assert(coordinates, stage);
  return { x: Number(coordinates[1]), y: Number(coordinates[2]) };
};
const marker85 = marker("sky-only-polaris-85-marker");
const marker45 = marker("sky-only-polaris-45-marker");
assert(Math.abs(marker45.x - 195.1999969482422) < 1e-9);
assert(Math.abs(marker45.y - 422) < 1e-9);
assert(marker85.y > marker45.y + 50, "Wide browsing changes the presented basis; target identity alone is not matching camera proof.");
const runtime = value("sky-only-final-runtime");
assert.equal(runtime.display.mode, "DAY");
assert.equal(runtime.display.largeText, false);
assert.equal(runtime.display.pagePath, "sky/detail/index");
assert.equal(runtime.display.pageDepth, 2);
for (const mode of [runtime.contextMode, runtime.resourceMode, runtime.sourceStatus.mode]) assert.equal(mode, "pass");
assert.equal(runtime.putsInNewEpoch, 0); assert.equal(runtime.held, 0); assert.equal(runtime.active, 0);
assert.equal(runtime.windows.length, 1); assert.equal(runtime.windows[0].Id, 25916);
const mapSource = path.resolve("apps/wechat-miniapp/src/pages/map/index.scss");
const beforeMap = path.join(evidence, "experience-map-theme-before-2026-09-29.scss");
assert.equal(await hash(mapSource), await hash(beforeMap));
assert.equal(await hash(mapSource), runtime.mapSourceSha256);
const captures = [];
for (const event of events.filter(item => item.value?.path && item.value?.width && item.value?.height)) {
  const bytes = await fs.readFile(event.value.path), png = PNG.sync.read(bytes);
  assert.equal(digest(bytes), event.value.sha256, event.stage);
  assert.equal(png.width, 479); assert.equal(png.height, 1035);
  captures.push({ stage: event.stage, ...event.value });
}
const capture = stage => { const result = captures.find(item => item.stage === stage); assert(result, stage); return result; };
const crop = { x: 4, y: 106, right: 475, bottom: 1015, scope: "Original native Canvas crop excluding OS clock/capsule/safe area. Not ordinary control composition." };
async function diff(first, second) {
  const a = PNG.sync.read(await fs.readFile(capture(first).path));
  const b = PNG.sync.read(await fs.readFile(capture(second).path));
  let changedPixels = 0, maxChannelDifference = 0;
  for (let y = crop.y; y < crop.bottom; y++) for (let x = crop.x; x < crop.right; x++) {
    const offset = (y * a.width + x) * 4;
    let changed = false;
    for (let channel = 0; channel < 4; channel++) {
      const delta = Math.abs(a.data[offset + channel] - b.data[offset + channel]);
      changed ||= delta !== 0; maxChannelDifference = Math.max(maxChannelDifference, delta);
    }
    changedPixels += Number(changed);
  }
  return { first, second, crop, changedPixels, maxChannelDifference };
}
const comparisons = await Promise.all([
  diff("sky-only-whole-scene-manual-45", "sky-only-whole-scene-local-return"),
  diff("sky-only-whole-scene-local-return", "sky-only-whole-scene-constellation-off"),
  diff("sky-only-whole-scene-local-return", "sky-only-whole-scene-constellation-restored"),
  diff("sky-only-whole-scene-polaris-45", "sky-only-whole-scene-polaris-final-45"),
  diff("sky-only-whole-scene-polaris-85", "sky-only-whole-scene-polaris-85-restored")
]);
const referenceFile = path.join(evidence, "experience-v26-polaris-reference-matched45-2026-09-29.json");
const reference = JSON.parse(await fs.readFile(referenceFile, "utf8"));
assert.match(reference.observedPausedState, /2026-09-30 05:00:01/u);
assert.equal(reference.dom.canvas[0].css[1], 844);
assert(Math.abs(reference.dom.canvas[0].css[0] - 390.4) < .001);
const retained = [];
for (const [name, expected] of [
  ["experience-large-text-consumers-native-2026-09-29.jsonl", "dc66f8eb4b9380c24b7137b12deb101d32189bc0bc6fa66bcf864e79c2ef37cf"],
  ["experience-bound-source-native-2026-09-29.jsonl", "a865c0e74d51219eebf8f3d11456c3f9dfd037c590707b9a338a6000e0ac7f6e"],
  ["experience-m42-native-2026-09-29.jsonl", "dfe4a4ae3c242551442b2aa13bb245de8b08b56f73a6b7ff5d07a67112837079"]]) {
  const sha256 = await hash(path.join(evidence, name)); assert.equal(sha256, expected); retained.push({ name, sha256 });
}
const withdrawalTrace = path.join(evidence, "experience-map-theme-recovery-native-2026-09-29.jsonl");
const result = {
  scope: "Fixed v26 Sky-only whole-scene development observations. User forbids changes to other modules; Map exploration was withdrawn byte for byte. Large-font adaptation remains paused. Goal remains active and unbudgeted.",
  candidate: { file: candidateFile, sha256: fingerprint.sha256, sourceInputs: candidate.sourceInputs.length },
  trace: { file: traceFile, sha256: await hash(traceFile), events: events.length, frozen: true },
  context, runtime, captures, comparisons, retained,
  reference: { file: referenceFile, sha256: await hash(referenceFile), screenshot: reference.path, screenshotSha256: await hash(reference.path), ...reference },
  presentedMarkers: { at85: marker85, at45: marker45, cameraLimit: "At85 the wide browsing camera tilts toward zenith. Not a matched Polaris camera. At45 public locate marker is at actual logical Canvas center." },
  actualGalaxyDisclosure: value("sky-only-galactic-actual-source-content"),
  scopeWithdrawal: { source: mapSource, restoredSha256: runtime.mapSourceSha256, beforeFile: beforeMap, trace: withdrawalTrace, traceSha256: await hash(withdrawalTrace), frozen: true, v27: runtime.unusedV27, limits: "Outside-Sky finding is a task-local lead, not a Goal completion dependency. Withdrawn checks/build do not deliver a Goal repair." },
  toolFailures: events.filter(item => item.stage === "tool-failure"),
  limits: ["Native Sky captures remain Canvas-only; controls/labels/modal visible composition is not certified.",
    "At45 constellation detail is intentionally hidden; ON/OFF invariance is not evidence that visible constellation art works. At25 actual art was observed, label anchors did not enter this viewport.",
    "The coarse diffuse background persists with constellation detail disabled; 2MASS is actually disclosed but causal attribution requires a same-frame renderer comparison.",
    "Different reference star catalog, atmosphere/landscape assets, view grammar and image encoding prevent cross-renderer pixel or density acceptance.",
    "Phone/new Moon/device pose/rotation/calibration/OS background, whole-scene quality/registration/coverage, target performance/package/cost and necessary final review remain unverified."]
};
await fs.writeFile(output, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ output, candidateSha256: fingerprint.sha256, events: events.length, captures: captures.length,
  comparisons: comparisons.map(({ first, second, changedPixels, maxChannelDifference }) => ({ first, second, changedPixels, maxChannelDifference })), marker85, marker45, sourceScopeRestored: true }));
