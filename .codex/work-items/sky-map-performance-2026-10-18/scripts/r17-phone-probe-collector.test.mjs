import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createR17PhoneProbeCollector } from './r17-phone-probe-collector.mjs';
import { validateR17PhoneProbeMetrics } from './r17-phone-probe-v2-protocol.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../../../..');
const require = createRequire(import.meta.url), ts = require(path.join(root, 'apps/wechat-miniapp/node_modules/typescript'));
const source = (await fs.readFile(path.join(here, 'r17-phone-probe-v2-runtime.ts'), 'utf8')).replace('"__VARIANT__"', '"candidate"');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
let now = 0, nextTimer = 0;
const timers = new Map(), exports = {};
vm.runInNewContext(compiled, { exports, performance: { now: () => now },
  setTimeout(callback, delay) { const id = ++nextTimer; timers.set(id, { callback, due: now + delay }); return id; },
  clearTimeout(id) { timers.delete(id); } });
const probe = exports.r17Probe;
assert.equal(probe.configureBinding({ mode: 'accepted-action-direct', buildGeneration: 23, buildSourceSha256: 'a'.repeat(64) }), true);
probe.start('wide-play'); probe.control('actualPlay', true);
now = 1000;
for (const [id, timer] of [...timers]) if (timer.due <= now) { timers.delete(id); timer.callback(); }
now = 15000; probe.control('export');
const metrics = JSON.parse(JSON.stringify(probe.snapshot()));
now = 20000; probe.control('pauseAttempt'); probe.controlResult('pauseAttempt', true); probe.control('pauseSuccess', true); probe.control('terminalExport');
const terminal = JSON.parse(JSON.stringify(probe.terminalSnapshot()));
assert.equal(validateR17PhoneProbeMetrics(metrics), true);
assert.equal(validateR17PhoneProbeMetrics(terminal), true);
const { binding, controls, observations, linkage, ...legacy } = metrics;
legacy.schemaVersion = 'starward-r17-phone-probe-v1';
assert.equal(validateR17PhoneProbeMetrics(legacy), true);

const tempRoot = await fs.realpath(os.tmpdir()), directory = await fs.mkdtemp(path.join(tempRoot, 'starward-r17-collector-fixture-'));
const clone = value => JSON.parse(JSON.stringify(value));
try {
  const store = createR17PhoneProbeCollector(directory);
  assert.equal(await store.store({ ...metrics, runId: '../escape' }), 400);
  assert.equal((await fs.readdir(directory)).length, 0);
  assert.equal(await store.store(terminal), 424); // Missing early metrics never appears successful.
  assert.equal((await fs.readdir(directory)).length, 0);
  assert.deepEqual(await Promise.all([store.store(metrics), store.store(metrics)]), [200, 200]);
  assert.equal((await fs.readdir(directory)).length, 1);
  const conflicting = clone(metrics); conflicting.counters.paintAttempts++;
  assert.equal(await store.store(conflicting), 409);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(directory, metrics.variant + '-' + metrics.runId + '.json'), 'utf8')), metrics);
  const wrongBuild = clone(terminal); wrongBuild.binding.buildGeneration++;
  assert.equal(await store.store(wrongBuild), 409);
  assert.deepEqual(await Promise.all([store.store(terminal), store.store(terminal)]), [200, 200]);
  assert.equal((await fs.readdir(directory)).length, 2);
  const changedTerminal = clone(terminal); changedTerminal.controls.events.pauseSuccess.lastResult = false;
  assert.equal(await store.store(changedTerminal), 409);
  assert.equal(await store.store({ ...legacy, runId: 'r17-1-legacy' }), 200);
  for (let index = 2; index <= 30; index++) assert.equal(await store.store({ ...legacy, runId: `r17-${index}-capacity` }), 200);
  assert.equal((await fs.readdir(directory)).length, 32);
  assert.equal(await store.store({ ...legacy, runId: 'r17-31-overflow' }), 429);
  assert.equal(await store.store(metrics), 200); // Exact retries remain safe when capacity is full.
  assert.equal(await store.store(terminal), 200);
  assert.equal((await fs.readdir(directory)).length, 32);
  console.log(JSON.stringify({ passed: true, boundary: 'v1-v2-terminal-existing-collector',
    verified: ['strict-admission-before-path', 'metrics-required-for-terminal', 'exact-idempotency', 'conflict-preserves-bytes',
      'terminal-build-binding', 'serialized-concurrency', 'shared-32-file-capacity', 'retry-at-capacity'], liveServiceTouched: false }));
} finally {
  const resolved = await fs.realpath(directory);
  if (path.dirname(resolved).toLowerCase() !== tempRoot.toLowerCase() || !path.basename(resolved).startsWith('starward-r17-collector-fixture-')) throw Error('fixture_cleanup_scope');
  // This is a generated, verified temporary test directory only.
  await fs.rm(resolved, { recursive: true, force: true });
}
