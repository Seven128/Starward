import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createTerrainWaitObserver } from './terrain-wait-observer.ts';
import { injectTerrainWaitObserver, terrainWaitSourceFiles, transformTerrainWaitSources } from './inject-terrain-wait-observer.mjs';

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
  assert.match(transformed.get('apps/wechat-miniapp/src/pages/map/use-map-raster-installation.ts'), /void coordinator\.apply/);
  assert.throws(() => transformTerrainWaitSources(transformed), /original_sources_required/);
});

test('writer rejects the ordinary repository and inspect mode is read-only', async () => {
  await assert.rejects(injectTerrainWaitObserver(root, { action: 'gesture', sourceSha256: binding, write: true }), /task_staging_required/);
  const manifest = await injectTerrainWaitObserver(root, { action: 'gesture', sourceSha256: binding });
  assert.equal(manifest.files.length, 8);
  assert.equal(manifest.files.filter(file => file.beforeSha256 === null).length, 2);
});
