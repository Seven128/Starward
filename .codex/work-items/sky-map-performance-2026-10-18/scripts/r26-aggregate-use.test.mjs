import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { addR26AggregateUse, stripR26AggregateUseSource } from './r26-aggregate-use-instrumentation.mjs';
const require = createRequire(import.meta.url), ts = require('../../../../apps/wechat-miniapp/node_modules/typescript');
const source = await fs.readFile(new URL('./r26-aggregate-use-observer.ts', import.meta.url), 'utf8');
function load(source, imports = {}) {
  const compiled = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }, reportDiagnostics: true });
  assert.equal(compiled.diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
  const module = { exports: {} };
  vm.runInNewContext('(function(exports,require,module){' + compiled.outputText + '\n})', { WeakRef, setTimeout, clearTimeout })(
    module.exports, name => { assert(Object.hasOwn(imports, name), 'unexpected import ' + name); return imports[name]; }, module);
  return module.exports;
}
const create = load(source).createR26AggregateUseObserver;
const plain = value => JSON.parse(JSON.stringify(value));
const base = new URL('../tmp/r17-normal-a1-review-r25-usb/source/apps/wechat-miniapp/src/features/sky/', import.meta.url);
const names = { lifecycle: 'sky-canvas-lifecycle.ts', drawPreparation: 'sky-star-draw-preparation.ts', page: 'spot-sky-page.tsx' };
const inputs = Object.fromEntries(await Promise.all(Object.entries(names).map(async ([key, name]) =>
  [key, (await fs.readFile(new URL(name, base), 'utf8')).replaceAll('\r\n', '\n')])));
const transformed = addR26AggregateUse(inputs);

test('reserved IDs record actual use while exact slot writes continue through pause and stop at release', () => {
  const a = {}, b = {}, unsampled = {}, ids = new WeakMap([[a, 1], [b, 8]]);
  const p = create({ aggregateId: value => ids.get(value) ?? null });
  assert(p.start()); assert.equal(p.start(), false);
  p.use('request', a); p.use('request', b); p.use('paint', b); p.use('accepted', b);
  p.use('paint', unsampled); p.use('paint', null);
  p.slot('lifecycle-latest', a); p.slot('lifecycle-latest', b);
  const before = p.snapshot(), bytes = JSON.stringify(before);
  assert.equal(before.samples[0].request, 1); assert.equal(before.samples[0].paint, 0);
  assert.equal(before.samples[7].accepted, 1); assert.equal(before.diagnostics.unselectedUses, 1);
  assert.equal(before.diagnostics.emptyUses, 1); assert.equal(before.slots[0].aggregateId, 8);
  assert.equal(before.slots[2].state, 'unobserved');
  p.stopTracking(); p.use('accepted', a); p.slot('accepted-command', b); p.slot('lifecycle-latest', null);
  const paused = p.snapshot();
  assert.equal(paused.tracking, false); assert.equal(paused.active, true);
  assert.equal(paused.samples[0].accepted, 0); assert.equal(paused.slots[0].state, 'empty');
  assert.equal(paused.slots[2].aggregateId, 8); assert.equal(JSON.stringify(before), bytes);
  p.release(); const ended = JSON.stringify(p.snapshot());
  p.use('request', a); p.slot('accepted-command', a); assert.equal(JSON.stringify(p.snapshot()), ended);
  assert(p.start()); assert.equal(p.snapshot().slots[2].state, 'unobserved');
});

test('missing identities and failed lookups remain unknown without reading object properties', () => {
  let reads = 0; const a = Object.defineProperty({}, 'secret', { get() { reads++; throw Error('not allowed'); } });
  let result = 3;
  const p = create({ aggregateId: () => { if (result === -1) throw Error('lookup failed'); return result; } }); p.start();
  p.use('request', a); p.slot('draw-preparation', a);
  result = 9; p.use('paint', a); p.slot('draw-preparation', a);
  result = -1; p.use('accepted', a); p.slot('accepted-command', a);
  p.use('request', 1); p.slot('lifecycle-latest', 'wrong');
  p.use('arbitrary', a); p.slot('arbitrary', a);
  const r = p.snapshot();
  assert.equal(reads, 0); assert.equal(r.samples[2].request, 1); assert.equal(r.diagnostics.unknownUses, 3);
  assert.equal(r.diagnostics.invalidIds, 2); assert.equal(r.diagnostics.lookupErrors, 2);
  assert.equal(r.diagnostics.invalidValues, 2); assert.equal(r.diagnostics.invalidCalls, 2);
  assert(r.slots.every(slot => slot.state === 'unknown' && slot.aggregateId === null));
});

test('observer stores scalar IDs rather than becoming a strong retaining owner', { skip: typeof global.gc !== 'function' }, async () => {
  const ids = new WeakMap(), p = create({ aggregateId: value => ids.get(value) ?? null }); p.start();
  let object = { large: new Array(100).fill(1) }; ids.set(object, 1); const witness = new WeakRef(object);
  p.use('request', object); p.use('accepted', object); p.slot('accepted-command', object); object = null;
  let collected = false;
  for (let i = 0; i < 20; i++) {
    await new Promise(resolve => setImmediate(resolve)); global.gc();
    await new Promise(resolve => setImmediate(resolve));
    if (witness.deref() === undefined) { collected = true; break; }
  }
  assert(collected, 'usage and slots must not strongly retain the inspected aggregate');
  assert.equal(p.snapshot().samples[0].accepted, 1);
  assert.equal(p.snapshot().slots[2].aggregateId, 1, 'slot is last observed assignment, not a liveness query');
});

test('exact additions restore complete source bytes, including accepted updater and all null retirements', () => {
  for (const kind of Object.keys(names)) assert.equal(stripR26AggregateUseSource(transformed[kind], kind), inputs[kind]);
  const updater = source => source.slice(source.indexOf('            setPresentedSkyFrame(previous =>'),
    source.indexOf('            setPresentedCamera', source.indexOf('            setPresentedSkyFrame(previous =>')));
  assert(updater(inputs.page).length > 1000); assert.equal(updater(transformed.page), updater(inputs.page));
  assert.equal(transformed.page.match(/setPresentedSkyFrame\(null\)/g).length, 3);
  assert.throws(() => addR26AggregateUse({ ...inputs, lifecycle: inputs.lifecycle.replace('      latest = frame;', '      latest=frame;') }), /boundary_changed/);
  assert.throws(() => addR26AggregateUse(transformed), /source_required/);
});

test('actual lifecycle coalesces requested aggregates, fences hidden completion, and clears the latest slot', () => {
  const a = {}, b = {}, c = {}, ids = new WeakMap([[a, 1], [b, 2], [c, 3]]), p = create({ aggregateId: value => ids.get(value) ?? null }); p.start();
  const bridge = { r26AggregateUse: (kind, value) => p.use(kind, value), r26AggregateSlot: (kind, value) => p.slot(kind, value) };
  const r17Probe = new Proxy({ measure: (_stage, work) => work() }, { get: (object, key) => object[key] ?? (() => {}) });
  const { createSkyCanvasLifecycle } = load(transformed.lifecycle, {
    './r25-memory-lifetime-adapter': bridge, './r17-phone-probe-runtime': { r17Probe },
    '../../services/runtime-error': { reportRuntimeError() {} },
  });
  let counter = 0, complete; const timers = new Map(), presented = [], painted = [];
  const clock = { schedule: (work, delay) => { const id = ++counter; timers.set(id, { work, delay }); return id; }, cancel: id => timers.delete(id) };
  const flush = () => { for (;;) { const next = [...timers].find(([, timer]) => timer.delay === 0); if (!next) break;
    timers.delete(next[0]); next[1].work(); } };
  const lifecycle = createSkyCanvasLifecycle({
    measure: done => done({ width: 10, height: 20 }), createContext: () => ({}), releaseContext() {},
    paint: (_context, frame, _size, done) => { painted.push(frame); complete = done; },
    presented: frame => { presented.push(frame); }, sameScene: () => true, invalidated() {}, failed() { assert.fail(); },
  }, clock);
  const frameA = { stellarSupplement: a }, frameB = { stellarSupplement: b }, frameC = { stellarSupplement: c };
  lifecycle.ready(); lifecycle.request(frameA); lifecycle.request(frameB); flush();
  assert.deepEqual(painted, [frameB]); assert.equal(p.snapshot().samples[0].request, 1); assert.equal(p.snapshot().samples[0].paint, 0);
  assert.equal(p.snapshot().samples[1].paint, 1); assert.equal(p.snapshot().slots[0].aggregateId, 2);
  lifecycle.request(frameC); complete(); flush(); assert.deepEqual(presented, [frameB]); assert.equal(painted.at(-1), frameC);
  p.stopTracking(); lifecycle.hide(); complete(); assert.deepEqual(presented, [frameB]);
  assert.equal(p.snapshot().slots[0].state, 'empty');
  lifecycle.dispose(); const writes = p.snapshot().slots[0].updates;
  lifecycle.request(frameA); assert.equal(p.snapshot().slots[0].updates, writes);
  assert.equal(p.snapshot().samples[0].request, 1);
});

test('actual draw preparation replaces and clears its slot on failed, reentrant and uncacheable builds', () => {
  const a = {}, b = {}, legacy = {}, admitted = new WeakSet([a, b]);
  const ids = new WeakMap([[a, 1], [b, 2]]), p = create({ aggregateId: value => ids.get(value) ?? null }); p.start();
  const { createSkyStarDrawPreparation } = load(transformed.drawPreparation, {
    './r25-memory-lifetime-adapter': { r26AggregateSlot: (slot, value) => p.slot(slot, value) },
    './sky-stellar-scene': { isReusableSkyStellarFrame: () => true },
    './sky-stellar-supplement-scene': { isReusableSkyStellarSupplementFrame: value => admitted.has(value) },
    './sky-view-projection': { validBasis: () => true },
  });
  const owner = createSkyStarDrawPreparation();
  const view = { canvas: {}, context: {}, at: 'same', basis: { right: [1, 0, 0], up: [0, 1, 0], forward: [0, 0, 1] },
    width: 100, height: 100, verticalFovDeg: 50, mode: 'DAY' };
  const visited = [], build = visit => visit({ reference: 'test' }, { x: 1, y: 2 });
  owner.prepare(view); owner.supplement(a, build, value => visited.push(value));
  assert.equal(p.snapshot().slots[1].aggregateId, 1); assert.equal(visited.length, 1);
  owner.supplement(a, () => assert.fail('same current entry should replay'), value => visited.push(value));
  assert.equal(visited.length, 2);
  assert.throws(() => owner.supplement(b, () => { throw Error('build failed'); }, () => {}), /build failed/);
  assert.equal(p.snapshot().slots[1].state, 'empty');
  owner.prepare(view); owner.supplement(b, build, () => {}); assert.equal(p.snapshot().slots[1].aggregateId, 2);
  owner.supplement(a, () => owner.reset(), () => assert.fail()); assert.equal(p.snapshot().slots[1].state, 'empty');
  owner.prepare(view); owner.supplement(a, build, () => {}); p.stopTracking();
  owner.supplement(legacy, build, () => {}); assert.equal(p.snapshot().slots[1].state, 'empty');
});
