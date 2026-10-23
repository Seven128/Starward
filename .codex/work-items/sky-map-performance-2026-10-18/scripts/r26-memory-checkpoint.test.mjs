import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { validateR26MemoryCheckpoint } from './r26-memory-checkpoint-protocol.mjs';
import { validateR25MemoryCheckpoint } from './r25-memory-checkpoint-protocol.mjs';
import { createR17PhoneProbeCollector } from './r17-phone-probe-collector.mjs';
import { memoryCheckpointHarness as harness } from './memory-checkpoint-test-support.mjs';
function enterSample(h) {
  const aggregate = {}, entry = { transform: {} }, tile = {};
  h.api.r25MemoryTile(tile, entry); h.api.r25MemoryAggregate(aggregate, [{ cached: entry }]);
  h.api.r26AggregateUse('request', aggregate); h.api.r26AggregateUse('paint', aggregate); h.api.r26AggregateUse('accepted', aggregate);
  h.api.r26AggregateSlot('accepted-command', aggregate);
  const hook = { memoizedState: { stellarSupplement: aggregate }, baseState: null, queue: null, baseQueue: null, next: null };
  const parent = { tag: 0, memoizedState: hook, return: null, alternate: null };
  const node = { props: { id: 'spot-night-sky-scene' } };
  node.__reactFiber$fixture = { tag: 5, stateNode: node, return: parent, alternate: null };
  h.nodes.set('spot-night-sky-scene', node);
  return { aggregate, hook };
}
test('actual transport extension binds use and strong field paths, scans twice, preserves early bytes and observes post-Pause clears', async () => {
  const h = await harness(); assert.equal(h.api.r25MemoryStarted(), true); await h.advance(0);
  const baseline = h.receipt(); assert.equal(baseline.ownerLinks.framework, null);
  const { aggregate, hook } = enterSample(h);
  await h.advance(5000); const earlyText = h.requests.at(-1).data, early = h.receipt();
  assert.equal(early.ownerLinks.framework.observation.status, 'matched'); assert.equal(h.lookups(), 2);
  assert.deepEqual(early.ownerLinks.uses.samples[0], { id: 1, request: 1, paint: 1, accepted: 1 });
  assert.equal(early.ownerLinks.framework.checkpointClockElapsedMs, 5000);
  await h.advance(15000); assert.equal(h.lookups(), 2);
  await h.advance(20000); h.api.r25MemoryPaused(); await h.advance(20000);
  h.api.r26AggregateUse('accepted', aggregate); h.api.r26AggregateSlot('accepted-command', null);
  hook.memoizedState = null;
  await h.advance(30000); const drain = h.receipt();
  assert.equal(drain.ownerLinks.framework.observation.status, 'no-match-in-covered-fields'); assert.equal(h.lookups(), 4);
  assert.equal(drain.ownerLinks.uses.samples[0].accepted, 1);
  assert.equal(drain.ownerLinks.uses.slots[2].state, 'empty');
  h.api.r25MemoryRetired(); await h.advance(40000); assert.equal(h.lookups(), 4, 'retirement drain cannot add a third scan');
  await h.advance(90000); const end = h.receipt(); assert.equal(end.observation.checkpoints[0].phase, 'end');
  assert.equal(end.ownerLinks.framework.checkpointClockElapsedMs, 30000);
  assert.equal(h.requests[1].data, earlyText, 'later scalar observations cannot mutate acknowledged bytes');
  assert(h.requests.every(request => validateR26MemoryCheckpoint(JSON.parse(request.data))));
});
test('strict graph protocol rejects arbitrary values, invalid identities and claimed committed-tree certainty within a bounded payload', async () => {
  const h = await harness(); h.api.r25MemoryStarted(); enterSample(h); await h.advance(5000); const packet = h.receipt();
  for (const mutate of [
    value => { value.ownerLinks.framework.observation.matches[0].valuePath = ['privatePayload']; },
    value => { value.ownerLinks.framework.observation.matches[0].aggregateId = 2; },
    value => { value.ownerLinks.framework.observation.currentCommit = 'current'; },
    value => { value.ownerLinks.framework.observation.raw = 'private'; },
    value => { value.ownerLinks.uses.slots[2].aggregateId = null; },
  ]) { const bad = structuredClone(packet); mutate(bad); assert.equal(validateR26MemoryCheckpoint(bad), false); }
  const full = structuredClone(packet), graph = full.ownerLinks.framework.observation;
  graph.matches = Array.from({ length: 24 }, () => ({ aggregateId: 1, entrance: 'sky-selection', ancestorDepth: 31,
    branch: 'host-linked', hookIndex: 1023, field: 'queue.interleaved.eagerState', updateIndex: 31,
    valuePath: Array(6).fill('stellarSupplement') }));
  assert.equal(validateR26MemoryCheckpoint(full), true);
  assert(Buffer.byteLength(JSON.stringify(full)) < 32768);
});
test('extended collector coexists with immutable historical checkpoint schemas', async () => {
  const h = await harness(); h.api.r25MemoryStarted(); await h.advance(0); const packet = h.receipt();
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'starward-r26-checkpoint-'));
  try {
    const collector = createR17PhoneProbeCollector(directory);
    assert.equal(await collector.store(packet), 200); assert.equal(await collector.store(packet), 200);
    const { ownerLinks, ...historical } = structuredClone(packet); historical.schemaVersion = 'starward-r25-memory-checkpoint-v1';
    historical.runId = historical.observation.runId = 'r25-2-legacy';
    assert.equal(validateR25MemoryCheckpoint(historical), true); assert.equal(await collector.store(historical), 200);
    const changed = structuredClone(packet); changed.ownerLinks.uses.diagnostics.invalidCalls++;
    assert.equal(await collector.store(changed), 409);
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(directory, `baseline-${packet.runId}-checkpoint-1.json`), 'utf8')), packet);
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
});
