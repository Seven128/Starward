import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fingerprintBundle } from '../../../../tools/miniapp/release-bundle-artifact.mjs';

const task = '.codex/work-items/cloud-sky-native-2026-09-22';
const output = task + '/evidence/experience-canvas-view-binding-2026-10-01.json';
const frozen = task + '/evidence/experience-canvas-view-events-frozen-2026-10-01.jsonl';
const watch = task + '/evidence/experience-canvas-view-watch-frozen-2026-10-01.log';
for (const file of [output, frozen, watch]) await assert.rejects(fs.access(file), { code: 'ENOENT' });
const record = async file => {
  const bytes = await fs.readFile(file);
  return { path: file.replaceAll('\\', '/'), bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex') };
};
const previousPath = task + '/evidence/experience-scene-frame-facts-binding-2026-10-01.json';
const previous = JSON.parse(await fs.readFile(previousPath, 'utf8'));
for (const row of [...previous.preservedRenderingInputs, ...previous.preservedOtherEdits]) {
  assert.equal((await record(row.path)).sha256, row.sha256, row.path);
}
const page = 'apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx';
const context = 'project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md';
const changedFromPrevious = [];
for (const row of previous.productionAndConsumerSources) {
  const current = await record(row.path);
  if ([page, context].includes(row.path)) {
    assert.notEqual(current.sha256, row.sha256, row.path);
    changedFromPrevious.push({ path: row.path, beforeSha256: row.sha256, afterSha256: current.sha256 });
  } else assert.equal(current.sha256, row.sha256, row.path);
}
const originalPage = await record(task + '/tmp/canvas-view-before-page-2026-10-01.tsx');
assert.equal(originalPage.sha256, previous.productionAndConsumerSources.find(row => row.path === page).sha256);
const originalAlignmentTest = await record(task + '/tmp/canvas-view-before-alignment-test-2026-10-01.ts');
const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim();
assert.equal(head, '72e65cf309d700cb7d40c5b7afd53660fd39fa35');
assert.equal(branch, 'codex/remote-main-20260908');
for (const row of previous.byteExactConfigurations) assert.equal((await record(row.path)).sha256, row.sha256);
const preservedCandidates = [];
for (const row of previous.preservedCandidates) {
  const current = await fingerprintBundle(path.resolve(row.path));
  assert.equal(current.sha256, row.sha256);
  preservedCandidates.push({ path: row.path, sha256: current.sha256, fileCount: current.fileCount });
}
const sourcePaths = new Set(previous.productionAndConsumerSources.map(row => row.path));
for (const name of ['sky-canvas-view.ts', 'sky-canvas-view.test.ts', 'sky-alignment-render.test.ts',
  'sky-orientation-controller.ts', 'sky-orientation-controller.test.ts', 'use-sky-orientation.ts',
  'compass-lifecycle.ts', 'sky-browsing-camera.ts', 'sky-browsing-camera.test.ts',
  'sky-presentation-filter.ts', 'sky-presentation-filter.test.ts', 'sky-viewport.ts', 'sky-zoom.ts',
  'device-orientation-view.ts']) sourcePaths.add('apps/wechat-miniapp/src/features/sky/' + name);
const productionAndConsumerSources = await Promise.all([...sourcePaths].map(record));
const raw = await fs.readFile(task + '/evidence/experience-current-native-events-2026-10-01.jsonl');
const prefix = await fs.readFile(previous.trace.path);
assert(raw.subarray(0, prefix.length).equals(prefix));
assert(!/\?[^"\r\n]*(?:contextId=|spotId=)/.test(raw.toString()));
const events = raw.toString().trim().split(/\r?\n/).map(JSON.parse);
const stage = name => {
  const row = events.findLast(row => row.stage === name);
  assert(row, name);
  return row.value;
};
const compileIndex = events.findLastIndex(row => row.stage === 'canvas-view-compiler-requested');
assert(compileIndex >= previous.trace.eventCount);
assert.equal(stage('canvas-view-compiler-dispatched').success, true);
assert.equal(events.slice(compileIndex).filter(row => row.stage === 'tool-failure').length, 0);
assert(events.findLastIndex(row => row.stage === 'canvas-view-app-running') <
  events.findLastIndex(row => row.stage === 'canvas-view-native-entry'));
const baseline = stage('canvas-view-native-baseline-scene');
const overview = stage('canvas-view-native-overview-scene');
const returned = stage('canvas-view-native-return-scene');
const follow = stage('canvas-view-native-follow-scene');
const calibration = stage('canvas-view-native-calibration-scene');
const manualRestored = stage('canvas-view-native-manual-restored-scene');
const current = stage('canvas-view-native-final-scene');
for (const scene of [baseline, overview, returned, follow, calibration, manualRestored, current]) {
  assert.equal(scene.route, 'sky/detail/index');
  assert.equal(scene.canvas.labelFacts.presented, true);
  assert.equal(scene.canvas.labelFacts.frameAt, '2026-09-30T13:50:33.000Z');
  assert.equal(scene.canvas.labelFacts.starCount, 4051);
  assert.equal(scene.canvas.labelFacts.starState, 'AVAILABLE');
  for (const key of ['selection', 'modal', 'time']) assert.equal(scene[key].length, 0);
}
for (const scene of [baseline, returned, follow, calibration, manualRestored, current]) {
  assert.equal(scene.canvas.labelFacts.verticalFovDeg, 45);
}
assert.equal(overview.canvas.labelFacts.verticalFovDeg, 274.9);
assert(follow.status.some(row => row.text === '设备方向暂不可用，保留手动视角'));
const calibrationPanel = stage('canvas-view-native-unavailable-calibration-panel');
assert(String(calibrationPanel).includes('取得设备方向后重新校准'));
assert(!calibration.actions.some(row => row.text === '确定'));
assert.equal(manualRestored.status.length, 0);
assert.notEqual(current.canvas.sid, baseline.canvas.sid);
assert(current.actions.some(row => row.text === '重试暗星'));
assert(current.actions.some(row => row.label === '关闭通知：暗星资料加载异常'));
const geometry = stage('canvas-view-native-return-geometry');
assert.equal(geometry.shortSide, 357);
assert.equal(geometry.insets.top, 297);
assert.equal(geometry.insets.bottom, 190);
assert(Math.abs(geometry.sourceDomeMax - geometry.observedDomeFov) < 0.05);
const files = Object.fromEntries(['baseline', 'overview', 'return', 'exit', 'final'].map(name =>
  [name, stage('canvas-view-native-' + name + '-files')]));
for (const name of ['baseline', 'final']) {
  assert.equal(files[name].count, 10); assert.equal(files[name].encodedBytes, 1789615);
}
for (const name of ['overview', 'return']) {
  assert.equal(files[name].count, 11); assert.equal(files[name].encodedBytes, 5105788);
}
assert.equal(files.exit.count, 0); assert.equal(files.exit.encodedBytes, 0);
const readback = stage('cold-image-durable-context-readback');
assert(readback.revisionUnchanged && readback.instantUnchanged && readback.fingerprintUnchanged);
assert.equal(readback.revision, 1); assert.equal(readback.contextPuts, 0);
assert.equal(readback.moduleSha256, previous.native.readback.moduleSha256);
const ordinaryWatch = await fingerprintBundle(path.resolve(previous.ordinaryWatch.path));
assert.notEqual(ordinaryWatch.sha256, previous.ordinaryWatch.sha256);
const watchedBytes = await fs.readFile(task + '/tmp/weapp-sky-watch-2026-10-01.log');
assert(watchedBytes.toString().includes('13:48:53'));
const passedLog = await fs.readFile(task + '/evidence/experience-canvas-view-tests-final-2026-10-01.log', 'utf8');
assert(passedLog.includes('tests 65') && passedLog.includes('pass 65') && passedLog.includes('fail 0'));
const mutationsPath = task + '/evidence/experience-canvas-view-mutations-2026-10-01.json';
const mutations = JSON.parse(await fs.readFile(mutationsPath, 'utf8'));
assert.equal(mutations.length, 3);
for (const row of mutations) {
  assert.equal(row.exitCode, 1);
  const log = await fs.readFile(row.log, 'utf8');
  assert(log.includes('AssertionError')); assert(!/(?:ReferenceError|SyntaxError):|ERR_MODULE_NOT_FOUND/.test(log));
}
const checks = await Promise.all(['tests', 'tests-final', 'typecheck', 'typecheck-final', 'context-check',
  'mutation-reference', 'mutation-stabilized', 'mutation-native-images'].map(name =>
  record(task + '/evidence/experience-canvas-view-' + name + '-2026-10-01.log')));
const captures = [];
for (const name of ['dispatched', 'baseline', 'overview', 'return', 'final']) {
  const capture = await record(task + '/evidence/experience-current-native-canvas-view-' + name + '-2026-10-01.png');
  assert.equal(capture.sha256, stage('canvas-view-' + name).sha256);
  captures.push(capture);
}
await fs.writeFile(frozen, raw, { flag: 'wx' });
await fs.writeFile(watch, watchedBytes, { flag: 'wx' });
await fs.writeFile(output, JSON.stringify({ at: new Date().toISOString(), head, branch,
  scope: 'Production queued-view/control coordinator; original owners retained; ordinary DevTools whole-dome return, unavailable follow/calibration, exit/reentry. No physical calibration or visible WXML acceptance.',
  previous: await record(previousPath),
  trace: { ...await record(frozen), eventCount: events.length, previous512EventPrefixUnchanged: true,
    currentSourceCompileEventIndex: compileIndex,
    earlierOrientationCombination: 'Events 512 through the next compile retain the previous scene-frame-facts source generation; not current coordinator evidence' },
  preservedRenderingInputs: previous.preservedRenderingInputs, productionAndConsumerSources, changedFromPrevious,
  originalPage, originalAlignmentTest, preservedOtherEdits: previous.preservedOtherEdits,
  preservedCandidates, byteExactConfigurations: previous.byteExactConfigurations,
  ordinaryWatch: { path: previous.ordinaryWatch.path, sha256: ordinaryWatch.sha256,
    fileCount: ordinaryWatch.fileCount, totalBytes: ordinaryWatch.totalBytes, files: ordinaryWatch.files,
    log: await record(watch), sourceCompileAtLocal: '2026-10-01 13:48:53',
    scope: 'Same ordinary watch, containing the six preserved other-work edits; not a clean delivery candidate or official package size' },
  checks, mutations: { ...await record(mutationsPath), cases: mutations },
  verifiedExecution: { affectedTests: { exitCode: 0, pass: 65, fail: 0 }, miniTypecheck: { exitCode: 0 },
    contextStructure: { exitCode: 0, scope: 'Manifest/source declarations only' },
    initialFixtureFailure: 'Camera-forward roll fixture initially confused device gamma with roll; corrected to a full valid rotation without changing production behavior; initial log retained' },
  native: { baseline, overview, returned, follow, calibration, calibrationPanel, manualRestored,
    current, files, readback, returnGeometry: geometry,
    rejectedHarnessAssumption: stage('canvas-view-return-fullscreen-assumption-rejected'),
    markerScope: 'Raw Taro data-* omissions remain explicit. Public stable aria-label supplies labelFacts; missing raw fields are not filled as READY/zero.',
    darkStarFailure: 'Latest reentry reports 暗星资料加载异常 and exposes 重试暗星. Independent bright stars/targets remain valid; SAO runtime success/recovery is not certified.' },
  captures, scripts: await Promise.all(['experience-current-native-helpers-2026-10-01.ps1',
    'experience-canvas-view-native-2026-10-01.ps1', 'experience-current-native-reenter-2026-10-01.ps1'].map(name => record(task + '/scripts/' + name))),
  limits: ['SDK selector input is a simulator event stream, not physical gesture or visible control proof',
    'No valid pose was acquired on this virtual device; full calibration confirm/roll/expiry/background/return has owner/renderer development checks only',
    'Actual screenshots were viewed; no exact full-pixel equality, source quality or complete composition acceptance is claimed',
    'Encoded-file counts/bytes do not measure decoded/native/GPU/OS/GC memory or total peaks',
    'Canvas+WXML composition remains FAILED_DEVTOOLS; Android/iOS/new moon/full journey/performance/package/cost/final independent review remain unverified',
    'No phone, candidate replacement, source download, commit/push/deploy, new agent, clock/reference owner or scope reduction; Goal active/unbudgeted/incomplete']
}, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output, eventCount: events.length, sourceRecords: productionAndConsumerSources.length,
  preservedRenderingInputs: previous.preservedRenderingInputs.length, preservedEdits: previous.preservedOtherEdits.length,
  wholeDomeFov: overview.canvas.labelFacts.verticalFovDeg, returnFov: returned.canvas.labelFacts.verticalFovDeg,
  contextPuts: 0, composition: 'FAILED_DEVTOOLS', sao: 'RUNTIME_FAILURE_REPORTED' }));
