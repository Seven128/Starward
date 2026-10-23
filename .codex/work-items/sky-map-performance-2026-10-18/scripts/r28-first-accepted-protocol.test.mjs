// Declared R28 protocol fixtures; no target, service, build or helper imports.
// The historical base comes from the unchanged v3 recorder so dispatcher and
// terminal checks do not maintain a second hand-written full base contract.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { R28_FIRST_ACCEPTED_COSTS_SCHEMA, validateR28FirstAcceptedCosts,
  withoutR28FirstAcceptedCosts } from './r28-first-accepted-protocol.mjs';
import { validateR17PhoneProbeMetrics, validateR17PhoneProbeTerminal, matchR17PhoneProbeTerminal,
  R17_PHONE_PROBE_MAX_BYTES } from './r17-normal-input-protocol.mjs';
import { createR17PhoneProbeCollector } from './r17-phone-probe-collector.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const ts = require(path.resolve(here, '../../../../apps/wechat-miniapp/node_modules/typescript'));
const source = await fs.readFile(new URL('r17-phone-probe-v3-runtime.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source.replaceAll('__VARIANT__', 'baseline'), {
  reportDiagnostics: true, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
});
assert.equal(compiled.diagnostics.length, 0);
const copy = value => JSON.parse(JSON.stringify(value));
const unknown = () => ({ belowResolution: 0, clockUnavailable: 0, clockDiscontinuity: 0, outOfRange: 0, notObserved: 0 });
const stageNames = ['nativePaintOwner','draw','bscTraversal','saoTraversal','rendererSubmit',
  'displayCopy','publishAccepted','nativeCallback'];
const known = milliseconds => [1, 1, milliseconds, [0,0,0,0,0], 0];
const missing = () => [0, 0, 0, [0,0,0,0,0], 0];

function baseFixture(amount = 1) {
  let wall = 0, nextTimer = 0;
  const timers = new Map();
  const context = { exports: {}, Date: class extends Date { static now() { return 1_800_000_000_000 + wall; } },
    setTimeout(run, delay) { const id = ++nextTimer; timers.set(id, { at: wall + delay, run }); return id; },
    clearTimeout(id) { timers.delete(id); } };
  const advance = milliseconds => {
    const end = wall + milliseconds;
    for (;;) {
      const pending = [...timers].filter(([, timer]) => timer.at <= end).sort((a,b) => a[1].at - b[1].at)[0];
      if (!pending) break;
      timers.delete(pending[0]); wall = pending[1].at; pending[1].run();
    }
    wall = end;
  };
  vm.runInNewContext(compiled.outputText, context);
  const probe = context.exports.r17Probe;
  probe.configureBinding({ mode: 'normal', buildGeneration: 34, buildSourceSha256: 'a'.repeat(64) });
  probe.start('wide-time'); advance(1000);
  for (let index = 0; index < amount; index++) {
    const at = new Date(Date.UTC(2020, 0, 1, 0, 0, index)).toISOString();
    const intent = probe.intent({ at }), token = probe.prepareStarted(intent);
    advance(1); probe.prepareFinished(token);
    const frame = { frameAt: at };
    probe.request(frame, token, intent); probe.prepared(frame); probe.paintStarted(frame);
    probe.measure('nativePaintOwner', () => { probe.measure('draw', () => advance(4)); advance(1); });
    probe.callback(frame);
    probe.measure('displayCopy', () => advance(1)); probe.measure('publishAccepted', () => advance(1));
    probe.accepted(frame, { objects: [{ reference: 'HR:1' }, { reference: 'SAO:2' }] });
  }
  probe.control('export');
  const v3 = copy(probe.snapshot());
  advance(1); const terminal = copy(probe.terminalSnapshot());
  assert.equal(validateR17PhoneProbeMetrics(v3), true);
  assert.equal(validateR17PhoneProbeTerminal(terminal), true);
  const aggregate = (calls = 0, total = 0, max = null) => ({ observedCalls: calls, validCalls: calls,
    unknownCalls: 0, knownSubtotalMs: total, maxMs: max, threwCalls: 0, unknown: unknown() });
  const stages = () => ({ draw: aggregate(), starTraversal: aggregate(), rendererSubmit: aggregate() });
  const requestMasks = new Array(64).fill(0), paintMasks = new Array(64).fill(0);
  requestMasks[1] = paintMasks[1] = amount;
  const r19 = { ...v3, schemaVersion: 'starward-r19-phone-probe-draw-reasons-v1', drawReasons: {
    schemaVersion: 'starward-r19-draw-reasons-v1', metricsSchema: v3.schemaVersion,
    meaning: 'request-causes-unioned-at-existing-pending-frame-paint-admission-not-pixels-or-wasted-work',
    identityLimit: 256, ringCapacity: 32, requests: amount, paints: amount, mergedRequests: 0,
    inheritedFrames: 0, identityRotations: 0, invalidReasons: 0, unknownFramePaints: 0,
    requestMasks, paintMasks, dropped: Math.max(0, amount - 32),
    entries: Array.from({ length: Math.min(32, amount) }, (_, index) => {
      const order = Math.max(0, amount - 32) + index + 1; return [order, 1, order, order];
    }),
  } };
  const effect = stages();
  if (amount) {
    effect.draw = aggregate(amount, 4 * amount, 4);
    effect.starTraversal = aggregate(2 * amount, 3 * amount, 2);
    effect.rendererSubmit = aggregate(amount, amount, 1);
  }
  const base = { ...r19, schemaVersion: 'starward-r20-phone-probe-draw-costs-v1', drawCosts: {
    schemaVersion: 'starward-r20-draw-costs-v1', metricsSchema: r19.schemaVersion,
    meaning: 'inclusive-wall-elapsed-synchronous-actual-paint-scope-not-CPU-GPU-or-pixels',
    nesting: 'submit-may-overlap-starTraversal-both-inside-draw-do-not-add',
    classification: 'unknown-bit-or-missing-first-then-effect-bit-else-continuation', scopedPaints: amount,
    missingAdmissionPaints: 0, nestedPaints: 0, scopeChangedSpans: 0,
    groups: [{ kind: 'inputResourceEffect', paints: amount, stages: effect },
      { kind: 'continuationOnly', paints: 0, stages: stages() }, { kind: 'unknown', paints: 0, stages: stages() }],
    unbound: stages(),
  } };
  assert.equal(validateR17PhoneProbeMetrics(base), true);
  return { base, terminal };
}

function wrapped(base, { omitted = [] } = {}) {
  const amount = base.linkage.firstAcceptedIntents;
  const orders = Array.from({ length: amount }, (_, index) => index + 1).filter(order => !omitted.includes(order));
  return { ...copy(base), schemaVersion: R28_FIRST_ACCEPTED_COSTS_SCHEMA, firstAcceptedCosts: {
    schemaVersion: 'starward-r28-first-accepted-costs-v1', metricsSchema: base.schemaVersion,
    meaning: 'existing-inclusive-wall-spans-at-first-accepted-identity-not-cpu-gpu-or-pixels',
    nesting: 'submit-may-overlap-traversals-and-draw-native-owner-encloses-sync-paint-do-not-add',
    capacity: 8, identityLimit: 256, stages: [...stageNames], counters: {
      paints: amount, firstAccepted: amount, missingFirstAccepted: omitted.length,
      evictedRows: Math.max(0, orders.length - 8), identityRotations: 0, unboundCosts: 0,
      nestedScopes: 0, invalidIntervals: 0, invalidIdentities: omitted.length, duplicateAccepted: 0,
    }, rows: orders.slice(-8).map(order => ({ order, intentSequence: order, prepareToken: order,
      canvasOwner: 1, canvasGeneration: 0, paintOrdinal: order, superseded: false, scopeAmbiguous: false,
      costs: [known(5), known(4), known(2), known(1), known(1), known(1), known(1), known(5)],
      cache: { bsc: [1,0,0], sao: [1,0,0] },
    })),
  } };
}

test('R28 unwrap preserves the full historical receipt and terminal association', () => {
  const { base, terminal } = baseFixture(3), bytes = JSON.stringify(base), value = wrapped(base);
  assert.equal(validateR28FirstAcceptedCosts(value), true);
  assert.equal(validateR17PhoneProbeMetrics(value), true);
  assert.deepEqual(withoutR28FirstAcceptedCosts(value), base);
  assert.equal(JSON.stringify(base), bytes);
  assert.equal(matchR17PhoneProbeTerminal(base, terminal), true);
  assert.equal(matchR17PhoneProbeTerminal(value, terminal), true);
  const wrong = copy(terminal); wrong.binding.buildGeneration++;
  assert.equal(matchR17PhoneProbeTerminal(value, wrong), false);
});

test('R28 keeps zero observations distinct from measured unknown intervals', () => {
  const value = wrapped(baseFixture().base), row = value.firstAcceptedCosts.rows[0];
  row.costs[0] = missing();
  for (let reason = 0; reason < 5; reason++) {
    const unknowns = [0,0,0,0,0]; unknowns[reason] = 1;
    row.costs[reason + 1] = [1,0,0,unknowns,reason === 4 ? 1 : 0];
  }
  assert.equal(validateR28FirstAcceptedCosts(value), true);
  assert.equal(validateR17PhoneProbeMetrics(value), true);
  row.costs[1][2] = 1;
  assert.equal(validateR28FirstAcceptedCosts(value), false, 'unknown-only cost cannot invent known elapsed time');
});

test('R28 bounded ring accounts for missing identities and does not invent discarded linkage', () => {
  const { base } = baseFixture(12), value = wrapped(base, { omitted: [2,5,9] });
  assert.equal(value.firstAcceptedCosts.rows.length, 8);
  assert.equal(value.firstAcceptedCosts.counters.evictedRows, 1);
  assert.equal(validateR17PhoneProbeMetrics(value), true);
  // Original links deliberately select only first/last records. Absence of
  // this valid finite identity cannot become a false protocol failure.
  value.linkage.links = value.linkage.links.filter(link => link.prepareToken !== 11);
  value.linkage.linkSampleTruncated = true;
  assert.equal(validateR28FirstAcceptedCosts(value), true);
  assert.equal(validateR17PhoneProbeMetrics(value), true);
  value.firstAcceptedCosts.counters.evictedRows++;
  assert.equal(validateR28FirstAcceptedCosts(value), false);
});

test('R28 rejects extra product fields, conflicting identities, nesting and counter claims', () => {
  const value = wrapped(baseFixture(2).base);
  const mutations = [
    v => { v.firstAcceptedCosts.rawFrame = {}; },
    v => { v.firstAcceptedCosts.rows[0].report = {}; },
    v => { v.firstAcceptedCosts.rows[0].cache.private = []; },
    v => { v.firstAcceptedCosts.counters.private = 0; },
    v => { v.firstAcceptedCosts.metricsSchema = R28_FIRST_ACCEPTED_COSTS_SCHEMA; },
    v => { v.firstAcceptedCosts.schemaVersion = 'future'; },
    v => { v.firstAcceptedCosts.nesting = 'add-all-stages'; },
    v => { v.firstAcceptedCosts.capacity = 9; },
    v => { v.firstAcceptedCosts.identityLimit = 257; },
    v => { v.firstAcceptedCosts.stages.reverse(); },
    v => { v.firstAcceptedCosts.rows[1].order = 1; },
    v => { v.firstAcceptedCosts.rows[1].intentSequence = 1; },
    v => { v.firstAcceptedCosts.rows[1].prepareToken = 1; },
    v => { v.firstAcceptedCosts.rows[1].paintOrdinal = 1; },
    v => { v.firstAcceptedCosts.rows[0].canvasOwner = 0; },
    v => { v.firstAcceptedCosts.rows[0].canvasGeneration = -1; },
    v => { v.firstAcceptedCosts.rows[0].scopeAmbiguous = true; },
    v => { v.firstAcceptedCosts.counters.firstAccepted++; },
    v => { v.firstAcceptedCosts.counters.paints++; },
    v => { v.linkage.links[0].intentSequence = 99; },
    v => { v.linkage.links[0].firstAcceptedObserved = false; },
    v => { v.linkage.links[0].intentSuperseded = true; },
  ];
  for (const mutate of mutations) {
    const invalid = copy(value); mutate(invalid);
    assert.equal(validateR28FirstAcceptedCosts(invalid), false, String(mutate));
    assert.equal(validateR17PhoneProbeMetrics(invalid), false, String(mutate));
  }
  const ambiguous = copy(value); ambiguous.firstAcceptedCosts.rows[0].scopeAmbiguous = true;
  ambiguous.firstAcceptedCosts.counters.nestedScopes = 1;
  assert.equal(validateR17PhoneProbeMetrics(ambiguous), true, 'reported ambiguity remains representable');
  const topLevel = copy(value); topLevel.rawFrame = {};
  assert.equal(validateR17PhoneProbeMetrics(topLevel), false, 'base validator rejects unknown top-level data');
});

test('R28 cost and cache tuples reject nonfinite, fractional and inconsistent numbers', () => {
  const value = wrapped(baseFixture().base);
  const badCosts = [
    [1,1,0,[0,0,0,0,0],0], [1,1,60001,[0,0,0,0,0],0],
    [1,0,0,[0,0,0,0,0],0], [1,0,0,[1,1,0,0,0],0],
    [1,1,4,[0,0,0,0,0],2], [1,1,4,[0,0,0,0],0],
    [0,0,1,[0,0,0,0,0],0], [1,1,4.5,[0,0,0,0,0],0],
    [1,1,Infinity,[0,0,0,0,0],0], [NaN,0,0,[0,0,0,0,0],0],
    [1,1,4,[0,0,0,0,-1],0], [1,1,4,[0,0,0,0,0],0,{}],
  ];
  for (const bad of badCosts) {
    const invalid = copy(value); invalid.firstAcceptedCosts.rows[0].costs[1] = bad;
    assert.equal(validateR28FirstAcceptedCosts(invalid), false);
  }
  for (const bad of [[1,0], [1,0,0,0], [Infinity,0,0], [1.5,0,0], [-1,0,0], [1e12+1,0,0]]) {
    const invalid = copy(value); invalid.firstAcceptedCosts.rows[0].cache.bsc = bad;
    assert.equal(validateR28FirstAcceptedCosts(invalid), false);
  }
});

test('R28 validates the complete outer byte budget before unwrapping', () => {
  let oversized;
  for (let amount = 16; amount <= 32; amount++) {
    const { base } = baseFixture(amount), value = wrapped(base);
    for (const row of value.firstAcceptedCosts.rows) {
      row.costs = stageNames.map(() => [1e12,2e7,1e12,[199996000000,199996000000,199996000000,199996000000,199996000000],1e12]);
      row.cache = { bsc: [1e12,1e12,1e12], sao: [1e12,1e12,1e12] };
    }
    assert.equal(validateR28FirstAcceptedCosts(value), true);
    assert.equal(validateR17PhoneProbeMetrics(base), true);
    if (Buffer.byteLength(JSON.stringify(value), 'utf8') > R17_PHONE_PROBE_MAX_BYTES) { oversized = value; break; }
  }
  assert(oversized, 'declared valid extension must exercise the real outer budget');
  assert.equal(validateR17PhoneProbeMetrics(withoutR28FirstAcceptedCosts(oversized)), true);
  assert.equal(validateR17PhoneProbeMetrics(oversized), false);
});

test('existing collector preserves R28 immutable idempotency and terminal readback', async () => {
  const temp = await fs.realpath(os.tmpdir()), directory = await fs.mkdtemp(path.join(temp, 'starward-r28-protocol-'));
  try {
    const { base, terminal } = baseFixture(2), value = wrapped(base), collector = createR17PhoneProbeCollector(directory);
    assert.equal(await collector.store(terminal), 424);
    assert.equal(await collector.store(value), 200);
    assert.equal(await collector.store(value), 200);
    const conflict = copy(value); conflict.firstAcceptedCosts.counters.unboundCosts++;
    assert.equal(await collector.store(conflict), 409);
    assert.equal(await collector.store(terminal), 200);
    const stored = JSON.parse(await fs.readFile(path.join(directory, value.variant + '-' + value.runId + '.json'), 'utf8'));
    assert.deepEqual(stored, value);
    const bad = copy(value); bad.firstAcceptedCosts.rows[0].privateContext = {};
    assert.equal(await collector.store(bad), 400);
    assert.equal((await fs.readdir(directory)).filter(name => name.endsWith('.json')).length, 2);
  } finally {
    const resolved = await fs.realpath(directory);
    assert.equal(path.dirname(resolved).toLowerCase(), temp.toLowerCase());
    assert(path.basename(resolved).startsWith('starward-r28-protocol-'));
    assert.equal((await fs.lstat(resolved)).isSymbolicLink(), false);
    await fs.rm(resolved, { recursive: true });
  }
});
