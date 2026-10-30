import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { addD2NormalLifecycle } from './d2-normal-lifecycle-instrumentation.mjs';
import { addD2GpuResourceLifecycle } from './d2-gpu-lifecycle-instrumentation.mjs';
const require = createRequire(import.meta.url), ts = require('../../../../apps/wechat-miniapp/node_modules/typescript');
const root = new URL('../../../../', import.meta.url);
const read = file => fs.readFile(new URL(file, import.meta.url), 'utf8').then(s => s.replaceAll('\r\n', '\n'));
const page = await fs.readFile(new URL('apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx', root), 'utf8').then(s => s.replaceAll('\r\n', '\n'));
const time = await fs.readFile(new URL('apps/wechat-miniapp/src/features/sky/sky-observation-time.ts', root), 'utf8').then(s => s.replaceAll('\r\n', '\n'));
const observation = await read('r17-normal-observations.ts');
const input = { ...addD2NormalLifecycle({ page, time, observation }),
  lifecycle: await read('d2-normal-lifecycle.ts'), controls: await read('d2-normal-lifecycle-controls.tsx'),
  receipt: await read('d2-gpu-resource-receipt.ts') };
const observed = addD2GpuResourceLifecycle(input);
function compile(source, jsx = ts.JsxEmit.ReactJSX) {
  const result = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx }, reportDiagnostics: true });
  assert.equal(result.diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
  return result.outputText;
}
function harness() {
  let now = 1000; const writes = [], api = {};
  vm.runInNewContext(compile(observed.observation), { exports: api, Date: { now: () => now, parse: Date.parse }, Math });
  api.r17ConfigureNormalRetirementObservation({ buildGeneration: 36, buildSourceSha256: 'a'.repeat(64) },
    (key, value) => writes.push({ key, value: JSON.parse(JSON.stringify(value)) }));
  const id = api.r17NormalSurfaceCreatedReceipt();
  return { api, writes, id, advance: ms => { now += ms; } };
}
const facts = () => ({ disposed: false, disposeAttempts: 0, disposeReturned: 0, disposeThrew: 0,
  textures: { residentTextureCount: 2, residentRgbaBytes: 512, sourceUploadAttempts: 2, sourceUploadPixels: 128, logicalOwnershipComplete: true },
  contributions: { poolCount: 1, scratchCount: 3, residentRgbaBytes: 1280, signalStorageRedefineAttempts: 0, alphaBits: null } });

test('fixed logical phase samples follow real Play and preserve immutable copies without per-frame writes', () => {
  const h = harness(), { api, id } = h;
  assert.equal(api.r17NormalGpuSnapshotPhase(id, false), null);
  assert.equal(api.r17NormalGpuSnapshotPhase(id, true), 'ready');
  const supplied = facts(); api.r17NormalGpuRecord(id, 'ready', supplied, '2026-10-28T13:00:00.000Z');
  supplied.textures.residentRgbaBytes = 99999;
  const n = h.writes.length;
  for (let i = 0; i < 100; i++) assert.equal(api.r17NormalGpuSnapshotPhase(id, true), null);
  assert.equal(h.writes.length, n);
  api.r17NormalGpuPlayStarted();
  assert.equal(api.r17NormalGpuSnapshotPhase(id, true), 'play-start');
  api.r17NormalGpuRecord(id, 'play-start', facts());
  h.advance(29999); assert.equal(api.r17NormalGpuSnapshotPhase(id, true), null);
  h.advance(1); assert.equal(api.r17NormalGpuSnapshotPhase(id, true), 'active-30');
  api.r17NormalGpuRecord(id, 'active-30', facts());
  api.r17NormalGpuPaused(); assert.equal(api.r17NormalGpuSnapshotPhase(id, true), 'paused');
  api.r17NormalGpuRecord(id, 'paused', facts());
  api.r17NormalGpuRecord(id, 'before-retire', facts());
  api.r17NormalGpuRecord(id, 'after-retire', { ...facts(), disposed: true, disposeAttempts: 1, disposeReturned: 1 });
  const packet = h.writes.at(-1);
  assert.match(packet.key, /^starward\.r17\.normal-surface-retirement\.v2\.[a-f0-9]{64}$/);
  assert.equal(packet.value.schemaVersion, 'starward-r17-normal-surface-retirement-v2');
  assert.equal(packet.value.gpu.samples.length, 6);
  assert.equal(packet.value.gpu.samples[0].facts.textures.residentRgbaBytes, 512);
  assert.equal(packet.value.gpu.samples[0].frameAtMs, Date.parse('2026-10-28T13:00:00Z'));
  assert.equal(api.r17NormalGpuSnapshotPhase(id, true), null);
  assert(Buffer.byteLength(JSON.stringify(packet.value)) < 32768);
});
test('unknown scalars stay null, foreign owners and getters are rejected, and new surfaces cannot consume old phases', () => {
  const h = harness(), { api, id } = h; let touched = 0;
  const hostile = facts(); Object.defineProperty(hostile.textures, 'handle', { enumerable: true, get() { touched++; return {}; } });
  api.r17NormalGpuRecord(id, 'ready', hostile); assert.equal(touched, 0);
  api.r17NormalGpuRecord(id + 1, 'ready', facts());
  const valid = facts(); valid.textures.residentRgbaBytes = null; api.r17NormalGpuRecord(id, 'ready', valid);
  assert.equal(h.writes.at(-1).value.gpu.samples[0].facts.textures.residentRgbaBytes, null);
  assert.equal(h.writes.at(-1).value.gpu.rejected, 2);
  const next = api.r17NormalSurfaceCreatedReceipt();
  assert.equal(api.r17NormalGpuSnapshotPhase(id, true), null);
  assert.equal(api.r17NormalGpuSnapshotPhase(next, true), 'ready');
  api.r17NormalGpuPlayStarted(); api.r17NormalGpuRecord(next, 'play-start', facts());
  api.r17NormalGpuRecord(next, 'ready', facts()); h.advance(90001);
  assert.equal(api.r17NormalGpuSnapshotPhase(next, true), null, 'no extension of the existing finite active window');
});
test('real teardown preserves original throw and surface finally while taking independent renderer results', () => {
  const file = ts.createSourceFile('page.tsx', observed.page, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let release;
  const visit = node => { if (ts.isPropertyAssignment(node) && node.name.getText(file) === 'releaseContext') release = node.initializer.getText(file); ts.forEachChild(node, visit); };
  visit(file); assert(release);
  const events = [], api = {}, reset = { reset() {} }, error = Error('native-delete-failed');
  vm.runInNewContext(compile('export const release=' + release), { exports: api,
    starTransitions: reset, starDrawing: reset, readyImages: reset, nameLayouts: reset,
    canvasSurfaceRef: { current: { dispose() { events.push('surface'); } } }, canvasDisplayRef: { current: {} },
    canvasFrameClock: { resetFailures() {} }, canvasNodeRef: { current: {} }, canvasGlRef: { current: {} }, canvasGenerationRef: { current: 1 },
    r17NormalGpuRecord(_id, phase, value) { events.push([phase, value.disposeThrew]); } });
  let threw = 0;
  assert.throws(() => api.release({ __d2SurfaceReceiptId: 1, __d2ResourceFacts() { return { disposeThrew: threw }; },
    dispose() { events.push('renderer'); threw = 1; throw error; } }), value => value === error);
  assert.deepEqual(events, [['before-retire', 0], 'renderer', ['after-retire', 1], 'surface']);
});
test('integration is task-only, strictly checks changed boundaries and preserves product state writes', () => {
  for (const source of Object.values(observed)) compile(source);
  assert.equal((observed.page.match(/setTimeIntent\(/g) ?? []).length, (page.match(/setTimeIntent\(/g) ?? []).length);
  assert.throws(() => addD2GpuResourceLifecycle({ ...input, page: input.page.replace('try { context.dispose(); }', 'try { context.otherDispose(); }') }), /boundary_changed/);
  assert(!observed.observation.includes('setInterval('));
  assert(!observed.observation.includes('=> renderer'));
});
