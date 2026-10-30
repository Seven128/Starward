import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { f04NativeRecoverySourceFiles, transformF04NativeRecoverySources, injectF04NativeRecovery } from './inject-f04-native-recovery.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const require = createRequire(import.meta.url);
const ts = require(path.join(root, 'apps/wechat-miniapp/node_modules/typescript'));
const observerSource = await fs.readFile(new URL('./f04-native-recovery-observer.ts', import.meta.url), 'utf8');
const observerExports = {};
new Function('exports', ts.transpileModule(observerSource, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
} }).outputText)(observerExports);
const { createF04NativeRecoveryObserver } = observerExports;
const binding = 'a'.repeat(64);
const target = name => ({ src: `private-file-${name}`, bounds: {
  southwest: { latitude: 11, longitude: 22 }, northeast: { latitude: 33, longitude: 44 },
}, opacity: .55, zIndex: 3 });
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
function fixture(mapId = 'old-map', { resourceObservation = false } = {}) {
  let time = 1000;
  const probe = createF04NativeRecoveryObserver({ sourceSha256: binding, now: () => time, resourceObservation });
  probe.mapState(mapId, 0, 'ready', true);
  const readyNative = { addGroundOverlay(options) { options.success(); }, removeGroundOverlay(options) { options.success(); } };
  probe.wrapContext(mapId, '地形', readyNative).addGroundOverlay({ ...target('baseline'), id: 2, visible: true, success() {}, fail() {} });
  return { probe, at(value) { time = value; } };
}
function successorAck(probe, { updated = true } = {}) {
  probe.recoveryStarted('old-map', 'new-map', 1);
  if (updated) probe.mapUpdated('new-map', 1);
  const returned = Promise.resolve('new-native-result');
  let synchronous = false;
  const native = { addGroundOverlay(options) { assert.equal(this, native); options.success(); return returned; }, removeGroundOverlay() {} };
  const actual = probe.wrapContext('new-map', '地形', native).addGroundOverlay({ ...target('new'), id: 2, visible: true,
    success() { synchronous = true; }, fail() { assert.fail('new successor failed'); } });
  assert.equal(actual, returned, 'successor Promise identity must be preserved');
  assert.equal(synchronous, true, 'successor callback must not be delayed');
}

test('one-shot needs actual baseline ack and both real old completion channels stay held until actual successor conditions', async () => {
  const unready = createF04NativeRecoveryObserver({ sourceSha256: binding });
  assert.equal(unready.arm().reason, 'no_current_map');
  unready.mapState('map', 0, 'ready', true);
  assert.equal(unready.arm().reason, 'no_actual_terrain_ack');
  const { probe } = fixture();
  assert.equal(probe.arm().ok, true);
  let called = 0, forwarded = 0, promiseForwarded = false;
  const nativeValue = { actual: 'native-result' };
  const native = { addGroundOverlay(options) { called++; options.success(); return Promise.resolve(nativeValue); }, removeGroundOverlay() {} };
  const pending = probe.wrapContext('old-map', '地形', native).addGroundOverlay({ ...target('held'), id: 2, visible: true,
    success() { forwarded++; }, fail() { assert.fail('fabricated failure'); } });
  pending.then(value => { assert.equal(value, nativeValue); promiseForwarded = true; });
  await flush();
  assert.equal(called, 1, 'native operation really ran');
  assert.equal(forwarded, 0); assert.equal(promiseForwarded, false);
  assert.equal(probe.status().selected.callback, 'success');
  assert.equal(probe.status().selected.promise, 'success');
  assert.equal(probe.arm().reason, 'one_shot_already_consumed');
  successorAck(probe, { updated: false }); await flush();
  assert.equal(probe.status().successor.terrainAcknowledged, true);
  assert.equal(forwarded, 0); assert.equal(promiseForwarded, false, 'actual ack alone cannot release');
  probe.mapUpdated('old-map', 0); probe.mapUpdated('new-map', 0);
  assert.equal(forwarded, 0, 'stale/wrong-generation Map events do not release');
  probe.mapUpdated('new-map', 1); await flush();
  assert.equal(forwarded, 1); assert.equal(promiseForwarded, true);
  assert.equal(probe.status().heldCalls, 0);
  const rows = probe.readback().rows;
  const releaseIndex = rows.findIndex(row => row.event === 'release_authorized');
  assert.ok(releaseIndex > rows.findIndex(row => row.event === 'successor_on_updated'));
  assert.ok(releaseIndex > rows.findIndex(row => row.event === 'successor_terrain_ack'));
  assert.doesNotMatch(JSON.stringify(probe.readback()), /private-file|southwest|latitude|longitude/);
});

test('actual errors are held and forwarded by identity; no success is synthesized', async () => {
  const { probe } = fixture(); probe.arm();
  const callbackError = { privateToken: 'not-exported' }, promiseError = new Error('private-failure');
  let received, receivedPromise, successes = 0;
  const native = { addGroundOverlay(options) { options.fail(callbackError); return Promise.reject(promiseError); }, removeGroundOverlay() {} };
  const returned = probe.wrapContext('old-map', '地形', native).addGroundOverlay({ ...target('failed'), id: 2, visible: true,
    success() { successes++; }, fail(error) { received = error; } });
  returned.catch(error => { receivedPromise = error; });
  await flush(); assert.equal(received, undefined); assert.equal(receivedPromise, undefined);
  probe.recoveryStarted('old-map', 'new-map', 1); probe.mapUpdated('new-map', 1); await flush();
  assert.equal(received, undefined, 'onUpdated alone cannot release');
  const next = { addGroundOverlay(options) { options.success(); }, removeGroundOverlay() {} };
  probe.wrapContext('new-map', '地形', next).addGroundOverlay({ ...target('next'), id: 2, visible: true, success() {}, fail() {} });
  await flush(); assert.equal(received, callbackError); assert.equal(receivedPromise, promiseError); assert.equal(successes, 0);
  assert.doesNotMatch(JSON.stringify(probe.readback()), /privateToken|not-exported|private-failure/);
});

test('unknown/late actual result is never fabricated; subsequent calls and other layers keep their ordinary result', async () => {
  const { probe } = fixture(); probe.arm();
  let originalOptions, forwarded = 0;
  const native = { addGroundOverlay(options) { originalOptions = options; return undefined; }, removeGroundOverlay() {} };
  const wrapped = probe.wrapContext('old-map', '地形', native);
  assert.equal(wrapped.addGroundOverlay({ ...target('unknown'), id: 2, visible: true, success() { forwarded++; }, fail() {} }), undefined);
  successorAck(probe); await flush();
  assert.equal(probe.status().selected.callback, 'none'); assert.equal(forwarded, 0);
  originalOptions.success(); assert.equal(forwarded, 1, 'actual callback arriving after authorization is forwarded');
  originalOptions.success(); assert.equal(forwarded, 1, 'duplicate native outcome cannot be fabricated as another completion');
  let next = 0;
  const ordinary = { addGroundOverlay(options) { options.success(); return 'actual-return'; }, removeGroundOverlay() {} };
  assert.equal(probe.wrapContext('old-map', '地形', ordinary).addGroundOverlay({ ...target('later'), id: 3, visible: true,
    success() { next++; }, fail() {} }), 'actual-return');
  assert.equal(next, 1);
  assert.equal(probe.wrapContext('old-map', '光污染', ordinary), ordinary);
  assert.equal(probe.wrapContext('new-map', '地形', ordinary).updateGroundOverlay, undefined);
});

test('synchronous actual throw is preserved and cannot prematurely release a held callback', () => {
  const { probe } = fixture(); probe.arm();
  const error = new Error('actual throw'); let callback = 0;
  const native = { addGroundOverlay(options) { options.success(); throw error; }, removeGroundOverlay() {} };
  assert.throws(() => probe.wrapContext('old-map', '地形', native).addGroundOverlay({ ...target('throw'), id: 2, visible: true,
    success() { callback++; }, fail() {} }), value => value === error);
  assert.equal(callback, 0); assert.equal(probe.status().selected.invocationThrew, true);
});

test('real production coordinator times out at 10000ms, retains ownership, and late old result only cleans its own Map', async () => {
  const source = await fs.readFile(path.join(root, 'apps/wechat-miniapp/src/pages/map/map-ground-overlay.ts'), 'utf8');
  const sessionSource = await fs.readFile(path.join(root, 'apps/wechat-miniapp/src/pages/map/native-map-session.ts'), 'utf8');
  let now = 0, timerId = 0;
  const timers = new Map();
  const clock = { set(fn, delay) { const id = ++timerId; timers.set(id, { fn, at: now + delay }); return id; },
    clear(id) { timers.delete(id); }, advance(ms) { now += ms; for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.fn(); } } };
  const exports = {};
  new Function('exports', 'setTimeout', 'clearTimeout', ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS } }).outputText)(exports, clock.set, clock.clear);
  const sessionExports = {};
  new Function('exports', ts.transpileModule(sessionSource, { compilerOptions: { target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS } }).outputText)(sessionExports);
  const sessions = sessionExports.createNativeMapSessions(), oldMap = sessions.create();
  const { probe } = fixture(oldMap.mapId, { resourceObservation: true });
  const pins = new Map(), events = [], oldNativeCalls = [];
  const resources = { retainPath(file) { pins.set(file, (pins.get(file) ?? 0) + 1); return () => pins.set(file, pins.get(file) - 1); } };
  const oldNative = {
    addGroundOverlay(options) { oldNativeCalls.push('add'); options.success(); return Promise.resolve('actual-add'); },
    updateGroundOverlay(options) { oldNativeCalls.push('update'); options.success(); return Promise.resolve('actual-update'); },
    removeGroundOverlay(options) { oldNativeCalls.push('remove'); options.success(); return Promise.resolve('actual-remove'); },
  };
  const old = probe.observeCoordinator(oldMap.mapId, '地形', exports.createMapGroundOverlayCoordinator(2, () => probe.wrapContext(oldMap.mapId, '地形', oldNative), result => {
    probe.terrainResult(oldMap.mapId, '地形', oldMap.isCurrent(), Boolean(result.error), Boolean(result.requiresMapRecovery), result.phase ?? 'display',
      Boolean(result.target), Boolean(result.presentationUnknown));
    if (oldMap.isCurrent()) events.push(result);
  }, probe.wrapResources(oldMap.mapId, '地形', resources), '地形'));
  oldMap.registerRaster(old);
  await old.apply(target('baseline')); assert.equal(probe.arm().ok, true);
  const applying = old.apply(target('held-update')); await flush();
  assert.equal(probe.status().selected.method, 'update');
  clock.advance(9999); await flush(); assert.equal(events.some(event => event.requiresMapRecovery), false);
  clock.advance(1); await applying;
  assert.equal(events.at(-1).requiresMapRecovery, true);
  assert.equal(probe.status().selected.recoveryRequired, true);
  assert.equal(pins.get('private-file-baseline'), 1); assert.equal(pins.get('private-file-held-update'), 1);
  assert.equal(probe.status().resourceObservation.groups.find(group => group.mapId === oldMap.mapId).pinBalance, 2);
  const nextMap = oldMap.recover();
  assert.ok(nextMap); assert.notEqual(nextMap.mapId, oldMap.mapId);
  assert.equal(oldMap.isCurrent(), false);
  assert.equal(nextMap.canInstallRasters(), true, 'actual successor may install while its one predecessor is uncertain');
  probe.recoveryStarted(oldMap.mapId, nextMap.mapId, 1);
  const oldDisposal = await old.dispose(); assert.equal(oldDisposal.complete, false);
  assert.equal(oldNativeCalls.includes('remove'), false, 'old unresolved operation cannot claim removal');
  const beforeLate = probe.status().resourceObservation;
  assert.equal(beforeLate.groups.find(group => group.mapId === oldMap.mapId).removeDispatched, 0);
  assert.equal(beforeLate.coordinators[0].lastDisposeComplete, false);
  assert.equal(beforeLate.coordinators[0].remainingIdsCount, 1);
  assert.equal(beforeLate.coordinators[0].retired, false);
  probe.mapUpdated(nextMap.mapId, 1);
  const freshEvents = [];
  const next = probe.observeCoordinator(nextMap.mapId, '地形', exports.createMapGroundOverlayCoordinator(2,
    () => probe.wrapContext(nextMap.mapId, '地形', oldNative), result => freshEvents.push(result),
    probe.wrapResources(nextMap.mapId, '地形', resources), '地形'));
  nextMap.registerRaster(next);
  await next.apply(target('successor')); await flush(); await old.retired;
  assert.equal(freshEvents.at(-1).target.src, 'private-file-successor');
  assert.equal(freshEvents.at(-1).error, null);
  assert.equal(pins.get('private-file-successor'), 1);
  assert.equal(pins.get('private-file-baseline'), 0); assert.equal(pins.get('private-file-held-update'), 0);
  assert.equal(probe.status().selected.oldRemoveAcknowledged, true);
  assert.equal(probe.status().selected.callbackForwarded, true); assert.equal(probe.status().selected.promiseForwarded, true);
  const resourceResult = probe.status().resourceObservation;
  const oldGroup = resourceResult.groups.find(group => group.mapId === oldMap.mapId);
  assert.equal(oldGroup.pinRetains, 2); assert.equal(oldGroup.pinReleases, 2); assert.equal(oldGroup.pinBalance, 0);
  assert.equal(oldGroup.removeDispatched, 1); assert.equal(oldGroup.removeAwaitingOutcome, 0);
  assert.equal(oldGroup.removeCallbackSuccess, 1); assert.equal(oldGroup.removePromiseSuccess, 1);
  assert.equal(resourceResult.coordinators[0].retired, true);
  assert.equal(resourceResult.coordinators[1].retired, false);
  assert.equal(resourceResult.groups.find(group => group.mapId === nextMap.mapId).pinBalance, 1);
  assert.doesNotMatch(JSON.stringify(probe.readback()), /private-file|latitude|longitude|southwest/);
  assert.equal(probe.status().physicalMapRelease, 'unknown');
  assert.equal(events.at(-1).requiresMapRecovery, true, 'old late success cannot publish a new accepted display');
  assert.equal(nextMap.recover(), null, 'actual native owner still bounds unknown physical Map destruction');
  await next.dispose();
});

test('resource observation is opt-in and unrelated layer callbacks never arm terrain or acknowledge its successor', async () => {
  const disabled = createF04NativeRecoveryObserver({ sourceSha256: binding });
  const resources = { retainPath() { return () => {}; } };
  const coordinator = { dispose() { return Promise.resolve({ complete: true, remainingIds: [] }); }, retired: Promise.resolve() };
  assert.equal(disabled.wrapResources('map', '地形', resources), resources);
  assert.equal(disabled.observeCoordinator('map', '地形', coordinator), coordinator);
  assert.equal(Object.hasOwn(disabled.readback(), 'resourceObservation'), false);
  const probe = createF04NativeRecoveryObserver({ sourceSha256: binding, resourceObservation: true });
  probe.mapState('old-map', 0, 'ready', true);
  const actualReturn = Promise.resolve('real'), callbackError = { secret: 'must-not-export' };
  const native = { addGroundOverlay(options) { options.success(); return actualReturn; }, removeGroundOverlay() {} };
  const light = probe.wrapContext('old-map', '光污染', native);
  assert.equal(light.addGroundOverlay({ ...target('private-light'), id: 4, visible: true, success() {}, fail() {} }), actualReturn);
  await flush(); assert.equal(probe.arm().reason, 'no_actual_terrain_ack');
  probe.wrapContext('old-map', '地形', native).addGroundOverlay({ ...target('terrain'), id: 2, visible: true, success() {}, fail() {} });
  assert.equal(probe.arm().ok, true);
  light.addGroundOverlay({ ...target('next-light'), id: 4, visible: true, success() {}, fail() { throw callbackError; } });
  assert.equal(probe.status().armed, true, 'another layer cannot consume the terrain one-shot');
  probe.wrapContext('old-map', '地形', native).addGroundOverlay({ ...target('held'), id: 2, visible: true, success() {}, fail() {} });
  probe.recoveryStarted('old-map', 'new-map', 1); probe.mapUpdated('new-map', 1);
  probe.wrapContext('new-map', '云量', native).addGroundOverlay({ ...target('new-cloud'), id: 6, visible: true, success() {}, fail() {} });
  await flush(); assert.equal(probe.status().successor.terrainAcknowledged, false);
  assert.equal(probe.status().heldCalls, 1);
  assert.doesNotMatch(JSON.stringify(probe.readback()), /private-light|next-light|new-cloud|must-not-export/);
});

test('remove dispatch precedes the actual call, synchronous throws and both real result channels remain distinct', async () => {
  const { probe } = fixture('old-map', { resourceObservation: true });
  const actualFailure = new Error('private native detail'), callbackFailure = { privatePath: '/sensitive/file' };
  let mode = 'throw', late, callbackCalled = 0;
  const actualPromise = Promise.resolve({ privateResult: 'never-record' });
  const native = {
    addGroundOverlay() {},
    removeGroundOverlay(options) {
      const dispatch = probe.readback().rows.at(-1);
      assert.equal(dispatch.event, 'native_remove_dispatched', 'dispatch must be observable before invoking the platform');
      assert.equal(dispatch.id, options.id);
      if (mode === 'throw') throw actualFailure;
      if (mode === 'failure') { options.fail(callbackFailure); return undefined; }
      if (mode === 'unknown') { late = options; return undefined; }
      options.success(); return actualPromise;
    },
  };
  const wrapped = probe.wrapContext('old-map', '地形', native);
  const callbacks = { success() { callbackCalled++; }, fail(error) { assert.equal(error, callbackFailure); } };
  assert.throws(() => wrapped.removeGroundOverlay({ id: 2, ...callbacks }), value => value === actualFailure);
  mode = 'failure'; wrapped.removeGroundOverlay({ id: 2, ...callbacks });
  mode = 'unknown'; wrapped.removeGroundOverlay({ id: 2, ...callbacks });
  mode = 'success'; assert.equal(wrapped.removeGroundOverlay({ id: 2, ...callbacks }), actualPromise);
  assert.equal(callbackCalled, 1, 'a synchronous callback stays synchronous');
  await flush();
  let group = probe.status().resourceObservation.groups[0];
  assert.equal(group.removeDispatched, 4); assert.equal(group.removeSyncThrows, 1);
  assert.equal(group.removeCallbackFailure, 1); assert.equal(group.removeCallbackSuccess, 1);
  assert.equal(group.removePromiseSuccess, 1); assert.equal(group.removeAwaitingOutcome, 1);
  assert.equal(group.removeReturnedPromise, 1); assert.equal(group.removeReturnedWithoutPromise, 2);
  late.success(); late.success();
  assert.equal(callbackCalled, 3, 'observation must not suppress the real repeated callback');
  group = probe.status().resourceObservation.groups[0];
  assert.equal(group.removeCallbackSuccess, 2, 'a callback channel settles its one observation only once');
  assert.equal(group.removeAwaitingOutcome, 0);
  const rows = probe.readback().rows;
  assert.equal(new Set(rows.filter(row => row.event === 'native_remove_dispatched').map(row => row.callId)).size, 4);
  assert.doesNotMatch(JSON.stringify(probe.readback()), /private native detail|sensitive|privatePath|never-record|privateResult/);
});

test('real production disposal keeps pins and retirement unsettled for actual remove failures or no callback', async () => {
  const source = await fs.readFile(path.join(root, 'apps/wechat-miniapp/src/pages/map/map-ground-overlay.ts'), 'utf8');
  for (const outcome of ['throw', 'callback-failure', 'promise-failure', 'unknown']) {
    const timers = new Map(); let timerId = 0;
    const exports = {};
    new Function('exports', 'setTimeout', 'clearTimeout', ts.transpileModule(source, { compilerOptions: {
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
    } }).outputText)(exports, (fn, delay) => { const id = ++timerId; timers.set(id, { fn, delay }); return id; }, id => timers.delete(id));
    const probe = createF04NativeRecoveryObserver({ sourceSha256: binding, resourceObservation: true });
    let physicalClaims = 0;
    const resources = probe.wrapResources('old-map', '地形', { retainPath() { physicalClaims++; return () => { physicalClaims--; }; } });
    const native = { addGroundOverlay(options) { options.success(); }, removeGroundOverlay(options) {
      if (outcome === 'throw') throw new Error('unexported synchronous failure');
      if (outcome === 'callback-failure') options.fail(new Error('unexported callback failure'));
      if (outcome === 'promise-failure') return Promise.reject(new Error('unexported promise failure'));
      return undefined;
    } };
    const owner = probe.observeCoordinator('old-map', '地形', exports.createMapGroundOverlayCoordinator(2,
      () => probe.wrapContext('old-map', '地形', native), () => {}, resources, '地形'));
    await owner.apply(target('not-exported'));
    const disposal = owner.dispose(); await flush();
    if (outcome === 'unknown') {
      assert.equal(timers.size, 1);
      for (const timer of [...timers.values()]) { assert.equal(timer.delay, 10000); timer.fn(); }
    }
    assert.equal((await disposal).complete, false); await flush();
    const result = probe.status().resourceObservation;
    assert.equal(physicalClaims, 1); assert.equal(result.groups[0].pinBalance, 1);
    assert.equal(result.groups[0].removeDispatched, 1);
    assert.equal(result.groups[0].removeAwaitingOutcome, outcome === 'unknown' ? 1 : 0);
    assert.equal(result.groups[0].removeSyncThrows, outcome === 'throw' ? 1 : 0);
    assert.equal(result.groups[0].removeCallbackFailure, outcome === 'callback-failure' ? 1 : 0);
    assert.equal(result.groups[0].removePromiseFailure, outcome === 'promise-failure' ? 1 : 0);
    assert.equal(result.coordinators[0].disposeResults, 1);
    assert.equal(result.coordinators[0].lastDisposeComplete, false);
    assert.equal(result.coordinators[0].remainingIdsCount, 1); assert.equal(result.coordinators[0].retired, false);
    assert.equal(probe.status().physicalMapRelease, 'unknown');
    assert.doesNotMatch(JSON.stringify(probe.readback()), /unexported|not-exported|latitude|longitude/);
  }
});

test('real pin functions and coordinator Promise identities are preserved; only successful release changes balance', async () => {
  const probe = createF04NativeRecoveryObserver({ sourceSha256: binding, resourceObservation: true });
  const actualFailure = new Error('private release failure'); let releaseCalls = 0;
  const resources = { retainPath(file) {
    assert.equal(this, resources);
    if (file === 'throw-retain') throw actualFailure;
    return function () { releaseCalls++; assert.equal(this, receiver); if (releaseCalls === 1) throw actualFailure; };
  } };
  const wrapped = probe.wrapResources('old-map', '地形', resources), receiver = {};
  assert.throws(() => wrapped.retainPath('throw-retain'), value => value === actualFailure);
  receiver.release = wrapped.retainPath('private-source-path');
  assert.throws(() => receiver.release(), value => value === actualFailure);
  assert.equal(probe.status().resourceObservation.groups[0].pinBalance, 1);
  receiver.release(); receiver.release();
  const group = probe.status().resourceObservation.groups[0];
  assert.equal(releaseCalls, 3); assert.equal(group.pinRetains, 1); assert.equal(group.pinReleases, 1);
  assert.equal(group.pinBalance, 0); assert.equal(group.pinRetainThrows, 1); assert.equal(group.pinReleaseThrows, 1);
  let retire, resolveDispose;
  const returned = new Promise(resolve => { resolveDispose = resolve; });
  const retired = new Promise(resolve => { retire = resolve; });
  const coordinator = { retired, apply() {}, dispose() { assert.equal(this, coordinator); return returned; } };
  const observed = probe.observeCoordinator('old-map', '地形', coordinator);
  assert.equal(observed.retired, retired); assert.equal(observed.apply, coordinator.apply);
  assert.equal(observed.dispose(), returned);
  resolveDispose({ complete: true, remainingIds: [] }); await flush();
  assert.equal(probe.status().resourceObservation.coordinators[0].retired, false, 'dispose completion is not retirement');
  retire(); await flush(); assert.equal(probe.status().resourceObservation.coordinators[0].retired, true);
  assert.doesNotMatch(JSON.stringify(probe.readback()), /private-source-path|private release failure|throw-retain/);
});

test('resource summaries and event history are bounded and exported copies cannot mutate the internal observation', async () => {
  const probe = createF04NativeRecoveryObserver({ sourceSha256: binding, resourceObservation: true });
  const resources = { retainPath() { return () => {}; } };
  for (let i = 0; i < 15; i++) probe.wrapResources(`map-${i}`, '地形', resources);
  const tracked = probe.wrapResources('map-0', '地形', resources);
  for (let i = 0; i < 150; i++) tracked.retainPath(`never-export-${i}`)();
  for (let i = 0; i < 27; i++) probe.observeCoordinator('map-0', '地形', {
    retired: Promise.resolve(), dispose() { return Promise.resolve({ complete: true, remainingIds: [] }); },
  });
  await flush();
  const result = probe.readback();
  assert.equal(result.rows.length, 256); assert.ok(result.droppedRows > 0);
  assert.equal(result.resourceObservation.groups.length, 12);
  assert.equal(result.resourceObservation.coordinators.length, 24);
  assert.equal(result.resourceObservation.droppedGroupObservations, 3);
  assert.equal(result.resourceObservation.droppedCoordinators, 3);
  result.resourceObservation.groups[0].pinBalance = 999;
  result.resourceObservation.coordinators[0].retired = false;
  assert.equal(probe.status().resourceObservation.groups[0].pinBalance, 0);
  assert.equal(probe.status().resourceObservation.coordinators[0].retired, true);
  assert.doesNotMatch(JSON.stringify(probe.readback()), /never-export/);
  for (const record of [...result.rows, ...result.resourceObservation.groups, ...result.resourceObservation.coordinators])
    for (const value of Object.values(record)) assert.ok(value === null || ['string', 'number', 'boolean'].includes(typeof value));
});

test('pure transform binds actual guarded onUpdated/context and leaves production coordinator byte-identical', async () => {
  const input = new Map(await Promise.all(f04NativeRecoverySourceFiles.map(async file => [file, await fs.readFile(path.join(root, file), 'utf8')])));
  const output = transformF04NativeRecoverySources(input);
  const coordinator = f04NativeRecoverySourceFiles[2];
  assert.equal(output.get(coordinator), input.get(coordinator));
  assert.match(output.get(f04NativeRecoverySourceFiles[1]), /if \(!isCurrent\(\) \|\| current\.current\.status !== "pending"\) return;\n      f04NativeRecovery\.mapUpdated/);
  assert.match(output.get(f04NativeRecoverySourceFiles[0]), /f04NativeRecovery\.wrapContext\(nativeMap\.mapId, input\.label, Taro\.createMapContext/);
  assert.throws(() => transformF04NativeRecoverySources(output), /already_instrumented/);
  const changed = new Map(input); changed.set(coordinator, input.get(coordinator).replace('}, 10000);', '}, 5000);'));
  assert.throws(() => transformF04NativeRecoverySources(changed), /native_timeout/);
  await assert.rejects(injectF04NativeRecovery(root, { sourceSha256: binding, write: true }), /task_staging_required/);
  const manifest = await injectF04NativeRecovery(root, { sourceSha256: binding });
  assert.equal(manifest.files.length, 4);
  const nativeBinding = manifest.files.find(file => file.file === coordinator);
  assert.equal(nativeBinding.beforeSha256, nativeBinding.afterSha256);
  const resourceOutput = transformF04NativeRecoverySources(input, { resourceObservation: true });
  assert.equal(resourceOutput.get(coordinator), input.get(coordinator));
  assert.match(resourceOutput.get(f04NativeRecoverySourceFiles[0]), /return f04NativeRecovery\.observeCoordinator\(nativeMap\.mapId, input\.label, createMapGroundOverlayCoordinator/);
  assert.match(resourceOutput.get(f04NativeRecoverySourceFiles[0]), /f04NativeRecovery\.wrapResources\(nativeMap\.mapId, input\.label, mapRasterFiles\)/);
  const resourceManifest = await injectF04NativeRecovery(root, { sourceSha256: binding, resourceObservation: true });
  assert.equal(resourceManifest.resourceObservation, true);
  assert.equal(resourceManifest.schema, 'starward-f04-native-recovery-source-v2');
  assert.notEqual(resourceManifest.files.at(-1).afterSha256, manifest.files.at(-1).afterSha256);
  for (const [file, source] of [...output, ...resourceOutput]) {
    const diagnostics = ts.transpileModule(source, { fileName: file, reportDiagnostics: true,
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).diagnostics ?? [];
    assert.equal(diagnostics.filter(item => item.category === ts.DiagnosticCategory.Error).length, 0);
  }
  // Resolve the task template at its real injected location without creating
  // that production file. Check structural compatibility with the actual
  // production MapGroundOverlayContext, not a copied interface fixture.
  const virtualFile = path.join(root, 'apps/wechat-miniapp/src/services/f04-native-recovery-observer.ts');
  const compilerOptions = { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
    strict: true, noEmit: true, skipLibCheck: true, types: [] };
  const host = ts.createCompilerHost(compilerOptions), originalGet = host.getSourceFile.bind(host);
  host.getSourceFile = (file, languageVersion, ...args) => path.resolve(file) === virtualFile
    ? ts.createSourceFile(file, observerSource, languageVersion, true) : originalGet(file, languageVersion, ...args);
  const errors = ts.getPreEmitDiagnostics(ts.createProgram([virtualFile], compilerOptions, host)).filter(item => item.category === ts.DiagnosticCategory.Error);
  assert.deepEqual(errors.map(item => ts.flattenDiagnosticMessageText(item.messageText, '\n')), []);
});
