import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('../../../../apps/wechat-miniapp/node_modules/typescript');
const sourcePath = fileURLToPath(new URL('./r28-first-accepted-costs.ts', import.meta.url));
const source = await fs.readFile(sourcePath, 'utf8');
const compiled = ts.transpileModule(source, { reportDiagnostics: true, compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } });
assert.equal(compiled.diagnostics.filter(value => value.category === ts.DiagnosticCategory.Error).length, 0);
const module = { exports: {} };
vm.runInNewContext('(function(exports,module){' + compiled.outputText + '\n})', {})(module.exports, module);
const create = module.exports.createR28FirstAcceptedCosts;
const base = { schemaVersion: 'starward-r20-phone-probe-draw-costs-v1' };
const plain = value => JSON.parse(JSON.stringify(value));
const snapshot = probe => plain(probe.attach(base).firstAcceptedCosts);
const valid = elapsedMs => ({ elapsedMs, status: 'valid' });
const at = (row, stage) => row.costs[module.exports.R28_FIRST_ACCEPTED_STAGES.indexOf(stage)];
function fixture() {
  const probe = create(), canvas = probe.canvasOwner();
  probe.start(true);
  return { probe, canvas, identity: (intentSequence, prepareToken = intentSequence + 100, canvasOwner = canvas, canvasGeneration = 0) =>
    ({ intentSequence, prepareToken, canvasOwner, canvasGeneration }) };
}

test('helper satisfies strict portable template types without a product dependency', () => {
  const program = ts.createProgram([sourcePath], { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
    strict: true, noUncheckedIndexedAccess: true, exactOptionalPropertyTypes: true,
    noEmit: true, types: [], skipLibCheck: true });
  assert.deepEqual(ts.getPreEmitDiagnostics(program).map(value => ts.flattenDiagnosticMessageText(value.messageText, '\n')), []);
});

test('asynchronous completion joins its own first response after another Canvas paint', () => {
  const { probe: p, identity } = fixture(), a = {}, b = {}, secondCanvas = p.canvasOwner();
  p.begin(a, identity(1));
  p.withFrame(a, () => {
    p.record('bscTraversal', valid(7)); p.cache('bsc', 'build');
    p.record('saoTraversal', valid(3)); p.cache('sao', 'replay');
    p.record('rendererSubmit', valid(2)); p.record('draw', valid(12));
    p.record('nativePaintOwner', valid(15));
  });
  p.begin(b, identity(2, 102, secondCanvas, 3));
  p.withFrame(b, () => { p.record('draw', valid(22)); p.cache('bsc', 'replay'); p.cache('sao', 'bypass'); });
  p.recordFrame(a, 'nativeCallback', valid(18));
  p.withFrame(a, () => { p.record('displayCopy', valid(2)); p.record('publishAccepted', valid(1)); p.accept(a, true); });
  p.recordFrame(b, 'nativeCallback', valid(25));
  p.withFrame(b, () => { p.record('displayCopy', valid(4)); p.accept(b, false); });
  const result = snapshot(p), [first, second] = result.rows;
  assert.deepEqual(result.rows.map(row => [row.intentSequence, row.prepareToken, row.canvasOwner, row.canvasGeneration,
    row.paintOrdinal, row.superseded]), [[1, 101, 1, 0, 1, true], [2, 102, 2, 3, 2, false]]);
  assert.equal(at(first, 'draw')[2], 12); assert.equal(at(second, 'draw')[2], 22);
  assert.equal(at(first, 'nativeCallback')[2], 18); assert.equal(at(second, 'nativeCallback')[2], 25);
  assert.deepEqual(first.cache, { bsc: [1, 0, 0], sao: [0, 1, 0] });
  assert.deepEqual(second.cache, { bsc: [0, 1, 0], sao: [0, 0, 1] });
  assert.equal(result.counters.nestedScopes, 0); assert.equal(result.counters.unboundCosts, 0);
});

test('synchronous done keeps tail cost, same-attempt nesting is exact, and exported values are detached', () => {
  const { probe: p, identity } = fixture(), frame = {};
  let beforeTail;
  p.begin(frame, identity(1));
  p.withFrame(frame, () => {
    p.record('draw', valid(5));
    p.withFrame(frame, () => {
      p.recordFrame(frame, 'nativeCallback', valid(7)); p.record('displayCopy', valid(1));
      p.accept(frame, false); beforeTail = p.attach(base);
    });
    p.record('nativePaintOwner', valid(9));
  });
  assert.equal(at(plain(beforeTail.firstAcceptedCosts.rows[0]), 'nativePaintOwner')[0], 0);
  const complete = snapshot(p);
  assert.equal(at(complete.rows[0], 'nativePaintOwner')[2], 9);
  assert.equal(complete.rows[0].scopeAmbiguous, false); assert.equal(complete.counters.nestedScopes, 0);
  beforeTail.firstAcceptedCosts.rows[0].costs[1][2] = 999;
  beforeTail.firstAcceptedCosts.rows[0].cache.bsc[0] = 999;
  beforeTail.firstAcceptedCosts.counters.paints = 999;
  assert.equal(at(snapshot(p).rows[0], 'draw')[2], 5);
  assert.equal(snapshot(p).rows[0].cache.bsc[0], 0); assert.equal(snapshot(p).counters.paints, 1);
});

test('continuations explicitly skip identity and costs; a replacement attempt cannot rewrite a saved first row', () => {
  const { probe: p, identity } = fixture(), frame = {};
  p.begin(frame, identity(1));
  p.withFrame(frame, () => { p.record('draw', valid(5)); p.accept(frame, false); });
  p.accept(frame, false);
  p.begin(frame, null);
  p.withFrame(frame, () => { p.record('draw', valid(40)); p.cache('bsc', 'build'); });
  p.recordFrame(frame, 'nativeCallback', valid(60));
  let result = snapshot(p);
  assert.equal(result.counters.duplicateAccepted, 1); assert.equal(result.counters.firstAccepted, 1);
  assert.equal(result.counters.invalidIdentities, 0); assert.equal(result.counters.unboundCosts, 0);
  assert.equal(at(result.rows[0], 'draw')[2], 5); assert.equal(at(result.rows[0], 'nativeCallback')[0], 0);
  p.begin(frame, identity(2));
  p.withFrame(frame, () => { p.record('draw', valid(17)); p.accept(frame, false); });
  result = snapshot(p);
  assert.deepEqual(result.rows.map(row => at(row, 'draw')[2]), [5, 17]);
  assert.deepEqual(result.rows.map(row => row.paintOrdinal), [1, 3]);
});

test('different-attempt re-entry marks both rows and restores the outer attribution while preserving throw identity', () => {
  const { probe: p, identity } = fixture(), outer = {}, inner = {}, expected = new Error('original-work-failed');
  const calls = [];
  p.begin(outer, identity(1)); p.begin(inner, identity(2));
  const returned = {};
  assert.equal(p.withFrame(outer, () => {
    calls.push('outer-before');
    assert.throws(() => p.withFrame(inner, () => {
      calls.push('inner');
      try { throw expected; } finally { p.record('draw', valid(3), true); }
    }), error => error === expected);
    p.record('draw', valid(9)); calls.push('outer-after');
    p.accept(outer, false); p.accept(inner, true); return returned;
  }), returned);
  const result = snapshot(p);
  assert.deepEqual(calls, ['outer-before', 'inner', 'outer-after']);
  assert.equal(result.counters.nestedScopes, 1);
  assert.deepEqual(result.rows.map(row => row.scopeAmbiguous), [true, true]);
  assert.deepEqual(result.rows.map(row => at(row, 'draw')[2]), [9, 3]);
  assert.equal(at(result.rows[1], 'draw')[4], 1);
});

test('invalid and sub-resolution spans remain unknown instead of becoming zero-duration work', () => {
  const { probe: p, identity } = fixture(), frame = {};
  p.begin(frame, identity(1));
  p.withFrame(frame, () => {
    p.record('draw', valid(12), true);
    for (const status of ['belowResolution', 'clockUnavailable', 'clockDiscontinuity', 'outOfRange', 'notObserved'])
      p.record('draw', { elapsedMs: null, status });
    for (const value of [valid(0), valid(60001), { elapsedMs: null, status: 'invented' }, { elapsedMs: 8, status: 'belowResolution' }])
      p.record('draw', value);
    p.accept(frame, false);
  });
  const result = snapshot(p);
  assert.deepEqual(at(result.rows[0], 'draw'), [10, 1, 12, [1, 1, 1, 1, 5], 1]);
  assert.deepEqual(at(result.rows[0], 'displayCopy'), [0, 0, 0, [0, 0, 0, 0, 0], 0]);
  assert.equal(result.counters.invalidIntervals, 4);
});

test('stop preserves bounded results while a re-entrant new run rejects old work and callbacks', () => {
  const { probe: p, identity } = fixture(), old = {};
  p.begin(old, identity(1));
  p.withFrame(old, () => {
    p.record('draw', valid(10)); p.accept(old, false); p.stop();
    const stopped = snapshot(p);
    p.record('draw', valid(40)); p.recordFrame(old, 'nativeCallback', valid(50));
    assert.deepEqual(snapshot(p), stopped);
    p.start(true);
    p.record('draw', valid(60)); p.recordFrame(old, 'nativeCallback', valid(70));
    p.cache('bsc', 'build'); p.begin(old, identity(1)); p.accept(old, false);
  });
  assert.deepEqual(snapshot(p).counters, { paints: 0, firstAccepted: 0, missingFirstAccepted: 0, evictedRows: 0,
    identityRotations: 0, unboundCosts: 0, nestedScopes: 0, invalidIntervals: 0, invalidIdentities: 0, duplicateAccepted: 0 });
  const next = {}, nextOwner = p.canvasOwner();
  assert.equal(nextOwner, 2);
  p.begin(next, identity(2, 102, nextOwner, 1));
  p.withFrame(next, () => { p.record('draw', valid(2)); p.accept(next, false); });
  assert.equal(snapshot(p).rows[0].canvasOwner, 2);
  p.recordFrame(old, 'nativeCallback', valid(90));
  assert.equal(snapshot(p).counters.unboundCosts, 0);
  p.record('draw', valid(1)); assert.equal(snapshot(p).counters.unboundCosts, 1);
  p.start(false);
  assert.equal(p.attach(base), base);
  const original = {}; assert.equal(p.withFrame(next, () => original), original);
});

test('recent-row eviction and missing identity keep an exact accounting of first acceptance', () => {
  const { probe: p, identity } = fixture();
  for (let id = 1; id <= 12; id++) {
    const frame = {}; p.begin(frame, identity(id));
    p.withFrame(frame, () => { p.record('draw', valid(id)); p.accept(frame, id % 2 === 0); });
  }
  const missing = {};
  p.begin(missing, { ...identity(13), prepareToken: null }); p.accept(missing, false);
  const result = snapshot(p);
  assert.deepEqual(result.rows.map(row => row.order), [5, 6, 7, 8, 9, 10, 11, 12]);
  assert.equal(result.rows.length, 8); assert.equal(result.counters.evictedRows, 4);
  assert.equal(result.counters.missingFirstAccepted, 1); assert.equal(result.counters.invalidIdentities, 1);
  assert.equal(result.rows.length + result.counters.evictedRows + result.counters.missingFirstAccepted, result.counters.firstAccepted);
});

test('weak identity rotation drops the old association and never recovers it from product fields', () => {
  const { probe: p, identity } = fixture(), frames = Array.from({ length: 257 }, () => ({}));
  frames.forEach((frame, index) => p.begin(frame, identity(index + 1)));
  p.recordFrame(frames[0], 'nativeCallback', valid(100)); p.accept(frames[0], false);
  const last = frames.at(-1);
  p.recordFrame(last, 'nativeCallback', valid(6));
  p.withFrame(last, () => { p.record('draw', valid(7)); p.accept(last, false); });
  const result = snapshot(p);
  assert.equal(result.counters.identityRotations, 1); assert.equal(result.counters.missingFirstAccepted, 1);
  assert.equal(result.rows[0].intentSequence, 257); assert.equal(result.rows[0].order, 2);
  assert.equal(at(result.rows[0], 'nativeCallback')[2], 6); assert.equal(result.counters.unboundCosts, 0);
});

test('opaque frame contents are neither read nor serialized by observation or export', () => {
  const { probe: p, identity } = fixture();
  const frame = new Proxy({}, { get() { throw Error('frame field was read'); },
    ownKeys() { throw Error('frame was enumerated'); }, getOwnPropertyDescriptor() { throw Error('frame descriptor was read'); } });
  p.begin(frame, identity(1));
  p.withFrame(frame, () => { p.cache('bsc', 'bypass'); p.record('draw', valid(1)); p.accept(frame, false); });
  const exported = p.attach(base);
  assert.doesNotThrow(() => JSON.stringify(exported));
  assert.equal(snapshot(p).rows[0].intentSequence, 1);
  assert(!Object.values(exported.firstAcceptedCosts.rows[0]).includes(frame));
});
