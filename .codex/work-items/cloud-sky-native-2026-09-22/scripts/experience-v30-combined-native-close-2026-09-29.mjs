import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';
import { fingerprintBundle } from '../../../../tools/miniapp/release-bundle-artifact.mjs';

// One-shot closure of this journey; previous candidates, traces and captures stay frozen.
const task = path.resolve('.codex/work-items/cloud-sky-native-2026-09-22');
const evidence = path.join(task, 'evidence');
const output = path.join(evidence, 'experience-v30-combined-native-validation-2026-09-29.json');
await assert.rejects(fs.access(output), { code: 'ENOENT' });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const hash = async file => sha(await fs.readFile(file));
const read = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const traceFile = 'experience-v30-combined-native-2026-09-29.jsonl';
const traceBytes = await fs.readFile(path.join(evidence, traceFile));
const events = traceBytes.toString().trim().split(/\r?\n/).map(JSON.parse);
function value(stage) {
  const event = events.findLast(row => row.stage === stage);
  assert(event, stage);
  let result = event.value;
  // Native RPC wrappers contain an object; search observations use a semantic result string.
  while (result && typeof result === 'object' && result.result && typeof result.result === 'object') result = result.result;
  return result;
}
const candidateFile = 'experience-combined-clean-v30-candidate-2026-09-29.json';
const candidate = await read(path.join(evidence, candidateFile));
assert.equal((await fingerprintBundle(path.resolve(candidate.bundle))).sha256, candidate.fingerprint.sha256);
assert.equal(candidate.sourceInputs.length, 106);
for (const input of [...candidate.sourceInputs, ...candidate.testInputs, ...candidate.retainedSkyTests]) {
  assert.equal(await hash(input.file), input.sha256, input.file);
}
const priorFile = 'experience-optical-boundary-v30-native-validation-2026-09-29.json';
const prior = await read(path.join(evidence, priorFile));
assert.equal(await hash(path.join(evidence, prior.trace.file)), prior.trace.sha256);
assert.equal(prior.trace.events, 60);
for (const capture of prior.captures) {
  assert.equal(await hash(path.resolve(capture.file)), capture.sha256);
}
const baseline = value('combined-baseline-context');
assert.deepEqual(baseline, prior.context);
const context = value('combined-frozen-final-context');
assert.equal(context.contextIdSha256, baseline.contextIdSha256);
assert.equal(context.contextFingerprint, baseline.contextFingerprint);
assert.equal(context.publicSpotId, 'spot:test-published');
assert.equal(context.locationKind, 'FORMAL_SPOT');
assert.equal(context.localDate, '2026-09-29');
assert.equal(context.timezone, 'Asia/Shanghai');
assert.equal(Date.parse(context.selectedAtUtc), Date.parse('2026-09-29T13:00:00Z'));
assert.equal(context.revision, 3);
for (const stage of ['combined-vega-tracking-21-context', 'combined-vega-tracking-source-context',
  'combined-vega-source-back-context', 'combined-pre-exit-context', 'combined-map-return-context',
  'combined-reentry-context', 'combined-reentry-manual-context']) {
  assert.deepEqual(value(stage), context, stage);
}
const frame = stage => value(stage).presentedCanvasLabel;
const zoomStages = ['combined-baseline-frame', 'combined-local-zoomout-1', 'combined-local-zoomout-2',
  'combined-local-zoomout-3', 'combined-wide-zoomout-1', 'combined-wide-zoomout-2',
  'combined-full-dome-frame', 'combined-local-return-1', 'combined-local-return-2'];
const zoomJourney = zoomStages.map(stage => ({ stage, label: frame(stage),
  roundedVerticalFov: Number(frame(stage).match(/垂直视场 ([\d.]+) 度/)[1]) }));
assert.deepEqual(zoomJourney.map(row => row.roundedVerticalFov), [0.15, 0.76, 3.8, 18.9, 89.6, 256.5, 274.9, 108.8, 23.5]);
assert.match(frame('combined-local-zoomout-3'), /猎犬座/);
assert(!frame('combined-full-dome-frame').includes('可见星座'));
assert.match(value('combined-vega-public-search').result, /Vega.*HR 7001.*织女星/);
for (const stage of ['combined-vega-search-information', 'combined-vega-natural-pick', 'combined-vega-current-21-natural-pick']) {
  assert.equal(value(stage).title, 'Vega');
  assert.match(value(stage).body, /HR 7001.*HIP 91262/);
}
assert.match(value('combined-vega-natural-pick').body, /方位 338\.4°.*高度 72\.2°/);
assert.match(value('combined-vega-current-21-natural-pick').body, /方位 305\.5°.*高度 53\.5°/);
assert.match(frame('combined-vega-tracking-frame'), /天琴座.*跟踪Vega.*19:00/);
for (const stage of ['combined-vega-tracking-21-frame', 'combined-vega-source-back-frame']) {
  assert.match(frame(stage), /23\.5 度.*4039.*2026-09-29T13:00:00\.000Z.*天琴座.*跟踪Vega.*21:00/);
}
assert.equal(value('combined-vega-source-back-selection').title, 'Vega');
assert.match(frame('combined-tracking-stop-frame'), /手动视角/);
assert(!frame('combined-tracking-stop-frame').includes('跟踪Vega'));
assert.equal(value('combined-map-return-route').route, 'pages/map/index');
assert.equal(value('combined-map-return-route').depth, 1);
assert.match(frame('combined-frozen-final-frame'), /45\.0 度.*4039.*2026-09-29T13:00:00\.000Z.*手动视角.*21:00/);
const native = value('combined-frozen-native-sdk-display-route');
assert.equal(native.SDKVersion, '3.17.4');
assert.equal(native.platform, 'devtools');
assert.equal(native.enableDebug, false);
assert.equal(native.mode, 'DAY');
assert.equal(native.largeText, false);
assert.equal(native.pagePath, 'sky/detail/index');
assert.equal(native.pageDepth, 2);
const geometry = value('combined-baseline-overlay-geometry');
assert.equal(geometry['.sky-orientation-canvas__surface'].size.height, 844);
assert.equal(geometry['.sky-control-dock__button--time'].size.height, 44);
assert.equal(value('combined-coordinate-time-result').ariaExpanded, true);
const files = stage => value(stage).files;
assert.equal(files('combined-map-return-files').length, 0);
assert(files('combined-pre-exit-files').length > 0);
assert(files('combined-reentry-manual-files').length > 0);
assert.deepEqual(files('combined-frozen-final-files'), files('combined-reentry-manual-files'));
const encodedFiles = Object.fromEntries(['combined-full-dome-files', 'combined-pre-exit-files',
  'combined-map-return-files', 'combined-reentry-manual-files'].map(stage => [stage, {
    count: files(stage).length, bytes: files(stage).reduce((sum, row) => sum + row.bytes, 0), files: files(stage),
  }]));
const captures = [];
for (const event of events.filter(row => row.value?.path?.endsWith('.png'))) {
  const row = event.value;
  assert.equal(await hash(row.path), row.sha256);
  const png = PNG.sync.read(await fs.readFile(row.path));
  assert.equal(png.width, 427); assert.equal(png.height, 919);
  captures.push({ stage: event.stage, file: path.relative(process.cwd(), row.path).replaceAll('\\', '/'),
    sha256: row.sha256, width: png.width, height: png.height, viewedBy: 'root' });
}
assert.equal(captures.length, 12);
const crop = { left: 4, right: 423, top: 100, bottom: 890,
  scope: 'Original native 427x919 captures, no resizing; exclude host status/capsule/border/home. Canvas scene only; does not certify overlay composition.' };
async function compare(leftStage, rightStage) {
  const left = value(leftStage).path, right = value(rightStage).path;
  const a = PNG.sync.read(await fs.readFile(left)), b = PNG.sync.read(await fs.readFile(right));
  let changedPixels = 0, maxChannelDifference = 0;
  const changedBounds = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
  for (let y = crop.top; y < crop.bottom; y++) for (let x = crop.left; x < crop.right; x++) {
    const offset = 4 * (y * a.width + x); let changed = false;
    for (let c = 0; c < 4; c++) {
      const difference = Math.abs(a.data[offset + c] - b.data[offset + c]);
      changed ||= difference > 0; maxChannelDifference = Math.max(maxChannelDifference, difference);
    }
    changedPixels += Number(changed);
    if (changed) {
      changedBounds.left = Math.min(changedBounds.left, x); changedBounds.right = Math.max(changedBounds.right, x);
      changedBounds.top = Math.min(changedBounds.top, y); changedBounds.bottom = Math.max(changedBounds.bottom, y);
    }
  }
  return { left: path.basename(left), right: path.basename(right), changedPixels, maxChannelDifference,
    changedBounds: changedPixels ? changedBounds : null, crop };
}
const pixels = {
  trackingTimeChange: await compare('vega-tracking-19', 'vega-tracking-21'),
  trackingSourceReturn: await compare('vega-tracking-21', 'vega-tracking-source-back'),
};
assert(pixels.trackingTimeChange.changedPixels > 0);
// Source-return pixels are measured, not assumed identical; preserve the actual small difference.
const runtime = value('combined-frozen-runtime');
assert.equal(runtime.windows.length, 1); assert.equal(runtime.windows[0].Id, 25916);
assert.match(runtime.windows[0].MainWindowTitle, /V30-0929$/);
assert.equal(runtime.puts, 4); assert.deepEqual(runtime.forwardedPutStatuses, [200, 200, 200, 200]);
assert.equal(runtime.phase, 'settled'); assert.equal(runtime.heldResourceCount, 0); assert.equal(runtime.activeCount, 0);
for (const key of ['contextMode', 'sourceMode', 'resourceMode']) assert.equal(runtime[key], 'pass');
const traffic = value('combined-current-run-native-traffic');
assert.equal(traffic.afterSequence, prior.runtime.totalObserved);
assert.equal(traffic.afterSequence, 261);
assert.equal(traffic.records.length, 88);
for (const row of traffic.records) {
  assert(row.sequence > 261 && row.sequence <= 349);
  assert([200, 304].includes(row.status));
  assert.equal(row.downstreamFinished, true); assert.equal(row.upstreamEnded, true);
}
const referenceFile = 'experience-v30-vega-reference-provisional-2026-09-29.json';
const reference = await read(path.join(evidence, referenceFile));
assert.equal(reference.classification, 'unmatched provisional reference only');
assert.equal(reference.reference.canvas.css.height, geometry['.sky-orientation-canvas__surface'].size.height);
const referenceImage = 'experience-v30-vega-reference-provisional-2026-09-29.jpg';
assert.equal((await fs.readFile(path.join(evidence, referenceImage))).subarray(0, 2).toString('hex'), 'ffd8');
const mapFile = path.resolve('apps/wechat-miniapp/src/pages/map/index.scss');
const mapSourceSha256 = await hash(mapFile);
assert.equal(mapSourceSha256, '81283f7b2849cd55eed4a82d322885e1c76d7f8aa81ab26fc2fc584d198c0e82');
const result = {
  scope: 'Unchanged V30 whole-journey development evidence only; no product source/build/device/cloud/Git changes.',
  candidate: { file: candidateFile, recordSha256: await hash(path.join(evidence, candidateFile)),
    bundle: candidate.bundle, sha256: candidate.fingerprint.sha256, sourceInputsVerified: candidate.sourceInputs.length },
  prior: { file: priorFile, sha256: await hash(path.join(evidence, priorFile)), traceVerified: true },
  trace: { file: traceFile, sha256: sha(traceBytes), events: events.length, frozen: true },
  captures, baselineContext: baseline, currentContext: context, native, zoomJourney, pixels, encodedFiles,
  coordinateAction: { input: value('combined-measured-time-coordinate-tap'), result: value('combined-coordinate-time-result'), geometry },
  runtime, currentRunTraffic: traffic, mapSourceSha256,
  reference: { file: referenceFile, sha256: await hash(path.join(evidence, referenceFile)),
    image: referenceImage, imageSha256: await hash(path.join(evidence, referenceImage)), viewedBy: 'root', ...reference },
  toolFailures: events.filter(row => row.stage === 'tool-failure').map(row => ({ observedUtc: row.observedUtc, ...row.value })),
  limitations: [
    'Native SDK input and rendered Canvas effects verify this journey, not real phone controls/gestures/pose or complete native overlay composition.',
    'Time-button measured coordinate changes aria-expanded; Canvas-only screenshot still omits normal labels/dock/modals. No proof of visible or correctly layered controls.',
    'Full-dome clamp makes local return 23.5 degrees rather than original 18.9; no pixel-equal or exact-camera roundtrip claim.',
    'Time change is committed 19:00 to 21:00. Opening/closing an untouched time panel does not verify cancellation of an uncommitted preview.',
    'Tracking source-return crop differs at 25 pixels with maximum channel difference 1; not exact pixel equality. Identity, time, tracking and rounded FOV are read back; the small pixel difference mechanism remains unproven.',
    '88 HTTP records are bounded by prior closure sequence, not the reused phase label. Normal 200/304 does not repeat V29 faults or establish native decode/GPU recovery.',
    'Encoded files 7 to 0 to 3 establish owner cleanup/reload, not decoded/native/GPU memory or peak resource measurements.',
    'Stellarium clock is running and numeric location editor was not verified. Reference remains unmatched; no astronomical registration, roll/FOV or cross-renderer pixel acceptance.',
    'Official WeChat Canvas documentation navigation was blocked by browser site-safety policy. No alternate route was used to obtain the blocked page; local screenshot behavior remains unresolved.',
    'Three native tool failures remain recorded: stale selector and two command quoting failures; corrected read-only quoting succeeded. Null SDK/control extraction diagnostics are superseded by final actual reads, not product failures.',
    'Only task evidence and the existing sole PLAN/state/index/progress are changed. Commercial exclusions/reasons and all 33 valid obligations remain. Phone unavailable, large text paused, final independent review open.',
  ],
};
await fs.writeFile(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output, trace: result.trace, captures: captures.length, pixels, encodedFiles: Object.fromEntries(Object.entries(encodedFiles).map(([stage, row]) => [stage, { count: row.count, bytes: row.bytes }])), runtime, sourceInputsVerified: candidate.sourceInputs.length, mapSourceSha256 }));
