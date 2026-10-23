import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('../../../../apps/wechat-miniapp/node_modules/typescript');
const source = await fs.readFile(new URL('./r27-query-callback-observer.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }, reportDiagnostics: true });
assert.equal(compiled.diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
const module = { exports: {} };
vm.runInNewContext('(function(exports,module){' + compiled.outputText + '\n})', { WeakRef })(module.exports, module);
const create = module.exports.createR27QueryCallbackObserver;
const plain = value => JSON.parse(JSON.stringify(value));

// These are deterministic liveness fixtures, not forced or observed real GC.
function controlledRefs() {
  const cells = [];
  class ControlledRef {
    constructor(value) { this.cell = { value, throws: false }; cells.push(this.cell); }
    deref() { if (this.cell.throws) throw Error('synthetic unavailable reference'); return this.cell.value; }
  }
  return { Ref: ControlledRef, cells,
    collect(value) { for (const cell of cells) if (cell.value === value) cell.value = undefined; },
    fail(value) { for (const cell of cells) if (cell.value === value) cell.throws = true; } };
}
function fixture(options = {}) {
  const refs = controlledRefs(), ids = new WeakMap();
  let reads = 0;
  const p = create({ aggregateId: value => ids.get(value) ?? null,
    readQueryOwner: (query, wrapper) => {
      reads++; return { inCache: query.inCache, currentOptionMatches: wrapper === undefined ? null : query.queryFn === wrapper };
    }, WeakRef: refs.Ref, ...options });
  return { p, ids, refs, reads: () => reads };
}
function register(p) {
  const page = () => 'page', wrapper = () => page(), query = { inCache: true, queryFn: wrapper };
  assert.equal(p.pageCallback(page), page); assert.equal(p.queryWrapper(page, wrapper), wrapper);
  p.queryOwner(page, query); return { page, wrapper, query };
}

test('returns the exact function and render value without invoking or inspecting product actions', () => {
  const { p, ids, refs } = fixture(); let calls = 0, inputReads = 0;
  const page = signal => { calls++; return signal; }, wrapper = signal => page(signal);
  const value = Object.defineProperty({ kind: 'synthetic-react-node' }, 'children', {
    get() { inputReads++; throw Error('must not inspect a returned render value'); }, enumerable: true });
  assert.equal(p.pageCallback(page), page); assert.equal(p.queryWrapper(page, wrapper), wrapper);
  assert.equal(p.finishRender(value), value); assert.equal(calls, 0);
  assert(p.start()); p.beginRender();
  assert.equal(p.pageCallback(page), page); assert.equal(p.queryWrapper(page, wrapper), wrapper);
  const query = { inCache: true, queryFn: wrapper }, aggregate = {};
  p.queryOwner(page, query); ids.set(aggregate, 1); p.aggregate(aggregate);
  assert.equal(p.finishRender(value), value); assert.equal(inputReads, 0); assert.equal(calls, 0);
  assert.equal(Object.isFrozen(value), false);
  assert.equal(refs.cells.filter(cell => cell.value === value || cell.value === aggregate).length, 0);
  const token = {}; assert.equal(wrapper(token), token); assert.equal(calls, 1);
  const r = p.snapshot(); assert.equal(r.samples[0].renderCompleted, true);
  assert.equal(r.samples[0].site, 'fine-target-queryFn');
});

test('selects only existing aggregate IDs one through eight and never replaces their first association', () => {
  let lookupErrors = false;
  const refs = controlledRefs(), ids = new WeakMap();
  const p = create({ WeakRef: refs.Ref, aggregateId: value => {
    if (lookupErrors) throw Error('synthetic owner unavailable'); return ids.get(value) ?? null;
  }, readQueryOwner: () => ({ inCache: true, currentOptionMatches: true }) });
  p.start(); const aggregates = Array.from({ length: 12 }, () => ({}));
  for (let index = 0; index < aggregates.length; index++) {
    ids.set(aggregates[index], index + 1); p.beginRender(); register(p); p.aggregate(aggregates[index]); p.finishRender(null);
  }
  const refsAfterEight = p.snapshot().diagnostics.refsCreated, cellsAfterEight = refs.cells.length;
  for (let index = 0; index < 100; index++) {
    p.beginRender(); const page = () => {}, wrapper = () => {};
    assert.equal(p.pageCallback(page), page); assert.equal(p.queryWrapper(page, wrapper), wrapper);
    assert.equal(p.observesPageCallback(page), false); p.queryOwner(page, {});
    p.aggregate(aggregates[index % 8]); p.finishRender(null);
  }
  const unselected = {}, invalid = {}; p.aggregate(unselected);
  ids.set(invalid, Number.NaN); p.aggregate(invalid); ids.set(invalid, 1.5); p.aggregate(invalid);
  ids.set(invalid, 0); p.aggregate(invalid); ids.set(invalid, -1); p.aggregate(invalid);
  p.aggregate(null); p.aggregate('invalid'); lookupErrors = true; p.aggregate({});
  const r = p.snapshot();
  assert.deepEqual(plain(r.samples.map(s => s.aggregateId)), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual(plain(r.samples.map(s => s.renderId)), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(r.diagnostics.duplicateAggregates, 100); assert.equal(r.diagnostics.invalidIds, 8);
  assert.equal(r.diagnostics.unselectedAggregates, 1); assert.equal(r.diagnostics.invalidCalls, 2);
  assert.equal(r.diagnostics.lookupErrors, 1); assert.equal(r.policy.samples, 8); assert.equal(r.policy.sites, 1);
  assert.equal(refsAfterEight, 24); assert.equal(r.diagnostics.refsCreated, refsAfterEight);
  assert.equal(refs.cells.length, cellsAfterEight); assert(r.samples.every(sample => sample.renderCompleted));
  assert(Buffer.byteLength(JSON.stringify(r)) < 6000);
});

test('outside-render and missing registration remain unknown rather than collected or retroactively associated', () => {
  const { p, ids } = fixture(), outside = {}, missing = {}, early = {}, late = {};
  [outside, missing, early, late].forEach((value, index) => ids.set(value, index + 1));
  p.start(); p.aggregate(outside); p.beginRender(); p.aggregate(missing); p.finishRender(null);
  p.beginRender(); const page = () => {}, wrapper = () => {}, query = { inCache: true, queryFn: wrapper };
  p.pageCallback(page); p.aggregate(early);
  p.queryWrapper(page, wrapper); p.queryOwner(page, query); p.aggregate(late); p.finishRender(null);
  p.beginRender(); register(p); p.aggregate(outside); p.finishRender(null);
  const r = p.snapshot();
  assert.deepEqual(plain(r.samples[0]), { aggregateId: 1, site: 'fine-target-queryFn', association: 'outside-render',
    renderId: null, renderCompleted: false, pageCallback: 'unknown', queryWrapper: 'unknown', queryOwner: 'unknown',
    queryInCache: null, currentOptionMatches: null });
  assert.equal(r.samples[1].pageCallback, 'unknown'); assert.equal(r.samples[1].renderCompleted, true);
  assert.equal(r.samples[2].pageCallback, 'alive'); assert.equal(r.samples[2].queryWrapper, 'unknown');
  assert.equal(r.samples[2].queryOwner, 'unknown'); assert.equal(r.samples[3].queryWrapper, 'alive');
  assert.equal(r.samples[3].queryOwner, 'alive'); assert.equal(r.diagnostics.outsideRenderAggregates, 1);
  assert.equal(r.diagnostics.missingPageCallbacks, 1); assert.equal(r.diagnostics.duplicateAggregates, 1);
});

test('a new begin reports an unterminated render; empty renders and finishes invent no sample', () => {
  const { p, ids } = fixture(), a = {}, b = {}; ids.set(a, 1); ids.set(b, 2);
  p.start(); p.beginRender(); register(p); p.aggregate(a);
  p.beginRender(); register(p); p.aggregate(b); p.finishRender({});
  p.beginRender(); p.finishRender(null); p.finishRender(null);
  const r = p.snapshot(); assert.equal(r.samples.length, 2);
  assert.equal(r.samples[0].renderCompleted, false); assert.equal(r.samples[1].renderCompleted, true);
  assert.equal(r.samples[1].renderId, 2); assert.equal(r.diagnostics.unterminatedRenders, 1);
  assert.equal(r.diagnostics.finishWithoutRender, 1);
});

test('pure page identity gating rejects unrelated queries and duplicate site registrations preserve the first witnesses', () => {
  const { p, ids, refs } = fixture(), a = {};
  const first = () => {}, other = () => {}, wrapper = () => {}, wrongWrapper = () => {};
  const query = { inCache: true, queryFn: wrapper }, wrongQuery = { inCache: true, queryFn: wrongWrapper };
  assert.equal(p.observesPageCallback(first), false); p.start(); p.beginRender();
  assert.equal(p.observesPageCallback(first), false); p.pageCallback(first);
  assert.equal(p.observesPageCallback(first), true); assert.equal(p.observesPageCallback(other), false);
  assert.equal(p.queryWrapper(other, wrongWrapper), wrongWrapper); p.queryOwner(other, wrongQuery);
  p.pageCallback(other); p.queryWrapper(first, wrapper); p.queryWrapper(first, wrongWrapper);
  p.queryOwner(first, undefined); p.queryOwner(first, query); p.queryOwner(first, wrongQuery);
  p.queryWrapper(null, wrapper); p.queryOwner(first, null); p.pageCallback(null);
  ids.set(a, 1); p.aggregate(a); p.finishRender(null);
  assert.equal(p.observesPageCallback(first), false);
  assert.equal(refs.cells.filter(cell => cell.value === other || cell.value === wrongWrapper || cell.value === wrongQuery).length, 0);
  const r = p.snapshot(); assert.equal(r.samples[0].currentOptionMatches, true);
  assert.equal(r.diagnostics.unmatchedPageCallbacks, 2); assert.equal(r.diagnostics.duplicatePageCallbacks, 1);
  assert.equal(r.diagnostics.duplicateWrappers, 1); assert.equal(r.diagnostics.duplicateQueries, 1);
  assert.equal(r.diagnostics.missingQueryOwners, 1); assert.equal(r.diagnostics.invalidCalls, 3);
});

test('unsupported, failing construction and failing dereference yield explicit unknown liveness', () => {
  for (const Ref of [null, class Throwing { constructor() { throw Error('unavailable'); } }]) {
    const { p, ids } = fixture({ WeakRef: Ref }), aggregate = {}; ids.set(aggregate, 1);
    assert(p.start()); p.beginRender(); const page = () => {}, wrapper = () => {};
    p.pageCallback(page); p.queryWrapper(page, wrapper); p.queryOwner(page, {}); p.aggregate(aggregate); p.finishRender(null);
    const r = p.snapshot(); assert.equal(r.capability, 'unsupported'); assert.equal(r.samples.length, 1);
    assert.equal(r.samples[0].pageCallback, 'unknown'); assert.equal(r.samples[0].queryWrapper, 'unknown');
    assert.equal(r.samples[0].queryOwner, 'unknown'); assert.equal(r.samples[0].queryInCache, null);
  }
  let constructed = 0;
  class FailsAfterCapability {
    constructor(value) { if (constructed++ > 0) throw Error('construction unavailable'); this.value = value; }
    deref() { return this.value; }
  }
  const f = fixture({ WeakRef: FailsAfterCapability }), a = {}; f.ids.set(a, 1);
  f.p.start(); f.p.beginRender(); register(f.p); f.p.aggregate(a); f.p.finishRender(null);
  const failed = f.p.snapshot(); assert.equal(failed.capability, 'supported');
  assert.equal(failed.samples[0].pageCallback, 'unknown'); assert.equal(failed.diagnostics.referenceErrors, 1);
  const g = fixture(), b = {}; g.ids.set(b, 1); g.p.start(); g.p.beginRender(); const functions = register(g.p);
  g.p.aggregate(b); g.p.finishRender(null); g.refs.fail(functions.page); g.refs.fail(functions.query);
  const unavailable = g.p.snapshot(); assert.equal(unavailable.samples[0].pageCallback, 'unknown');
  assert.equal(unavailable.samples[0].queryOwner, 'unknown'); assert.equal(unavailable.samples[0].queryWrapper, 'alive');
  assert.equal(unavailable.diagnostics.referenceErrors, 2); assert.equal(unavailable.diagnostics.ownerReadCalls, 0);
  const gate = fixture(); gate.p.start(); gate.p.beginRender(); const page = () => {};
  gate.p.pageCallback(page); gate.refs.fail(page); assert.equal(gate.p.observesPageCallback(page), false);
  assert.equal(gate.p.snapshot().diagnostics.referenceErrors, 1);
  gate.p.stopTracking(); assert.equal(gate.p.observesPageCallback(page), false);
  assert.equal(gate.p.snapshot().diagnostics.referenceErrors, 1, 'paused gate must not dereference again');
});

test('controlled weak liveness distinguishes collection from missing and keeps unavailable option identity unknown', () => {
  const { p, ids, refs, reads } = fixture(), a = {}; ids.set(a, 1);
  p.start(); p.beginRender(); const { page, wrapper, query } = register(p); p.aggregate(a); p.finishRender(null);
  const before = p.snapshot(), beforeText = JSON.stringify(before);
  assert.equal(before.samples[0].pageCallback, 'alive'); assert.equal(before.samples[0].queryInCache, true);
  assert.equal(before.samples[0].currentOptionMatches, true);
  refs.collect(page); refs.collect(wrapper); const partial = p.snapshot();
  assert.equal(partial.samples[0].pageCallback, 'collected'); assert.equal(partial.samples[0].queryWrapper, 'collected');
  assert.equal(partial.samples[0].queryOwner, 'alive'); assert.equal(partial.samples[0].queryInCache, true);
  assert.equal(partial.samples[0].currentOptionMatches, null); assert.equal(reads(), 2);
  refs.collect(query); const gone = p.snapshot();
  assert.equal(gone.samples[0].queryOwner, 'collected'); assert.equal(gone.samples[0].queryInCache, null);
  assert.equal(reads(), 2); assert.equal(JSON.stringify(before), beforeText);
  assert(Object.isFrozen(before)); assert(Object.isFrozen(before.samples)); assert(Object.isFrozen(before.samples[0]));
});

test('pause freezes association selection while actual Query option and cache occupancy remain observable; release clears witnesses', () => {
  const { p, ids, refs } = fixture(), a = {}, b = {}; ids.set(a, 1); ids.set(b, 2);
  p.start(); assert.equal(p.start(), false); p.beginRender(); const { page, query } = register(p); p.aggregate(a);
  const refCount = refs.cells.length; p.stopTracking();
  assert.equal(p.observesPageCallback(page), false); p.beginRender(); register(p); p.aggregate(b);
  assert.equal(refs.cells.length, refCount); query.queryFn = () => {}; query.inCache = false;
  assert.equal(p.finishRender(a), a);
  const paused = p.snapshot(); assert.equal(paused.tracking, false); assert.equal(paused.active, true);
  assert.equal(paused.samples.length, 1); assert.equal(paused.samples[0].renderCompleted, true);
  assert.equal(paused.samples[0].queryInCache, false); assert.equal(paused.samples[0].currentOptionMatches, false);
  p.release(); const ended = p.snapshot(), text = JSON.stringify(ended);
  assert.equal(ended.released, true); assert.equal(ended.samples.length, 0);
  p.aggregate(a); p.beginRender(); register(p); p.finishRender(query); p.queryOwner(page, query);
  assert.equal(JSON.stringify(p.snapshot()), text); assert(p.start()); p.beginRender(); register(p); p.aggregate(b); p.finishRender(null);
  const restarted = p.snapshot(); assert.equal(restarted.samples.length, 1); assert.equal(restarted.samples[0].renderId, 1);
  assert.equal(restarted.diagnostics.aggregateCalls, 1);
});

test('read-port failures or invalid booleans cannot escape or become false evidence; snapshots contain no product objects or functions', () => {
  let mode = 'throws';
  const { p, ids } = fixture({ readQueryOwner: () => {
    if (mode === 'throws') throw Error('synthetic unavailable Query owner');
    if (mode === 'invalid') return { inCache: 'bad', currentOptionMatches: 1 };
    return { inCache: false, currentOptionMatches: false };
  } }), aggregate = {};
  ids.set(aggregate, 1); p.start(); p.beginRender(); const { page, wrapper, query } = register(p); p.aggregate(aggregate); p.finishRender(null);
  let productReads = 0;
  for (const value of [page, wrapper, query, aggregate]) Object.defineProperty(value, 'privatePayload', {
    get() { productReads++; throw Error('product graph inspection forbidden'); }, enumerable: true });
  const failed = p.snapshot(); assert.equal(failed.samples[0].queryInCache, null);
  assert.equal(failed.samples[0].currentOptionMatches, null); assert.equal(failed.diagnostics.ownerReadErrors, 1);
  mode = 'invalid'; const invalid = p.snapshot(); assert.equal(invalid.samples[0].queryInCache, null);
  assert.equal(invalid.samples[0].currentOptionMatches, null); assert.equal(invalid.diagnostics.invalidOwnerStates, 2);
  mode = 'valid'; const valid = p.snapshot(); assert.equal(valid.samples[0].queryInCache, false);
  assert.equal(valid.samples[0].currentOptionMatches, false);
  const forbidden = new Set([page, wrapper, query, aggregate]);
  function scalarTree(value) {
    assert.equal(typeof value === 'function', false); assert.equal(forbidden.has(value), false);
    if (value && typeof value === 'object') for (const child of Object.values(value)) scalarTree(child);
    else assert(['string', 'number', 'boolean'].includes(typeof value) || value === null);
  }
  scalarTree(valid); assert.equal(JSON.parse(JSON.stringify(valid)).samples.length, 1); assert.equal(productReads, 0);
});

test('actual installed QueryCore owner reports disabled storage, replacement, key change and exact object retirement', () => {
  const miniappRequire = createRequire(new URL('../../../../apps/wechat-miniapp/package.json', import.meta.url));
  const { QueryClient, QueryObserver } = miniappRequire('@tanstack/query-core');
  const client = new QueryClient(), cache = client.getQueryCache(), ids = new WeakMap();
  const own = (object, name) => Object.getOwnPropertyDescriptor(object, name)?.value;
  const p = create({ aggregateId: value => ids.get(value) ?? null, readQueryOwner: (query, wrapper) => {
    const hash = own(query, 'queryHash'), options = own(query, 'options');
    return { inCache: typeof hash === 'string' ? cache.get(hash) === query : null,
      currentOptionMatches: wrapper === undefined || !options ? null : own(options, 'queryFn') === wrapper };
  } });
  let calls = 0, observer, unsubscribe;
  const pageA = () => { calls++; return Promise.resolve(null); }, wrapperA = () => pageA();
  const pageB = () => { calls++; return Promise.resolve(null); }, wrapperB = () => pageB();
  const wrapperC = () => Promise.resolve(null), keyA = ['r27-fixture', 'exact'], keyB = ['r27-fixture', null];
  const options = (key, queryFn) => ({ queryKey: key, queryFn, enabled: false, gcTime: Infinity });
  try {
    p.start(); p.beginRender(); p.pageCallback(pageA); p.queryWrapper(pageA, wrapperA);
    observer = new QueryObserver(client, options(keyA, wrapperA)); unsubscribe = observer.subscribe(() => {});
    const queryA = observer.getCurrentQuery(), a = {}; ids.set(a, 1); p.queryOwner(pageA, queryA); p.aggregate(a); p.finishRender(null);
    const original = p.snapshot(); assert.equal(original.samples[0].queryInCache, true);
    assert.equal(original.samples[0].currentOptionMatches, true);
    observer.setOptions(options(keyA, wrapperB)); assert.equal(observer.getCurrentQuery(), queryA);
    assert.equal(p.snapshot().samples[0].currentOptionMatches, false);
    p.beginRender(); p.pageCallback(pageB); p.queryWrapper(pageB, wrapperB); p.queryOwner(pageB, queryA);
    const b = {}; ids.set(b, 2); p.aggregate(b); p.finishRender(null); p.stopTracking();
    observer.setOptions(options(keyB, wrapperC)); assert.notEqual(observer.getCurrentQuery(), queryA);
    const changedKey = p.snapshot(); assert.equal(changedKey.samples[0].queryInCache, true);
    assert.equal(changedKey.samples[1].currentOptionMatches, true);
    client.removeQueries({ queryKey: keyA, exact: true });
    const replacementA = cache.build(client, options(keyA, wrapperC)); assert.notEqual(replacementA, queryA);
    const replacedObject = p.snapshot(); assert.equal(replacedObject.samples[0].queryInCache, false);
    assert.equal(replacedObject.samples[1].queryInCache, false);
    assert.equal(replacedObject.samples[1].currentOptionMatches, true, 'removed Query can still hold its last options while externally alive');
    assert.equal(calls, 0, 'the owner observation must not fetch a disabled query');
  } finally {
    unsubscribe?.(); observer?.destroy(); client.clear(); p.release();
  }
  assert.equal(cache.getAll().length, 0); assert.equal(p.snapshot().samples.length, 0);
});
