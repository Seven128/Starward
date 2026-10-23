import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import vm from 'node:vm';
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

// Exercise the actual task watcher with fake provider I/O; never import its
// top-level device entrance or launch ADB merely to test process-instance loss.
async function watchWithStats(stats) {
  const source = await fs.readFile(new URL('./r17-sky-memory.mjs', import.meta.url), 'utf8');
  const script = source.replace(/^import .*;\r?\n/gm, '')
    .replaceAll('import.meta.url', JSON.stringify(new URL('./r17-sky-memory.mjs', import.meta.url).href));
  const files = new Map(), logs = [], calls = [];
  const activity = 'com.tencent.mm/com.tencent.mm.plugin.appbrand.ui.AppBrandUI0';
  const activities = ' Hist #0: ActivityRecord{fixture ' + activity + '}\n'
    + '  mState=RESUMED\n  app=ProcessRecord{fixture 42:com.tencent.mm:appbrand0/u0a}\n';
  const meminfo = '** MEMINFO in pid 42 [com.tencent.mm:appbrand0] **\n'
    + 'TOTAL PSS: 120\nTOTAL RSS: 130\nTOTAL SWAP PSS: 0\n';
  const io = { async mkdir() {}, async readFile() { return Buffer.from(source); },
    async writeFile(file, bytes, options) {
      if (options.flag === 'wx' && files.has(file)) throw Error('fixture_write_collision');
      files.set(file, options.flag === 'a' ? (files.get(file) ?? '') + bytes : bytes);
    } };
  class Device {
    async select() {}
    async foreground() { return activity; }
    async command(args) {
      calls.push(args);
      if (args[1] === 'cat') {
        const value = stats.shift();
        if (value instanceof Error) throw value;
        return Buffer.from(value ?? '');
      }
      if (args[2] === 'activity') return Buffer.from(activities);
      if (args[2] === 'meminfo') return Buffer.from(meminfo);
      throw Error('unexpected_fixture_command');
    }
  }
  let monotonic = 0;
  const fakeProcess = { argv: ['node', 'fixture', 'watch', 'map-test', '2', '2000', 'usb'] };
  await vm.runInNewContext('(async()=>{' + script + '\n})()', {
    fs: io, createHash, AdbDevice: Device, findAdb: async () => 'unused-fixture-adb',
    foregroundActivity: () => activity, createMemoryWatchAnchor, MEMORY_EVIDENCE_ROOT,
    URL, process: fakeProcess, performance: { now: () => ++monotonic },
    Date: { now: () => 100000 + monotonic }, setTimeout: callback => { callback(); },
    console: { log: line => logs.push(JSON.parse(line)) },
  });
  const instances = [...files].filter(([file]) => file.endsWith('.process.private.ndjson'))
    .flatMap(([, bytes]) => bytes.trim().split('\n').map(JSON.parse));
  return { calls, logs, instances, exitCode: fakeProcess.exitCode };
}

function processStat(ticks, pid = '42') {
  // Field 22 follows the comm boundary; comm itself can contain ')' and spaces.
  return `${pid} (fixture ) name) S ${Array(18).fill('0').join(' ')} ${ticks} 0\n`;
}

test('watch rejects reused same PID/name/activity before or during meminfo', async () => {
  const between = await watchWithStats([processStat('100'), processStat('100'), processStat('200')]);
  assert.equal(between.logs[0].state, 'miniapp_foreground');
  assert.equal(between.logs[0].processInstanceVerified, true);
  assert.equal(between.logs[0].processes[0].totalSwapPssKiB, 0);
  assert.equal(between.logs[1].state, 'foreground_instance_changed');
  assert.equal(between.logs[1].processInstanceVerified, false);
  assert.deepEqual(between.logs[1].processes, []);
  assert.equal(between.calls.filter(args => args[2] === 'meminfo').length, 1);
  assert.deepEqual(between.instances.map(row => row.state), ['verified', 'changed']);
  assert.deepEqual(between.instances.map(row => row.target.startTicks), ['100', '200']);
  assert.equal(between.instances[1].afterStartTicks, null);
  assert.equal(between.instances[0].watchId, between.instances[1].watchId);
  assert.equal(between.logs.at(-1).processInstanceRows, 2);
  assert.equal(/"(?:target|pid|startTicks)":/.test(JSON.stringify(between.logs)), false);

  const during = await watchWithStats([processStat('100'), processStat('200')]);
  assert.equal(during.logs[0].state, 'foreground_instance_changed');
  assert.deepEqual(during.logs[0].processes, []);
  assert.equal(during.instances[0].state, 'changed');
  assert.equal(during.instances[0].target.startTicks, '100');
  assert.equal(during.instances[0].afterStartTicks, '200');
  assert.equal(during.calls.filter(args => args[1] === 'cat').length, 2);
});

test('missing or invalid startTicks stays unknown and never reuses a prior instance or zero', async () => {
  for (const invalid of ['42 (fixture) S 0\n', processStat('missing'), processStat('100', '99'), new Error('private_provider_error')]) {
    const result = await watchWithStats([invalid]);
    assert.equal(result.logs[0].state, 'foreground_instance_unavailable');
    assert.equal(result.logs[0].processInstanceVerified, false);
    assert.deepEqual(result.logs[0].processes, []);
    assert.equal(result.calls.filter(args => args[2] === 'meminfo').length, 0);
    assert.equal(result.instances[0].state, 'unknown');
    assert.equal(result.instances[0].target.startTicks, null);
    assert.equal(result.instances[0].afterStartTicks, null);
  }
  const after = await watchWithStats([processStat('100'), new Error('private_provider_error')]);
  assert.equal(after.logs[0].state, 'foreground_instance_unavailable');
  assert.deepEqual(after.logs[0].processes, []);
  assert.equal(after.instances[0].state, 'unknown');
  assert.equal(after.instances[0].target.startTicks, '100');
  assert.equal(after.instances[0].afterStartTicks, null);
  const later = await watchWithStats([processStat('100'), processStat('100'), '42 (fixture) S 0\n']);
  assert.equal(later.logs[0].state, 'miniapp_foreground');
  assert.equal(later.logs[1].state, 'foreground_instance_unavailable');
  assert.deepEqual(later.logs[1].processes, []);
  assert.equal(later.instances[1].target.startTicks, null);
  assert.equal(later.calls.filter(args => args[2] === 'meminfo').length, 1);
});
