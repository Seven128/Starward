import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { PNG } from "pngjs";
import { fingerprintBundle } from "../../../../tools/miniapp/release-bundle-artifact.mjs";
const task = path.resolve(".codex/work-items/cloud-sky-native-2026-09-22"), evidence = path.join(task, "evidence");
const output = path.join(evidence, "experience-galactic-native-validation-2026-09-29.json");
await assert.rejects(fs.access(output), { code: "ENOENT" });
const digest = bytes => createHash("sha256").update(bytes).digest("hex"), hash = async file => digest(await fs.readFile(file));
const traceFile = path.join(evidence, "experience-galactic-native-2026-09-29.jsonl");
const events = (await fs.readFile(traceFile, "utf8")).trim().split(/\r?\n/u).map(JSON.parse);
const value = stage => {
  const event = events.findLast(item => item.stage === stage); assert(event, stage);
  let result = event.value; while (result && typeof result === "object" && "result" in result) result = result.result;
  return result;
};
const candidateFile = path.join(evidence, "experience-combined-clean-v28-candidate-2026-09-29.json");
const candidate = JSON.parse(await fs.readFile(candidateFile, "utf8"));
assert.equal((await fingerprintBundle(path.resolve(candidate.bundle))).sha256, candidate.fingerprint.sha256);
for (const input of [...candidate.sourceInputs, ...candidate.testInputs, ...candidate.retainedSkyTests])
  assert.equal(await hash(input.file), input.sha256, input.file);
const context = value("v28-frozen-final-context");
for (const stage of ["v28-public-next-day-context", "v28-polaris-located-context", "v28-source-back-context",
  "v28-sky-back-durable-context", "v28-reentry-context", "v28-final-context"]) {
  const row = value(stage); assert.equal(Date.parse(row.selectedAtUtc), Date.parse(context.selectedAtUtc));
  for (const key of ["contextIdSha256", "contextFingerprint", "revision", "localDate", "timezone", "publicSpotId", "astronomyVersion"])
    assert.equal(row[key], context[key], stage + " " + key);
}
assert.equal(context.revision, 2); assert.equal(context.publicSpotId, "spot:test-published");
assert.equal(Date.parse(context.selectedAtUtc), Date.parse("2026-09-29T21:00:00Z"));
assert.notEqual(value("v26-before-replacement-context").contextIdSha256, context.contextIdSha256,
  "new native project has a separate durable session; do not claim an identical v26 Context");
assert.match(value("v28-frozen-final-frame").presentedCanvasLabel, /45\.0 度.*4208.*2026-09-29T21:00:00\.000Z.*05:00/u);
assert.match(value("v28-dome-complete-frame").presentedCanvasLabel, /274\.9 度/u);
assert.match(value("v28-recognition-frame").presentedCanvasLabel, /25\.2 度/u);
assert.match(value("v28-natural-polaris-information"), /Polaris · HR 424/u);
assert.match(value("v28-natural-polaris-information"), /方位 359\.6° · 高度 23\.0°/u);
assert.equal(value("v28-source-back-retained-polaris"), "Polaris");
assert.match(value("v28-galactic-source-display-disclosure").text, /局部放大时对全景背景作平滑显示/u);
assert.match(value("v28-galactic-source-display-disclosure").text, /no recoloring/u);
const display = value("v28-final-display-state"); assert.equal(display.mode, "DAY"); assert.equal(display.largeText, false);
assert.equal(display.pagePath, "sky/detail/index"); assert.equal(display.pageDepth, 2);
const runtime = value("v28-final-runtime"); assert.equal(runtime.windows.length, 1);
assert.match(runtime.windows[0].MainWindowTitle, /V28/u); assert.equal(runtime.contextUpstream, 8789);
for (const key of ["contextMode", "sourceMode", "resourceMode"]) assert.equal(runtime[key], "pass");
assert.equal(runtime.active, 0); assert.equal(runtime.held, 0); assert.equal(runtime.puts, 1); assert.deepEqual(runtime.forwardedPutStatuses, [200]);
const captures = [];
for (const event of events.filter(event => event.value?.path?.endsWith(".png"))) {
  const row = event.value; assert.equal(await hash(row.path), row.sha256, event.stage);
  const png = PNG.sync.read(await fs.readFile(row.path)); assert.equal(png.width, 427); assert.equal(png.height, 919);
  captures.push({ stage: event.stage, file: path.relative(process.cwd(), row.path).replaceAll("\\", "/"), sha256: row.sha256,
    width: png.width, height: png.height });
}
const crop = { left: 4, right: 423, top: 100, bottom: 890, scope: "Same v28 original screenshots only; excludes capsule/system bars/rounded border. No resize, cross-candidate pixel comparison or invented pass tolerance." };
const compare = async (leftStage, rightStage) => {
  const a = PNG.sync.read(await fs.readFile(value(leftStage).path)), b = PNG.sync.read(await fs.readFile(value(rightStage).path));
  let changedPixels = 0, maxChannelDifference = 0;
  for (let y = crop.top; y < crop.bottom; y++) for (let x = crop.left; x < crop.right; x++) {
    const offset = 4 * (y * a.width + x); let changed = false;
    for (let c = 0; c < 4; c++) { const d = Math.abs(a.data[offset + c] - b.data[offset + c]); maxChannelDifference = Math.max(maxChannelDifference, d); changed ||= d > 0; }
    changedPixels += Number(changed);
  }
  return { leftStage, rightStage, changedPixels, maxChannelDifference, crop };
};
const sameCandidatePixels = [await compare("galactic-polaris-local-45", "galactic-source-back-45"),
  await compare("galactic-polaris-local-45", "galactic-final-polaris-45")];
const retained = [];
for (const [file, sha256] of [
  ["experience-sky-whole-scene-review-native-2026-09-29.jsonl", "69e818624877befd897e1ab769d5f9cd9358c4faaf4baebb340be2394c63a4b6"],
  ["experience-large-text-consumers-native-2026-09-29.jsonl", "dc66f8eb4b9380c24b7137b12deb101d32189bc0bc6fa66bcf864e79c2ef37cf"],
  ["experience-map-theme-recovery-native-2026-09-29.jsonl", "30645226b665d0700b65dbd05c8e242dacbaa067cc6ba305a0de532044081512"]]) {
  assert.equal(await hash(path.join(evidence, file)), sha256); retained.push({ file, sha256 });
}
assert.equal(await hash("apps/wechat-miniapp/src/pages/map/index.scss"), "81283f7b2849cd55eed4a82d322885e1c76d7f8aa81ab26fc2fc584d198c0e82");
const supporting = await Promise.all(["experience-galactic-causal-validation-2026-09-29.json", "experience-galactic-cost-2026-09-29.json"]
  .map(async file => ({ file, sha256: await hash(path.join(evidence, file)) })));
const record = { scope: "Fixed v28 native development binding and actual public journey. Only two Sky source owners changed; original 2MASS bytes/publication unchanged. Original screenshots viewed by the primary agent; this is self-review. Native Canvas-only captures do not establish ordinary overlay composition, target performance, phone/iOS/new-Moon acceptance or overall completion.",
  candidate: { file: candidateFile, sha256: await hash(candidateFile), bundle: candidate.bundle, fingerprint: candidate.fingerprint.sha256 },
  trace: { file: traceFile, events: events.length, sha256: await hash(traceFile), frozen: true }, captures, context, display, runtime,
  toolFailures: events.filter(event => event.stage === "tool-failure").map(event => event.value),
  viewport: value("v28-polaris-logical-canvas-size"), sameCandidatePixels, supporting, retained,
  historyLimits: "Native v28 427x919 and v26 479x1035 are differently scaled host captures despite the same actual logical canvas. No cross-generation pixel equality. v28 Context differs from v26; same public observer/time are comparable. v27 remains unused. A legacy pinch-helper stage name includes v26; actions use the recorded explicit v28 project." };
await fs.writeFile(output, JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ output, traceEvents: events.length, captures: captures.length,
  traceSha256: record.trace.sha256, sameCandidatePixels, toolFailures: record.toolFailures.length }));
