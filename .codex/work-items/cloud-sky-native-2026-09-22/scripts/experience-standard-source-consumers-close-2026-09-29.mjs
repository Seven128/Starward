import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { PNG } from "pngjs";
import { fingerprintBundle } from "../../../../tools/miniapp/release-bundle-artifact.mjs";

const task = path.resolve(".codex/work-items/cloud-sky-native-2026-09-22");
const evidence = path.join(task, "evidence");
const output = path.join(evidence, "experience-standard-source-consumers-validation-2026-09-29.json");
await assert.rejects(fs.access(output), { code: "ENOENT" });
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const hash = async file => digest(await fs.readFile(file));
const trace = path.join(evidence, "experience-large-text-consumers-native-2026-09-29.jsonl");
const events = (await fs.readFile(trace, "utf8")).trim().split(/\r?\n/u).map(JSON.parse);
const unwrap = item => {
  while (item && typeof item === "object" && "result" in item) item = item.result;
  return item;
};
const value = stage => {
  const event = events.findLast(item => item.stage === stage);
  assert(event, stage);
  return unwrap(event.value);
};
const text = stage => {
  const result = value(stage);
  const str = typeof result === "string" ? result : result.text;
  assert.equal(typeof str, "string", stage);
  return str;
};
const candidateFile = path.join(evidence, "experience-combined-clean-v26-candidate-2026-09-29.json");
const candidate = JSON.parse(await fs.readFile(candidateFile, "utf8"));
const fingerprint = await fingerprintBundle(path.resolve(candidate.bundle));
assert.equal(fingerprint.sha256, candidate.fingerprint.sha256);
for (const input of [...candidate.sourceInputs, ...candidate.testInputs, ...candidate.retainedSkyTests])
  assert.equal(await hash(input.file), input.sha256, input.file);

assert(value("user-confirmed-large-text-paused"));
assert.equal(value("baseline-display").largeText, false);
const context = value("baseline-context");
for (const stage of ["night-mode-context", "night-source-return-context", "night-moon-source-context",
  "night-moon-source-back-context", "source-consumers-night-map-context"]) {
  const actual = value(stage);
  assert.equal(Date.parse(actual.selectedAtUtc), Date.parse(context.selectedAtUtc), stage);
  for (const key of ["contextIdSha256", "contextFingerprint", "revision", "locationKind", "publicSpotId", "localDate", "timezone", "astronomyVersion"])
    assert.equal(actual[key], context[key], stage + " " + key);
}
const route = value("night-source-route-display");
assert.equal(route.mode, "NIGHT");
assert.equal(route.largeText, false);
assert.equal(route.path, "sky/sources/index");
assert.equal(decodeURIComponent(route.reference), "M:82");
assert.equal(route.imagePublicationHash, "87ab6341b43d660e3c93a2430994c0f38b409dafa86216e7e3313e98cdbbc073");
for (const provider of ["OpenNGC", "NASA/IPAC", "Sloan Digital"]) assert(text("night-source-content").includes(provider));
assert.equal(value("night-source-attribution-presence").elements.length, 0);
assert.equal(text("night-moon-modal-identity"), "月球");
assert.equal(text("night-moon-source-back-identity"), "月球");
assert.equal(value("night-moon-source-attribution-presence").elements.length, 1);
const moonUrl = "https://astrogeology.usgs.gov/search/map/moon_clementine_uvvis_global_mosaic_118m";
assert(text("night-moon-source-content").includes(moonUrl));
assert(text("night-moon-source-content").includes("No local terrain or albedo is inferred in gaps."));
assert(text("night-moon-attribution-copy-status").includes("来源链接已复制"));
assert.equal(value("night-moon-attribution-clipboard-readback").equalsMoonPublicSource, true);
assert.equal(value("source-consumers-public-back-map").pagePath, "pages/map/index");
assert.equal(value("source-consumers-map-attribution-presence").elements.length, 2);
assert(text("source-consumers-map-first-attribution-content").includes("和风天气 · https://www.qweather.com"));
assert.equal(value("source-consumers-spot-source-route").pagePath, "spot/data-source/index");
for (const provider of ["Astronomy Engine", "NASA Goddard", "Saturnian Rings Fact Sheet"])
  assert(text("source-consumers-spot-source-content").includes(provider));

const captures = [];
for (const event of events.filter(item => item.value?.path && item.value?.width && item.value?.height)) {
  const bytes = await fs.readFile(event.value.path), png = PNG.sync.read(bytes);
  assert.equal(digest(bytes), event.value.sha256, event.stage);
  assert.equal(png.width, 479); assert.equal(png.height, 1035);
  captures.push({ stage: event.stage, ...event.value });
}
const capture = stage => { const record = captures.find(item => item.stage === stage); assert(record, stage); return record; };
const crop = { x: 4, y: 106, right: 475, bottom: 1015, basis: "Existing native 390x844 capsule bottom83; exclude OS clock/capsule/safe area, same original dimensions." };
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
  return { first, second, crop, changedPixels, maxChannelDifference, scope: "Canvas-only native capture; not ordinary control/modal composition or phone acceptance." };
}
const colors = value("source-consumers-night-map-observed-colors");
assert.equal(colors.title, "rgb(15, 23, 42)");
assert.equal(colors.route, colors.title);
assert.equal(colors.panel, "rgb(24, 26, 23)");
const luminance = rgb => rgb.map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
  .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
const observedContrast = (luminance([24, 26, 23]) + .05) / (luminance([15, 23, 42]) + .05);
const runtime = value("standard-source-consumers-final-runtime");
assert.equal(runtime.display.mode, "NIGHT"); assert.equal(runtime.display.largeText, false);
assert.equal(runtime.display.pagePath, "pages/map/index"); assert.equal(runtime.display.pageDepth, 1);
assert.equal(runtime.contextMode, "pass"); assert.equal(runtime.resourceMode, "pass");
assert.equal(runtime.sourceStatus.mode, "pass"); assert.equal(runtime.putsInNewEpoch, 0);
assert.equal(runtime.held, 0); assert.equal(runtime.active, 0);
assert.equal(runtime.windows.length, 1); assert.equal(runtime.windows[0].Id, 25916);
const retained = [];
for (const [name, expected] of [
  ["experience-bound-source-native-2026-09-29.jsonl", "a865c0e74d51219eebf8f3d11456c3f9dfd037c590707b9a338a6000e0ac7f6e"],
  ["experience-m42-native-2026-09-29.jsonl", "dfe4a4ae3c242551442b2aa13bb245de8b08b56f73a6b7ff5d07a67112837079"]]) {
  const sha256 = await hash(path.join(evidence, name)); assert.equal(sha256, expected); retained.push({ name, sha256 });
}
const record = {
  scope: "Fixed v26 standard typography and representative source consumers in NIGHT. User confirmed large-font adaptation stays paused; no activation or acceptance claim. Trace filename retains its initial stage name. Existing full Goal obligations remain.",
  candidate: { file: candidateFile, sha256: fingerprint.sha256, fileCount: fingerprint.fileCount, rawBytes: fingerprint.totalBytes, sourceInputCount: candidate.sourceInputs.length },
  trace: { file: trace, sha256: await hash(trace), events: events.length, frozen: true },
  captures, context, runtime, retained,
  canvasComparisons: [await diff("source-consumers-night-sky-before", "source-consumers-night-sky-after"),
    await diff("source-consumers-night-sky-before", "source-consumers-night-moon-back")],
  consumers: {
    m82: { fullProvenance: true, actualAttributionCount: 0, publicationHash: route.imagePublicationHash },
    moon: { actualAttributionCount: 1, fullOriginalUrl: moonUrl, copiedPublicUrlReadback: true, sourceBackIdentity: "月球" },
    map: { actualAttributionCount: 2, firstAttribution: "和风天气", actualFullSourceEntry: true, visibilityLimit: "Credit exists in retained document but current medium viewport screenshot does not show it; no weather upstream accuracy acceptance." },
    spotSources: { fullProvenanceWithGroupedSources: true, actualSourceContent: true }
  },
  knownFailed: { owner: "apps/wechat-miniapp/src/pages/map/index.scss", nativeColors: colors, observedTitleContrastRatio: observedContrast,
    result: "NIGHT Map return is not readable: adopted DAY ink leaks onto NIGHT surface. Must repair before dependent return/mode completion. No repair yet in this evidence." },
  limits: ["Phone unavailable, no preview/input/capture/upload", "Large-font adaptation stays paused", "Canvas-only Sky capture cannot certify ordinary WXML composition",
    "All affected consumers/modes, whole-scene quality, alignment/coverage, device/OS/rotation/calibration, target performance/package/cost and necessary final review remain unverified where no suitable evidence exists."]
};
await fs.writeFile(output, JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ candidateSha256: fingerprint.sha256, traceEvents: events.length, captures: captures.length,
  comparisons: record.canvasComparisons.map(item => ({ first: item.first, second: item.second, changedPixels: item.changedPixels, maxChannelDifference: item.maxChannelDifference })),
  mapNight: record.knownFailed, output }));
