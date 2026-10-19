// One GPU producer-backpressure diagnosis from the ORIGINAL paired candidate.
// Replace only surface.present's flush with finish; retain every native copy,
// complete Scene, real publication and accepted probe. Never a product fix.
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..'), work = path.resolve(here, '..');
const pairRoot = path.join(work, 'tmp/r17-phone-probe');
const trialRoot = path.join(work, 'tmp/r17-gpu-finish-trial');
const sourceRoot = path.join(trialRoot, 'source');
const projectRoot = path.join(trialRoot, 'project');
const feature = 'apps/wechat-miniapp/src/features/sky/';
const surfacePath = feature + 'sky-canvas-surface.ts';
const controlsPath = feature + 'r17-phone-probe-controls.tsx';
const runtimePath = feature + 'r17-phone-probe-runtime.ts';
const pagePath = feature + 'spot-sky-page.tsx';
const slot = 'r17-gpu-finish';
const bundleRoot = path.join(sourceRoot, 'apps/wechat-miniapp/dist/weapp-check-' + slot);
const manifestPath = path.join(trialRoot, 'manifest.json');
const evidencePath = path.join(work, 'R17-GPU-FINISH-TRIAL.json');
const mode = process.argv[2] ?? 'prepare';
const run = promisify(execFile), require = createRequire(import.meta.url);
const sha = value => createHash('sha256').update(value).digest('hex');
const relative = value => path.relative(root, value).replaceAll('\\', '/');
const read = file => fs.readFile(path.join(root, file));
const json = file => fs.readFile(file, 'utf8').then(JSON.parse);
const scope = 'TASK_ONLY_GPU_FINISH_BACKPRESSURE_DIAGNOSTIC_NOT_PRODUCT_ACCEPTANCE';
const scriptPath = fileURLToPath(import.meta.url);
const diagnosticControlsPath = path.join(here, 'r17-gpu-finish-controls.tsx');
const diagnosticControls = await fs.readFile(diagnosticControlsPath, 'utf8');
const absent = async target => {
  try { await fs.lstat(target); throw Error('trial_output_already_exists'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
};
if (!['prepare', 'build', 'inspect'].includes(mode)) throw Error('use_prepare_build_or_inspect');
if (trialRoot !== path.join(work, 'tmp', 'r17-gpu-finish-trial')) throw Error('trial_scope_required');
if ((await fs.realpath(path.dirname(trialRoot))).toLowerCase() !== path.join(await fs.realpath(work), 'tmp').toLowerCase())
  throw Error('trial_parent_scope_mismatch');

const { fingerprintBundle, inspectReleaseBundleBudget } = await import(pathToFileURL(path.join(root, 'tools/miniapp/release-bundle-artifact.mjs')));
const { inspectCandidate } = await import(pathToFileURL(path.join(root, 'tools/miniapp/inspect-production.mjs')));
const { assertPhysicalDeviceBundleSafe } = await import(pathToFileURL(path.join(root, 'tools/miniapp/device-feedback-snapshot.mjs')));
const ts = require(path.join(root, 'apps/wechat-miniapp/node_modules/typescript'));

function replaceOne(source, from, to, label) {
  if (source.split(from).length !== 2) throw Error('trial_source_boundary_changed:' + label);
  return source.replace(from, to);
}
function trialSurface(source) {
  source = replaceOne(source, 'export interface SkyWebGLCanvas', `// Task-only scalar counters; no native identifiers, retained frame arrays or render loop.
let r17Surfaces = 0, r17CompletedFinishes = 0, r17ActualCopies = 0;
export function r17GpuFinishStats() {
  return { surfaces: r17Surfaces, completedFinishes: r17CompletedFinishes, actualCopies: r17ActualCopies };
}

export interface SkyWebGLCanvas`, 'scalar_diagnostic_owner');
  source = replaceOne(source, '    return {\n      node: ownedNode, gl: ownedGl,',
    '    if (r17Surfaces < Number.MAX_SAFE_INTEGER) r17Surfaces++;\n    return {\n      node: ownedNode, gl: ownedGl,', 'surface_counter');
  source = replaceOne(source, '        ownedGl.flush();',
    `        // Diagnostic only: wait for GL completion before the original copy.
        // A missing/throwing API follows the existing failed-present boundary.
        ownedGl.finish();
        if (r17CompletedFinishes < Number.MAX_SAFE_INTEGER) r17CompletedFinishes++;`, 'gpu_completion');
  return replaceOne(source, '        context.drawImage(ownedNode, 0, 0, width, height);',
    `        context.drawImage(ownedNode, 0, 0, width, height);
        if (r17ActualCopies < Number.MAX_SAFE_INTEGER) r17ActualCopies++;`, 'copy_counter');
}
const trialControls = () => diagnosticControls;
function trialPage(source) {
  source = replaceOne(source, 'import { R17PhoneProbeControls } from "./r17-phone-probe-controls";',
    'import { R17PhoneProbeControls, useR17GpuFinishLifecycle, r17GpuFinishProductPlayStarted } from "./r17-phone-probe-controls";', 'page_diagnostic_import');
  source = replaceOne(source, 'export function SpotSkyPage({ targetOpticalPublication,opticalHipsContributions }: SpotSkyPageProps = {}) {',
    'export function SpotSkyPage({ targetOpticalPublication,opticalHipsContributions }: SpotSkyPageProps = {}) {\n  useR17GpuFinishLifecycle();', 'page_lifecycle_hook');
  return replaceOne(source, '    setTimeIntent(observationTime.play(Date.now()));',
    '    setTimeIntent(observationTime.play(Date.now()));\n    r17GpuFinishProductPlayStarted();', 'real_product_play_hook');
}

// Bounded JS fixtures execute the exact staged owners, not a replacement Scene.
// Their native GL completion, target pixels and memory effects remain unverified.
async function verifyFinishScope() {
  const transpile = source => ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const load = (source, require, extra = {}, suffix = '') => {
    const module = { exports: {} };
    vm.runInNewContext('(function(exports,require,module){' + transpile(source) + '\n' + suffix + '\n})', { console, ...extra })(module.exports, require, module);
    return module.exports;
  };
  const events = [], stack = [];
  let failCopy = false, failFinish = false, lost = false, widthWrites = 0, allocations = 0;
  const context = {
    globalAlpha: 1,
    save() { stack.push(this.globalAlpha); events.push('save'); },
    restore() { this.globalAlpha = stack.pop(); events.push('restore'); },
    drawImage(_source, x, y, width, height) {
      assert.deepEqual([x, y, width, height], [0, 0, 780, 1688]); events.push('native-copy');
      if (failCopy) throw Error('trial_copy_failed');
    },
    scale() {}, measureText() { return { width: 12 }; }, fillText() { events.push('caption'); },
  };
  const surfaceApi = load(await fs.readFile(path.join(sourceRoot, surfacePath), 'utf8'), name => {
    if (name === './sky-selection-reticle') return {
      createSkySelectionLayer() { throw Error('unexpected_selection_layer'); },
      paintSkySelectionReticle(value) { assert.strictEqual(value, context); events.push('reticle'); },
    };
    if (name === '../../services/runtime-error') return { reportRuntimeError() { throw Error('unexpected_runtime_error'); } };
    throw Error('unexpected_fixture_import:' + name);
  });
  const makeSurface = () => {
    let nodeWidth = 0, nodeHeight = 0;
    const gl = { isContextLost: () => lost, flush: () => { throw Error('flush_must_not_be_used'); },
      finish() { events.push('finish'); if (failFinish) throw Error('trial_finish_failed'); }, getExtension: () => null };
    const node = { get width() { return nodeWidth; }, set width(value) { nodeWidth = value; widthWrites++; },
      get height() { return nodeHeight; }, set height(value) { nodeHeight = value; widthWrites++; },
      getContext: () => gl, createImage() { throw Error('unexpected_frame_image_allocation'); } };
    const display = { width: 0, height: 0, getContext: () => context };
    return surfaceApi.createSkyCanvasSurface(display, { width: 390, height: 844 }, 2, () => { allocations++; return node; });
  };
  const reticle = { x: 10, y: 20, radiusPx: 12, shape: 'cross', color: '#fff' };
  const captions = [{ text: 'Name', x: 30, y: 40, opacity: 1, letterSpacing: 0 }];
  const surface = makeSurface(), initialWrites = widthWrites;
  for (let frame = 0; frame < 20; frame++) {
    events.length = 0; surface.present(reticle, captions);
    assert.deepEqual(events, ['finish', 'native-copy', 'save', 'caption', 'restore', 'reticle']);
  }
  assert.equal(widthWrites, initialWrites); assert.equal(allocations, 1); assert.equal(stack.length, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(surfaceApi.r17GpuFinishStats())), { surfaces: 1, completedFinishes: 20, actualCopies: 20 });
  failFinish = true; events.length = 0;
  assert.throws(() => surface.present(reticle, captions), /trial_finish_failed/u);
  assert.deepEqual(events, ['finish']); assert.equal(surfaceApi.r17GpuFinishStats().completedFinishes, 20);
  failFinish = false; const finish = surface.gl.finish; surface.gl.finish = undefined; events.length = 0;
  assert.throws(() => surface.present(reticle, captions), /finish/u);
  assert.deepEqual(events, []); surface.gl.finish = finish;
  failCopy = true; events.length = 0;
  assert.throws(() => surface.present(reticle, captions), /trial_copy_failed/u);
  assert.deepEqual(events, ['finish', 'native-copy']);
  assert.equal(surfaceApi.r17GpuFinishStats().completedFinishes, 21);
  assert.equal(surfaceApi.r17GpuFinishStats().actualCopies, 20);
  failCopy = false; surface.present(reticle, captions);
  assert.equal(surfaceApi.r17GpuFinishStats().actualCopies, 21);
  lost = true; events.length = 0;
  assert.throws(() => surface.present(reticle, captions), /sky_canvas_surface_invalidated/u);
  assert.deepEqual(events, []); lost = false;

  let clock = 0, nextTimer = 0, hide, pageUnmount;
  const timers = new Map(), requests = [];
  const schedule = (callback, delay) => { const id = ++nextTimer; timers.set(id, { callback, at: clock + delay }); return id; };
  const advance = to => { while (true) {
    const due = [...timers].filter(([, value]) => value.at <= to).sort((a, b) => a[1].at - b[1].at)[0];
    if (!due) break; timers.delete(due[0]); clock = due[1].at; due[1].callback();
  } clock = to; };
  const timerEnvironment = { setTimeout: schedule, clearTimeout: id => timers.delete(id), performance: { now: () => clock } };
  const probe = load(await fs.readFile(path.join(sourceRoot, runtimePath), 'utf8'), name => { throw Error(name); }, timerEnvironment).r17Probe;
  const jsx = (type, props) => ({ type, props });
  const controls = load(await fs.readFile(path.join(sourceRoot, controlsPath), 'utf8'), name => {
    if (name === './r17-phone-probe-runtime') return { r17Probe: probe };
    if (name === './sky-canvas-surface') return surfaceApi;
    if (name === 'react') return { useEffect: effect => { pageUnmount ??= effect(); }, useState: value => [value === false ? true : value, () => {}] };
    if (name === '@tarojs/taro') return { __esModule: true, useDidHide: callback => { hide = callback; }, default: { request(options) {
      return new Promise(resolve => requests.push({ options, resolve }));
    } } };
    if (name === '@tarojs/components') return { Button: 'Button', Text: 'Text', View: 'View' };
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    throw Error('unexpected_controls_import:' + name);
  }, { ...timerEnvironment, __MINIAPP_API_BASE__: 'http://diagnostic.invalid' },
  'exports.fixture = { startDiagnostic, exportDiagnostic, cancelDiagnostic, getStatus: () => status };');
  controls.useR17GpuFinishLifecycle();
  assert.equal(typeof hide, 'function'); assert.equal(typeof pageUnmount, 'function');
  const findNode = (node, predicate) => {
    if (Array.isArray(node)) { for (const child of node) { const result = findNode(child, predicate); if (result) return result; } return; }
    if (!node || typeof node !== 'object') return;
    if (predicate(node)) return node;
    return findNode(node.props?.children, predicate);
  };
  let openedCase = null;
  const menu = controls.R17PhoneProbeControls({ onStart: key => { openedCase = key; }, onPrepareFov() { throw Error('unexpected_prepare'); } });
  const selectPlay = findNode(menu, node => node.props?.id === 'r17-probe-start-narrow-play');
  assert(selectPlay); selectPlay.props.onClick();
  assert.equal(openedCase, 'narrow-play'); assert.equal(timers.size, 0); assert.equal(probe.status(), 'empty');
  advance(20000); assert.equal(requests.length, 0); assert.equal(timers.size, 0);
  await controls.fixture.exportDiagnostic(); assert.equal(requests.length, 0);
  assert.match(controls.fixture.getStatus(), /等待正常播放按钮/u);

  const pageSource = await fs.readFile(path.join(sourceRoot, pagePath), 'utf8');
  assert.equal(pageSource.split('useR17GpuFinishLifecycle();').length, 2);
  assert.equal(pageSource.split('r17GpuFinishProductPlayStarted();').length, 2);
  assert(pageSource.includes('onPause={pauseSkyTime} onTogglePlay={toggleSkyTimePlayback}'));
  assert(pageSource.includes('onStart={key => setSkyControlPanel(key.endsWith("-camera") ? null : "time")}'));
  const playFirst = pageSource.indexOf('  const toggleSkyTimePlayback = () => {');
  const playLast = pageSource.indexOf('  const commitInstant = ', playFirst);
  assert(playFirst > 0 && playLast > playFirst);
  const playOwner = pageSource.slice(playFirst, playLast);
  let productMode = 'PREVIEW', playCalls = 0, pauseCalls = 0, published = 0, prepared = 0;
  const at = '2026-10-18T00:00:00.000Z';
  const ownerEnvironment = { ownerCurrent: false, datePickerOpenRef: { current: false },
    timeModel: { endAt: '2026-10-18T12:00:00.000Z' }, geometryReport: {}, report: { isError: false, data: { dataState: 'FRESH' } },
    skyTimeIntentCurrent: () => ownerEnvironment.ownerCurrent, cancelSkyCalibration() { prepared++; },
    observationTime: { snapshot: () => ({ mode: productMode, at }),
      play: () => { playCalls++; return { mode: 'PLAYING', at }; }, pause: () => { pauseCalls++; return { mode: 'PAUSED', at }; } },
    setTimeIntent: value => { productMode = value.mode; },
    r17GpuFinishProductPlayStarted: controls.r17GpuFinishProductPlayStarted };
  const togglePlay = vm.runInNewContext('(function(){' + transpile(playOwner) + ';return toggleSkyTimePlayback;})()', ownerEnvironment);
  // Render the unchanged product time-control owner and use its actual Play onClick.
  const timeControls = load(await fs.readFile(path.join(sourceRoot, feature + 'sky-time-controls.tsx'), 'utf8'), name => {
    if (name === '@tarojs/components') return { Button: 'Button', Input: 'Input', Text: 'Text', View: 'View' };
    if (name === '@tarojs/taro') return { __esModule: true, useDidHide() {}, default: {} };
    if (name === 'react') return { useState: value => [value, () => {}], useRef: value => ({ current: value }),
      useMemo: factory => factory(), useCallback: callback => callback, useEffect() {} };
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === '@starward/miniapp-contracts') return { localParts: () => ({ year: 2026, month: 10, day: 18, hour: 0, minute: 0, second: 0 }) };
    if (name === '@/components/semantic-asset') return { SemanticIcon: 'SemanticIcon' };
    if (name === './sky-time-input') return { createSkyTimeRepeat: () => ({ stop() {} }), skyTimeInputAllowed: () => true };
    throw Error('unexpected_time_control_import:' + name);
  });
  const productControl = timeControls.SkyTimeControls({ at, timezone: 'UTC', active: true, current: () => true,
    playing: false, canPlay: true, onPreview: () => true, onApply() { throw Error('unexpected_context_apply'); },
    onTogglePlay: togglePlay, onPause() { throw Error('unexpected_product_pause'); } });
  const productPlay = findNode(productControl, node => node.props?.ariaLabel === '1倍播放');
  assert(productPlay); assert.equal(productPlay.props.disabled, false);
  productPlay.props.onClick(); // stale page: the original page guard rejects it.
  assert.equal(playCalls, 0); assert.equal(timers.size, 0);
  ownerEnvironment.ownerCurrent = true; ownerEnvironment.datePickerOpenRef.current = true;
  productPlay.props.onClick(); assert.equal(playCalls, 0); assert.equal(timers.size, 0);
  ownerEnvironment.datePickerOpenRef.current = false; productMode = 'PLAYING';
  productPlay.props.onClick(); assert.equal(pauseCalls, 1); assert.equal(timers.size, 0);
  productPlay.props.onClick(); // the real guarded play branch now accepts.
  assert.equal(playCalls, 1); assert.equal(prepared, 1); assert.equal(productMode, 'PLAYING');
  assert.equal(timers.size, 2); assert.equal(probe.status(), 'armed');
  assert.equal(controls.r17GpuFinishProductPlayStarted(), false); assert.equal(timers.size, 2);
  advance(21000); assert.equal(probe.status(), 'recording');

  const first = pageSource.indexOf('      r17Probe.measure("displayCopy"');
  const last = pageSource.indexOf('      setCanvasSize(', first);
  assert(first > 0 && last > first);
  const completion = pageSource.slice(first, last);
  assert.equal(completion.split('attempt.publish!').length, 2);
  assert.equal(completion.split('r17Probe.accepted(frame,paintedSkyObjectsRef.current);').length, 2);
  const executeCompletion = vm.runInNewContext('(function(r17Probe,surface,attempt,selectionCurrent,excludedNameKeys,frame,paintedSkyObjectsRef){' + transpile(completion) + '})');
  for (let frameIndex = 0; frameIndex < 10; frameIndex++) {
    advance(21000 + frameIndex * 1000);
    const frame = { frameAt: new Date(Date.parse(at) + frameIndex * 1000).toISOString() };
    const snapshot = { objects: [{ reference: 'HR:1' }, { reference: 'SAO:1' }] };
    probe.intent({ at: frame.frameAt }); probe.prepared(frame); probe.paintStarted(frame); probe.callback(frame);
    executeCompletion(probe, surface, { reticle, captions, publish() { published++; } }, true, [], frame, { current: snapshot });
  }
  assert.equal(published, 10); assert.equal(surfaceApi.r17GpuFinishStats().actualCopies, 31);
  failFinish = true;
  assert.throws(() => executeCompletion(probe, surface, { reticle, captions, publish() { published++; } }, true, [],
    { frameAt: at }, { current: { objects: [] } }), /trial_finish_failed/u);
  failFinish = false; assert.equal(published, 10);
  advance(34999); assert.equal(requests.length, 0);
  advance(35000); assert.equal(requests.length, 1); assert.equal(timers.size, 0);
  assert.equal(productMode, 'PLAYING'); assert.equal(pauseCalls, 1); // export never pauses product.
  const receipt = JSON.parse(requests[0].options.data);
  assert.equal(receipt.schemaVersion, 'starward-r17-phone-probe-v1'); assert.equal(receipt.variant, 'candidate');
  assert.equal(receipt.caseKey, 'narrow-play'); assert.equal(receipt.window.durationLimitMs, 45000);
  assert.equal(receipt.window.reason, 'manual'); assert.equal(receipt.window.elapsedMs, 14000);
  assert.equal(receipt.counters.acceptedCopies, 10); assert.equal(receipt.time.accepted.events, 10);
  assert.equal(receipt.time.accepted.distinct, 10); assert.equal(receipt.cpu.publishAccepted.calls, 10);
  assert.equal(receipt.cpu.displayCopy.calls, 11); assert(requests[0].options.data.length <= 32768);
  await controls.fixture.exportDiagnostic(); assert.equal(requests.length, 1);
  assert.equal(controls.fixture.startDiagnostic('wide-play'), false);
  requests[0].resolve({ statusCode: 200, data: { stored: true } });
  await Promise.resolve(); await Promise.resolve();
  assert.match(controls.fixture.getStatus(), /candidate\/gpu-finish S1 F32 C31 已导出 .*14000ms\/manual/u);
  const retry = controls.fixture.exportDiagnostic(); assert.equal(requests.length, 2);
  assert.equal(requests[1].options.data, requests[0].options.data);
  requests[1].resolve({ statusCode: 200, data: { stored: true } }); await retry;
  controls.fixture.startDiagnostic('wide-camera'); assert.equal(timers.size, 2); // unchanged immediate start for non-play cases.
  controls.fixture.startDiagnostic('narrow-play'); assert.equal(timers.size, 0);
  hide(); assert.equal(timers.size, 0); assert.equal(controls.r17GpuFinishProductPlayStarted(), false);
  controls.fixture.startDiagnostic('narrow-play'); controls.r17GpuFinishProductPlayStarted();
  assert.equal(timers.size, 2); hide(); assert.equal(timers.size, 0);
  advance(100000); assert.equal(requests.length, 2);
  controls.fixture.startDiagnostic('narrow-play'); controls.r17GpuFinishProductPlayStarted();
  assert.equal(timers.size, 2); pageUnmount(); assert.equal(timers.size, 0);
  controls.fixture.startDiagnostic('narrow-play'); controls.r17GpuFinishProductPlayStarted();
  const pending = controls.fixture.exportDiagnostic(); assert.equal(requests.length, 3);
  hide(); const afterHide = controls.fixture.getStatus();
  requests[2].resolve({ statusCode: 200, data: { stored: true } }); await pending;
  assert.equal(controls.fixture.getStatus(), afterHide);
  await controls.fixture.exportDiagnostic(); assert.equal(requests.length, 3);
  surface.dispose();
  return { finishBeforeEveryOriginalNativeCopy: true, noFlushFallback: true, missingAndThrowingFinishPropagate: true,
    failedCopyRetriesNormally: true, captionsAndReticleRetained: true, realAttemptPublishAndAcceptedRetained: true,
    failedFinishDoesNotPublishOrAccept: true, noPerPresentAllocationOrResize: true, boundedScalarCountersOnly: true,
    actualProductPlayOnClickThroughOriginalGuardedOwner: true, playSelectionArmsWithoutStartingTimersOrPlayback: true,
    rejectedOrPauseActionDoesNotBeginMeasurement: true, otherCasesStartImmediately: true,
    autoExportOnce15SecondsAfterActualPlay: true, nominal14ActiveSecondsManualWithOriginal45SecondLimit: true,
    nonemptyAcceptedCopiesAndDistinctTimesInFixture: true, exportDoesNotPauseProductPlayback: true,
    exactPayloadRetryAndConcurrentExportGuard: true, replacementHideUnmountClearArmingAndTimers: true,
    staleExportCompletionFenced: true, fixtureOnlyNotTargetPixelsOrMemory: true };
}

async function originalBindings() {
  const manifestBytes = await fs.readFile(path.join(pairRoot, 'manifest.json'));
  const proofBytes = await fs.readFile(path.join(work, 'R17-PHONE-PROBE-BUILD.json'));
  const manifest = JSON.parse(manifestBytes), proof = JSON.parse(proofBytes);
  if (manifest.scope !== 'TASK_ONLY_DIAGNOSTIC_NOT_FORMAL_ACCEPTANCE' ||
    Object.keys(manifest.variants).sort().join(',') !== 'baseline,candidate' || proof.measurementWindow.durationLimitMs !== 45000)
    throw Error('admitted_45_second_pair_required');
  if (proof.variants.candidate.bundleSha256 !== 'a95a2a7389e9023d49e3ca4932adb0322126892bf8d958dc988b5c909c36c8bf' ||
    proof.variants.baseline.bundleSha256 !== '61b5ce1bc7f5ab1954a992c69fb2224468488ee750a3488a54832bb0dd54bef5')
    throw Error('exact_original_pair_required');
  const sourceHashes = {}, bundleHashes = {};
  const runtimeTemplate = await fs.readFile(path.join(here, 'r17-phone-probe-runtime.ts'), 'utf8');
  const controlsTemplate = await fs.readFile(path.join(here, 'r17-phone-probe-controls.tsx'), 'utf8');
  if (sha(runtimeTemplate) !== manifest.probeTemplateSha256 || sha(controlsTemplate) !== manifest.controlsTemplateSha256)
    throw Error('original_pair_templates_changed');
  for (const variant of ['baseline', 'candidate']) {
    const item = manifest.variants[variant];
    const directory = path.join(root, item.directory);
    if (directory !== path.join(pairRoot, variant)) throw Error('original_pair_source_scope_mismatch');
    const hashes = {};
    for (const [file, originalHash] of Object.entries(manifest.sourceSnapshot)) {
      if (path.isAbsolute(file) || file.split('/').includes('..')) throw Error('original_source_path_invalid');
      const edit = file.startsWith(feature) ? item.instrumentation[file.slice(feature.length)] : null;
      const preserved = manifest.baselineSources.find(row => row.path === file);
      const expected = edit?.afterSha256 ?? (variant === 'baseline' && preserved ? preserved.sha256 : originalHash);
      const actual = sha(await fs.readFile(path.join(directory, file)));
      if (actual !== expected) throw Error('original_pair_source_changed:' + variant + ':' + file);
      hashes[file] = actual;
    }
    for (const [file, template] of [[runtimePath, runtimeTemplate], [controlsPath, controlsTemplate]]) {
      const expected = sha(template.replaceAll('__VARIANT__', variant));
      if (sha(await fs.readFile(path.join(directory, file))) !== expected) throw Error('original_pair_diagnostic_source_changed');
      hashes[file] = expected;
    }
    sourceHashes[variant] = hashes;
    if (item.result.bundleSha256 !== proof.variants[variant].bundleSha256) throw Error('original_pair_evidence_mismatch');
    for (const folder of [item.result.bundleDirectory, item.result.projectDirectory + '/weapp']) {
      if (!path.resolve(root, folder).startsWith(pairRoot + path.sep)) throw Error('original_bundle_scope_mismatch');
      if ((await fingerprintBundle(path.join(root, folder))).sha256 !== item.result.bundleSha256) throw Error('original_pair_bundle_changed');
    }
    bundleHashes[variant] = item.result.bundleSha256;
  }
  const allowed = new Set([...manifest.baselineSources.map(row => row.path), runtimePath, controlsPath]);
  const differences = Object.keys(sourceHashes.candidate).filter(file => sourceHashes.candidate[file] !== sourceHashes.baseline[file]);
  if (differences.length !== 7 || differences.some(file => !allowed.has(file))) throw Error('original_pair_parity_changed');
  return { sourceHashes, bundleHashes, sourceManifestSha256: sha(manifestBytes), buildEvidenceSha256: sha(proofBytes),
    normalFiles: Object.keys(manifest.sourceSnapshot), candidateDirectory: path.join(pairRoot, 'candidate') };
}

async function readNormalBindings(files) {
  const hashes = {};
  for (const file of files) hashes[file] = sha(await read(file));
  return hashes;
}
async function priorTrialBindings() {
  const bindings = {};
  for (const name of ['r17-canvas-copy-trial', 'r17-native-copy-suppression-trial']) {
    const directory = path.join(work, 'tmp', name), manifestBytes = await fs.readFile(path.join(directory, 'manifest.json'));
    const prior = JSON.parse(manifestBytes);
    if (path.resolve(root, prior.sourceDirectory) !== path.join(directory, 'source') || !prior.result)
      throw Error('prior_trial_source_scope_changed');
    for (const [file, expected] of Object.entries(prior.trialSourceBindings)) {
      if (path.isAbsolute(file) || file.split('/').includes('..')) throw Error('prior_source_path_invalid');
      if (sha(await fs.readFile(path.join(root, prior.sourceDirectory, file))) !== expected)
        throw Error('prior_trial_source_changed:' + name + ':' + file);
    }
    for (const folder of [prior.result.bundleDirectory, prior.result.projectDirectory + '/weapp']) {
      if (!path.resolve(root, folder).startsWith(directory + path.sep)) throw Error('prior_trial_bundle_scope_changed');
      if ((await fingerprintBundle(path.join(root, folder))).sha256 !== prior.result.bundleSha256)
        throw Error('prior_trial_bundle_changed:' + name);
    }
    bindings[name] = { manifestSha256: sha(manifestBytes), sourceFiles: Object.keys(prior.trialSourceBindings).length,
      sourceBindingsSha256: sha(JSON.stringify(prior.trialSourceBindings)), bundleSha256: prior.result.bundleSha256 };
  }
  return bindings;
}
async function verifyBindings(manifest) {
  if (manifest.scope !== scope || manifest.builderSha256 !== sha(await fs.readFile(scriptPath)) ||
    manifest.diagnosticControlsSha256 !== sha(diagnosticControls)) throw Error('trial_owner_or_builder_changed');
  const original = await originalBindings();
  if (original.sourceManifestSha256 !== manifest.original.sourceManifestSha256 ||
    original.buildEvidenceSha256 !== manifest.original.buildEvidenceSha256 ||
    JSON.stringify(original.bundleHashes) !== JSON.stringify(manifest.original.bundleHashes) ||
    sha(JSON.stringify(original.sourceHashes)) !== manifest.original.allSourceBindingsSha256)
    throw Error('original_pair_changed_after_trial_preparation');
  if (JSON.stringify(await readNormalBindings(Object.keys(manifest.normalSourceBindings))) !== JSON.stringify(manifest.normalSourceBindings))
    throw Error('normal_source_changed_after_trial_preparation');
  if (JSON.stringify(await priorTrialBindings()) !== JSON.stringify(manifest.priorTrialBindings))
    throw Error('preceding_trials_changed_after_trial_preparation');
  for (const [file, expected] of Object.entries(manifest.trialSourceBindings))
    if (sha(await fs.readFile(path.join(sourceRoot, file))) !== expected) throw Error('trial_source_readback_mismatch:' + file);
  const differences = Object.keys(original.sourceHashes.candidate).filter(file => original.sourceHashes.candidate[file] !== manifest.trialSourceBindings[file]);
  if (differences.length !== 3 || ![surfacePath, controlsPath, pagePath].every(file => differences.includes(file))) throw Error('trial_source_parity_mismatch');
  if (await fs.readFile(path.join(sourceRoot, surfacePath), 'utf8') !== trialSurface(await fs.readFile(path.join(original.candidateDirectory, surfacePath), 'utf8')) ||
    await fs.readFile(path.join(sourceRoot, controlsPath), 'utf8') !== trialControls() ||
    await fs.readFile(path.join(sourceRoot, pagePath), 'utf8') !== trialPage(await fs.readFile(path.join(original.candidateDirectory, pagePath), 'utf8')))
    throw Error('trial_single_variable_patch_mismatch');
  for (const relativePath of ['node_modules', 'apps/wechat-miniapp/node_modules']) {
    const link = path.join(sourceRoot, relativePath);
    if (!(await fs.lstat(link)).isSymbolicLink() || (await fs.realpath(link)).toLowerCase() !== (await fs.realpath(path.join(original.candidateDirectory, relativePath))).toLowerCase())
      throw Error('trial_dependency_junction_changed');
  }
  return verifyFinishScope();
}

if (mode === 'prepare') {
  await absent(trialRoot); await absent(evidencePath);
  const original = await originalBindings();
  const normalSourceBindings = await readNormalBindings(original.normalFiles);
  const { stdout: head } = await run('git', ['rev-parse', 'HEAD'], { cwd: root, windowsHide: true });
  await fs.mkdir(trialRoot);
  const manifest = { scope, createdAt: new Date().toISOString(), head: head.trim(), builderSha256: sha(await fs.readFile(scriptPath)),
    diagnosticControlsSha256: sha(diagnosticControls),
    sourceDirectory: relative(sourceRoot), original: { sourceManifestSha256: original.sourceManifestSha256,
      buildEvidenceSha256: original.buildEvidenceSha256, bundleHashes: original.bundleHashes,
      allSourceBindingsSha256: sha(JSON.stringify(original.sourceHashes)), candidateSourceBindings: original.sourceHashes.candidate },
    normalSourceBindings, priorTrialBindings: await priorTrialBindings(), trialSourceBindings: {}, exactDifferences: [surfacePath, controlsPath, pagePath], result: null };
  // Persist provenance before copying or changing any generated source.
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
  for (const file of Object.keys(original.sourceHashes.candidate)) {
    const destination = path.join(sourceRoot, file); await fs.mkdir(path.dirname(destination), { recursive: true });
    const bytes = await fs.readFile(path.join(original.candidateDirectory, file));
    const copied = file === surfacePath ? trialSurface(bytes.toString('utf8')) : file === controlsPath ? trialControls() : file === pagePath ? trialPage(bytes.toString('utf8')) : bytes;
    await fs.writeFile(destination, copied, { flag: 'wx' }); manifest.trialSourceBindings[file] = sha(copied);
  }
  for (const relativePath of ['node_modules', 'apps/wechat-miniapp/node_modules'])
    await fs.symlink(await fs.realpath(path.join(original.candidateDirectory, relativePath)), path.join(sourceRoot, relativePath), 'junction');
  manifest.scopeBehaviorChecks = await verifyBindings(manifest);
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({ prepared: true, sourceFiles: Object.keys(manifest.trialSourceBindings).length,
    sourceManifest: relative(manifestPath), exactDifferences: manifest.exactDifferences, scopeBehaviorChecks: manifest.scopeBehaviorChecks }));
} else {
  const manifest = await json(manifestPath);
  const behavior = await verifyBindings(manifest);
  if (mode === 'build') {
    await absent(bundleRoot); await absent(projectRoot);
    if (manifest.result) throw Error('trial_already_built');
    // Use the already authorized account service's physical listener only to
    // derive the bridge origin in memory; never print/store a concrete address.
    const { stdout } = await run('pwsh', ['-NoProfile', '-Command', '(Get-NetTCPConnection -State Listen -LocalPort 8791 | Select-Object -First 1).LocalAddress'], { windowsHide: true });
    const address = stdout.trim();
    if (!/^\d+\.\d+\.\d+\.\d+$/.test(address) || address.startsWith('127.') || address === '0.0.0.0') throw Error('authorized_physical_listener_required');
    const origin = `http://${address}:8795`;
    const env = { ...process.env, MINIAPP_ISOLATED_CHECK_BUILD: '1', MINIAPP_ISOLATED_CHECK_BUILD_SLOT: slot,
      MINIAPP_API_BASE: origin, MINIAPP_SKY_RESOURCE_BASE: origin };
    for (const key of ['MINIAPP_DEVELOPMENT_FIXTURE_MODE', 'MINIAPP_ISOLATED_FIXTURE_BUILD', 'MINIAPP_ACCEPTANCE_DIAGNOSTICS',
      'MINIAPP_DEVICE_REQUEST_DIAGNOSTICS', 'MINIAPP_OPERATOR_PREVIEW_TOKEN', 'MINIAPP_RELEASE_BUNDLE_ID', 'MINIAPP_SKY_FEEDBACK_ID']) delete env[key];
    const redact = text => String(text ?? '').replaceAll(origin, '[physical-LAN-bridge-8795]').replaceAll(address, '[physical-LAN-listener]');
    try {
      const build = await run(process.execPath, [path.join(root, 'tools/run-node.cjs'), '--bin', '@tarojs/cli', 'taro', 'build', '--type', 'weapp'],
        { cwd: path.join(sourceRoot, 'apps/wechat-miniapp'), env, windowsHide: true, maxBuffer: 30 * 1024 * 1024 });
      await fs.writeFile(path.join(trialRoot, 'build-redacted.log'), redact(build.stdout) + '\n' + redact(build.stderr));
    } catch (error) {
      await fs.writeFile(path.join(trialRoot, 'build-redacted.log'), redact(error.stdout) + '\n' + redact(error.stderr));
      throw Error('trial_complete_build_failed_see_redacted_log');
    }
    await assertPhysicalDeviceBundleSafe(bundleRoot);
    const fingerprint = await fingerprintBundle(bundleRoot), budget = await inspectReleaseBundleBudget(fingerprint, bundleRoot);
    const inspection = await inspectCandidate({ bundleDirectory: relative(bundleRoot) });
    if (Object.values(inspection.checks).some(value => value !== true)) throw Error('trial_static_candidate_checks_failed');
    await fs.mkdir(projectRoot);
    const config = JSON.parse(await fs.readFile(path.join(sourceRoot, 'apps/wechat-miniapp/project.config.json'), 'utf8'));
    config.miniprogramRoot = 'weapp/'; delete config.srcMiniprogramRoot; config.projectname = 'starward-r17-gpu-finish-trial';
    if (config.setting) delete config.setting.useCompilerPlugins;
    await fs.writeFile(path.join(projectRoot, 'project.config.json'), JSON.stringify(config, null, 2) + '\n', { flag: 'wx' });
    await fs.cp(bundleRoot, path.join(projectRoot, 'weapp'), { recursive: true, errorOnExist: true, force: false });
    if ((await fingerprintBundle(path.join(projectRoot, 'weapp'))).sha256 !== fingerprint.sha256) throw Error('trial_project_copy_mismatch');
    manifest.result = { bundleDirectory: relative(bundleRoot), projectDirectory: relative(projectRoot), bundleSha256: fingerprint.sha256,
      fileCount: fingerprint.fileCount, totalBytes: fingerprint.totalBytes, packages: budget.packages,
      mainHeadroomBytes: budget.limits.perPackageBytes - budget.packages.main.bytes, staticChecks: inspection.checks };
    manifest.scopeBehaviorChecks = await verifyBindings(manifest);
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log(JSON.stringify({ buildReady: true, ...manifest.result }));
  } else {
    if (!manifest.result) throw Error('complete_trial_build_required');
    await assertPhysicalDeviceBundleSafe(bundleRoot);
    const fingerprint = await fingerprintBundle(bundleRoot), project = await fingerprintBundle(path.join(projectRoot, 'weapp'));
    if (fingerprint.sha256 !== manifest.result.bundleSha256 || project.sha256 !== fingerprint.sha256) throw Error('trial_bundle_readback_mismatch');
    const budget = await inspectReleaseBundleBudget(fingerprint, bundleRoot);
    const inspection = await inspectCandidate({ bundleDirectory: relative(bundleRoot) });
    if (Object.values(inspection.checks).some(value => value !== true)) throw Error('trial_static_candidate_checks_failed');
    const evidence = { scope, status: 'BUILD_READY_GPU_FINISH_DIAGNOSTIC_TARGET_EFFECT_UNVERIFIED', head: manifest.head,
      builderSha256: manifest.builderSha256, diagnosticControlsSha256: manifest.diagnosticControlsSha256,
      originalCandidateSha256: manifest.original.bundleHashes.candidate,
      originalBaselineSha256: manifest.original.bundleHashes.baseline, originalSourceManifestSha256: manifest.original.sourceManifestSha256,
      originalBuildEvidenceSha256: manifest.original.buildEvidenceSha256, sourceFiles: Object.keys(manifest.trialSourceBindings).length,
      candidateSourceSnapshotSha256: sha(JSON.stringify(manifest.original.candidateSourceBindings)),
      trialSourceSnapshotSha256: sha(JSON.stringify(manifest.trialSourceBindings)), sourceManifest: relative(manifestPath),
      sourceManifestSha256: sha(await fs.readFile(manifestPath)), exactSourceDifferences: manifest.exactDifferences.map(file => ({ file,
        candidateSha256: manifest.original.candidateSourceBindings[file], trialSha256: manifest.trialSourceBindings[file] })),
      normalSourceUnchanged: true, originalPairSourceAndBundlesUnchanged: true, fullSourceBuildNotGeneratedPatch: true,
      postBuildSourceAndBundleReadback: true, precedingTrialSourceAndBundlesUnchanged: manifest.priorTrialBindings,
      diagnosticLabel: 'R17 candidate/gpu-finish', protocolVariant: 'candidate',
      measurementWindow: { startDelayMs: 1000, durationLimitMs: 45000, sampleLimit: 2048 }, productPlaybackUnchanged: true,
      diagnosticAutoExport: { playCaseSelection: 'arm-next-accepted-actual-product-Play-without-timer-or-autoplay',
        wallDelayFromActualProductPlayMs: 15000, snapshotReason: 'manual', expectedActiveMsWithoutSchedulingDelay: 14000,
        stopsProductPlayback: false, retriesReuseExactPayload: true },
      gpuCommandPolicy: 'ownedGl.finish-before-original-fullframe-copy-instead-of-ownedGl.flush-with-no-fallback',
      nativeCopyPolicy: 'all-original-fullframe-copies-retained', publicationPolicy: 'real-attempt.publish-and-r17Probe.accepted-retained',
      scalarStatusCounters: { S: 'successfully-created-surfaces', F: 'finish-calls-returned-successfully', C: 'successful-actual-full-frame-native-copies' },
      originClass: 'authorized-physical-LAN-development-bridge-8795', scopeBehaviorChecks: behavior,
      result: { ...manifest.result, packages: budget.packages, staticChecks: inspection.checks },
      limitations: ['The bounded experiment tests GPU producer-backpressure; it is not an adopted performance repair or target acceptance.',
        'GL finish is blocking by API semantics; its actual target availability, cost, memory behavior and rendered results require the parent\'s real phone observation.',
        'The original full Scene, every normal native fullframe copy, captions, reticle, real attempt.publish and accepted probe remain. No fixed FPS, quality reduction, clear, forced GC or copy compositing is added.',
        'Play selection opens the original time panel and arms measurement only. A valid actual normal Play action executes its existing guarded observation-time owner before starting measurement.',
        'The 15-second wall timer starts from that accepted actual Play action and exports an early manual snapshot, nominally 14 active seconds after the one-second arm. The 45000ms limit is unchanged.',
        'Auto export stops measurement only and does not pause product playback; the parent must promptly pause through actual UI.',
        'S/F/C are bounded cumulative scalar counters displayed at export status; they are not extra collector schema fields or per-frame React updates.',
        'No phone, feedback entry, DevTools, service, database, production source or original paired staging was changed by this builder.',
        'Probe receipts retain variant=candidate; bind each receipt to this exact trial bundle and its device generation externally.'] };
    await fs.writeFile(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
    console.log(JSON.stringify({ buildReady: true, postBuildSourceAndBundleReadback: true, sourceFiles: evidence.sourceFiles,
      exactSourceDifferences: evidence.exactSourceDifferences, scopeBehaviorChecks: behavior, ...evidence.result }));
  }
}
