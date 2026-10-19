// Focused source-flow checks for a deliberately synthetic, task-only boundary.
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

export async function verifyCpuPageOnlyFixture({ sourceRoot, feature, ts }) {
  const transpile = source => ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  }, reportDiagnostics: true });
  const load = (source, require, environment = {}, suffix = '') => {
    const result = transpile(source);
    assert.equal(result.diagnostics.filter(value => value.category === ts.DiagnosticCategory.Error).length, 0);
    const module = { exports: {} };
    vm.runInNewContext('(function(exports,require,module){' + result.outputText + '\n' + suffix + '\n})', environment)(module.exports, require, module);
    return module.exports;
  };
  const read = name => fs.readFile(path.join(sourceRoot, feature, name), 'utf8');
  const unknown = Object.freeze({ scope: 'frozen-highp-shader-pixel-centers', precision: 'unknown' });
  const cpu = load(await read('r17-cpu-page-only.ts'), name => {
    if (name === './sky-artwork-level-composition') return { unknownSkyArtworkLocalObservation: unknown };
    throw Error(name);
  });
  let glHealthReads = 0, copies = 0, publishes = 0, accepted = 0;
  const renderer = new Proxy({}, { get(_object, key) { throw Error('unexpected_native_renderer_call:' + String(key)); } });
  const display = { width: 780, height: 1688 }, selection = { width: 780, height: 1688 };
  const size = { width: 390, height: 844 };
  const surface = { node: { width: 780, height: 1688 }, isCurrent() { glHealthReads++; return true; }, present() { copies++; } };
  cpu.r17CpuPageOnlyAttach(renderer, surface, display, size, 2, selection);
  assert.strictEqual(cpu.r17CpuPageOnlyScene(renderer), renderer);
  assert.equal(cpu.r17CpuPageOnlyCurrent(surface, display, size, 2, selection), true); assert.equal(glHealthReads, 1);
  const pageSource = await read('spot-sky-page.tsx');
  const completionStart = pageSource.indexOf('      if (!attempt.synthetic) {\n        r17Probe.measure("displayCopy"');
  const completionEnd = pageSource.indexOf('      setCanvasSize(', completionStart);
  assert(completionStart > 0 && completionEnd > completionStart);
  const completion = pageSource.slice(completionStart, completionEnd);
  const executeCompletion = vm.runInNewContext('(function(surface,attempt,frame,r17Probe){' + transpile(completion).outputText + '})', {
    selectionCurrent: true, excludedNameKeys: [], paintedSkyObjectsRef: { current: {} }, ...cpu,
  });
  const probeCounter = { measure(_key, operation) { return operation(); }, accepted() { accepted++; } };
  const frame = { sceneReady: true, data: {} };
  const attempt = { synthetic: false, camera: { view: {} }, reticle: null, captions: [], publish() { publishes++; } };
  executeCompletion(surface, attempt, frame, probeCounter);
  assert.equal(copies, 1); assert.equal(accepted, 1); assert.equal(publishes, 1);
  assert.equal(cpu.r17CpuPageOnlyStats().frozen, true); assert.equal(cpu.r17CpuPageOnlyStats().readyNativeCopies, 1);
  const facade = cpu.r17CpuPageOnlyScene(renderer); assert.notStrictEqual(facade, renderer);
  facade.begin(390, 844, '#000', [], false);
  assert.equal(facade.solarLight({}, {}), true); assert.equal(facade.landscape({}, {}, false), true);
  assert.equal(facade.sun({}, {}, false), true); assert.equal(facade.saturnRings({}, {}, '', false), true);
  let imageCallbacks = 0;
  const bitmap = {}, imagePainted = value => { assert.strictEqual(value, bitmap); imageCallbacks++; };
  assert.equal(facade.galacticBand({}, {}, bitmap, imagePainted), true);
  assert.equal(facade.moon({}, {}, false, bitmap, imagePainted), true);
  assert.equal(facade.planet({}, {}, '', false, bitmap, imagePainted), true);
  facade.moon({}, {}, false, null, () => { throw Error('null_image_callback'); }); assert.equal(imageCallbacks, 3);
  assert.equal(facade.image(bitmap, [], 1), true); assert.equal(facade.skyImageMesh(bitmap, [], {}, 1), true);
  assert.equal(facade.artwork(bitmap, {}, {}, 1, ''), true); assert.equal(facade.prepareArtwork(bitmap, {}, {}), true);
  assert.equal(facade.prepareSkyImageMesh(bitmap, [], {}), true);
  let readyCalls = 0;
  const levels = facade.skyImageMeshLevels([{ image: bitmap }, { image: bitmap }], {}, 1, {}, ready => {
    assert.deepEqual(Array.from(ready), [true, true]); readyCalls++; return [1, 1];
  });
  assert.deepEqual(Array.from(levels), [true, true]);
  const draw = facade.artworkLevels({ fine: { image: bitmap } }, {}, 1, eligible => {
    assert.equal(eligible.fine, true); assert.equal(eligible.coarse, false); readyCalls++; return { fine: 1, coarse: 0 };
  });
  assert.equal(draw.submitted, true); assert.equal(draw.finePrepared, true); assert.equal(draw.coarsePrepared, false); assert.equal(readyCalls, 2);
  assert.equal(facade.artworkLevelsQualification(draw).fine, 'has'); assert.equal(facade.artworkLevelsContribution(draw).finePhoto, 'positive');
  assert.strictEqual(facade.artworkLevelsObserveRegion(draw, null), unknown);
  assert.equal(facade.skyImageMeshContribution({}), 'positive'); assert.equal(facade.artworkContributionsFailed(), false);
  facade.resetArtworkContributions(); facade.resetTargetOptical(); facade.resetBodyImages(); facade.resetHips();
  facade.disc(1, 2, 1, '', 1); facade.segments([[0, 0, 1, 1]], ''); facade.finish();
  executeCompletion(surface, { ...attempt, synthetic: true }, frame, probeCounter);
  executeCompletion(surface, { ...attempt, synthetic: true }, frame, probeCounter);
  assert.equal(copies, 1); assert.equal(accepted, 1); assert.equal(publishes, 3);
  assert.equal(cpu.r17CpuPageOnlyStats().syntheticPublications, 2);
  assert.equal(cpu.r17CpuPageOnlyCurrent(surface, display, size, 2, selection), true); assert.equal(glHealthReads, 1);
  assert.equal(cpu.r17CpuPageOnlyCurrent(surface, display, { width: 400, height: 844 }, 2, selection), false);
  assert.equal(cpu.r17CpuPageOnlyCurrent(surface, {}, size, 2, selection), false);
  cpu.r17CpuPageOnlyRetire(renderer); assert.equal(cpu.r17CpuPageOnlyStats().retired, true);
  assert.equal(cpu.r17CpuPageOnlyCurrent(surface, display, size, 2, selection), false);
  assert.throws(() => facade.begin(1, 1, ''), /not_live/); assert.throws(() => cpu.r17CpuPageOnlyScene(renderer), /retired/);
  // A failed native copy or failed page publication cannot arm freezing.
  const failedSurface = { ...surface, present() { throw Error('native_copy_failed'); } }, failedRenderer = {};
  cpu.r17CpuPageOnlyAttach(failedRenderer, failedSurface, display, size, 2, selection);
  assert.throws(() => executeCompletion(failedSurface, attempt, frame, probeCounter), /native_copy_failed/);
  assert.equal(cpu.r17CpuPageOnlyStats().frozen, false); assert.equal(cpu.r17CpuPageOnlyStats().nativeCopies, 0);
  failedSurface.present = () => {};
  assert.throws(() => executeCompletion(failedSurface, { ...attempt, publish() { throw Error('publish_failed'); } }, frame, probeCounter), /publish_failed/);
  assert.equal(cpu.r17CpuPageOnlyStats().frozen, false); assert.equal(cpu.r17CpuPageOnlyStats().nativeCopies, 1);
  executeCompletion(failedSurface, attempt, { ...frame, sceneReady: false }, probeCounter);
  assert.equal(cpu.r17CpuPageOnlyStats().frozen, false);

  // Fixed original Scene and all three image ports receive one coherent facade.
  assert.match(pageSource, /drawSkyScene\(sceneContext, frame\.data, frame\.frameAt, frame\.heading, frame\.pose,/);
  assert.equal(pageSource.split('surface: sceneContext,').length, 4);
  assert.match(pageSource, /surface\.measureText\(object\.displayName/);
  assert.match(pageSource, /createSkyCanvasFrameClock\(\(\) => canvasDisplayRef\.current\)/);
  assert.equal((await read('sky-scene-render.ts')).includes('r17CpuPageOnly'), false);
  const gpuSource = await read('sky-gpu-renderer.ts');
  assert.match(gpuSource, /gl\.bufferData\(gl\.ARRAY_BUFFER, new Float32Array\(data\), gl\.DYNAMIC_DRAW\);\s+r17RecordTypedGpuUpload\(data\.length\);/);

  // Exercise actual guarded normal Play and the20s termination with latest ref.
  let clock = 0, nextTimer = 0, hide, show, pageUnmount, stopUnmount;
  const timers = new Map(), requests = [], refs = [], productPage = { setData() {} };
  let refIndex = 0, effectIndex = 0;
  const schedule = (callback, delay) => { const id = ++nextTimer; timers.set(id, { callback, at: clock + delay }); return id; };
  const advance = to => { while (true) {
    const due = [...timers].filter(([, value]) => value.at <= to).sort((a, b) => a[1].at - b[1].at)[0];
    if (!due) break; timers.delete(due[0]); clock = due[1].at; due[1].callback();
  } clock = to; };
  const timeEnvironment = { setTimeout: schedule, clearTimeout: id => timers.delete(id), performance: { now: () => clock } };
  const probe = load(await read('r17-phone-probe-runtime.ts'), name => { throw Error(name); }, timeEnvironment).r17Probe;
  const observer = load(await read('r17-page-bridge-observer.ts'), name => { throw Error(name); }, timeEnvironment);
  const jsx = (type, props) => ({ type, props });
  const controls = load(await read('r17-phone-probe-controls.tsx'), name => {
    if (name === './r17-phone-probe-runtime') return { r17Probe: probe };
    if (name === './r17-page-bridge-observer') return observer;
    if (name === './r17-cpu-page-only') return cpu;
    if (name === 'react') return { useEffect: effect => { if (effectIndex++ === 0) pageUnmount = effect(); else stopUnmount = effect(); },
      useRef: initial => refs[refIndex++] ??= { current: initial }, useState: value => [typeof value === 'function' ? value() : value, () => {}] };
    if (name === '@tarojs/taro') return { __esModule: true, useDidHide: callback => { hide = callback; }, useDidShow: callback => { show = callback; },
      default: { getCurrentInstance: () => ({ page: productPage }), getAppBaseInfo: () => ({ enableDebug: false }),
        request: options => new Promise(resolve => requests.push({ options, resolve })) } };
    if (name === '@tarojs/components') return { Button: 'Button', Text: 'Text', View: 'View' };
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    throw Error(name);
  }, { ...timeEnvironment, __MINIAPP_API_BASE__: 'http://diagnostic.invalid' },
  'exports.fixture = { startDiagnostic, exportDiagnostic, cancelDiagnostic, status: () => status };');
  controls.useR17CpuPageOnlyLifecycle();
  let mode = 'PREVIEW', runStartAt = null, pauses = 0, oldCallbackCalls = 0;
  const at = '2026-10-18T00:00:00.000Z';
  const environment = { ownerCurrent: false, datePickerOpenRef: { current: false }, timeModel: { endAt: '2026-10-18T12:00:00.000Z' },
    geometryReport: {}, report: { isError: false, data: { dataState: 'FRESH' } }, skyTimeIntentCurrent: () => environment.ownerCurrent,
    cancelSkyCalibration() {}, observationTime: { snapshot: () => ({ mode, at, runStartAt }), play: () => ({ mode: 'PLAYING', runStartAt: at }), pause: () => ({ mode: 'PAUSED', runStartAt: null }) },
    setTimeIntent: value => { mode = value.mode; runStartAt = value.runStartAt; },
    pauseSkyTime: () => { pauses++; environment.setTimeIntent(environment.observationTime.pause()); },
    r17CpuPageOnlyProductPlayStarted: controls.r17CpuPageOnlyProductPlayStarted };
  const playStart = pageSource.indexOf('  const toggleSkyTimePlayback = () => {'), playEnd = pageSource.indexOf('  const commitInstant = ', playStart);
  const toggle = vm.runInNewContext('(function(){' + transpile(pageSource.slice(playStart, playEnd)).outputText + ';return toggleSkyTimePlayback;})()', environment);
  const stopStart = pageSource.indexOf('  useR17CpuPageOnlyStop(runStartAt => {'), stopEnd = pageSource.indexOf('  const toggleSkyTimePlayback', stopStart);
  let actualStop;
  vm.runInNewContext(transpile(pageSource.slice(stopStart, stopEnd)).outputText, { ...environment, useR17CpuPageOnlyStop: fn => { actualStop = fn; } });
  // First effect installs one callback. A later render updates the same ref.
  controls.useR17CpuPageOnlyStop(() => { oldCallbackCalls++; return false; });
  refs.at(-1).current = actualStop;
  controls.fixture.startDiagnostic('narrow-play'); assert.equal(timers.size, 0);
  toggle(); assert.equal(mode, 'PREVIEW'); assert.equal(timers.size, 0);
  environment.ownerCurrent = true; environment.datePickerOpenRef.current = true; toggle(); assert.equal(mode, 'PREVIEW');
  environment.datePickerOpenRef.current = false; toggle(); assert.equal(mode, 'PLAYING'); assert.equal(timers.size, 3);
  advance(15000); assert.equal(requests.length, 1); assert.equal(mode, 'PLAYING');
  const receipt = JSON.parse(requests[0].options.data);
  assert.equal(receipt.window.elapsedMs, 14000); assert.equal(receipt.counters.acceptedCopies, 0); assert.equal(receipt.time.accepted.distinct, 0);
  requests[0].resolve({ statusCode: 200, data: { stored: true } }); await new Promise(resolve => setImmediate(resolve));
  advance(20000); assert.equal(mode, 'PAUSED'); assert.equal(pauses, 1); assert.equal(oldCallbackCalls, 0);
  // Old timer cannot pause a replacement run or a hidden page.
  controls.fixture.startDiagnostic('narrow-play'); toggle(); runStartAt = 'replacement-run'; advance(40000);
  assert.equal(mode, 'PLAYING'); assert.equal(pauses, 1);
  requests.at(-1).resolve({ statusCode: 200, data: { stored: true } }); await new Promise(resolve => setImmediate(resolve));
  mode = 'PAUSED'; controls.fixture.startDiagnostic('narrow-play'); toggle(); assert(timers.size > 0); hide(); assert.equal(timers.size, 0);
  show(); mode = 'PAUSED'; controls.fixture.startDiagnostic('narrow-play'); toggle(); pageUnmount(); stopUnmount(); assert.equal(timers.size, 0);
  return { exactSceneSourceAndFullInputsRetained: true, allImagePortsUseSameFacade: true,
    initialReadyNativeCopyAndPublishRequiredBeforeFreeze: true, copyAndPublishFailureDoNotFreeze: true,
    syntheticFacadeNoNativeRendererCalls: true, optionalLevelsReadinessAndImageCallbacks: true,
    actualPublicationRetainedButSyntheticAcceptanceOmitted: true, recurringGlHealthReadSkippedWhileFrozen: true,
    captionMeasurementsAndNativeRafClockRetained: true, resizeHideRetirementFenced: true,
    actualGuardedNormalPlayArms15secondExport: true, zeroSyntheticAcceptedTimesAndCopies: true,
    bounded20secondOriginalPauseUsesLatestCallbackAndSameRun: true, hiddenUnmountNewCaseCancelTimers: true,
    fixtureOnlyNotPhoneOrProductEvidence: true };
}
