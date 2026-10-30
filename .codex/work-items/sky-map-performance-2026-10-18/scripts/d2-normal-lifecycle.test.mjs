import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { addD2NormalLifecycle } from './d2-normal-lifecycle-instrumentation.mjs';
import { addD2DecodeCheckpoint } from './d2-decode-checkpoint-instrumentation.mjs';
import { validateD2DecodeCheckpoint } from './d2-decode-checkpoint-protocol.mjs';
import { memoryCheckpointHarness } from './memory-checkpoint-test-support.mjs';
const require = createRequire(import.meta.url), ts = require('../../../../apps/wechat-miniapp/node_modules/typescript');
const root = new URL('../../../../', import.meta.url);
const read = name => fs.readFile(new URL(name, import.meta.url), 'utf8');
const original = {
  page: await fs.readFile(new URL('apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx', root), 'utf8'),
  time: await fs.readFile(new URL('apps/wechat-miniapp/src/features/sky/sky-observation-time.ts', root), 'utf8'),
  observation: await read('r17-normal-observations.ts'),
};
const transformed = addD2NormalLifecycle(Object.fromEntries(Object.entries(original).map(([key, value]) => [key, value.replaceAll('\r\n', '\n')])));
const requestSource = await fs.readFile(new URL('apps/wechat-miniapp/src/features/sky/sky-artwork-request.ts', root), 'utf8');
const runtimeSources = {
  'd2-normal-lifecycle': await read('d2-normal-lifecycle.ts'),
  'd2-normal-lifecycle-controls': (await read('d2-normal-lifecycle-controls.tsx'))
    .replaceAll('__D2_BUILD_GENERATION__', '35').replaceAll('__D2_BUILD_SOURCE_HASH__', 'c'.repeat(64)),
  'r17-normal-observations': transformed.observation,
  'd2-decode-observation': await read('d2-decode-observation.ts'),
  observedTime: transformed.time, originalTime: original.time,
};
function compile(source, jsx = ts.JsxEmit.ReactJSX) {
  const result = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx }, reportDiagnostics: true });
  assert.equal(result.diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
  return result.outputText;
}
function hookOwner() {
  let cursor = 0, slots = [], pending = [], hides = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((value, index) => value === b[index]);
  return {
    react: {
      useMemo(make, deps) { const i = cursor++, prior = slots[i]; if (!prior || !same(prior.deps, deps)) slots[i] = { value: make(), deps }; return slots[i].value; },
      useEffect(setup, deps) { const i = cursor++, prior = slots[i]; if (!prior || !same(prior.deps, deps)) pending.push(() => { prior?.cleanup?.(); slots[i] = { deps, cleanup: setup() }; }); },
      useState(initial) { const i = cursor++; if (!slots[i]) slots[i] = { value: initial }; return [slots[i].value, next => { slots[i].value = typeof next === 'function' ? next(slots[i].value) : next; }]; },
    },
    didHide(callback) { hides.push(callback); },
    render(work) { cursor = 0; hides = []; const result = work(); const effects = pending; pending = []; for (const run of effects) run(); return { ...result, hide: hides.at(-1) }; },
    unmount() { for (const slot of slots) slot?.cleanup?.(); slots = []; },
  };
}
const facts = { nodePresent: true, displayPresent: true, selectionDisplayPresent: true,
  nodeWidth: 200, nodeHeight: 400, displayWidth: 200, displayHeight: 400,
  selectionWidth: 200, selectionHeight: 400, selectionLayerPresent: true, contextPresent: true, contextLost: false };
const steps = Object.fromEntries(['selection', 'contextExtension', 'contextLoss', 'nodeWidth', 'nodeHeight', 'displayWidth', 'displayHeight'].map(key => [key, 'returned']));
const at = '2026-01-01T00:00:00.000Z', coverage = { startAt: at, endAt: '2026-01-01T01:00:00.000Z' };
async function harness() {
  const loaded = new Map(), engine = hookOwner(), writes = [];
  let memory;
  const jsx = (type, props) => ({ type, props });
  const imports = {
    react: engine.react, 'react/jsx-runtime': { jsx, jsxs: jsx },
    '@tarojs/components': { Button: 'Button', Text: 'Text', View: 'View' },
    '@tarojs/taro': { __esModule: true, default: { setStorageSync(key, value) { writes.push({ key, value: JSON.parse(JSON.stringify(value)) }); } },
      useDidHide: callback => engine.didHide(callback) },
  };
  const load = name => {
    if (loaded.has(name)) return loaded.get(name);
    if (name === 'r25-memory-lifetime-adapter') return memory.api;
    assert.equal(typeof runtimeSources[name], 'string', name);
    const module = { exports: {} }; loaded.set(name, module.exports);
    vm.runInNewContext('(function(exports,require,module){' + compile(runtimeSources[name]) + '\n})', {})(module.exports,
      key => Object.hasOwn(imports, key) ? imports[key] : load(key.replace(/^\.\//, '')), module);
    return module.exports;
  };
  const decode = load('d2-decode-observation').d2DecodeObservation;
  memory = await memoryCheckpointHarness({ generation: 35, validate: validateD2DecodeCheckpoint,
    transformAdapter: adapter => addD2DecodeCheckpoint({ request: requestSource, adapter }).adapter,
    imports: { './d2-decode-observation': { d2DecodeObservation: decode } } });
  const controls = load('d2-normal-lifecycle-controls'), coordinator = load('d2-normal-lifecycle'), observation = load('r17-normal-observations');
  const factory = load('observedTime').createSkyObservationTime, originalFactory = load('originalTime').createSkyObservationTime;
  const time = () => { const value = factory(); value.bind('ctx-a', at, coverage); return value; };
  const render = (value, binding = 'ctx-a', visible = true) => engine.render(() => {
    const state = value.snapshot();
    const owner = controls.useD2NormalLifecycle(value.__d2ObservationToken, binding, at, visible,
      state.binding === binding && state.committedAt === at && state.mode === 'PLAYING');
    return { owner, tree: controls.D2DecodeControls({ owner }) };
  });
  const button = (ui, className) => ui.tree.props.children.find(node => node.props?.className === className);
  return { ...memory, decode, engine, controls, coordinator, observation, writes, factory, originalFactory, time, render, button,
    phases: () => memory.requests.map(request => JSON.parse(request.data).observation.checkpoints[0].phase),
    ready(value) { return coordinator.d2NormalSurfaceCreation(value.__d2ObservationToken, () => {
      const id = observation.r17NormalSurfaceCreatedReceipt(); observation.r17NormalSurfaceReadyReceipt(id, facts); return id;
    }); },
    retire(id) {
      observation.r17NormalSurfaceRetirementStartedReceipt(id);
      observation.r17NormalSurfaceRetired();
      observation.r17NormalSurfaceRetirementFinishedReceipt(id, { ...facts, nodeWidth: 0, nodeHeight: 0, displayWidth: 0,
        displayHeight: 0, selectionWidth: 0, selectionHeight: 0, contextLost: true, selectionLayerPresent: false }, steps, true);
    },
  };
}

test('current source integration preserves Page product writes and uses a non-circular scalar receipt writer', () => {
  assert.equal(transformed.observation, original.observation.replaceAll('\r\n', '\n'));
  assert.equal((transformed.page.match(/setTimeIntent\(/g) ?? []).length, (original.page.match(/setTimeIntent\(/g) ?? []).length);
  assert(!runtimeSources['d2-normal-lifecycle'].includes('r17-normal-observations'));
  assert(!runtimeSources['d2-normal-lifecycle'].includes('d2-normal-lifecycle-controls'));
  compile(transformed.page);
  assert.throws(() => addD2NormalLifecycle({ ...original, time: original.time.replace('const publish =', 'const retiredPublish =') }), /d2_normal_lifecycle_boundary_changed/);
});

test('only armed actual normal Play starts the real adapter; existing baseline survives Pause/drain and ordinary retirement', async () => {
  const h = await harness(), time = h.time();
  let ui = h.render(time); assert.equal(h.button(ui, 'd2-normal-resource-arm').props.disabled, true);
  const id = h.ready(time); ui = h.render(time);
  const image = {}; const release = h.decode.imageClaim(image, 8, 16);
  time.play(0); await h.advance(0); assert.equal(h.requests.length, 0, 'unarmed Play remains ordinary product work');
  time.pause(); ui = h.render(time);
  h.button(ui, 'd2-normal-resource-arm').props.onClick(); assert.equal(h.requests.length, 0);
  time.requestPlay(); assert.equal(h.requests.length, 0, 'waiting for supply is not actual Play');
  const started = time.play(0); assert.equal(started.mode, 'PLAYING');
  await h.advance(0); assert.deepEqual(h.phases(), ['baseline']);
  assert.equal(h.receipt().decode.images.logicalPixels, 128);
  time.tick(100); time.play(100); await h.advance(5000);
  assert.equal(h.phases().filter(phase => phase === 'baseline').length, 1, 'repeated PLAYING does not restart');
  time.pause(); await h.advance(5000); assert.equal(h.receipt().observation.checkpoints[0].phase, 'paused');
  assert.equal(h.receipt().decode.images.logicalImages, 1, 'Pause never resets decoded baseline');
  release(); await h.advance(15000); assert.equal(h.receipt().observation.checkpoints[0].phase, 'drain-10');
  assert.equal(h.receipt().decode.images.logicalImages, 0);
  h.engine.unmount(); h.retire(id); await h.advance(15000);
  assert(h.phases().includes('scope-ended')); assert(h.phases().includes('retired'));
  await h.advance(25000); assert.equal(h.receipt().observation.checkpoints[0].phase, 'drain-10');
  assert(h.writes.every(row => row.key === `starward.r17.normal-surface-retirement.v1.${'c'.repeat(64)}`));
});

test('the existing 90s diagnostic boundary never pauses, edits or restarts product playback', async () => {
  const h = await harness(), time = h.time(); h.ready(time); const ui = h.render(time);
  h.button(ui, 'd2-normal-resource-arm').props.onClick(); time.play(0);
  await h.advance(20000); assert.equal(time.snapshot().mode, 'PLAYING');
  await h.advance(90000); assert.equal(time.snapshot().mode, 'PLAYING');
  assert.equal(h.receipt().observation.checkpoints[0].phase, 'end');
  assert(!h.phases().includes('paused'));
});

test('a retired surface cannot arm or start until a fresh ready; a late old retirement cannot clear its replacement', async () => {
  const h = await harness(), time = h.time(); const first = h.ready(time); let ui = h.render(time);
  h.retire(first); ui = h.render(time);
  assert.equal(h.button(ui, 'd2-normal-resource-arm').props.disabled, true);
  h.button(ui, 'd2-normal-resource-arm').props.onClick(); time.play(0); await h.advance(0);
  assert.equal(h.requests.length, 0, 'retired id cannot establish capture readiness');
  time.pause(); const replacement = h.ready(time); ui = h.render(time);
  h.coordinator.d2NormalSurfaceRetired(first);
  assert.equal(ui.owner.readySurfaceId, replacement, 'late old id cannot retire the successor');
  h.button(ui, 'd2-normal-resource-arm').props.onClick(); time.play(0); await h.advance(0);
  assert.equal(h.receipt().observation.checkpoints[0].phase, 'baseline');
  h.button(ui, 'd2-normal-resource-export').props.onClick(); await h.advance(0);
  assert.equal(h.receipt().observation.checkpoints[0].phase, 'end');
  assert.equal(time.snapshot().mode, 'PLAYING', 'manual export seals only the observation');
});

test('old owner, old time and old surface cannot arm, pause or retire a successor run', async () => {
  const h = await harness(), first = h.time(); h.ready(first); const oldUi = h.render(first);
  h.button(oldUi, 'd2-normal-resource-arm').props.onClick(); first.play(0); await h.advance(0);
  const oldId = oldUi.owner.recordingSurfaceId;
  const second = h.time(), secondId = h.ready(second), nextUi = h.render(second);
  h.button(oldUi, 'd2-normal-resource-arm').props.onClick(); oldUi.hide(); first.pause(); first.play(1);
  await h.advance(0); assert.equal(nextUi.owner.armed, false); assert(!h.phases().includes('paused'));
  await h.coordinator.exportD2NormalObservation(nextUi.owner);
  const ui = h.render(second); h.button(ui, 'd2-normal-resource-arm').props.onClick(); second.play(0); await h.advance(0);
  assert.equal(ui.owner.start, 'started');
  const count = h.requests.length;
  h.button(oldUi, 'd2-normal-resource-export').props.onClick(); await h.advance(0);
  assert.equal(h.requests.length, count, 'a retired control cannot seal the successor run');
  h.coordinator.d2NormalSurfaceRetired(oldId); h.retire(oldId); await h.advance(0); assert.equal(h.requests.length, count);
  h.retire(secondId); await h.advance(0); assert.equal(h.receipt().observation.checkpoints[0].phase, 'retired');
});

test('Context replacement on the same real time owner retires old arming; hidden scope keeps only bounded drain', async () => {
  const h = await harness(), time = h.time(); h.ready(time); const a = h.render(time);
  h.button(a, 'd2-normal-resource-arm').props.onClick();
  const b = h.render(time, 'ctx-b'); time.bind('ctx-b', at, coverage);
  time.play(0); await h.advance(0); assert.equal(h.requests.length, 0, 'old arm is not inherited');
  time.pause(); let current = h.render(time, 'ctx-b');
  h.button(current, 'd2-normal-resource-arm').props.onClick(); time.play(0); await h.advance(0);
  a.hide(); assert.equal(current.owner.visible, true, 'late old hide cannot hide the new scope');
  current.hide(); time.hide(0); await h.advance(0);
  assert(h.phases().includes('hidden')); assert(h.phases().includes('paused'));
  const before = h.requests.length;
  h.button(current, 'd2-normal-resource-arm').props.onClick(); time.play(1); await h.advance(0);
  assert.equal(h.requests.length, before, 'hidden controls cannot rearm');
  await h.advance(10000); assert.equal(h.receipt().observation.checkpoints[0].phase, 'drain-10');
});

test('real time results remain unchanged and factory scope preserves original value/throws without retaining its callback', async () => {
  const h = await harness(), observed = h.factory(), original = h.originalFactory();
  for (const [method, args] of [['bind', ['ctx-a', at, coverage]], ['requestPlay', []], ['play', [10]], ['tick', [1010]],
    ['pause', []], ['preview', ['2026-01-01T00:05:00.000Z']], ['cancel', []], ['hide', [1200]]]) {
    assert.deepEqual(JSON.parse(JSON.stringify(observed[method](...args))), JSON.parse(JSON.stringify(original[method](...args))));
  }
  assert.deepEqual(Object.keys(observed.__d2ObservationToken), []);
  const thrown = new Error('original factory failure');
  assert.throws(() => h.coordinator.d2NormalSurfaceCreation(observed.__d2ObservationToken, () => { throw thrown; }), error => error === thrown);
  assert.equal(h.coordinator.d2NormalSurfaceCreation(observed.__d2ObservationToken, () => 42), 42);
  assert.equal(h.requests.length, 0);
});

test('coordinator tokens do not keep the real time owner, options or returned factory callback alive', async () => {
  const run = promisify(execFile);
  const script = `const ts=require(${JSON.stringify(require.resolve('../../../../apps/wechat-miniapp/node_modules/typescript'))});
const vm=require('node:vm');const assert=require('node:assert/strict');
const sources=${JSON.stringify({ coordinator: runtimeSources['d2-normal-lifecycle'], time: transformed.time })};
const noop=()=>{}; const adapter={r25MemoryStarted:()=>true,r25MemoryPaused:noop,r25MemoryHidden:noop,r25MemoryScopeEnded:noop,r25MemoryRetired:noop,r25MemoryExport:()=>Promise.resolve(),r25MemoryStatus:()=>''};
function load(source,imports){const m={exports:{}};const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext('(function(exports,require,module){'+js+'})',{})(m.exports,k=>imports[k],m);return m.exports;}
const coordinator=load(sources.coordinator,{'./r25-memory-lifetime-adapter':adapter});const factory=load(sources.time,{'./d2-normal-lifecycle':coordinator}).createSkyObservationTime;
let refs;(()=>{const sentinel={};const time=factory({latestInstant:()=>{void sentinel;return Infinity}});const owner=coordinator.createD2NormalOwner(time.__d2ObservationToken,true,false);owner.visible=true;coordinator.mountD2NormalOwner(owner);let callback=()=>{void time;return sentinel};coordinator.d2NormalSurfaceCreation(time.__d2ObservationToken,callback);refs=[new WeakRef(time),new WeakRef(sentinel),new WeakRef(callback)];})();
(async()=>{for(let i=0;i<16;i++){await new Promise(setImmediate);global.gc();await new Promise(setImmediate);if(refs.every(r=>r.deref()===undefined)){console.log('collected');return}}assert.fail('diagnostic kept product owner/closure');})();`;
  const result = await run(process.execPath, ['--expose-gc', '-e', script], { windowsHide: true });
  assert.match(result.stdout, /collected/);
});
