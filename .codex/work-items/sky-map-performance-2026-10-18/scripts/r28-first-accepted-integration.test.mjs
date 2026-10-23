import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { normalPage, normalLifecycle, normalSurface, controls } from './build-r17-normal-baseline-v3.mjs';
import { addR17ACorrelation } from './r17-a-correlation-instrumentation.mjs';
import { addR17RulerEntryV2 } from './r17-ruler-entry-v2-instrumentation.mjs';
import { addR17NormalInput, addR17GeometryStages, addR19DrawReasons, addR20DrawCosts } from './r17-normal-input-instrumentation.mjs';
import { addR28FirstAcceptedCosts } from './r28-first-accepted-instrumentation.mjs';
import { validateR17PhoneProbeMetrics } from './r17-normal-input-protocol.mjs';
import { verifyNormalBaselineV3Fixture } from './r17-normal-baseline-v3-fixture.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../../../..');
const feature = 'apps/wechat-miniapp/src/features/sky/';
const require = createRequire(import.meta.url), ts = require(path.join(root, 'apps/wechat-miniapp/node_modules/typescript'));
const read = file => fs.readFile(file, 'utf8').then(value => value.replaceAll('\r\n', '\n'));
const template = name => read(path.join(here, name)), production = name => read(path.join(root, feature, name));
const correlated = addR17ACorrelation({ runtime: (await template('r17-phone-probe-v3-runtime.ts')).replaceAll('__VARIANT__', 'baseline'),
  pageObserver: await template('r17-page-bridge-observer.ts') });
const entry = addR17RulerEntryV2({ runtime: correlated.runtime,
  controls: controls(await template('r17-accepted-action-controls.tsx'), 'a'.repeat(64), true),
  page: normalPage(await production('spot-sky-page.tsx')),
  layout: await production('orientation-ruler-layout.ts'),
  nativePosition: await read(path.join(root, 'apps/wechat-miniapp/src/components/ruler-scroll-position.ts')) });
const manual = { ...entry, ...addR17NormalInput(entry) };
const geometry = addR17GeometryStages({ ...manual, geometry: await production('use-sky-time-geometry.ts') });
const reasons = addR19DrawReasons({ ...geometry, lifecycle: normalLifecycle(await production('sky-canvas-lifecycle.ts')) });
const costs = addR20DrawCosts({ runtime: reasons.runtime, scene: await production('sky-scene-render.ts'), renderer: await production('sky-gpu-renderer.ts') });
const joined = addR28FirstAcceptedCosts({ ...costs, page: reasons.page, lifecycle: reasons.lifecycle,
  observation: await template('r17-normal-observations.ts'), starPreparation: await production('sky-star-draw-preparation.ts') });
const files = new Map(Object.entries({
  'r17-phone-probe-runtime.ts': joined.runtime, 'r17-normal-observations.ts': joined.observation,
  'r28-first-accepted-costs.ts': await template('r28-first-accepted-costs.ts'),
  'r17-ruler-entry-runtime.ts': (await template('r17-ruler-entry-runtime.ts')).replace('starward-r17-ruler-entry-v1', 'starward-r17-ruler-entry-v2'),
  'r17-a-correlation-runtime.ts': await template('r17-a-correlation-runtime.ts'),
  'r17-geometry-stage-runtime.ts': await template('r17-geometry-stage-runtime.ts'),
  'r17-page-bridge-observer.ts': correlated.pageObserver,
  'r17-phone-probe-controls.tsx': manual.controls,
  'spot-sky-page.tsx': joined.page, 'sky-canvas-lifecycle.ts': joined.lifecycle,
  'sky-star-draw-preparation.ts': joined.starPreparation,
  'orientation-ruler-layout.ts': manual.layout, 'r17-ruler-scroll-position.ts': manual.nativePosition,
}));
const plain = value => JSON.parse(JSON.stringify(value));
function environment() {
  let elapsed = 0, sequence = 0;
  const timers = new Map(), loaded = new Map();
  const context = { Date: class extends Date { static now() { return 1_800_000_000_000 + elapsed; } },
    setTimeout(run, delay) { const id = ++sequence; timers.set(id, { at: elapsed + delay, run }); return id; },
    clearTimeout(id) { timers.delete(id); } };
  function load(name, overrides = {}) {
    if (loaded.has(name)) return loaded.get(name);
    const source = files.get(name); assert(source, 'known materialized source: ' + name);
    const code = ts.transpileModule(source, { reportDiagnostics: true,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
    assert.equal(code.diagnostics.length, 0);
    const module = { exports: {} }; loaded.set(name, module.exports);
    vm.runInNewContext('(function(exports,require,module){' + code.outputText + '\n})', context)(module.exports, specifier => {
      if (Object.hasOwn(overrides, specifier)) return overrides[specifier];
      if (specifier === '../../services/runtime-error') return { reportRuntimeError() {} };
      if (specifier.startsWith('./')) return load(specifier.slice(2) + '.ts');
      throw Error('unexpected_dependency:' + specifier);
    }, module);
    return module.exports;
  }
  const probe = load('r17-phone-probe-runtime.ts').r17Probe;
  assert.equal(probe.configureBinding({ mode: 'normal', buildGeneration: 34, buildSourceSha256: 'a'.repeat(64) }), true);
  probe.start('manual-input', 1);
  const advance = ms => {
    const end = elapsed + ms;
    for (;;) {
      const due = [...timers].filter(([, value]) => value.at <= Math.max(end, elapsed)).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      timers.delete(due[0]); elapsed = Math.max(elapsed, due[1].at); due[1].run();
    }
    elapsed = Math.max(elapsed, end);
  };
  const intent = n => { const at = `2026-10-${String(n).padStart(2, '0')}T20:30:00.000Z`;
    const sequence = probe.intent({ at }), token = probe.prepareStarted(sequence, 'presentation');
    elapsed++; probe.prepareFinished(token); return { frame: { frameAt: at }, sequence, token }; };
  return { probe, load, advance, tick: ms => { elapsed += ms; }, intent, context };
}
const stage = (value, row, name) => row.costs[value.firstAcceptedCosts.stages.indexOf(name)];

test('real lifecycle joins first accepted, delayed copy and epoch; continuations cannot rewrite that row', () => {
  const e = environment(), completions = [];
  const { createSkyCanvasLifecycle } = e.load('sky-canvas-lifecycle.ts');
  const writer = createSkyCanvasLifecycle({ measure: done => done({ width: 100, height: 200 }), createContext: () => ({}),
    resolveFrame(frame) { const clone = { ...frame }; e.probe.inheritFrame(clone, frame); return clone; },
    paint(_context, _frame, _size, done) {
      e.probe.measure('draw', () => {
        e.probe.actualDrawCost('starTraversal', () => { e.tick(5); e.probe.actualDrawCost('rendererSubmit', () => e.tick(2)); }, 'bsc');
        e.probe.actualDrawCost('starTraversal', () => e.tick(3), 'sao');
      });
      completions.push(done);
    },
    presented(frame) {
      e.probe.frameStage(frame, 'displayCopy', () => e.tick(4));
      e.probe.frameStage(frame, 'publishAccepted', () => e.tick(2));
      e.probe.accepted(frame, { objects: [{ reference: 'HR:1' }, { reference: 'SAO:2' }] });
    }, invalidated() {}, failed(error) { throw error; } },
  { schedule: e.context.setTimeout, cancel: e.context.clearTimeout });
  writer.ready();
  const first = e.intent(1);
  const request = value => { e.probe.request(value.frame, value.token, value.sequence, 1); writer.request(value.frame); e.advance(0); };
  request(first); e.tick(11); completions.shift()();
  request({ ...first, frame: { ...first.frame } }); completions.shift()();
  writer.resize(); e.advance(0); completions.shift()();
  const second = e.intent(2); request(second); e.tick(7); completions.shift()();
  const third = e.intent(3); request(third); writer.hide(); completions.shift()();
  const value = plain(e.probe.snapshot());
  assert.equal(validateR17PhoneProbeMetrics(value), true);
  assert.equal(value.firstAcceptedCosts.rows.length, 2);
  const [a, b] = value.firstAcceptedCosts.rows;
  assert.equal(a.intentSequence, first.sequence); assert.equal(a.prepareToken, first.token);
  assert.equal(b.canvasOwner, a.canvasOwner); assert(b.canvasGeneration > a.canvasGeneration);
  assert.equal(stage(value, a, 'draw')[2], 10); assert.equal(stage(value, a, 'bscTraversal')[2], 7);
  assert.equal(stage(value, a, 'saoTraversal')[2], 3); assert.equal(stage(value, a, 'rendererSubmit')[2], 2);
  assert.equal(stage(value, a, 'nativePaintOwner')[2], 10); assert.equal(stage(value, a, 'nativeCallback')[2], 21);
  assert.equal(stage(value, a, 'displayCopy')[2], 4); assert.equal(stage(value, a, 'publishAccepted')[2], 2);
  assert.equal(a.scopeAmbiguous, false); assert.equal(value.firstAcceptedCosts.counters.firstAccepted, 2);
  assert.equal(value.firstAcceptedCosts.counters.missingFirstAccepted, 0);
  assert.equal(value.firstAcceptedCosts.counters.unboundCosts, 0);
});

test('real preparation build/replay/bypass preserves output and synchronous accepted keeps tail cost', () => {
  const e = environment(), { createSkyCanvasLifecycle } = e.load('sky-canvas-lifecycle.ts');
  const { createSkyStarDrawPreparation } = e.load('sky-star-draw-preparation.ts', {
    './sky-stellar-scene': { isReusableSkyStellarFrame: value => value.reusable },
    './sky-stellar-supplement-scene': { isReusableSkyStellarSupplementFrame: value => value.reusable },
    './sky-view-projection': { validBasis: () => true },
  });
  const preparation = createSkyStarDrawPreparation(), source = {}, bsc = { reusable: true }, sao = { reusable: true };
  const outputs = [], builds = { bsc: 0, sao: 0 };
  const view = { canvas: {}, basis: { right: [1,0,0], up: [0,1,0], forward: [0,0,1] }, width: 100, height: 200, verticalFovDeg: 80, mode: 'NIGHT' };
  preparation.prepare(view);
  const writer = createSkyCanvasLifecycle({ measure: done => done({ width: 100, height: 200 }), createContext: () => ({}),
    paint(_c, _f, _s, done) {
      const seen = [];
      e.probe.measure('draw', () => {
        e.probe.actualDrawCost('starTraversal', () => preparation.catalog(source, bsc, visit => {
          builds.bsc++; e.tick(3); visit({ reference: 'HR:1' }, { x: 1, y: 2 });
        }, (star, point) => { seen.push([star.reference, point.x, point.y]); e.tick(1); }), 'bsc');
        e.probe.actualDrawCost('starTraversal', () => preparation.supplement(sao, visit => {
          builds.sao++; e.tick(2); visit({ reference: 'SAO:2' }, { x: 3, y: 4 });
        }, (star, point) => { seen.push([star.reference, point.x, point.y]); e.tick(1); }), 'sao');
      });
      outputs.push(seen); done(); e.tick(2);
    },
    presented(frame) { e.probe.frameStage(frame, 'displayCopy', () => e.tick(1));
      e.probe.frameStage(frame, 'publishAccepted', () => e.tick(1)); e.probe.accepted(frame, { objects: [] }); },
    invalidated() {}, failed(error) { throw error; } }, { schedule: e.context.setTimeout, cancel: e.context.clearTimeout });
  writer.ready();
  for (let n = 1; n <= 3; n++) {
    if (n === 3) { bsc.reusable = false; sao.reusable = false; }
    const value = e.intent(n); e.probe.request(value.frame, value.token, value.sequence, 1); writer.request(value.frame); e.advance(0);
  }
  const value = plain(e.probe.snapshot());
  assert.equal(validateR17PhoneProbeMetrics(value), true);
  assert.deepEqual(builds, { bsc: 2, sao: 2 });
  assert(outputs.every(output => JSON.stringify(output) === JSON.stringify([['HR:1',1,2],['SAO:2',3,4]])));
  assert.deepEqual(value.firstAcceptedCosts.rows.map(row => row.cache), [
    { bsc: [1,0,0], sao: [1,0,0] }, { bsc: [0,1,0], sao: [0,1,0] }, { bsc: [0,0,1], sao: [0,0,1] },
  ]);
  assert(value.firstAcceptedCosts.rows.every(row => row.scopeAmbiguous === false));
  const first = value.firstAcceptedCosts.rows[0];
  assert.equal(stage(value, first, 'draw')[2], 7);
  assert.equal(stage(value, first, 'nativePaintOwner')[2], 11, 'includes the original synchronous callback and tail after accepted');
});

test('complete normal business fixture keeps Play, Pause, publication, terminal and strict export with the added observation', async () => {
  // Imported builder helpers retain their default fixture generation25. The
  // real finite generation34 is separately bound by builder prepare/build.
  const result = await verifyNormalBaselineV3Fixture({ productionRoot: root, feature, ts, buildGeneration: 25,
    protocolPath: path.join(here, 'r17-normal-input-protocol.mjs'), allowACorrelation: true, allowRulerEntry: true,
    retirementObservation: true, normalPlayTrialMs: 60000,
    readPreparedSource: async name => files.get(name) ?? (name === 'sky-canvas-surface.ts'
      ? normalSurface(await production(name), true).source : production(name)) });
  assert(Object.values(result).every(value => value === true));
});
