import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createTerrainWaitObserver, createTerrainWaitExporter } from './terrain-wait-observer.ts';
import { injectTerrainWaitObserver, terrainWaitSourceFiles, transformTerrainWaitSources } from './inject-terrain-wait-observer.mjs';
import { validateTerrainWait } from './terrain-wait-protocol.mjs';
import { createTerrainWaitCollector } from './terrain-wait-collector.mjs';
import os from 'node:os';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const require = createRequire(import.meta.url);
const ts = require(path.join(root, 'apps/wechat-miniapp/node_modules/typescript'));
const binding = 'a'.repeat(64);
const baseline = { metadataAvailable: true, fetching: false, imageReady: true, imagePending: false };
function fixture(action = 'gesture') {
  let time = 1000, deadline, cancelled = 0;
  const receipts = [];
  const probe = createTerrainWaitObserver({ action, sourceSha256: binding, now: () => time,
    later: fn => { deadline = fn; return 1; }, cancel: () => { cancelled++; } });
  probe.configureWriter(value => receipts.push(value));
  return { probe, receipts, at(value) { time = value; }, end() { deadline(); }, cancelled: () => cancelled };
}

test('one actual gesture records response, verified file and native acknowledgment separately without raw identities', () => {
  const f = fixture(), p = f.probe;
  p.start('enable', 'ignored', null, null, baseline);
  assert.equal(p.snapshot().started, false);
  p.start('gesture', 'private-coordinate-request', 'old-secret-url', 'old-private-path', baseline);
  f.at(1010); const attempt = p.metadataStart('private-new-coordinate');
  f.at(1200); p.metadataEnd(attempt, 'private-new-coordinate', 'private-new-url', true);
  p.cacheAcquire('private-new-url', 'miss');
  f.at(1300); p.downloadReturned('private-new-url', 200);
  f.at(1370); p.fileReady('private-new-url', 'private-native-path');
  f.at(1450); p.nativeResult('private-map', 'private-native-path', true, true, 'display');
  f.end();
  const report = p.snapshot();
  assert.deepEqual(report.rows.map(row => row.phase), ['action', 'metadata_start', 'metadata_returned', 'file_acquire', 'download_returned', 'file_ready', 'native_ack']);
  assert.equal(report.rows[3].cache, 'miss');
  assert.equal(report.rows[5].asset, report.rows[6].asset);
  assert.equal(report.rows[5].relativeMs, 370);
  assert.equal(report.rows[6].relativeMs, 450);
  assert.doesNotMatch(JSON.stringify(report), /private-|secret-url|coordinate-request/);
  assert.equal(f.receipts.length, 1);
  assert.equal(f.cancelled(), 1);
});

test('actual ready cache is explicit; metadata failure has no invented ready result and raw extra facts are discarded', () => {
  const f = fixture('enable'), p = f.probe;
  p.metadataEnd(null, 'inactive-request', 'inactive-url', true);
  p.start('enable', 'request', 'asset', 'path', { ...baseline, privateCoordinate: 'not-for-export' });
  p.cacheAcquire('asset', 'ready');
  p.fileReady('asset', 'path');
  const attempt = p.metadataStart('new-request');
  p.metadataEnd(attempt, 'new-request', null, false);
  f.end();
  const report = p.snapshot();
  assert.equal(report.rows[0].asset, 1);
  assert.equal(report.rows[1].cache, 'ready');
  assert.equal(report.rows.at(-1).phase, 'metadata_failed');
  assert.equal(report.rows.at(-1).asset, null);
  assert.doesNotMatch(JSON.stringify(report), /inactive-|privateCoordinate|not-for-export/);
});

test('pending and unknown native presentation never masquerade as installed acknowledgments', () => {
  const { probe: p } = fixture();
  p.start('gesture', 'request', 'asset', 'path', baseline);
  p.nativeResult('map', 'path', true, true, 'pending', true);
  p.nativeResult('map', 'path', true, true, 'display', true);
  p.nativeResult('map', 'path', false, true, 'display', true);
  p.nativeResult('map', 'path', true, true, 'display', false);
  const report = p.snapshot();
  assert.equal(report.schemaVersion, 'starward-terrain-wait-v3');
  assert.deepEqual(report.rows.slice(1).map(row => row.phase),
    ['native_pending', 'native_presentation_unknown', 'native_failure', 'native_ack']);
  assert.deepEqual(report.rows.slice(1).map(row => row.presentationUnknown), [true, true, true, false]);
});

test('backward wall clock is explicit and cannot yield clamped elapsed evidence', () => {
  const f = fixture(), p = f.probe;
  p.start('gesture', 'r', null, null, baseline);
  f.at(999); p.metadataStart('r');
  f.at(1400); p.metadataEnd(1, 'r', 'a', true);
  const report = p.snapshot();
  assert.equal(report.clock.backwardReads, 1);
  assert.equal(report.clock.monotonic, false);
  assert.equal(report.rows[1].relativeMs, null);
  assert.equal(report.rows[2].relativeMs, null);
});

test('file-ready identity uses admitted file facts and omits arbitrary or invalid values', () => {
  const f = fixture(), p = f.probe, digest = 'AB'.repeat(32);
  p.start('gesture', 'private-request', null, null, baseline);
  p.fileReady('private-key', 'private-path', { bytes: 314570, sha256: digest, rawUrl: 'private-url' });
  p.fileReady('private-key', 'private-path', { bytes: -1, sha256: 'not-a-digest' });
  p.fileReady('another-private-key', 'another-private-path');
  f.end();
  const rows = f.receipts[0].rows.filter(row => row.phase === 'file_ready');
  assert.equal(rows[0].fileBytes, 314570); assert.equal(rows[0].fileSha256, digest.toLowerCase());
  assert.equal(rows[1].asset, rows[0].asset); assert.equal(rows[1].file, rows[0].file);
  for (const row of rows.slice(1)) { assert.equal(row.fileBytes, null); assert.equal(row.fileSha256, null); }
  assert.doesNotMatch(JSON.stringify(f.receipts[0]), /private-|not-a-digest|rawUrl/);
});

test('event overflow seals once and later work cannot mutate the captured observation', () => {
  const f = fixture(), p = f.probe;
  p.start('gesture', 'r', null, null, baseline);
  for (let i = 0; i < 90; i++) p.cacheAcquire('a', 'loading');
  const report = p.snapshot();
  assert.equal(report.rows.length, 80);
  assert.equal(report.overflow, true);
  assert.equal(report.sealed, true);
  assert.equal(report.stopReason, 'event_limit');
  assert.equal(f.receipts.length, 1);
  p.start('gesture', 'other', 'other', 'other', baseline);
  p.fileReady('other', 'other');
  assert.deepEqual(p.snapshot(), report);
});

test('long scalar rows seal inside the existing HTTP byte bound without pretending the omitted input was recorded', () => {
  const f = fixture(), p = f.probe;
  p.configureResources(() => Object.fromEntries(['entries', 'readyBytes', 'activeDownloads', 'queued', 'nativePins', 'failedRemovals', 'activeReaders', 'physicalFiles'].map(key => [key, Number.MAX_SAFE_INTEGER])));
  for (let i = 0; i < 100; i++) p.start('gesture', 'r', 'a', 'p', baseline);
  const report = p.snapshot();
  assert.equal(report.stopReason, 'byte_limit'); assert.equal(report.overflow, true);
  assert.equal(report.inputCount, report.rows.length);
  assert(Buffer.byteLength(JSON.stringify(report)) <= 32768);
  assert.equal(validateTerrainWait(report), true);
  assert(JSON.stringify({ ...report, rows: [], nativePending: Number.MAX_SAFE_INTEGER }).length <= 2048);
});

test('current real consumer transforms have valid syntax and keep the cache/download/install business owners', async () => {
  const input = new Map(await Promise.all(terrainWaitSourceFiles.map(async file => [file, await fs.readFile(path.join(root, file), 'utf8')])));
  const transformed = transformTerrainWaitSources(input);
  for (const [file, source] of transformed) {
    const result = ts.transpileModule(source, { fileName: file, reportDiagnostics: true,
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } });
    assert.deepEqual(result.diagnostics?.filter(item => item.category === ts.DiagnosticCategory.Error), [], file);
  }
  const resource = transformed.get('apps/wechat-miniapp/src/services/raster-image-resources.ts');
  assert.ok(resource.indexOf('entry.retired = true; current.delete(input.key); entry = undefined;') < resource.indexOf('terrainWait.cacheAcquire'));
  assert.match(resource, /await makeRoom\(1, 0\)/);
  assert.match(transformed.get('apps/wechat-miniapp/src/hooks/use-terrain-overlay.ts'), /return \{ \.\.\.response, request: input \};/);
  const hook = transformed.get('apps/wechat-miniapp/src/hooks/use-raster-image.ts');
  assert.match(hook, /read\.promise\.then\(\(\{ path, bytes, sha256 \}\)/);
  assert.match(hook, /terrainWait\.fileReady\(imageKey, path, \{ bytes,/);
  assert.doesNotMatch(hook, /fileReady\([^\n]*imageSha256/);
  assert.match(transformed.get('apps/wechat-miniapp/src/pages/map/use-map-raster-installation.ts'), /void coordinator\.apply/);
  assert.match(transformed.get('apps/wechat-miniapp/src/pages/map/use-map-raster-installation.ts'), /phase \?\? "display", Boolean\(presentationUnknown\)/);
  assert.throws(() => transformTerrainWaitSources(transformed), /original_sources_required/);
});

test('writer rejects the ordinary repository and inspect mode is read-only', async () => {
  await assert.rejects(injectTerrainWaitObserver(root, { action: 'gesture', sourceSha256: binding, write: true }), /task_staging_required/);
  const manifest = await injectTerrainWaitObserver(root, { action: 'gesture', sourceSha256: binding });
  assert.equal(manifest.files.length, 9);
  assert.equal(manifest.files.filter(file => file.beforeSha256 === null).length, 2);
});

test('manual arm binds two real gestures to one deadline; old metadata keeps its actual request input', () => {
  let deadlines = 0;
  const p = createTerrainWaitObserver({ action: 'gesture', sourceSha256: binding, armRequired: true,
    later: () => { deadlines++; return 1; }, cancel: () => {} });
  p.start('gesture', 'r0', null, null, baseline);
  assert.equal(p.snapshot().started, false);
  assert.equal(p.arm(), true);
  p.start('gesture', 'r0', null, null, baseline);
  const attempt = p.metadataStart('r1', 'preview');
  p.start('gesture', 'r1', null, null, { ...baseline, fetching: true });
  p.metadataEnd(attempt, 'r1', 'old-asset', true, 'preview');
  p.fileReady('old-asset', 'old-file', { bytes: 7, sha256: 'b'.repeat(64) });
  const owner = p.nativeOwner(), token = p.nativeDispatch(owner, 3, 'add', 'old-file');
  p.nativeReturned(token, true, false);
  p.seal('manual');
  const result = p.snapshot();
  assert.equal(result.inputCount, 2); assert.equal(deadlines, 1);
  for (const row of result.rows.filter(row => ['metadata_returned', 'file_ready', 'native_dispatch'].includes(row.phase))) {
    assert.equal(row.inputSeq, 2); assert.equal(row.requestInputSeq, 1);
  }
  assert.equal(result.rows.find(row => row.phase === 'metadata_returned').kind, 'preview');
  assert.equal(validateTerrainWait(result), true);
});

test('resource reads use the actual shared scalar snapshot; unknown never becomes zero; seals freeze pending', () => {
  const p = createTerrainWaitObserver({ action: 'gesture', sourceSha256: binding, later: () => 1, cancel: () => {} });
  let pins = 2;
  p.configureResources(() => ({ entries: 3, readyBytes: 105, activeDownloads: 1, queued: 0,
    nativePins: pins, failedRemovals: 0, activeReaders: 1, physicalFiles: 3, privatePath: 'not-exported' }));
  p.start('gesture', 'private-r', null, null, baseline);
  const op = p.nativeDispatch(p.nativeOwner(), 1, 'remove', 'private-file');
  pins = 1; p.nativeReturned(op, false, false);
  p.nativeDispatch(p.nativeOwner(), 2, 'add', 'private-file');
  p.seal('manual');
  const result = p.snapshot();
  assert.equal(result.resources.nativePins, 1); assert.equal(result.nativePending, 1);
  assert.equal(result.rows[0].resource_nativePins, 2);
  assert.equal(result.rows.find(row => row.phase === 'native_returned').resource_nativePins, 1);
  pins = 0; assert.deepEqual(p.snapshot(), result);
  assert.doesNotMatch(JSON.stringify(result), /private-|not-exported/);
  assert.equal(validateTerrainWait(result), true);
  const missing = fixture(); missing.probe.start('gesture', 'r', null, null, baseline); missing.end();
  assert.equal(missing.probe.snapshot().resources.observed, false);
  assert.equal(missing.probe.snapshot().resources.nativePins, null);
});

async function transformedNative(probe) {
  const input = new Map(await Promise.all(terrainWaitSourceFiles.map(async file => [file, await fs.readFile(path.join(root, file), 'utf8')])));
  const text = transformTerrainWaitSources(input).get('apps/wechat-miniapp/src/pages/map/map-ground-overlay.ts');
  const js = ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {}, timers = new Map(); let timerId = 0;
  new Function('exports', 'require', 'setTimeout', 'clearTimeout', js)(exports, () => ({ terrainWait: probe }),
    callback => { timers.set(++timerId, callback); return timerId; }, id => timers.delete(id));
  return { create: exports.createMapGroundOverlayCoordinator, timers };
}
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
const target = src => ({ src, bounds: { southwest: { latitude: 1, longitude: 1 }, northeast: { latitude: 2, longitude: 2 } }, opacity: 1, zIndex: 1 });

test('transformed real coordinator preserves add/update/remove and records return after real pin retirement', async () => {
  const { probe: p } = fixture(); p.start('gesture', 'r', null, null, baseline);
  let pins = 0;
  p.configureResources(() => ({ entries: 2, readyBytes: 20, activeDownloads: 0, queued: 0, nativePins: pins, failedRemovals: 0, activeReaders: 0, physicalFiles: 2 }));
  p.fileReady('asset-a', 'file-a'); p.fileReady('asset-b', 'file-b');
  const { create } = await transformedNative(p), calls = [], results = [];
  const context = Object.fromEntries(['add', 'update', 'remove'].map(operation => [operation + 'GroundOverlay', args => { calls.push({ operation, args }); }]));
  const c = create(3, () => context, r => results.push(r), { retainPath: () => { pins++; return () => { pins--; }; } }, '地形');
  let pending = c.apply(target('file-a')); await flush(); calls.at(-1).args.success(); await pending;
  pending = c.apply(target('file-b')); await flush(); calls.at(-1).args.success(); await pending;
  pending = c.dispose(); await flush(); calls.at(-1).args.success(); assert.equal((await pending).complete, true);
  assert.deepEqual(calls.map(c => c.operation), ['add', 'update', 'remove']); assert.equal(pins, 0);
  assert.equal(results.filter(r => r.phase === 'display' && !r.error).length, 2);
  p.seal('manual'); const report = p.snapshot();
  assert.deepEqual(report.rows.filter(r => r.phase === 'native_dispatch').map(r => r.operation), ['add', 'update', 'remove']);
  assert.deepEqual(report.rows.filter(r => r.phase === 'native_returned').map(r => r.resource_nativePins), [1, 1, 0]);
  assert.equal(validateTerrainWait(report), true);
});

test('real native timeout does not claim failure completion; late callback is separately associated and cleaned', async () => {
  const { probe: p } = fixture(); p.start('gesture', 'r', null, null, baseline);
  const { create, timers } = await transformedNative(p), calls = [], results = [];
  const context = { addGroundOverlay(args) { calls.push(args); }, removeGroundOverlay(args) { calls.push(args); } };
  const c = create(3, () => context, r => results.push(r), undefined, '地形');
  const pending = c.apply(target('file-a')); await flush();
  const callback = [...timers.values()][0]; callback(); await pending;
  assert.equal(p.snapshot().nativePending, 1);
  assert.equal(p.snapshot().rows.filter(r => r.phase === 'native_returned').length, 0);
  assert.equal(results.at(-1).requiresMapRecovery, true);
  calls[0].success(); await flush(); calls[1].success(); await flush();
  p.seal('manual'); const report = p.snapshot();
  assert.deepEqual(report.rows.filter(r => r.phase === 'native_returned').map(r => r.late), [true, false]);
  assert.equal(report.nativePending, 0); assert.equal(validateTerrainWait(report), true);
});

test('strict current protocol rejects raw payloads, invented identities and unsealed/old-schema records', () => {
  const f = fixture(); f.probe.start('gesture', 'r', null, null, baseline); f.end();
  const good = f.probe.snapshot(); assert.equal(validateTerrainWait(good), true);
  for (const mutate of [v => { v.rawPath = 'secret'; }, v => { v.rows[0].url = 'secret'; }, v => { v.rows[0].inputSeq = 2; },
    v => { v.active = true; }, v => { v.schemaVersion = 'starward-terrain-wait-v2'; }, v => { v.resources.nativePins = 0; },
    v => { v.rows[0].asset = 65; }, v => { v.sourceSha256 = 'not-a-source'; }]) {
    const bad = structuredClone(good); mutate(bad); assert.equal(validateTerrainWait(bad), false);
  }
});

test('manual export is single-flight and retries identical sealed bytes after an unknown outcome', async () => {
  const f = fixture(); f.probe.start('gesture', 'r', null, null, baseline); f.end();
  let current = f.probe.snapshot(), release; const bodies = [];
  const exporter = createTerrainWaitExporter(() => current, body => { bodies.push(body); return new Promise(resolve => { release = resolve; }); });
  const first = exporter.export(); assert.equal(exporter.export(), first); await flush();
  release({ statusCode: 503, data: { outcome: 'unknown' } }); await first;
  current = { ...current, runId: 'tw-different-new' };
  const second = exporter.export(); await flush(); assert.equal(bodies[0], bodies[1]);
  release({ statusCode: 200, data: { stored: true } }); await second;
  await exporter.export(); assert.equal(bodies.length, 2); assert.equal(exporter.status(), 'stored');
});

test('collector is serial/idempotent, preserves conflict and delegates other schemas without reinterpreting them', async () => {
  const parent = await fs.realpath(os.tmpdir()), directory = await fs.mkdtemp(path.join(parent, 'starward-terrain-wait-fixture-'));
  try {
    let fallback = 0;
    const collector = createTerrainWaitCollector(directory, { fallback: { store: () => { fallback++; return 424; } } });
    const f = fixture(); f.probe.start('gesture', 'r', null, null, baseline); f.end(); const value = f.probe.snapshot();
    assert.deepEqual(await Promise.all([collector.store(value), collector.store(value)]), [200, 200]);
    const changed = structuredClone(value); changed.stopReason = 'manual'; assert.equal(await collector.store(changed), 409);
    const bad = { ...value, rawUrl: 'not-permitted' }; assert.equal(await collector.store(bad), 400);
    assert.equal(await collector.store({ schema: 'starward-terrain-wait-v2' }), 424); assert.equal(fallback, 1);
    const files = await fs.readdir(directory); assert.equal(files.length, 1);
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(directory, files[0]), 'utf8')), value);
  } finally {
    const resolved = await fs.realpath(directory);
    assert.equal(path.dirname(resolved).toLowerCase(), parent.toLowerCase()); assert(path.basename(resolved).startsWith('starward-terrain-wait-fixture-'));
    await fs.rm(resolved, { recursive: true });
  }
});
