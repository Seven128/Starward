import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createMemoryWatchAnchor, MEMORY_EVIDENCE_ROOT } from './r17-memory-watch-anchor.mjs';

const firstId = '11111111-1111-4111-8111-111111111111', secondId = '22222222-2222-4222-8222-222222222222';
const bindings = { watcherSha256: 'a'.repeat(64), anchorSha256: 'b'.repeat(64), adbSha256: 'c'.repeat(64) };
const sha = text => createHash('sha256').update(text).digest('hex');
function fake({ monotonic = [100, 102, 1100, 1102], wall = [10000, 11020], id = firstId, sourceBindings = bindings } = {}) {
  const files = new Map(), writes = [];
  const io = { async writeFile(file, bytes, options) {
    if (options.flag === 'wx' && files.has(file)) throw Error('private simulated path and account must not escape');
    files.set(file, options.flag === 'a' ? (files.get(file) ?? '') + bytes : bytes);
    writes.push({ file, options });
  } };
  const clock = { monotonicNow: () => monotonic.shift(), wallNow: () => wall.shift() };
  return { files, writes, io, clock,
    create: overrides => createMemoryWatchAnchor({ label: 'test', startedMonotonicMs: 99, sourceBindings, io, clock,
      newId: () => id, ...overrides }), records: () => [...files.values()].flatMap(bytes => bytes.trim().split('\n').map(JSON.parse)) };
}

test('private association binds source and exact observations; public handles contain no clock values', async () => {
  const e = fake(), anchor = await e.create(), observations = '{"sampleStartElapsedMs":5,"sampleEndElapsedMs":20}\n';
  await anchor.finish({ outcome: 'observer_returned', sampleCount: 1, completedRowsSha256: sha(observations) });
  const [start, end] = e.records();
  assert.equal(start.watchId, end.watchId);
  assert.equal(start.watchId, firstId);
  assert.deepEqual(start.sourceBindings, bindings);
  assert.equal(start.observationsFile, 'test-' + firstId + '.ndjson');
  assert.equal(end.completedRowsSha256, sha(observations));
  assert.equal(end.sampleCount, 1);
  assert.equal(start.productRunId, null);
  assert.equal(start.productCandidateVerified, false);
  assert.equal(start.clocks.startedMonotonicMs, 99);
  assert.equal(start.clocks.wallResolutionMs, null);
  assert.deepEqual(start.anchor.wallMinusMonotonicReadBracketMs, [9898, 9900]);
  assert.deepEqual(end.endpointOffsetChangeReadBracketMs, [18, 22]);
  assert.equal(end.associationState, 'host_endpoints_only');
  assert.deepEqual(Object.keys(anchor).sort(), ['file', 'finish', 'watchId']);
  const publicReceipt = JSON.stringify({ evidence: anchor.file });
  for (const privateValue of ['10000', '11020', bindings.watcherSha256, 'wallEpochMs', 'startedMonotonicMs'])
    assert.equal(publicReceipt.includes(privateValue), false);
  assert.ok(e.writes.every(write => write.file.replaceAll('\\', '/').startsWith(MEMORY_EVIDENCE_ROOT.replaceAll('\\', '/') + '/')
    && write.file.endsWith('.anchor.private.ndjson') && write.options.mode === 0o600));
  assert.deepEqual(e.writes.map(write => write.options.flag), ['wx', 'a']);
  await assert.rejects(anchor.finish({ outcome: 'observer_returned', sampleCount: 1, completedRowsSha256: sha(observations) }),
    { message: 'memory_probe_anchor_already_finished' });
  assert.equal(e.writes.length, 2);
});

test('equal host times still yield distinct observer identities; collision never overwrites evidence', async () => {
  const a = fake(), b = fake({ id: secondId });
  assert.notEqual((await a.create()).file, (await b.create()).file);
  const before = [...a.files.values()];
  await assert.rejects(a.create({ clock: { monotonicNow: () => 100, wallNow: () => 10000 } }),
    { message: 'memory_probe_anchor_write_failed' });
  assert.deepEqual([...a.files.values()], before);
});

test('only the fixed source hash fields and opaque UUID can enter a private record', async () => {
  for (const sourceBindings of [{ ...bindings, account: 'private' }, { ...bindings, watcherSha256: 'private endpoint' }]) {
    const e = fake({ sourceBindings });
    await assert.rejects(e.create(), { message: 'memory_probe_anchor_binding_invalid' });
    assert.equal(e.writes.length, 0);
  }
  const e = fake({ id: '../private' });
  await assert.rejects(e.create(), { message: 'memory_probe_anchor_id_invalid' });
  assert.equal(e.writes.length, 0);
});

test('clock failures remain invalid, including backward wall time, without clamping observed change', async () => {
  for (const [options, expectedChange] of [
    [{ wall: [10000, 9000] }, [-2002, -1998]],
    [{ monotonic: [100, 102, 80, 82] }, [1038, 1042]],
    [{ monotonic: [100, 102, 1102, 1100] }, null],
    [{ wall: [10000, NaN] }, null],
    [{ monotonic: [NaN, 102, 1100, 1102] }, null],
  ]) {
    const e = fake(options), anchor = await e.create();
    await anchor.finish({ outcome: 'observer_failed', sampleCount: 0, completedRowsSha256: sha('') });
    const end = e.records()[1];
    assert.equal(end.associationState, 'invalid_clock');
    assert.deepEqual(end.endpointOffsetChangeReadBracketMs, expectedChange);
    assert.equal(end.outcome, 'observer_failed');
    assert.equal(end.sampleCount, 0);
  }
  const e = fake(), anchor = await e.create({ startedMonotonicMs: 105 });
  await anchor.finish({ outcome: 'observer_failed', sampleCount: 0, completedRowsSha256: sha('') });
  assert.equal(e.records()[0].clocks.originState, 'invalid_clock');
  assert.equal(e.records()[1].associationState, 'invalid_clock');
});

test('a failed private completion is redacted and is not blindly appended again', async () => {
  const e = fake(), anchor = await e.create();
  e.io.writeFile = async () => { throw Error('private account or endpoint'); };
  const finish = { outcome: 'observer_failed', sampleCount: 0, completedRowsSha256: sha('') };
  await assert.rejects(anchor.finish(finish), { message: 'memory_probe_anchor_write_failed' });
  await assert.rejects(anchor.finish(finish), { message: 'memory_probe_anchor_already_finished' });
  assert.equal(e.records().length, 1);
});
