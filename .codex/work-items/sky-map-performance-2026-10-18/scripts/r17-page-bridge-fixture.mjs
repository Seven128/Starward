// Bounded source-flow fixtures for the task-only observation, never phone proof.
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

export async function verifyPageBridgeFixture({ sourceRoot, feature, ts }) {
  const transpile = source => ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const load = (source, require, extra = {}, suffix = '') => {
    const module = { exports: {} };
    vm.runInNewContext('(function(exports,require,module){' + transpile(source) + '\n' + suffix + '\n})', { console, ...extra })(module.exports, require, module);
    return module.exports;
  };
  let clock = 0;
  const observer = load(await fs.readFile(path.join(sourceRoot, feature, 'r17-page-bridge-observer.ts'), 'utf8'), name => { throw Error(name); },
    { performance: { now: () => clock } });
  const stats = () => JSON.parse(JSON.stringify(observer.r17PageBridgeObservationStats()));
  const state = observer.r17CreatePageBridgeState(), queued = [], callbackThis = { receiver: true }, returnValue = {};
  let called = 0, callbackCalls = 0, callbackReceiver, callbackValues;
  const original = function(...args) { assert.strictEqual(this, page); called++; queued.push(args); return returnValue; };
  const page = { setData: original }, originalDescriptor = Object.getOwnPropertyDescriptor(page, 'setData');
  const release = observer.r17AttachPageBridge(page, state), installed = page.setData;
  assert.notStrictEqual(installed, original); assert.equal(stats().available, 1);
  const input = { a: '星😀' }, extra = {};
  const callback = function(...args) { callbackCalls++; callbackReceiver = this; callbackValues = args; return returnValue; };
  assert.strictEqual(page.setData(input, callback, extra), returnValue);
  assert.strictEqual(queued[0][0], input); assert.strictEqual(queued[0][2], extra); assert.equal(queued[0].length, 3);
  assert.equal(stats().pending, 1); assert.equal(stats().sampledCalls, 0);
  // Reset at actual Play keeps pre-existing pending and its eventual ack.
  clock = 5; observer.r17ResetPageBridgeObservation(true);
  assert.equal(stats().inheritedPending, 1); assert.equal(stats().pending, 1); assert.equal(stats().submitted, 0);
  page.setData({ b: 2, c: 3 }, callback);
  assert.equal(stats().pending, 2); assert.equal(stats().maxPending, 2); assert.equal(stats().sampledCalls, 1);
  clock = 20; assert.strictEqual(queued[1][1].call(callbackThis, 'second', 2), returnValue);
  assert.strictEqual(callbackReceiver, callbackThis); assert.deepEqual(callbackValues, ['second', 2]);
  clock = 30; queued[0][1].call(callbackThis, 'first');
  assert.equal(stats().completed, 2); assert.equal(stats().pending, 0); assert.equal(stats().latencyTotalMs, 45); assert.equal(stats().latencyMaxMs, 30);
  queued[0][1].call(callbackThis, 'duplicate');
  assert.equal(stats().duplicateCallback, 1); assert.equal(stats().completed, 2); assert.equal(callbackCalls, 3);
  // No added callback or changed arity for calls lacking a callback.
  page.setData(input); assert.equal(queued[2].length, 1); assert.strictEqual(queued[2][0], input); assert.equal(stats().callbackMissing, 1);
  for (let index = 0; index < 25; index++) { page.setData(input, callback); queued.at(-1)[1](); }
  assert.equal(stats().sampledCalls, 16); assert.equal(stats().serializationFailures, 0);
  assert(stats().sampledBytes > 0); assert(stats().keyCountTotal > 0);
  const after16 = stats().sampledBytes;
  page.setData({ large: 'x'.repeat(100000) }, callback); queued.at(-1)[1]();
  assert.equal(stats().sampledBytes, after16); // no serialization after first 16.
  // Cyclic/sample failure cannot suppress the original invocation.
  observer.r17ResetPageBridgeObservation(false);
  const cycle = {}; cycle.self = cycle; const beforeCycle = called;
  page.setData(cycle, callback); assert.equal(called, beforeCycle + 1); queued.at(-1)[1]();
  assert.equal(stats().serializationFailures, 1); assert.equal(stats().sampledCalls, 1);
  const utf = { a: '星😀' }; page.setData(utf, callback); queued.at(-1)[1]();
  assert.equal(stats().sampledBytes, Buffer.byteLength(JSON.stringify(utf), 'utf8'));
  // Hide restoration is exact; callbacks already in flight still reach owner.
  page.setData({ hide: true }, callback); const late = queued.at(-1)[1];
  release(); assert.deepEqual(Object.getOwnPropertyDescriptor(page, 'setData'), originalDescriptor); assert.equal(stats().available, 0);
  const beforeAck = stats().completed; late.call(callbackThis, 'after-hide'); assert.equal(stats().completed, beforeAck + 1); assert.equal(stats().pending, 0);
  const showRelease = observer.r17AttachPageBridge(page, state); assert.equal(stats().available, 1); assert.notStrictEqual(page.setData, installed);
  const replacement = () => {}; page.setData = replacement; showRelease(); assert.strictEqual(page.setData, replacement);
  const inherited = Object.create({ setData: original });
  const inheritedRelease = observer.r17AttachPageBridge(inherited, state); inheritedRelease(); assert.equal(Object.hasOwn(inherited, 'setData'), false);
  const immutable = {}; Object.defineProperty(immutable, 'setData', { value: original, writable: false });
  observer.r17AttachPageBridge(immutable, state)(); assert.equal(stats().available, 0); assert.strictEqual(immutable.setData, original);
  // Original setData throws and synchronous callback throws preserve identity.
  const failure = new Error('original-throw'); const failPage = { setData() { throw failure; } };
  observer.r17AttachPageBridge(failPage, state); observer.r17ResetPageBridgeObservation(null);
  assert.throws(() => failPage.setData(input, callback), error => error === failure);
  assert.equal(stats().failed, 1); assert.equal(stats().failedBeforeCallback, 1); assert.equal(stats().pending, 0);
  const callbackError = new Error('callback-throw'); const sync = { setData(_data, cb) { return cb.call(callbackThis, 'sync', extra); } };
  observer.r17AttachPageBridge(sync, state); observer.r17ResetPageBridgeObservation(null);
  assert.throws(() => sync.setData(input, function(...args) { assert.strictEqual(this, callbackThis); assert.deepEqual(args, ['sync', extra]); throw callbackError; }), error => error === callbackError);
  assert.equal(stats().completed, 1); assert.equal(stats().failed, 1); assert.equal(stats().failedBeforeCallback, 0); assert.equal(stats().pending, 0);
  assert.equal(observer.r17ReadEnableDebug(() => ({ enableDebug: true, ignoredSecret: 'not-exported' })), true);
  assert.equal(observer.r17ReadEnableDebug(() => ({ enableDebug: false })), false);
  assert.equal(observer.r17ReadEnableDebug(() => { throw Error('unsupported'); }), null);
  assert.equal(observer.r17ReadEnableDebug(undefined), null);
  assert(!JSON.stringify(stats()).includes('ignoredSecret'));

  // Execute the exact actual GPU owner's submit block, not a global GL patch.
  const gpuSource = await fs.readFile(path.join(sourceRoot, feature, 'sky-gpu-renderer.ts'), 'utf8');
  const submitStart = gpuSource.indexOf('    const submit = '), submitEnd = gpuSource.indexOf('    const flush = ', submitStart);
  assert(submitStart > 0 && submitEnd > submitStart);
  const block = gpuSource.slice(submitStart, submitEnd);
  assert.equal(block.split('r17RecordTypedGpuUpload(data.length);').length, 2);
  const glEvents = [], glError = new Error('buffer-data-throw'); let failUpload = false;
  const gl = { ARRAY_BUFFER: 1, DYNAMIC_DRAW: 2, NO_ERROR: 0, disableVertexAttribArray() {}, bindBuffer() {},
    bufferData(_target, data) { glEvents.push(data); if (failUpload) throw glError; }, getError: () => 0, useProgram() {} };
  const quad = [1, 2, 3, 4], uploadedQuads = new WeakMap(), buffer = { attribs: { a: { buffer: {} } } };
  const submit = vm.runInNewContext('(function(){' + transpile(block) + ';return submit;})()', {
    gl, maxAttributes: 1, quad, uploadedQuads, contributions: { hasPending: () => false, invalidate() {} },
    setBuffersAndAttributes() {}, setUniforms() {}, drawBufferInfo() {}, width: 390, height: 844, pixelRatio: 2,
    maxPointSize: 32, pointDisplayTuning: 1, groupDrawing: false, reportRuntimeError() {},
    r17Probe: { count() {} },
    r17RecordTypedGpuUpload: observer.r17RecordTypedGpuUpload,
  });
  observer.r17ResetPageBridgeObservation(null);
  submit({}, buffer, [1, 2, 3, 4, 5, 6], 3, 0);
  assert.equal(stats().bufferDataCalls, 1); assert.equal(stats().totalTypedUploadBytes, 24); assert.equal(stats().maxTypedUploadBytes, 24);
  submit({}, buffer, quad, 2, 0); submit({}, buffer, quad, 2, 0);
  assert.equal(stats().bufferDataCalls, 2); assert.equal(stats().totalTypedUploadBytes, 40);
  failUpload = true; assert.throws(() => submit({}, buffer, [1, 2, 3], 3, 0), error => error === glError);
  assert.equal(stats().bufferDataCalls, 2); failUpload = false;
  assert.equal(glEvents.length, 3); // original typed allocation/upload cadence preserved.

  // Reuse accepted-normal-Play setup and exact original protocol.
  let nextTimer = 0, hide, show, pageUnmount, hookRefs = [], hookIndex = 0;
  const timers = new Map(), requests = [], productPage = { setData() {} };
  const schedule = (callback, delay) => { const id = ++nextTimer; timers.set(id, { callback, at: clock + delay }); return id; };
  const advance = to => { while (true) {
    const due = [...timers].filter(([, value]) => value.at <= to).sort((a, b) => a[1].at - b[1].at)[0];
    if (!due) break; timers.delete(due[0]); clock = due[1].at; due[1].callback();
  } clock = to; };
  const timerEnvironment = { setTimeout: schedule, clearTimeout: id => timers.delete(id), performance: { now: () => clock } };
  const probe = load(await fs.readFile(path.join(sourceRoot, feature, 'r17-phone-probe-runtime.ts'), 'utf8'), name => { throw Error(name); }, timerEnvironment).r17Probe;
  const jsx = (type, props) => ({ type, props });
  const controls = load(await fs.readFile(path.join(sourceRoot, feature, 'r17-phone-probe-controls.tsx'), 'utf8'), name => {
    if (name === './r17-phone-probe-runtime') return { r17Probe: probe };
    if (name === './r17-page-bridge-observer') return observer;
    if (name === 'react') return { useEffect: effect => { pageUnmount ??= effect(); },
      useRef: initial => hookRefs[hookIndex++] ??= { current: initial }, useState: value => [value === false ? true : typeof value === 'function' ? value() : value, () => {}] };
    if (name === '@tarojs/taro') return { __esModule: true, useDidHide: callback => { hide = callback; }, useDidShow: callback => { show = callback; },
      default: { getCurrentInstance: () => ({ page: productPage }), getAppBaseInfo: () => ({ enableDebug: true, ignoredPrivate: 'never-exported' }),
        request: options => new Promise(resolve => requests.push({ options, resolve })) } };
    if (name === '@tarojs/components') return { Button: 'Button', Text: 'Text', View: 'View' };
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    throw Error('unexpected_controls_import:' + name);
  }, { ...timerEnvironment, __MINIAPP_API_BASE__: 'http://diagnostic.invalid' },
  'exports.fixture = { startDiagnostic, exportDiagnostic, cancelDiagnostic, getStatus: () => status };');
  controls.useR17PageBridgeLifecycle(); assert.equal(stats().available, 1); assert.equal(stats().enableDebug, true);
  const firstWrapper = productPage.setData; hide(); assert.equal(stats().available, 0); show(); assert.equal(stats().available, 1); assert.notStrictEqual(productPage.setData, firstWrapper);
  const find = (node, predicate) => {
    if (Array.isArray(node)) { for (const child of node) { const found = find(child, predicate); if (found) return found; } return; }
    if (!node || typeof node !== 'object') return; if (predicate(node)) return node;
    return find(node.props?.children, predicate);
  };
  let openedCase;
  const menu = controls.R17PhoneProbeControls({ onStart: key => { openedCase = key; }, onPrepareFov() {} });
  find(menu, node => node.props?.id === 'r17-probe-start-narrow-play').props.onClick();
  assert.equal(openedCase, 'narrow-play'); assert.equal(timers.size, 0); advance(20000); assert.equal(requests.length, 0);
  const pageSource = await fs.readFile(path.join(sourceRoot, feature, 'spot-sky-page.tsx'), 'utf8');
  const playStart = pageSource.indexOf('  const toggleSkyTimePlayback = () => {'), playEnd = pageSource.indexOf('  const commitInstant = ', playStart);
  const at = '2026-10-18T00:00:00.000Z'; let mode = 'PREVIEW', playCalls = 0, pauseCalls = 0;
  const environment = { ownerCurrent: false, datePickerOpenRef: { current: false }, timeModel: { endAt: '2026-10-18T12:00:00.000Z' },
    geometryReport: {}, report: { isError: false, data: { dataState: 'FRESH' } }, skyTimeIntentCurrent: () => environment.ownerCurrent,
    cancelSkyCalibration() {}, observationTime: { snapshot: () => ({ mode, at }), play: () => { playCalls++; return { mode: 'PLAYING' }; }, pause: () => { pauseCalls++; return { mode: 'PAUSED' }; } },
    setTimeIntent: value => { mode = value.mode; }, r17PageBridgeProductPlayStarted: controls.r17PageBridgeProductPlayStarted };
  const toggle = vm.runInNewContext('(function(){' + transpile(pageSource.slice(playStart, playEnd)) + ';return toggleSkyTimePlayback;})()', environment);
  const timeControls = load(await fs.readFile(path.join(sourceRoot, feature, 'sky-time-controls.tsx'), 'utf8'), name => {
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
  const timeControl = timeControls.SkyTimeControls({ at, timezone: 'UTC', active: true, current: () => true,
    playing: false, canPlay: true, onPreview: () => true, onApply() { throw Error('unexpected_apply'); },
    onTogglePlay: toggle, onPause() { throw Error('unexpected_product_pause'); } });
  const playButton = find(timeControl, node => node.props?.ariaLabel === '1倍播放');
  assert(playButton); assert.equal(playButton.props.disabled, false);
  playButton.props.onClick(); assert.equal(playCalls, 0); assert.equal(timers.size, 0);
  environment.ownerCurrent = true; environment.datePickerOpenRef.current = true; playButton.props.onClick(); assert.equal(playCalls, 0);
  environment.datePickerOpenRef.current = false; mode = 'PLAYING'; playButton.props.onClick(); assert.equal(pauseCalls, 1); assert.equal(timers.size, 0);
  playButton.props.onClick(); assert.equal(playCalls, 1); assert.equal(timers.size, 2); assert.equal(stats().enableDebug, true);
  assert.equal(controls.r17PageBridgeProductPlayStarted(), false); advance(21000);
  const first = pageSource.indexOf('      r17Probe.measure("displayCopy"'), last = pageSource.indexOf('      setCanvasSize(', first);
  const completion = pageSource.slice(first, last); assert.equal(completion.split('attempt.publish!').length, 2);
  assert.equal(completion.split('r17Probe.accepted(frame,paintedSkyObjectsRef.current);').length, 2);
  let presented = 0, published = 0;
  const executeCompletion = vm.runInNewContext('(function(r17Probe,surface,attempt,selectionCurrent,excludedNameKeys,frame,paintedSkyObjectsRef){' + transpile(completion) + '})');
  for (let index = 0; index < 10; index++) {
    advance(21000 + index * 1000); const frame = { frameAt: new Date(Date.parse(at) + index * 1000).toISOString() };
    probe.intent({ at: frame.frameAt }); probe.prepared(frame); probe.paintStarted(frame); probe.callback(frame);
    executeCompletion(probe, { present() { presented++; } }, { publish() { published++; }, reticle: null, captions: [] }, true, [], frame,
      { current: { objects: [{ reference: 'HR:1' }, { reference: 'SAO:1' }] } });
  }
  assert.equal(presented, 10); assert.equal(published, 10);
  observer.r17RecordTypedGpuUpload(8);
  advance(34999); assert.equal(requests.length, 0); advance(35000); assert.equal(requests.length, 1); assert.equal(mode, 'PLAYING');
  const receipt = JSON.parse(requests[0].options.data);
  assert.equal(receipt.variant, 'candidate'); assert.equal(receipt.schemaVersion, 'starward-r17-phone-probe-v1');
  assert.equal(receipt.window.elapsedMs, 14000); assert.equal(receipt.window.durationLimitMs, 45000); assert.equal(receipt.window.reason, 'manual');
  assert.equal(receipt.counters.acceptedCopies, 10); assert.equal(receipt.time.accepted.distinct, 10);
  assert(!requests[0].options.data.includes('bufferDataCalls')); assert(!requests[0].options.data.includes('ignoredPrivate'));
  observer.r17RecordTypedGpuUpload(100); // pinned snapshot must remain G1:32/32.
  requests[0].resolve({ statusCode: 200, data: { stored: true } }); await new Promise(resolve => setImmediate(resolve));
  assert.match(controls.fixture.getStatus(), /candidate\/page-bridge A1 Dtrue .*G1:32\/32 已导出 .*14000ms\/manual/u);
  const retry = controls.fixture.exportDiagnostic(); assert.equal(requests.length, 2); assert.equal(requests[1].options.data, requests[0].options.data);
  assert.equal(controls.fixture.startDiagnostic('wide-camera'), false);
  requests[1].resolve({ statusCode: 200, data: { stored: true } }); await retry;
  controls.fixture.startDiagnostic('wide-camera'); assert.equal(timers.size, 2); hide(); assert.equal(timers.size, 0); assert.equal(stats().available, 0);
  show(); controls.fixture.startDiagnostic('narrow-play'); controls.r17PageBridgeProductPlayStarted(); assert.equal(timers.size, 2);
  pageUnmount(); assert.equal(timers.size, 0); assert.equal(stats().available, 0); advance(100000); assert.equal(requests.length, 2);
  show(); controls.fixture.startDiagnostic('narrow-play'); controls.r17PageBridgeProductPlayStarted();
  const pendingExport = controls.fixture.exportDiagnostic(); assert.equal(requests.length, 3);
  hide(); const hiddenStatus = controls.fixture.getStatus();
  requests[2].resolve({ statusCode: 200, data: { stored: true } }); await pendingExport;
  assert.equal(controls.fixture.getStatus(), hiddenStatus); assert.equal(timers.size, 0);
  return { slowOutOfOrderDuplicateAcknowledgements: true, inheritedPendingPreservedAtReset: true,
    originalThisArgumentsReturnCallbackReceiverArgumentsAndExceptionsPreserved: true,
    originalAndSynchronousCallbackThrowIdentityPreserved: true, missingCallbackNotAdded: true,
    first16OnlyUtf8SamplesAndSerializationFailurePreservesCall: true, perCallOwnKeyCountWithoutPayloadRetention: true,
    exactDescriptorRestoredOnHideAndReattachedOnShow: true, laterReplacementNotOverwritten: true,
    inFlightAcknowledgementsStillReachOriginalCallbackAfterHide: true, immutablePageReportsUnavailable: true,
    successfulActualSubmitBufferDataOnlyNoExtraArray: true, repeatedReusableQuadNotCountedAsUpload: true,
    throwingUploadDoesNotIncrement: true, enableDebugOnlyBooleanOrUnknown: true,
    actualGuardedProductPlayStartsMeasurement: true, rejectedPlayOrPauseDoesNotStartMeasurement: true,
    originalScenePublishAndAcceptedPathUnchanged: true, realNonemptyAcceptedTimesInSourceFlowFixture: true,
    autoExportAfter15WallSecondsNominal14ActiveManualWithOriginal45000Limit: true,
    pinnedNumericSnapshotAndExactReceiptRetry: true, headerSnapshotOnOpenNotPerFrameState: true,
    hideUnmountAndStaleExportFencesRetained: true, fixtureOnlyNotTargetBridgeOrGpuEvidence: true };
}
