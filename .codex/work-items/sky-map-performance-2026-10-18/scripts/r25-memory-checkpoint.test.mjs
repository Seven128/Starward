import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { validateR25MemoryCheckpoint, validateR25StellarOwners } from './r25-memory-checkpoint-protocol.mjs';
import { createR17PhoneProbeCollector } from './r17-phone-probe-collector.mjs';
const require = createRequire(import.meta.url), ts = require('../../../../apps/wechat-miniapp/node_modules/typescript');
async function load(name) {
  const source = await fs.readFile(new URL(name, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } });
  const module = { exports: {} };
  vm.runInNewContext('(function(exports,module){' + compiled.outputText + '\n})', { WeakRef })(module.exports, module);
  return module.exports;
}
const { createR25MemoryLifetimeObserver } = await load('r25-memory-lifetime-observer.ts');
const { createR25StellarOwnerObserver } = await load('r25-stellar-owner-observer.ts');
function sample({ full = false, unsupported = false } = {}) {
  class Reference { constructor(value) { this.value = value; } deref() { return this.value; } }
  let now = 1000000;
  const observation = createR25MemoryLifetimeObserver({ WeakRef: unsupported ? null : Reference, now: () => now });
  observation.configure({ generation: 29, sourceHash: 'a'.repeat(64) }); observation.start();
  const owners = createR25StellarOwnerObserver({ WeakRef: unsupported ? null : Reference }); owners.start();
  if (full) {
    const entries = [];
    for (let i = 0; i < 8; i++) { const entry = { transform: {} }; entries.push(entry); owners.observeTile({}, entry); }
    for (let i = 0; i < 8; i++) owners.observeAggregate({}, entries.map(cached => ({ cached })));
    for (const site of ['stellar-vectors', 'stellar-positions', 'stellar-directions', 'stellar-transmissions', 'gpu-upload-view', 'gpu-upload-backing'])
      for (let i = 0; i < 600; i++) observation.track(site, {}, 1e12);
    now += 5000; observation.checkpoint('active-5');
  }
  return JSON.parse(JSON.stringify({ schemaVersion: 'starward-r25-memory-checkpoint-v1', variant: 'baseline',
    runId: observation.snapshot().runId, sequence: full ? 2 : 1, observation: observation.snapshot(), owners: owners.snapshot() }));
}
test('strict checkpoint schema binds one immutable window to its run and bounded owner identities', () => {
  const packet = sample({ full: true }); assert.equal(validateR25MemoryCheckpoint(packet), true);
  assert.equal(packet.owners.tiles.length, 8); assert.equal(packet.owners.aggregates.length, 8);
  assert.deepEqual(packet.owners.aggregates[0].firstEntryTileIds, [1, 2, 3, 4, 5, 6, 7, 8]);
  for (const alter of [
    v => { v.runId = 'r25-2-other'; }, v => { v.sequence = 11; }, v => { v.sequence = 1; },
    v => { v.variant = 'unapproved'; }, v => { v.observation.checkpoints.push(v.observation.checkpoints[0]); },
    v => { v.owners.tiles[0].firstEntry = 'absent'; }, v => { v.owners.tiles[0].firstIsLatestObserved = null; },
    v => { v.owners.aggregates[0].firstEntryTileIds = [1, 1]; }, v => { v.owners.aggregates[0].firstEntryTileIds = [9]; },
    v => { v.owners.tiles.push(v.owners.tiles[0]); }, v => { v.owners.unapproved = 'x'; },
    v => { v.owners.released = true; }, v => { v.owners.diagnostics.referenceErrors = -1; },
    v => { v.observation.clock.elapsedMs = 1; }, v => { v.extra = 'x'.repeat(32768); },
  ]) { const invalid = structuredClone(packet); alter(invalid); assert.equal(validateR25MemoryCheckpoint(invalid), false); }
  const baseline = sample(); assert.equal(validateR25MemoryCheckpoint(baseline), true);
  baseline.sequence = 2; assert.equal(validateR25MemoryCheckpoint(baseline), false);
  const absent = sample({ unsupported: true }); assert.equal(validateR25MemoryCheckpoint(absent), true);
  absent.owners.tiles = packet.owners.tiles; assert.equal(validateR25MemoryCheckpoint(absent), false);
});
test('full owner relationships plus conservative numeric widths remain within the 32KiB budget', () => {
  const packet = sample({ full: true });
  // Serialization bound only: choose the longest allowed decimal form even
  // when a combination would not satisfy relational count constraints.
  const extend = value => { for (const [key, child] of Object.entries(value)) {
    if (typeof child === 'number') value[key] = ['siteIndex', 'first', 'recent', 'strideAfterFirst', 'checkpoints', 'events', 'tiles', 'aggregates'].includes(key) ? child
      : ['relativeMs', 'elapsedMs', 'ageMinMs', 'ageMaxMs'].includes(key) ? 120000
      : ['witnesses', 'alive', 'collected', 'unknown', 'ageUnknown'].includes(key) ? 32 : 1e12;
    else if (child === null && ['ageMinMs', 'ageMaxMs'].includes(key)) value[key] = 120000;
    else if (typeof child === 'boolean') value[key] = false;
    else if (child && typeof child === 'object') extend(child);
    else if (key === 'phase') value[key] = 'scope-ended';
    else if (['key', 'firstEntry', 'latestObservedEntry', 'firstTransform', 'latestObservedTransform', 'alive'].includes(key)) value[key] = 'collected';
  } };
  extend(packet); packet.runId = packet.observation.runId = 'r25-' + '9'.repeat(12) + '-' + 'z'.repeat(10);
  assert(Buffer.byteLength(JSON.stringify(packet)) <= 32768);
});
test('collector preserves separately acknowledged windows and exact retry/conflict/capacity semantics', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'starward-r25-checkpoints-'));
  try {
    const directory = path.join(temp, 'receipts'), collector = createR17PhoneProbeCollector(directory), baseline = sample();
    assert.equal(await collector.store({ ...baseline, runId: '../outside' }), 400);
    await assert.rejects(fs.stat(directory), { code: 'ENOENT' });
    assert.equal(await collector.store(baseline), 200);
    const filename = path.join(directory, `baseline-${baseline.runId}-checkpoint-1.json`);
    const durable = await fs.readFile(filename, 'utf8');
    assert.deepEqual(JSON.parse(durable), baseline);
    assert.equal(await collector.store(baseline), 200);
    const changed = structuredClone(baseline); changed.observation.clock.reads++;
    assert.equal(await collector.store(changed), 409); assert.equal(await fs.readFile(filename, 'utf8'), durable);
    const later = sample({ full: true }); later.runId = later.observation.runId = baseline.runId;
    assert.equal(await collector.store(later), 200);
    assert.equal(await fs.readFile(filename, 'utf8'), durable, 'later collection or loss cannot rewrite an acknowledged earlier window');
    for (let i = 0; i < 30; i++) await fs.writeFile(path.join(directory, 'reserved-' + i + '.json'), '{}', { flag: 'wx' });
    const next = structuredClone(later); next.sequence = 3;
    assert.equal(await collector.store(next), 429); assert.equal(await collector.store(baseline), 200);
  } finally { await fs.rm(temp, { recursive: true, force: true }); }
});
