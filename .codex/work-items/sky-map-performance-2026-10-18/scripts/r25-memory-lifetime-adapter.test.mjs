// Task-only adapter boundary checks. Fake clocks schedule the actual adapter;
// fake WeakRefs test capture/export lifecycle, never target GC capability.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { validateR25MemoryCheckpoint } from './r25-memory-checkpoint-protocol.mjs';
import { R25_MEMORY_SITES } from './r25-memory-lifetime-protocol.mjs';
const require = createRequire(import.meta.url), ts = require('../../../../apps/wechat-miniapp/node_modules/typescript');
const sources = Object.fromEntries(await Promise.all([
  'r25-memory-lifetime-observer.ts', 'r25-memory-lifetime-adapter.ts', 'r25-stellar-owner-observer.ts', 'r17-ruler-entry-runtime.ts',
].map(async name => [name, await fs.readFile(new URL(name, import.meta.url), 'utf8')])));
const compile = source => {
  const result = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
  }, reportDiagnostics: true });
  assert.equal(result.diagnostics.filter(value => value.category === ts.DiagnosticCategory.Error).length, 0);
  return result.outputText;
};
const compiled = Object.fromEntries(Object.entries(sources).map(([name, source]) => [name,
  compile(source.replaceAll('__R25_BUILD_SOURCE_HASH__', 'a'.repeat(64)))]));
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
function harness({ unsupported = false, manual = false } = {}) {
  let elapsed = 0, timerId = 0;
  const timers = new Map(), requests = [], weakEntries = [];
  class Reference {
    constructor(value) { this.value = value; this.dead = false; weakEntries.push(this); }
    deref() { return this.dead ? undefined : this.value; }
  }
  const context = vm.createContext({
    Date: class extends Date { static now() { return 1000000 + elapsed; } },
    WeakRef: unsupported ? undefined : Reference,
    __R25_BUILD_GENERATION__: 29,
    __MINIAPP_API_BASE__: 'http://127.0.0.1:8798',
    setTimeout(callback, delay) {
      assert.equal(typeof callback, 'function');
      assert(Number.isSafeInteger(delay) && delay >= 0 && delay <= 90000);
      const id = ++timerId; timers.set(id, { at: elapsed + delay, callback }); return id;
    },
    clearTimeout(id) { timers.delete(id); },
  });
  const load = (name, imports = {}) => {
    const module = { exports: {} };
    vm.runInContext('(function(exports,require,module){' + compiled[name] + '\n})', context)(
      module.exports, imported => {
        assert(Object.hasOwn(imports, imported), 'no unapproved product boundary: ' + imported);
        return imports[imported];
      }, module);
    return module.exports;
  };
  const observer = load('r25-memory-lifetime-observer.ts'), ownerObserver = load('r25-stellar-owner-observer.ts');
  const bytes = load('r17-ruler-entry-runtime.ts');
  const taro = new Proxy({ request(options) {
    return new Promise((resolve, reject) => {
      requests.push({ options, resolve, reject });
      if (!manual) resolve({ statusCode: 200, data: { stored: true } });
    });
  } }, { get(target, key) {
    assert.equal(key, 'request', 'the memory adapter must not operate product state or navigation');
    return target[key];
  } });
  const api = load('r25-memory-lifetime-adapter.ts', {
    './r25-memory-lifetime-observer': observer,
    './r25-stellar-owner-observer': ownerObserver,
    './r17-ruler-entry-runtime': bytes,
    '@tarojs/taro': { __esModule: true, default: taro },
  });
  return {
    api, requests, timers, weakEntries,
    async advanceTo(target) {
      assert(target >= elapsed);
      for (let count = 0; ; count++) {
        assert(count < 64, 'no unbounded timer loop');
        const next = [...timers.entries()].filter(([, timer]) => timer.at <= target)
          .sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
        if (!next) break;
        const [id, timer] = next; timers.delete(id); elapsed = timer.at;
        timer.callback(); await flush();
      }
      elapsed = target; await flush();
    },
    receipt(index = requests.length - 1) {
      const request = requests[index].options;
      assert.equal(request.method, 'POST');
      assert.equal(request.url, 'http://127.0.0.1:8798/__development_r17_phone_probe_metrics');
      assert.equal(request.header['content-type'], 'application/json');
      assert.equal(request.timeout, 10000);
      assert(Buffer.byteLength(request.data, 'utf8') <= 32768);
      assert.equal(bytes.r17ProbePayloadBytes(request.data), Buffer.byteLength(request.data, 'utf8'));
      const result = JSON.parse(request.data);
      assert.equal(validateR25MemoryCheckpoint(result), true);
      return result;
    },
  };
}

test('baseline and early workload windows export before the 90-second deadline', async () => {
  const h = harness(), { api } = h;
  assert.equal(api.r25MemoryStarted(), true); await flush();
  assert.equal(h.requests.length, 1); assert.equal(h.receipt().sequence, 1);
  assert.equal(h.receipt().observation.checkpoints[0].phase, 'baseline');
  for (const site of R25_MEMORY_SITES) api.r25MemoryTrack(site, [], 12);
  await h.advanceTo(5000);
  assert.equal(h.requests.length, 2);
  const earlyBytes = h.requests[1].options.data, early = h.receipt();
  assert.equal(early.observation.checkpoints[0].phase, 'active-5');
  assert.equal(early.observation.checkpoints[0].sites[0].allocations, 1);
  assert.match(api.r25MemoryStatus(), /分段已保存 2\/2/);
  // This acknowledged packet already exists outside the VM before any later
  // simulated work/exit. Later observations never rewrite its original bytes.
  for (const site of R25_MEMORY_SITES) api.r25MemoryTrack(site, [], 12);
  await h.advanceTo(15000);
  assert.equal(h.requests.length, 3); assert.equal(h.requests[1].options.data, earlyBytes);
  await h.advanceTo(90000);
  assert.equal(h.requests.length, 5); assert.equal(h.timers.size, 0);
  assert.deepEqual(h.requests.map((_, i) => h.receipt(i).sequence), [1, 2, 3, 4, 5]);
  assert.equal(h.receipt().observation.checkpoints[0].phase, 'end');
  assert.equal(h.receipt().observation.checkpoints[0].sites[0].allocations, 2);
  assert.match(api.r25MemoryStatus(), /寿命记录已保存 5\/5/);
});

for (const [method, event, phase, hasDrain] of [
  ['r25MemoryPaused', 'pause', 'paused', true],
  ['r25MemoryRetired', 'retire', 'retired', true],
  ['r25MemoryHidden', 'hide', 'hidden', false],
  ['r25MemoryScopeEnded', 'scope', 'scope-ended', false],
]) test(`${event} exports immediately, stops new tracking, and retains only weak drain witnesses`, async () => {
  const h = harness(), { api } = h, value = [];
  assert.equal(api.r25MemoryStarted(), true); await flush();
  api.r25MemoryTrack('stellar-vectors', value, 8404);
  const tile = {}, entry = { transform: {} }, aggregate = {};
  api.r25MemoryTile(tile, entry); api.r25MemoryAggregate(aggregate, [{ cached: entry }]);
  await h.advanceTo(1000); api[method](); api[method](); await flush();
  assert.equal(h.requests.length, 2, 'one checkpoint for the real first lifecycle event');
  const action = h.receipt(); assert.equal(action.observation.checkpoints[0].phase, phase);
  assert.equal(action.observation.checkpoints[0].sites[0].first.alive, 1);
  assert.equal(action.owners.tracking, false); assert.equal(action.owners.tiles.length, 1);
  assert.equal(api.r25MemoryStarted(), false, 'drain is still the original run');
  api.r25MemoryTrack('stellar-vectors', [], 42); api.r25MemoryTile({}, { transform: {} });
  for (const weak of h.weakEntries) if (weak.value === value || weak.value === entry || weak.value === aggregate) weak.dead = true;
  await h.advanceTo(90000);
  const packets = h.requests.map((_, i) => h.receipt(i)), final = packets.at(-1);
  assert.equal(h.timers.size, 0);
  assert.equal(packets.some(p => p.observation.checkpoints[0].phase.startsWith('active-')), false,
    'scheduled active labels must not be emitted after actual pause/hide/retire');
  assert.deepEqual(final.observation.events, [{ event: 'play', relativeMs: 0 }, { event, relativeMs: 1000 }]);
  assert.equal(final.observation.checkpoints[0].sites[0].allocations, 1);
  assert.equal(final.observation.checkpoints[0].sites[0].first.collected, 1);
  assert.equal(final.owners.tiles[0].writes, 1); assert.equal(final.owners.aggregates[0].alive, 'collected');
  const drain = packets.find(p => p.observation.checkpoints[0].phase === 'drain-10');
  assert.equal(Boolean(drain), hasDrain);
  if (drain) assert.equal(drain.observation.checkpoints[0].relativeMs, 11000);
});

test('single-flight delivery has bounded exact retries; an exhausted packet cannot block later windows', async () => {
  const h = harness({ manual: true }), { api } = h;
  api.r25MemoryStarted(); const baseline = h.requests[0].options.data;
  await h.advanceTo(5000); assert.equal(h.requests.length, 1, 'no overlapping POST');
  assert.equal(api.r25MemoryStarted(), false);
  h.requests[0].reject(Error('first failed attempt')); await flush();
  assert.equal(h.requests.length, 2); assert.equal(h.requests[1].options.data, baseline);
  h.requests[1].resolve({ statusCode: 200, data: { stored: false } }); await flush();
  assert.equal(h.requests.length, 3); assert.equal(h.receipt().sequence, 2, 'later window proceeds after two failed attempts');
  h.requests[2].resolve({ statusCode: 200, data: { stored: true } }); await flush();
  assert.match(api.r25MemoryStatus(), /导出失败/);
  await h.advanceTo(15000); assert.equal(h.requests.length, 4); assert.equal(h.receipt().sequence, 3);
  h.requests[3].resolve({ statusCode: 200, data: { stored: true } }); await flush();
  const manualExport = api.r25MemoryExport();
  assert.equal(h.requests.length, 5); assert.equal(h.receipt().observation.checkpoints[0].phase, 'end');
  // A repeated press while delivery is in flight must not enqueue a second manual retry.
  const pendingAgain = api.r25MemoryExport(); assert.equal(h.requests.length, 5);
  h.requests[4].resolve({ statusCode: 200, data: { stored: true } }); await flush();
  assert.equal(h.requests.length, 6); assert.equal(h.requests[5].options.data, baseline);
  h.requests[5].resolve({ statusCode: 200, data: { stored: true } }); await manualExport; await pendingAgain;
  assert.equal(h.timers.size, 0); assert.equal(api.r25MemoryStarted(), true);
  assert.notEqual(h.receipt().runId, JSON.parse(baseline).runId);
  assert.equal(h.receipt().sequence, 1); assert.equal(h.requests[0].options.data, baseline);
});

test('checkpoint cap reserves the final receipt and reports omitted lifecycle/drain points', async () => {
  const h = harness(), { api } = h;
  api.r25MemoryStarted(); await h.advanceTo(30000);
  await h.advanceTo(31000); api.r25MemoryPaused(); await flush();
  await h.advanceTo(32000); api.r25MemoryRetired(); await flush();
  await h.advanceTo(33000); api.r25MemoryHidden(); await flush();
  await h.advanceTo(34000); api.r25MemoryScopeEnded(); await flush();
  await h.advanceTo(90000);
  assert.equal(h.requests.length, 10); assert.equal(h.receipt().sequence, 10);
  assert.equal(h.receipt().observation.checkpoints[0].phase, 'end');
  assert.equal(h.receipt().observation.diagnostics.checkpointOmitted, 1);
  assert.equal(h.timers.size, 0);
});

test('unsupported WeakRef exports explicit missing capability without invented liveness or timers', async () => {
  const h = harness({ unsupported: true }), { api } = h;
  assert.equal(api.r25MemoryStarted(), false); await flush();
  assert.equal(h.requests.length, 1); assert.equal(h.timers.size, 0);
  const packet = h.receipt();
  assert.equal(packet.observation.capability, 'unsupported'); assert.equal(packet.owners.capability, 'unsupported');
  assert(packet.observation.checkpoints[0].sites.every(site => site.allocations === 0 && site.first === null && site.recent === null));
  assert.equal(packet.owners.tiles.length, 0); assert.equal(packet.owners.aggregates.length, 0);
  assert.match(api.r25MemoryStatus(), /WeakRef:不支持/);
  await h.advanceTo(90000); assert.equal(h.requests.length, 1);
});
