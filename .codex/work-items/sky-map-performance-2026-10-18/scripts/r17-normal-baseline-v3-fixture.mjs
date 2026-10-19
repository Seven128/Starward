// Task-only versioned fixture for the complete normal product path, probe v3.
// Reuses bounded Play/Pause assertions, including finite r9/r10; no native/device/API call.
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

export async function verifyNormalSurfaceRetirementFixture({ surfaceSource, observationSource, ts }) {
  const load = (source, require = () => { throw Error('unexpected_import'); }, environment = {}) => {
    const module = { exports: {} }, result = ts.transpileModule(source, { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, reportDiagnostics: true });
    assert.equal(result.diagnostics.filter(item => item.category === ts.DiagnosticCategory.Error).length, 0);
    vm.runInNewContext('(function(exports,require,module){' + result.outputText + '\n})', environment)(module.exports, require, module);
    return module.exports;
  };
  const binding = { buildGeneration: 27, buildSourceSha256: 'd'.repeat(64) };
  const harness = (options = {}) => {
    let wall = 1800000000000, lost = false, extensionCalls = 0;
    const writes = [], date = class extends Date { static now() { return wall; } };
    const observation = load(observationSource, undefined, { Date: date });
    assert.equal(observation.r17ConfigureNormalRetirementObservation(binding, (key, value) => {
      writes.push({ key, value: JSON.parse(JSON.stringify(value)) });
      if (options.storageFailure) throw Error('private-storage-error-not-exported');
    }), true);
    const canvas = (kind, context) => {
      let width = 10, height = 10;
      return Object.defineProperties({ getContext: () => context }, {
        width: { get() { if (options.readFailure && kind === 'node' && width === 0) throw Error('private-native-read'); return width; },
          set(value) { if (options.assignmentFailure && kind === 'display' && value === 0) throw Error('private-native-width'); width = value; } },
        height: { get: () => height,
          set(value) { if (options.assignmentFailure && kind === 'node' && value === 0) throw Error('private-native-height'); height = value; } },
      });
    };
    const gl = { isContextLost() { if (options.contextReadFailure) throw Error('private-context-read'); return lost; },
      getExtension() { extensionCalls++; return options.unsupported ? null : { loseContext() {
        if (options.lossFailure) throw Error('private-context-loss'); lost = true;
      } }; } };
    const display = canvas('display', {}), selection = canvas('selection', {}), node = canvas('node', options.contextUnavailable ? null : gl);
    const surface = load(surfaceSource, name => {
      if (name === './r17-normal-observations') return observation;
      if (name === '../../services/runtime-error') return { reportRuntimeError() {} };
      if (name === './sky-selection-reticle') return { createSkySelectionLayer() { return {
        dispose() { if (options.selectionFailure) throw Error('original-selection-retirement-error'); },
      }; }, paintSkySelectionReticle() {} };
      throw Error(name);
    });
    return { observation, writes, display, selection, node, extensionCalls: () => extensionCalls,
      at: value => { wall = value; }, last: () => writes.at(-1).value,
      create: () => surface.createSkyCanvasSurface(display, { width: 100, height: 200 }, 1, () => node, selection) };
  };
  const normal = harness(), resource = normal.create();
  assert.equal(normal.writes.length, 2); assert.equal(normal.last().event, 'ready');
  assert.equal(normal.last().surface.ready.nodeWidth, 100); assert.equal(normal.last().surface.ready.displayHeight, 200);
  normal.observation.r17NormalCopyReturned(true); normal.observation.r17ResetNormalObservation();
  normal.observation.r17NormalPlayStartedReceipt(1);
  for (let index = 0; index < 5; index++) normal.observation.r17NormalCopyReturned(true);
  normal.at(1800000060025); normal.observation.r17NormalPauseResultReceipt(1, true);
  normal.at(1800000090025); assert.equal(normal.writes.length, 2, 'Play, copy and Pause do not serialize or write per frame');
  resource.dispose(); const receipt = normal.last();
  assert.equal(normal.writes.length, 4); assert.equal(receipt.event, 'retire-complete');
  assert.equal(receipt.surface.outcome, 'returned'); assert.equal(receipt.surface.after.contextLost, true);
  assert.equal(receipt.surface.after.selectionLayerPresent, false);
  for (const field of ['nodeWidth','nodeHeight','displayWidth','displayHeight','selectionWidth','selectionHeight']) assert.equal(receipt.surface.after[field], 0);
  assert.equal(receipt.counts.constructionAttempts, 1); assert.equal(receipt.counts.ready, 1); assert.equal(receipt.counts.retireAttempts, 1); assert.equal(receipt.counts.retireCompletions, 1);
  assert.equal(receipt.normalRun.pauseResult, true); assert.equal(receipt.normalRun.pause.nativeCopies, 5);
  assert.equal(receipt.normalRun.pause.lifetimeNativeCopies - receipt.normalRun.start.lifetimeNativeCopies, 5);
  assert.equal(receipt.normalRun.pauseReturnedAtMs - receipt.normalRun.startedAtMs, 60025);
  assert.equal(receipt.surface.retireCompletedAtMs - receipt.normalRun.pauseReturnedAtMs, 30000);
  assert.equal(normal.extensionCalls(), 1); resource.dispose(); assert.equal(normal.writes.length, 4, 'original disposed guard keeps one attempt/finish');
  assert(normal.writes.every(row => row.key === `starward.r17.normal-surface-retirement.v1.${binding.buildSourceSha256}`));
  assert.equal(normal.writes[2].value.surface.outcome, 'attempted'); assert.equal(normal.writes[2].value.surface.after, null);
  assert.equal(normal.writes[0].value.surface, null); assert.equal(normal.writes[0].value.event, 'initialized');
  assert(Buffer.byteLength(JSON.stringify(receipt), 'utf8') < 8192);
  const failing = harness({ assignmentFailure: true, readFailure: true, lossFailure: true, contextReadFailure: true });
  const failingResource = failing.create(); failingResource.dispose(); const failed = failing.last();
  assert.equal(failed.surface.outcome, 'returned', 'original independent catches still let retirement return');
  for (const field of ['contextLoss','nodeHeight','displayWidth']) assert.equal(failed.surface.steps[field], 'threw');
  assert.equal(failed.surface.after.nodeWidth, null); assert.equal(failed.surface.after.contextLost, null);
  assert.equal(failed.surface.after.nodeHeight, 200); assert.equal(failed.surface.after.displayWidth, 100);
  assert.equal(failed.surface.after.displayHeight, 0, 'one failing native step cannot skip the other original backing write');
  assert(!JSON.stringify(failed).includes('private-'), 'no native/storage error text is persisted');
  const unsupported = harness({ unsupported: true }); unsupported.create().dispose();
  assert.equal(unsupported.last().surface.steps.contextLoss, 'unavailable'); assert.equal(unsupported.last().surface.after.contextLost, false);
  const selectionFailure = harness({ selectionFailure: true }), selectionResource = selectionFailure.create();
  assert.throws(() => selectionResource.dispose(), /original-selection-retirement-error/);
  assert.equal(selectionFailure.last().surface.outcome, 'threw'); assert.equal(selectionFailure.last().surface.steps.selection, 'threw');
  assert.equal(selectionFailure.last().surface.steps.contextExtension, 'not-attempted'); assert.equal(selectionFailure.extensionCalls(), 0);
  assert.equal(selectionFailure.last().surface.after.selectionLayerPresent, true);
  const initializationFailure = harness({ contextUnavailable: true });
  assert.throws(initializationFailure.create, /sky_canvas_webgl_context_unavailable/);
  assert.equal(initializationFailure.last().counts.ready, 0); assert.equal(initializationFailure.last().surface.ready, null);
  assert.equal(initializationFailure.last().surface.after.contextLost, null);
  const storageFailure = harness({ storageFailure: true }); storageFailure.create().dispose();
  assert.equal(storageFailure.display.width, 0); assert.equal(storageFailure.node.height, 0);
  assert.equal(storageFailure.last().storage.priorWriteFailures, 3, 'optional storage failures never block original teardown');
  const replaced = harness(), oldResource = replaced.create(), newResource = replaced.create();
  const currentId = replaced.last().surface.id; oldResource.dispose(); assert.equal(replaced.last().surface.id, currentId);
  newResource.dispose(); assert.equal(replaced.last().surface.id, currentId); assert(replaced.last().counts.rejectedEvents > 0);
  return { surfaceReceiptOnlyWritesAtInitializationReadyAndRetireBoundaries: true,
    surfaceReceiptReadsActualPostTeardownDimensionsAndContext: true, surfaceReceiptFailureUnknownAndOriginalThrowPoliciesPreserved: true,
    surfaceReceiptSourceBoundLastSurfaceAndScalarPlayTailOnly: true };
}

export function verifyNormalRequestedPreparationFixture({ page, parentPage, presentationSource, ts }) {
  const transpile = source => {
    const value = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, reportDiagnostics: true });
    assert.equal(value.diagnostics.filter(item => item.category === ts.DiagnosticCategory.Error).length, 0);
    return value.outputText;
  };
  const start = page.indexOf('  const r17TimePreparation = useMemo('), end = page.indexOf('  const timeGeometryReady', start);
  assert(start >= 0 && end > start);
  const chain = page.slice(start, end), selectionStart = '  const acceptedTimePresentation =';
  assert.equal(chain.slice(chain.indexOf(selectionStart)), parentPage.slice(parentPage.indexOf(selectionStart), parentPage.indexOf('  const timeGeometryReady')),
    'accepted scope and the production selection memo remain byte identical');
  assert.match(chain, /\}, \[rawReportData, requestedAt, timeModel, timeGeometrySources\]\);/);
  const ast = ts.createSourceFile('presentation.ts', presentationSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const selectors = ast.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === 'selectSkyTimePresentation');
  assert.equal(selectors.length, 1);
  const selectorText = selectors[0].getText(ast).replace('export ', '');
  const report = { context: {} }, committed = { source: report, report: {}, row: { at: 'C' } };
  const a = { source: report, report: {}, row: { at: 'A' } }, b = { source: report, report: {}, row: { at: 'B' } };
  let hook = 0, refHook = 0, calls = 0, nextToken = 0, throwing = false;
  const memos = [], refs = [], preparations = [], requests = [], available = new Map([['A', a], ['C', committed]]), sequences = new WeakMap();
  const probe = { intentSequence: state => sequences.get(state) ?? null,
    prepareStarted: (sequence, kind) => { assert.equal(kind, 'presentation'); const token = ++nextToken; preparations.push({ token, sequence }); return token; },
    prepareFinished: (token, completed) => { preparations.find(value => value.token === token).completed = completed; },
    request: (frame, token, sequence) => requests.push({ frame, token, sequence }) };
  const context = vm.createContext({ rawReportData: report, requestedAt: 'A', committedAt: 'C', timeBinding: 'owner',
    timeIntent: { at: 'A', committedAt: 'C', binding: 'owner' }, timeModel: {}, timeGeometrySources: [],
    pageVisible: true, skyResourcesActive: true, canvasError: null, presentedSkyFrame: null, mode: 'NIGHT',
    canvasGenerationRef: { current: 1 }, timePresentationScope: {}, r17Probe: probe,
    presentSkyTime: (_report, at) => { calls++; if (throwing) throw Error('fixture_preparation_failed'); return available.get(at) ?? null; },
    useRef: initial => refs[refHook++] ??= { current: initial },
    useMemo: (work, deps) => { const index = hook++, previous = memos[index];
      if (previous && previous.deps.length === deps.length && deps.every((value, i) => Object.is(value, previous.deps[i]))) return previous.value;
      const value = work(); memos[index] = { deps: [...deps], value }; return value; } });
  context.selectSkyTimePresentation = vm.runInContext('(function(){' + transpile(selectorText) + ';return selectSkyTimePresentation;})()', context);
  const script = new vm.Script('(function(){' + transpile(chain) + ';return {r17TimePreparation,requestedTimePresentation,timePresentation,r17TimePreparationRef};})()');
  const render = () => { hook = refHook = 0; return script.runInContext(context); };
  const intent = (at, sequence, binding = 'owner') => { context.requestedAt = at; context.timeIntent = { at, committedAt: 'C', binding }; sequences.set(context.timeIntent, sequence); };
  const accepted = presentation => { context.presentedSkyFrame = { mode: 'NIGHT', nativeCanvasGeneration: 1,
    timePresentationScope: context.timePresentationScope, data: { context: report.context }, timePresentation: presentation, frameAt: presentation.row.at }; };
  const drawStart = page.indexOf('  const draw = useCallback('), classifyStart = page.indexOf('    const r17RequestPreparation =', drawStart);
  const frameStart = page.indexOf('    const r17PreparedRequest:', classifyStart), requestStart = page.indexOf('    r17Probe.request(', frameStart);
  const requestEnd = page.indexOf('    canvasLifecycle.request(', requestStart);
  assert(classifyStart > drawStart && frameStart > classifyStart && requestEnd > requestStart);
  const makeDraw = vm.runInNewContext('(function(timePresentation, canvasData, r17TimePreparationRef, r17Probe){return function(){' +
    transpile(page.slice(classifyStart, frameStart)) +
    'const r17PreparedRequest={data:canvasData,frameAt:timePresentation?.row.at,timePresentation};' +
    transpile(page.slice(requestStart, requestEnd)) + '};})');
  intent('A', 1); const readyA = render(), drawA = makeDraw(readyA.timePresentation, {}, readyA.r17TimePreparationRef, probe);
  assert.strictEqual(readyA.timePresentation, a); assert.equal(preparations.length, 1); assert.equal(calls, 1);
  drawA(); assert.equal(requests.at(-1).token, 1); assert.equal(requests.at(-1).sequence, 1);
  accepted(a); intent('B', 2); const pending = render();
  assert.strictEqual(pending.timePresentation, a); assert.equal(pending.requestedTimePresentation, null);
  assert.equal(pending.r17TimePreparation.token, null); assert.equal(pending.r17TimePreparation.intentSequence, null);
  assert.equal(preparations.length, 2); assert.equal(calls, 2, 'only the actual unavailable requested computation is prepared');
  drawA(); assert.equal(requests.at(-1).token, null); assert.equal(requests.at(-1).sequence, null,
    'a retained old callback reads current preparation and cannot claim the new pending intent');
  const pendingDraw = makeDraw(pending.timePresentation, {}, pending.r17TimePreparationRef, probe);
  pendingDraw(); accepted(a); render(); pendingDraw();
  assert.equal(preparations.length, 2); assert.equal(calls, 2, 'accepted-only rerenders and repeated retained draws are not new preparations');
  assert(requests.slice(1).every(value => value.token === null && value.sequence === null));
  available.set('B', b); context.timeModel = {}; const readyB = render();
  assert.strictEqual(readyB.timePresentation, b); assert.equal(readyB.r17TimePreparation.token, 3); assert.equal(readyB.r17TimePreparation.intentSequence, 2);
  drawA(); assert.equal(requests.at(-1).token, null, 'old accepted input cannot consume a newly admitted different input');
  const drawB = makeDraw(readyB.timePresentation, {}, readyB.r17TimePreparationRef, probe); drawB();
  assert.equal(requests.at(-1).token, 3); assert.equal(requests.at(-1).sequence, 2);
  intent('B', 3); const sameB = render(); assert.strictEqual(sameB.r17TimePreparation, readyB.r17TimePreparation);
  drawB(); assert.equal(requests.at(-1).token, 3); assert.equal(requests.at(-1).sequence, 2,
    'a repeated equal instant that reuses the memo keeps the original preparation intent');
  intent('C', 4); const cancelled = render(); assert.strictEqual(cancelled.timePresentation, committed);
  drawB(); assert.equal(requests.at(-1).token, null); assert.equal(preparations.length, 4);
  const emptyDraw = makeDraw(cancelled.timePresentation, undefined, cancelled.r17TimePreparationRef, probe); emptyDraw();
  assert.equal(requests.at(-1).token, null); assert.equal(requests.at(-1).sequence, null);
  intent('B', 5, 'other'); const foreign = render(); assert.equal(foreign.r17TimePreparation.intentSequence, null);
  assert.equal(preparations.at(-1).sequence, null);
  throwing = true; context.timeModel = {}; assert.throws(render, /fixture_preparation_failed/);
  assert.equal(preparations.at(-1).completed, false); assert(preparations.slice(0, -1).every(value => value.completed === true));
  return { requestedMemoKeepsFourProductionDependenciesAndSelectionByteIdentical: true,
    acceptedFallbackAndStaleDrawCannotConsumeNewIntentPreparation: true,
    acceptedOnlyRenderDoesNotCreateAnotherPreparation: true,
    newTargetAndSameTimeMemoReusePreserveOriginalPreparationIntent: true,
    cancelledEmptyAndForeignInputsAndThrownPreparationKeepHonestLinkage: true };
}

export async function verifyNormalBaselineV3Fixture({ sourceRoot, productionRoot, feature, ts, buildGeneration, protocolPath, expectedProbeVersion = 3, allowACorrelation = false, allowRulerEntry = false, retirementObservation = false, requestedPreparation, readPreparedSource, readProductionSource }) {
  assert.equal(expectedProbeVersion, 3, 'this materialized fixture is explicitly v3');
  const probeMode = 'normal';
  const read = name => (readPreparedSource ? readPreparedSource(name) : fs.readFile(path.join(sourceRoot, feature, name), 'utf8')).then(value => value.replaceAll('\r\n', '\n'));
  const parentRead = name => (readProductionSource ? readProductionSource(name) : fs.readFile(path.join(productionRoot, feature, name), 'utf8')).then(value => value.replaceAll('\r\n', '\n'));
  const transpile = source => {
    const value = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }, reportDiagnostics: true });
    assert.equal(value.diagnostics.filter(item => item.category === ts.DiagnosticCategory.Error).length, 0);
    return value.outputText;
  };
  const load = (source, require = name => { throw Error(name); }, environment = {}, suffix = '') => {
    const module = { exports: {} };
    vm.runInNewContext('(function(exports,require,module){' + transpile(source) + '\n' + suffix + '\n})', environment)(module.exports, require, module);
    return module.exports;
  };
  const page = await read('spot-sky-page.tsx'), parentPage = await parentRead('spot-sky-page.tsx');
  requestedPreparation ??= page.includes('  const requestedTimePresentation = r17TimePreparation.presentation;');
  assert.equal(page.split('skyCommandStateSetter(presentedSkyFrameRef, setPresentedSkyFrameState)').length, 2);
  assert.equal(page.match(/setPresentedSkyFrame\(null\)/g)?.length, 3);
  assert.equal(page.match(/setPresentedSkyFrame\(previous =>/g)?.length, 1);
  const publication = source => source.slice(source.indexOf('            setPresentedSkyFrame(previous =>'), source.indexOf('            setPresentedCamera', source.indexOf('            setPresentedSkyFrame(previous =>')));
  assert.equal(publication(page), publication(parentPage), 'complete updater/equality stays byte identical');
  const acceptedType = source => source.slice(source.indexOf('  const [presentedSkyFrame,'), source.indexOf('  const setPresentedSkyFrame ='));
  assert.equal(acceptedType(page), acceptedType(parentPage), 'complete state/ref retained');
  const setterSource = await read('sky-command-state.ts');
  assert.equal(setterSource, await parentRead('sky-command-state.ts'));
  const { skyCommandStateSetter } = load(setterSource);
  const A = { frameAt: 'A', data: {}, image: {}, nested: { complete: true } }, B = { frameAt: 'B', data: {}, image: {} };
  const current = { current: A }, actions = [];
  const setter = skyCommandStateSetter(current, action => { assert.equal(typeof action, 'function'); assert.strictEqual(action(null), current.current); actions.push(action); });
  let updates = 0;
  setter(previous => { assert.strictEqual(previous, A); updates++; return B; });
  setter(previous => { assert.strictEqual(previous, B); updates++; return A; });
  setter(previous => { assert.strictEqual(previous, A); updates++; return previous; });
  assert.equal(updates, 3); assert.equal(actions.length, 3); assert.strictEqual(current.current, A);
  setter(null); assert.strictEqual(current.current, null);
  assert.throws(() => setter(() => { throw Error('updater_failed'); }), /updater_failed/); assert.equal(actions.length, 4);
  const failedDispatch = { current: null };
  assert.throws(() => skyCommandStateSetter(failedDispatch, () => { throw Error('dispatch_failed'); })(A), /dispatch_failed/);
  assert.strictEqual(failedDispatch.current, A);
  for (const name of ['sky-selected-object.tsx', 'use-sky-artwork.ts', 'sky-stellar-transform.ts',
    'sky-object-selection.ts', 'sky-star-transition.ts', 'sky-ready-presentation.ts', 'sky-name-layout.ts']) {
    assert.equal(await read(name), await parentRead(name), 'unaffected production consumer changed:' + name);
  }
  assert.doesNotMatch(page, /r17Cpu|r17AcceptedAction|scene-owned-memo|synthetic/);
  const observationSource = await read('r17-normal-observations.ts');
  const normalObservation = load(observationSource);
  const textResult = { width: 32 };
  assert.strictEqual(normalObservation.r17NormalMeasuredText(textResult), textResult);
  assert.equal(normalObservation.r17NormalTextStats().nativeGlyphCalls, 1);
  normalObservation.r17ResetNormalObservation();
  assert.equal(normalObservation.r17NormalTextStats().nativeGlyphCalls, 0);
  assert.equal(normalObservation.r17NormalTextStats().lifetimeNativeGlyphCalls, 1);
  normalObservation.r17NormalSurfaceReady(); normalObservation.r17NormalCopyReturned(true);
  assert.equal(normalObservation.r17NormalSceneStats().nativeCopies, 1);
  assert.equal(normalObservation.r17NormalSceneStats().readyNativeCopies, 1);
  assert.equal(normalObservation.r17NormalSceneStats().frozen, false);
  normalObservation.r17NormalSurfaceRetired(); assert.equal(normalObservation.r17NormalSceneStats().retired, true);
  const retirementChecks = retirementObservation ? await verifyNormalSurfaceRetirementFixture({
    surfaceSource: await read('sky-canvas-surface.ts'), observationSource, ts }) : {};
  const requestedPreparationChecks = requestedPreparation ? verifyNormalRequestedPreparationFixture({
    page, parentPage, presentationSource: await parentRead('sky-time-presentation.ts'), ts }) : {};
  if (!requestedPreparation) {
  const memoStart = page.indexOf('  const r17TimePreparation = useMemo('), memoEnd = page.indexOf('  const timeGeometryReady', memoStart);
  const memoText = page.slice(memoStart, memoEnd);
  assert.match(memoText, /\[rawReportData, requestedAt, committedAt, timeModel, timeGeometrySources\]/);
  const intentState = { at: 'A', binding: 'owner', committedAt: 'C' }, presentation = { row: { at: 'A' }, report: {} };
  let preparedStarts = 0, finished = 0, inputCalls = 0, sameDeps;
  const result = vm.runInNewContext('(function(){' + transpile(memoText) + ';return {r17TimePreparation,timePresentation};})()', {
    useMemo: (work, deps) => { sameDeps = deps; return work(); }, timeIntent: intentState, timeBinding: 'owner', committedAt: 'C',
    requestedAt: 'A', rawReportData: {}, timeModel: {}, timeGeometrySources: [],
    presentSkyTime: (_report, at) => { inputCalls++; assert.equal(at, 'A'); return presentation; },
    r17Probe: { intentSequence: state => { assert.strictEqual(state, intentState); return 4; },
      prepareStarted: (sequence, kind) => { assert.equal(sequence, 4); assert.equal(kind, 'presentation'); preparedStarts++; return 8; },
      prepareFinished: (token, completed) => { assert.equal(token, 8); assert.equal(completed, true); finished++; } },
  });
  assert.strictEqual(result.timePresentation, presentation); assert.equal(result.r17TimePreparation.token, 8);
  assert.equal(result.r17TimePreparation.intentSequence, 4); assert.equal(preparedStarts, 1); assert.equal(finished, 1); assert.equal(inputCalls, 1); assert.equal(sameDeps.length, 5);
  const fallback = vm.runInNewContext('(function(){' + transpile(memoText) + ';return {r17TimePreparation,timePresentation};})()', {
    useMemo: work => work(), timeIntent: intentState, timeBinding: 'owner', committedAt: 'C', requestedAt: 'A', rawReportData: {}, timeModel: {}, timeGeometrySources: [],
    presentSkyTime: (_report, at) => at === 'A' ? null : { row: { at: 'C' } },
    r17Probe: { intentSequence: () => 4, prepareStarted: () => 8, prepareFinished() {} },
  });
  assert.equal(fallback.r17TimePreparation.token, null); assert.equal(fallback.r17TimePreparation.intentSequence, null);
  let failureCompleted;
  assert.throws(() => vm.runInNewContext('(function(){' + transpile(memoText) + '})()', {
    useMemo: work => work(), timeIntent: intentState, timeBinding: 'owner', committedAt: 'C', requestedAt: 'A', rawReportData: {}, timeModel: {}, timeGeometrySources: [],
    presentSkyTime: () => { throw Error('fixture_preparation_failed'); },
    r17Probe: { intentSequence: () => 4, prepareStarted: () => 8, prepareFinished: (_token, completed) => { failureCompleted = completed; } },
  }), /preparation_failed/);
  assert.equal(failureCompleted, false);
  }
  // The full request object stays unchanged; only an explicit identity call is inserted.
  const requestFields = (source, prefix, suffix) => source.slice(source.indexOf(prefix) + prefix.length, source.indexOf(suffix, source.indexOf(prefix)));
  assert.equal(requestFields(parentPage, '    canvasLifecycle.request({', ' },\n      !canvasData'),
    requestFields(page, '    const r17PreparedRequest: SkyCanvasFrame = {', ' };\n    r17Probe.request'));
  const drawDeps = source => source.slice(source.indexOf('  }, [canvasLifecycle, canvasNodeRevision, canvasFrameInfo,'), source.indexOf('  browsingDrawRef.current = draw;'));
  assert.equal(drawDeps(page), drawDeps(parentPage), 'draw scheduling dependencies changed');

  const protocol = await import(pathToFileURL(protocolPath));
  // Runtime/control integration uses fake timers and actual source. No device/API side effects.
  let clock = 0, nextTimer = 0, hide, show, pageUnmount, stopUnmount, effectIndex = 0, refIndex = 0;
  const timers = new Map(), refs = [], requests = [], productPage = { setData() {} };
  const schedule = (callback, delay) => { const id = ++nextTimer; timers.set(id, { callback, at: clock + delay }); return id; };
  const advance = to => { while (true) {
    const due = [...timers].filter(([, value]) => value.at <= to).sort((a, b) => a[1].at - b[1].at)[0];
    if (!due) break; timers.delete(due[0]); clock = due[1].at; due[1].callback();
  } clock = to; };
  const fixtureEpochMs = 1802822400000;
  let fixtureWallOffset = 0;
  const fixtureDate = class extends Date { static now() { return fixtureEpochMs + clock + fixtureWallOffset; } };
  const pauseTrialMs = retirementObservation ? 60000 : 20000;
  // Preserve the historical sequence while changing only this trial's Pause delay.
  const advanceBoundary = boundary => advance(Math.floor(boundary / 20000) * pauseTrialMs + boundary % 20000);
  const environmentClock = { Date: fixtureDate, setTimeout: schedule, clearTimeout: id => timers.delete(id), performance: { now: () => clock } };
  const correlation = allowACorrelation ? load(await read('r17-a-correlation-runtime.ts'), undefined, environmentClock) : null;
  const rulerEntry = allowRulerEntry ? load(await read('r17-ruler-entry-runtime.ts'), undefined, environmentClock) : null;
  const probe = load(await read('r17-phone-probe-runtime.ts'), name => {
    if (allowACorrelation && name === './r17-a-correlation-runtime') return correlation;
    if (allowRulerEntry && name === './r17-ruler-entry-runtime') return rulerEntry;
    throw Error(name);
  }, environmentClock).r17Probe;
  const observer = load(await read('r17-page-bridge-observer.ts'), name => {
    if (allowACorrelation && name === './r17-phone-probe-runtime') return { r17Probe: probe };
    throw Error(name);
  }, environmentClock);
  const tmStats = { nativeGlyphCalls: 4, lifetimeNativeGlyphCalls: 9, observationResets: 1, retired: false, available: true };
  const cpuStats = { frozen: false, retired: false, nativeCopies: 1, readyNativeCopies: 1, syntheticBegins: 0, syntheticFinishes: 0, syntheticPublications: 0 };
  const jsx = (type, props) => ({ type, props });
  const controls = load(await read('r17-phone-probe-controls.tsx'), name => {
    if (name === './r17-phone-probe-runtime') return { r17Probe: probe };
    if (allowRulerEntry && name === './r17-ruler-entry-runtime') return rulerEntry;
    if (name === './r17-page-bridge-observer') return observer;
    if (name === './r17-normal-observations') return { ...normalObservation,
      r17NormalSceneStats: () => cpuStats, r17NormalTextStats: () => tmStats, r17ResetNormalObservation() {} };
    if (name === 'react') return { useEffect: effect => { if (effectIndex++ === 0) pageUnmount = effect(); else stopUnmount = effect(); },
      useRef: initial => refs[refIndex++] ??= { current: initial }, useState: value => [typeof value === 'function' ? value() : value, () => {}] };
    if (name === '@tarojs/taro') return { __esModule: true, useDidHide: callback => { hide = callback; }, useDidShow: callback => { show = callback; },
      default: { getCurrentInstance: () => ({ page: productPage }), getAppBaseInfo: () => ({ enableDebug: false }), setStorageSync() {},
        request: options => new Promise(resolve => requests.push({ options, resolve })) } };
    if (name === '@tarojs/components') return { Button: 'Button', Text: 'Text', View: 'View' };
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    throw Error(name);
  }, { ...environmentClock, __MINIAPP_API_BASE__: 'http://diagnostic.invalid' },
  'exports.fixture = { startDiagnostic, exportDiagnostic, cancelDiagnostic, status: () => status };');
  controls.useR17NormalLifecycle();
  let productMode = 'PREVIEW', runStartAt = null, pauses = 0, oldCallbackCalls = 0;
  const at = '2026-10-18T00:00:00.000Z';
  const scope = { Date: fixtureDate, ownerCurrent: false, datePickerOpenRef: { current: false }, timeModel: { endAt: '2026-10-18T12:00:00.000Z' },
    geometryReport: {}, report: { isError: false, data: { dataState: 'FRESH' } }, skyTimeIntentCurrent: () => scope.ownerCurrent,
    cancelSkyCalibration() {}, observationTime: { snapshot: () => ({ mode: productMode, at, runStartAt }),
      play: () => ({ mode: 'PLAYING', runStartAt: at }), pause: () => ({ mode: 'PAUSED', runStartAt: null }) },
    setTimeIntent: value => { productMode = value.mode; runStartAt = value.runStartAt; },
    pauseSkyTime: () => { pauses++; scope.setTimeIntent(scope.observationTime.pause()); },
    r17NormalProductPlayStarted: controls.r17NormalProductPlayStarted };
  const playStart = page.indexOf('  const toggleSkyTimePlayback = () => {'), playEnd = page.indexOf('  const commitInstant = ', playStart);
  const toggle = vm.runInNewContext('(function(){' + transpile(page.slice(playStart, playEnd)) + ';return toggleSkyTimePlayback;})()', scope);
  const stopStart = page.indexOf('  useR17NormalStop(runStartAt => {'), stopEnd = page.indexOf('  const toggleSkyTimePlayback', stopStart);
  let actualStop;
  vm.runInNewContext(transpile(page.slice(stopStart, stopEnd)), { ...scope, useR17NormalStop: fn => { actualStop = fn; } });
  controls.useR17NormalStop(() => { oldCallbackCalls++; return false; }); refs.at(-1).current = actualStop;
  controls.fixture.startDiagnostic('wide-play'); assert.equal(timers.size, 0);
  toggle(); assert.equal(productMode, 'PREVIEW'); assert.equal(timers.size, 0);
  scope.ownerCurrent = true; scope.datePickerOpenRef.current = true; toggle(); assert.equal(productMode, 'PREVIEW');
  scope.datePickerOpenRef.current = false; toggle(); assert.equal(productMode, 'PLAYING'); assert.equal(timers.size, 3);
  advance(1000);
  const publicState = { at }, sequence = probe.intent(publicState), token = probe.prepareStarted(sequence, 'presentation');
  probe.prepareFinished(token);
  const frame = { frameAt: at }, clone = { ...frame };
  probe.request(frame, token, sequence); probe.prepared(frame); probe.inheritFrame(clone, frame); probe.paintStarted(clone); probe.callback(clone); probe.accepted(clone, { objects: [{ reference: 'HR:1' }, { reference: 'SAO:2' }] });
  probe.sceneFinished({ skyScene: { catalog: { catalogVersion: 'test-public' } } }, at, { pointCount: 8404 }, { pointCount: 666 }, 390, 844, 45, 'NIGHT', 100, 5);
  advance(15000); assert.equal(requests.length, 1); assert.equal(productMode, 'PLAYING');
  const metricsSerialized = requests[0].options.data, metrics = JSON.parse(metricsSerialized);
  assert.equal(metrics.schemaVersion, 'starward-r17-phone-probe-v3');
  assert.equal(metrics.window.elapsedMs, 14000); assert.equal(metrics.counters.sceneFinishes, 1); assert.equal(metrics.counters.acceptedCopies, 1);
  assert.equal(metrics.binding.mode, probeMode); assert.equal(metrics.binding.buildGeneration, buildGeneration); assert.match(metrics.binding.buildSourceSha256, /^[a-f0-9]{64}$/);
  assert.equal(metrics.controls.events.actualPlay.calls, 1); assert.equal(metrics.controls.events.actualPlay.firstRelativeMs, 0);
  assert.equal(metrics.controls.events.actualPlay.lastResult, true);
  assert.equal(metrics.controls.events.export.calls, 1); assert.equal(metrics.controls.events.export.firstRelativeMs, 15000);
  assert.equal(metrics.controls.events.pauseAttempt.calls, 0);
  assert.equal(metrics.observations.tm.captures, 2); assert.equal(metrics.observations.tm.last.values.hits, null);
  assert.equal(metrics.observations.tm.last.values.nativeGlyphCalls, 4);
  assert.equal(metrics.observations.scene.last.values.frozen, false);
  assert.equal(metrics.observations.scene.last.values.images, null);
  assert.equal(metrics.counters.acceptedBscObjects, 1); assert.equal(metrics.counters.acceptedSaoObjects, 1);
  assert.equal(metrics.linkage.preparationsFinished, 1); assert.equal(metrics.linkage.syntheticPublications, 0);
  assert.equal(metrics.linkage.firstAcceptedIntents, 1);
  if (allowACorrelation) {
    assert.equal(metrics.aCorrelation.schemaVersion, 'starward-r17-a-correlation-v1');
    assert.equal(metrics.aCorrelation.retainedPreparations, 1);
    assert.equal(metrics.aCorrelation.links[0].prepareToken, token);
    assert.equal(metrics.aCorrelation.links[0].firstRequestObserved, true);
    assert.equal(metrics.aCorrelation.links[0].firstPaintObserved, true);
    assert.equal(metrics.aCorrelation.preparationToRequest.unknown.belowResolution, 1);
    assert.equal(metrics.aCorrelation.requestToPaint.unknown.belowResolution, 1);
  }
  assert.equal(protocol.validateR17PhoneProbeMetrics(metrics), true);
  requests[0].resolve({ statusCode: 200, data: { stored: true } }); await new Promise(resolve => setImmediate(resolve));
  if (retirementObservation) {
    advance(59999); assert.equal(productMode, 'PLAYING'); assert.equal(pauses, 0);
    // A real delayed timer may exceed v3's 60s clock range. Keep null; do not widen it.
    fixtureWallOffset = 25;
  }
  advanceBoundary(20000); assert.equal(productMode, 'PAUSED'); assert.equal(pauses, 1); assert.equal(oldCallbackCalls, 0); assert.equal(requests.length, 2);
  const terminal = JSON.parse(requests[1].options.data);
  assert.equal(terminal.schemaVersion, 'starward-r17-phone-probe-v3-terminal'); assert.equal(terminal.runId, metrics.runId);
  assert.equal(terminal.controls.events.pauseAttempt.calls, 1); assert.equal(terminal.controls.events.pauseAttempt.lastRelativeMs, retirementObservation ? null : 20000);
  assert.equal(terminal.controls.events.pauseAttempt.lastResult, true); assert.equal(terminal.controls.events.pauseSuccess.calls, 1);
  assert.equal(terminal.controls.events.pauseSuccess.lastResult, true); assert.equal(terminal.controls.events.terminalExport.calls, 1);
  assert.equal(JSON.stringify(probe.snapshot()), metricsSerialized, 'terminal must not mutate sealed metrics');
  assert.equal(protocol.validateR17PhoneProbeMetrics(terminal), true);
  assert.equal(protocol.matchR17PhoneProbeTerminal(metrics, terminal), true);
  requests[1].resolve({ statusCode: 200, data: { stored: true } }); await new Promise(resolve => setImmediate(resolve));
  // The original guards reject a replacement product run, hidden or unmounted owner.
  // A real Pause/Play at the same observed instant keeps runStartAt unchanged.
  // The diagnostic must distinguish that new playback, including when unarmed.
  controls.fixture.startDiagnostic('wide-play'); toggle(); toggle(); toggle(); advanceBoundary(35000);
  requests.at(-1).resolve({ statusCode: 200, data: { stored: true } }); await new Promise(resolve => setImmediate(resolve));
  advanceBoundary(40000);
  assert.equal(productMode, 'PLAYING'); assert.equal(pauses, 1);
  const rejectedPause = JSON.parse(requests.at(-1).options.data);
  assert.equal(rejectedPause.controls.events.pauseAttempt.calls, 1); assert.equal(rejectedPause.controls.events.pauseAttempt.lastResult, false);
  assert.equal(rejectedPause.controls.events.pauseSuccess.calls, 0);
  for (const request of requests.slice(2)) request.resolve({ statusCode: 200, data: { stored: true } });
  await new Promise(resolve => setImmediate(resolve));
  productMode = 'PAUSED'; controls.fixture.startDiagnostic('wide-play'); toggle(); assert(timers.size > 0); hide(); assert.equal(timers.size, 0);
  show(); productMode = 'PAUSED'; controls.fixture.startDiagnostic('wide-play'); toggle(); pageUnmount(); stopUnmount(); assert.equal(timers.size, 0);
  // A failed/delayed metrics POST cannot discard the sealed20s terminal.
  show();
  // Its mounted callback was retired above; reinstall the same guarded owner.
  effectIndex = 1; refIndex = 3; controls.useR17NormalStop(actualStop);
  productMode = 'PAUSED'; controls.fixture.startDiagnostic('wide-play'); toggle();
  const requestCount = requests.length; advanceBoundary(55000);
  assert.equal(requests.length, requestCount + 1);
  const failedMetrics = requests.at(-1).options.data;
  requests.at(-1).resolve({ statusCode: 503, data: { stored: false } }); await new Promise(resolve => setImmediate(resolve));
  assert.match(controls.fixture.status(), /导出失败/);
  advanceBoundary(60000); assert.equal(requests.length, requestCount + 1); assert.equal(productMode, 'PAUSED'); assert.equal(pauses, 2);
  assert.match(controls.fixture.status(), /回执待metrics/);
  // Manual metrics retry admits the same terminal bytes; a real424 response
  // retires the local confirmation and waits for the next explicit retry.
  void controls.fixture.exportDiagnostic();
  assert.equal(requests.length, requestCount + 2); assert.equal(requests.at(-1).options.data, failedMetrics);
  requests.at(-1).resolve({ statusCode: 200, data: { stored: true } }); await new Promise(resolve => setImmediate(resolve));
  assert.equal(requests.length, requestCount + 3);
  const deferredTerminal = requests.at(-1).options.data, deferredReceipt = JSON.parse(deferredTerminal);
  assert.equal(protocol.matchR17PhoneProbeTerminal(JSON.parse(failedMetrics), deferredReceipt), true);
  assert.equal(deferredReceipt.controls.events.pauseAttempt.calls, 1); assert.equal(deferredReceipt.controls.events.pauseSuccess.calls, 1);
  requests.at(-1).resolve({ statusCode: 424, data: { stored: false } }); await new Promise(resolve => setImmediate(resolve));
  assert.match(controls.fixture.status(), /回执导出失败/); assert.equal(requests.length, requestCount + 3);
  void controls.fixture.exportDiagnostic();
  assert.equal(requests.length, requestCount + 4); assert.equal(requests.at(-1).options.data, failedMetrics);
  requests.at(-1).resolve({ statusCode: 200, data: { stored: true } }); await new Promise(resolve => setImmediate(resolve));
  assert.equal(requests.length, requestCount + 5); assert.equal(requests.at(-1).options.data, deferredTerminal);
  requests.at(-1).resolve({ statusCode: 200, data: { stored: true } }); await new Promise(resolve => setImmediate(resolve));
  assert.match(controls.fixture.status(), /回执已导出/); assert.equal(pauses, 2); assert.equal(timers.size, 0);
  // A late metrics acknowledgement after hide cannot send a retired terminal.
  productMode = 'PAUSED'; controls.fixture.startDiagnostic('wide-play'); toggle(); advanceBoundary(75000);
  const lateMetrics = requests.at(-1), beforeHide = requests.length;
  advanceBoundary(80000); assert.equal(pauses, 3); assert.equal(requests.length, beforeHide); hide();
  lateMetrics.resolve({ statusCode: 200, data: { stored: true } }); await new Promise(resolve => setImmediate(resolve));
  assert.equal(requests.length, beforeHide); assert.equal(timers.size, 0);
  controls.fixture.cancelDiagnostic();
  // Unknown elapsed is consumed as unknown by the actual controls, never 0ms.
  controls.fixture.startDiagnostic('wide-time');
  fixtureDate.now = () => NaN;
  advanceBoundary(81000); void controls.fixture.exportDiagnostic();
  const unknownRequest = requests.at(-1), unknownMetrics = JSON.parse(unknownRequest.options.data);
  assert.equal(unknownMetrics.window.elapsedMs, null);
  assert.equal(protocol.validateR17PhoneProbeMetrics(unknownMetrics), true);
  unknownRequest.resolve({ statusCode: 200, data: { stored: true } }); await new Promise(resolve => setImmediate(resolve));
  assert.match(controls.fixture.status(), /elapsed未知\/manual/);
  controls.fixture.cancelDiagnostic();
  return { originalSetterImmediateExactlyOnceClosureAndRefBeforeDispatch: true,
    fullStateIdentityEqualityAndAllThreeNullRetirementsRetained: true, sameIdentityStillDispatches: true,
    sequentialAToBToAUpdaterAndDispatchFailureRetainOriginalSemantics: true,
    productionCommandSetterAndUnaffectedConsumersByteIdentical: true,
    actualPresentationMemoOriginalDependenciesAndExactResultIdentity: true, fallbackExplicitlyUnbound: true,
    completeRequestFieldsAndDrawDependenciesUnchanged: true, explicitPreparationIdentitySurvivesResolveClone: true,
    realAcceptedCopyAndNoSyntheticPublication: true, nativeMeasureTextReturnIdentityAndNumericCountersOnly: true,
    explicitVersion3ProtocolAndDateFake: true, nullElapsedConsumerDisplaysUnknownAndActualReason: true, guardedNormalPlayAnd15sMetricsKept: true,
    ...(retirementObservation ? { exactSameRun60sOriginalPauseAndSeparateTerminalReceiptWithUnknownLateTimestamp: true } : { exactSameRun20sOriginalPauseAndSeparateTerminalReceipt: true }),
    hiddenUnmountReplacementRunAndExportFailureGuarded: true,
    sealedTerminalWaitsForMetricsAnd424RetriesIdenticalBytesWithoutReplay: true,
    lateMetricsAfterHideCannotSendRetiredTerminal: true, fixturesNotPhoneEvidence: true,
    ...(allowRulerEntry ? { rulerEntryDisabledForPlayAndUsesExistingWideTimeCollector: true } : {}),
    ...(allowACorrelation ? { boundedACorrelationUsesActualPreparedRuntimeAndStrictDispatcher: true } : {}), ...retirementChecks, ...requestedPreparationChecks };
}
