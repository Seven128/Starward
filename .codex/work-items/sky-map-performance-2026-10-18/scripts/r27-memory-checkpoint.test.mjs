import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { addR27QueryCallbackSources, stripR27QueryCallbackSource, addR27QueryCallbackAdapter } from './r27-query-callback-instrumentation.mjs';
import { addR26MemoryOwnerLinks } from './r26-memory-owner-instrumentation.mjs';
import { validateR27MemoryCheckpoint } from './r27-memory-checkpoint-protocol.mjs';
import { validateR26MemoryCheckpoint } from './r26-memory-checkpoint-protocol.mjs';
import { memoryCheckpointHarness } from './memory-checkpoint-test-support.mjs';
import { createR17PhoneProbeCollector } from './r17-phone-probe-collector.mjs';
import { checkpointWatchMode, checkpointArrivalRecord } from './r25-watch-checkpoint-arrivals.mjs';
const require = createRequire(new URL('../../../../apps/wechat-miniapp/package.json', import.meta.url));
const { QueryClient } = require('@tanstack/react-query'), ts = require('typescript');
const root = new URL('../../../../', import.meta.url);
const portsSource = await fs.readFile(new URL('r27-query-callback-ports.ts', import.meta.url), 'utf8');
function sharedPorts() {
  const compiled = ts.transpileModule(portsSource, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }, reportDiagnostics: true });
  assert.equal(compiled.diagnostics.filter(value => value.category === ts.DiagnosticCategory.Error).length, 0);
  const module = { exports: {} };
  vm.runInNewContext('(function(exports, require, module){' + compiled.outputText + '\n})', {})(module.exports,
    name => { throw Error('shared_ports_must_have_no_runtime_import:' + name); }, module);
  return module.exports;
}
test('shared ports return original wrappers before and after one fixed registration without product invocation', () => {
  const ports = sharedPorts(), fn = () => { throw Error('product_callback_must_not_be_invoked'); }, key = [], client = {};
  assert.equal(ports.r27QueryWrapper(fn, fn), fn); ports.r27QueryOwner(fn, client, key);
  let wrappers = 0, owners = 0;
  const wrapperPort = (page, wrapper) => { wrappers++; assert.equal(page, fn); assert.equal(wrapper, fn); return () => {}; };
  const ownerPort = (page, provider, queryKey) => { owners++; assert.equal(page, fn); assert.equal(provider, client); assert.equal(queryKey, key); };
  ports.registerR27QueryCallbackPorts(wrapperPort, ownerPort);
  assert.equal(ports.r27QueryWrapper(fn, fn), fn); ports.r27QueryOwner(fn, client, key);
  assert.equal(wrappers, 1); assert.equal(owners, 1);
  ports.registerR27QueryCallbackPorts(wrapperPort, ownerPort);
  assert.throws(() => ports.registerR27QueryCallbackPorts(() => fn, ownerPort), /already_registered/);
  assert.throws(() => ports.registerR27QueryCallbackPorts(wrapperPort, () => {}), /already_registered/);
  assert.equal(ports.r27QueryWrapper(fn, fn), fn); assert.equal(wrappers, 2);
  const ast = ts.createSourceFile('ports.ts', portsSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  assert.equal(ast.statements.filter(ts.isImportDeclaration).length, 0);
  assert.doesNotMatch(portsSource, /\b(?:setTimeout|setInterval|WeakRef|Map|QueryClient|Taro)\b/);
});
test('actual current page and hook restore byte-for-byte, preserving all three page returns and query bodies', async () => {
  const page = await fs.readFile(new URL('apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx', root), 'utf8');
  const resourceQuery = await fs.readFile(new URL('apps/wechat-miniapp/src/hooks/use-resource-query.ts', root), 'utf8');
  for (const sharedQueryPorts of [false, true]) {
  const changed = addR27QueryCallbackSources({ page, resourceQuery }, { sharedQueryPorts });
  for (const [kind, original] of Object.entries({ page, resourceQuery })) {
    assert.equal(stripR27QueryCallbackSource(changed[kind], kind), original);
    const parsed = ts.createSourceFile('source.tsx', changed[kind], ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    assert.equal(parsed.parseDiagnostics.length, 0);
  }
  assert.throws(() => addR27QueryCallbackSources(changed), /uninstrumented_source_required/);
  assert.throws(() => addR27QueryCallbackSources({ page: page.replace('const fineTarget =', 'const renamed ='), resourceQuery }), /declaration_changed/);
  if (sharedQueryPorts) {
    assert.match(changed.resourceQuery, /^import .* from "\.\/r27-query-callback-ports";/);
    assert.doesNotMatch(changed.resourceQuery, /features\/sky|r25-memory-lifetime-adapter/);
  }
  }
});
async function harness(generation = 31, sharedQueryPorts = false) {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
  const ports = sharedQueryPorts ? sharedPorts() : null;
  const h = await memoryCheckpointHarness({ generation,
    extraNames: ['r27-query-callback-observer', 'r27-query-callback-links'],
    transformAdapter: source => addR27QueryCallbackAdapter(addR26MemoryOwnerLinks(source), { sharedQueryPorts }), validate: validateR27MemoryCheckpoint,
    imports: { '../../services/query-client': { miniappQueryClient: client },
      ...(sharedQueryPorts ? { '../../hooks/r27-query-callback-ports': ports } : {}) },
  });
  return { ...h, client, queryPorts: ports ?? h.api };
}
function enter(h, id) {
  h.api.r27PageRenderBegin();
  const original = () => Promise.resolve(id);
  const fn = h.api.r27PageQueryCallback(original);
  assert.equal(fn, original);
  const originalWrapper = () => fn();
  const wrapper = h.queryPorts.r27QueryWrapper(fn, originalWrapper);
  assert.equal(wrapper, originalWrapper);
  const key = ['r27-fixed-site-test'];
  const query = h.client.getQueryCache().build(h.client,
    h.client.defaultQueryOptions({ queryKey: key, queryFn: wrapper, gcTime: Infinity }));
  query.setOptions({ ...query.options, queryFn: wrapper });
  h.queryPorts.r27QueryOwner(fn, h.client, key);
  const aggregate = {}, entry = { transform: {} };
  h.api.r25MemoryTile({}, entry); h.api.r25MemoryAggregate(aggregate, [{ cached: entry }]);
  h.api.r26AggregateUse('accepted', aggregate);
  const result = { original: true }; assert.equal(h.api.r27PageRenderEnd(result), result);
  return { query, aggregate, fn, wrapper };
}

test('arrival watcher admits current-UI R27 checkpoints before end and rejects incompatible or mislabeled evidence', async () => {
  const mode = checkpointWatchMode(['--review-r27', '--current-ui']);
  assert.equal(mode.trial, 'r17-normal-a1-review-r27-usb-current-ui');
  assert.equal(checkpointWatchMode(['--review-r27']).trial, 'r17-normal-a1-review-r27-usb');
  assert.equal(checkpointWatchMode(['--review-r26']).revision, 26);
  assert.equal(checkpointWatchMode([]).revision, 25);
  const skyMode = checkpointWatchMode(['--review-r27', '--current-ui', '--r27-sky-package']);
  assert.equal(skyMode.trial, 'r17-normal-a1-review-r27-usb-sky-package');
  for (const args of [['--current-ui'], ['--review-r26', '--current-ui'], ['--review-r26', '--review-r27'],
    ['--review-r27', '--review-r27'], ['--review-r28'], ['--output', 'elsewhere'], ['--r27-sky-package'],
    ['--review-r27', '--r27-sky-package'], ['--review-r26', '--current-ui', '--r27-sky-package']])
    assert.throws(() => checkpointWatchMode(args), /finite_review_required/);
  const h = await harness(32);
  try {
    h.api.r25MemoryStarted(); await h.advance(0);
    const baseline = h.receipt();
    const manifest = { buildGeneration: 32, buildSourceSha256: baseline.observation.binding.sourceHash };
    const record = packet => checkpointArrivalRecord(mode, manifest,
      `baseline-${packet.runId}-checkpoint-${packet.sequence}.json`, Buffer.from(JSON.stringify(packet)), 1200);
    assert.equal(record(baseline).callbackPhase, null);
    assert.equal(record(baseline).callbackSamples, 0);
    assert.throws(() => checkpointArrivalRecord(skyMode, manifest, 'unused', Buffer.from('{}'), 0), /unexpected_checkpoint_binding/);
    const skyBaseline = structuredClone(baseline); skyBaseline.observation.binding.generation = 33;
    assert.equal(checkpointArrivalRecord(skyMode, { ...manifest, buildGeneration: 33 },
      `baseline-${skyBaseline.runId}-checkpoint-${skyBaseline.sequence}.json`, Buffer.from(JSON.stringify(skyBaseline)), 0).callbackSamples, 0);
    enter(h, 1); await h.advance(5000);
    const packet = h.receipt(), row = record(packet);
    assert.equal(row.phase, 'active-5'); assert.equal(row.callbackPhase, 'active-5');
    assert.equal(row.callbackCapability, 'supported'); assert.equal(row.callbackSamples, 1);
    assert.equal(row.ownerAggregates, 1); assert.equal(row.currentEndAlreadyPresent, false);
    assert.equal(row.hostWatchElapsedMs, 1200);
    const raw = Buffer.from(JSON.stringify(packet));
    assert.equal(row.bytes, raw.length); assert.match(row.sha256, /^[a-f0-9]{64}$/);
    assert.equal(checkpointArrivalRecord(mode, { ...manifest, buildGeneration: 31 }, row.name, raw, 1200), null);
    for (const partial of [Buffer.from('{'), Buffer.from('null')])
      assert.equal(checkpointArrivalRecord(mode, manifest, row.name, partial, 1200), null);
    assert.throws(() => checkpointArrivalRecord(mode, { ...manifest, buildSourceSha256: 'b'.repeat(64) }, row.name, raw, 1200), /unexpected_checkpoint_binding/);
    assert.throws(() => checkpointArrivalRecord(mode, manifest, row.name.replace(/checkpoint-\d+/, 'checkpoint-99'), raw, 1200), /unexpected_checkpoint_binding/);
    const incompatible = structuredClone(packet);
    delete incompatible.queryCallbacks; incompatible.schemaVersion = 'starward-r26-memory-checkpoint-v1';
    assert.throws(() => record(incompatible), /unexpected_checkpoint_binding/);
    const { queryCallbacks, ...historical } = packet;
    historical.schemaVersion = 'starward-r26-memory-checkpoint-v1';
    assert.equal(checkpointArrivalRecord(checkpointWatchMode(['--review-r26']), manifest, row.name,
      Buffer.from(JSON.stringify(historical)), 1200).frameworkPhase, row.frameworkPhase);
  } finally { h.client.clear(); }
});
for (const sharedQueryPorts of [false, true]) {
test(`fixed-site owner uses the provider hash and direct get without enumerating the cache (${sharedQueryPorts ? 'shared ports' : 'legacy'})`, async () => {
  const h = await harness(sharedQueryPorts ? 33 : 31, sharedQueryPorts), cache = h.client.getQueryCache();
  const find = cache.find, getAll = cache.getAll;
  try {
    h.client.setQueryDefaults(['r27-fixed-site-test'], { queryKeyHashFn: () => 'r27-provider-owned-hash' });
    for (let id = 0; id < 3; id++) cache.build(h.client, { queryKey: ['unrelated', id], gcTime: Infinity });
    cache.find = cache.getAll = () => { throw Error('query_cache_enumeration_is_forbidden'); };
    h.api.r25MemoryStarted();
    const originalGet = cache.get; let getCalls = 0;
    cache.get = function(...args) { getCalls++; return originalGet.apply(this, args); };
    const unrelated = () => {}, wrapper = () => {};
    assert.equal(h.queryPorts.r27QueryWrapper(unrelated, wrapper), wrapper);
    h.queryPorts.r27QueryOwner(unrelated, h.client, ['unrelated']);
    assert.equal(getCalls, 0, 'unregistered page identity does not inspect the cache');
    h.api.r27PageRenderBegin();
    const registered = h.api.r27PageQueryCallback(() => {}); let foreignLookups = 0;
    h.queryPorts.r27QueryOwner(registered, { defaultQueryOptions() { foreignLookups++; throw Error('foreign_provider_must_not_be_read'); } }, ['foreign-provider']);
    h.api.r27PageRenderEnd(null);
    assert.equal(foreignLookups, 0); assert.equal(getCalls, 0, 'a matching callback still requires the exact global provider');
    cache.get = originalGet;
    const selected = enter(h, 1);
    assert.equal(selected.query.queryHash, 'r27-provider-owned-hash');
    await h.advance(5000);
    const [sample] = h.receipt().queryCallbacks.observation.value.samples;
    assert.equal(sample.queryOwner, 'alive');
    assert.equal(sample.queryInCache, true);
    assert.equal(sample.currentOptionMatches, true);
    cache.remove(selected.query);
    const replacement = cache.build(h.client,
      h.client.defaultQueryOptions({ queryKey: ['r27-fixed-site-test'], gcTime: Infinity }));
    assert.equal(replacement.queryHash, selected.query.queryHash);
    assert.notEqual(replacement, selected.query);
    await h.advance(20000); h.api.r25MemoryPaused(); await h.advance(20000); await h.advance(30000);
    assert.equal(h.receipt().queryCallbacks.observation.value.samples[0].queryInCache, false);
  } finally {
    cache.find = find; cache.getAll = getAll; h.client.clear();
  }
});

test(`same adapter exports original IDs and actual Query replacement/exit without extra scans or workload replay (${sharedQueryPorts ? 'shared ports' : 'legacy'})`, async () => {
  const h = await harness(sharedQueryPorts ? 33 : 31, sharedQueryPorts);
  try {
    assert.equal(h.api.r25MemoryStarted(), true); await h.advance(0);
    assert.equal(h.receipt().queryCallbacks.observation, null);
    let selected;
    for (let id = 1; id <= 8; id++) selected = enter(h, id);
    for (const site of ['stellar-vectors', 'stellar-positions', 'stellar-directions', 'stellar-transmissions', 'gpu-upload-view', 'gpu-upload-backing'])
      for (let sample = 0; sample < 544; sample++) h.api.r25MemoryTrack(site, {}, 64);
    await h.advance(5000);
    const earlyText = h.requests.at(-1).data, early = h.receipt();
    assert.equal(early.owners.aggregates.length, 8);
    assert.equal(early.queryCallbacks.observation.phase, 'active-5');
    const rows = early.queryCallbacks.observation.value.samples;
    assert.equal(rows.length, 8); assert(rows.every((row, i) => row.aggregateId === i + 1 && row.renderId === i + 1 && row.renderCompleted));
    assert(rows.every(row => row.queryInCache === true && row.queryOwner === 'alive'));
    assert.deepEqual(rows.map(row => row.currentOptionMatches), [false, false, false, false, false, false, false, true]);
    assert.equal(h.lookups(), 2);
    await h.advance(15000); assert.equal(h.lookups(), 2);
    await h.advance(20000); h.api.r25MemoryPaused(); await h.advance(20000);
    selected.query.setOptions({ ...selected.query.options, queryFn: () => Promise.resolve('replacement') });
    h.client.removeQueries();
    await h.advance(30000);
    const drain = h.receipt(); assert.equal(h.lookups(), 4);
    assert(drain.queryCallbacks.observation.value.samples.every(row => row.queryInCache === false && row.currentOptionMatches === false));
    assert.equal(drain.queryCallbacks.observation.checkpointClockElapsedMs, 30000);
    h.api.r25MemoryRetired(); await h.advance(40000); assert.equal(h.lookups(), 4);
    await h.advance(90000); const end = h.receipt();
    assert.equal(end.queryCallbacks.observation.checkpointClockElapsedMs, 30000);
    assert.equal(h.requests[1].data, earlyText);
    assert(h.requests.every(request => validateR27MemoryCheckpoint(JSON.parse(request.data))));
    assert(h.requests.every(request => Buffer.byteLength(request.data) <= 32768));
    const withMaximumMatches = structuredClone(early), graph = withMaximumMatches.ownerLinks.framework.observation;
    graph.capability = 'available'; graph.status = 'matched'; graph.coverage.nodeInputs = graph.coverage.uniqueNodes =
      graph.coverage.skyEntrances = graph.coverage.hostFibers = graph.coverage.functionFibers = 1;
    graph.matches = Array.from({ length: 24 }, () => ({ aggregateId: 1, entrance: 'sky-selection', ancestorDepth: 31,
      branch: 'host-linked', hookIndex: 1023, field: 'queue.interleaved.eagerState', updateIndex: 31,
      valuePath: Array(6).fill('stellarSupplement') }));
    assert.equal(validateR27MemoryCheckpoint(withMaximumMatches), true);
    assert(Buffer.byteLength(JSON.stringify(withMaximumMatches)) <= 32768, 'the full prior witness limits and callback addition must fit the same packet cap');
  } finally { h.client.clear(); }
});
}
test('module registration remains through Pause/drain and release, then the next legal run resets association', async () => {
  const h = await harness(33, true);
  try {
    h.api.r25MemoryStarted(); const first = enter(h, 1); await h.advance(5000);
    const originalRun = h.receipt().runId;
    await h.advance(20000); h.api.r25MemoryPaused();
    enter(h, 2); first.query.setOptions({ ...first.query.options, queryFn: () => Promise.resolve('new') });
    await h.advance(30000);
    const drain = h.receipt().queryCallbacks.observation;
    assert.equal(drain.phase, 'drain-10'); assert.equal(drain.checkpointClockElapsedMs, 30000);
    assert.equal(drain.value.samples.length, 1); assert.equal(drain.value.samples[0].currentOptionMatches, false);
    await h.advance(90000); const sealed = h.requests.at(-1).data;
    enter(h, 3); assert.equal(h.requests.at(-1).data, sealed);
    assert.equal(h.api.r25MemoryStarted(), true); enter(h, 1); await h.advance(95000);
    const next = h.receipt(); assert.notEqual(next.runId, originalRun);
    assert.equal(next.queryCallbacks.observation.value.samples.length, 1);
    assert.equal(next.queryCallbacks.observation.value.samples[0].renderId, 1);
    assert.equal(next.queryCallbacks.observation.value.samples[0].currentOptionMatches, true);
    assert.equal(next.queryCallbacks.observation.value.diagnostics.beginRenderCalls, 1);
  } finally { h.client.clear(); }
});
test('strict scalar contract and collector preserve historical packets and reject raw callback data or relabelled identities', async () => {
  const h = await harness();
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'starward-r27-checkpoint-'));
  try {
    h.api.r25MemoryStarted(); enter(h, 1); await h.advance(5000); const packet = h.receipt();
    for (const mutate of [
      value => { value.queryCallbacks.observation.value.samples[0].raw = 'private'; },
      value => { value.queryCallbacks.observation.value.samples[0].aggregateId = 2; },
      value => { value.queryCallbacks.observation.value.samples[0].pageCallback = 'retaining-root'; },
      value => { value.queryCallbacks.observation.value.samples[0].queryOwner = 'collected'; },
      value => { value.queryCallbacks.observation.value.policy.samples = 9; },
      value => { value.queryCallbacks.observation.checkpointClockElapsedMs = 100000; },
    ]) { const bad = structuredClone(packet); mutate(bad); assert.equal(validateR27MemoryCheckpoint(bad), false); }
    const collector = createR17PhoneProbeCollector(directory);
    assert.equal(await collector.store(packet), 200); assert.equal(await collector.store(packet), 200);
    const changed = structuredClone(packet); changed.queryCallbacks.observation.value.diagnostics.invalidCalls++;
    assert.equal(await collector.store(changed), 409);
    const { queryCallbacks, ...historical } = structuredClone(packet);
    historical.schemaVersion = 'starward-r26-memory-checkpoint-v1';
    historical.runId = historical.observation.runId = 'r25-2-legacy';
    assert.equal(validateR26MemoryCheckpoint(historical), true); assert.equal(await collector.store(historical), 200);
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(directory, `baseline-${packet.runId}-checkpoint-${packet.sequence}.json`), 'utf8')), packet);
  } finally {
    h.client.clear();
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
    assert(path.basename(directory).startsWith('starward-r27-checkpoint-'));
    await fs.rm(directory, { recursive: true, force: true });
  }
});
