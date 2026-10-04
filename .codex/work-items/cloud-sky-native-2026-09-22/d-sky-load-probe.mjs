import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';

const base = 'http://127.0.0.1:18791';
const clientCount = 4;
const selected = JSON.parse(await readFile(new URL('./evidence/d-sky-load-selection-2026-09-24.json', import.meta.url), 'utf8'));
const bsc = JSON.parse(await readFile(new URL('../../../packages/astronomy-core/dist/data/bsc5p-bright-stars.v3.manifest.json', import.meta.url), 'utf8'));
assert.equal(selected.maximum.ids.length, 17);
assert.equal(selected.maximum.bytes, 1_109_570);

async function get(path, etag) {
  const response = await fetch(new URL(path, base), { headers: etag ? { 'If-None-Match': etag } : {} });
  const bytes = Buffer.from(await response.arrayBuffer());
  return { status: response.status, bytes, etag: response.headers.get('etag') };
}
async function boundedMap(items, parallelism, process) {
  let index = 0;
  const results = new Array(items.length);
  await Promise.all(Array.from({ length: parallelism }, async () => {
    while (index < items.length) {
      const current = index++;
      results[current] = await process(items[current]);
    }
  }));
  return results;
}
async function stage(name, run) {
  const start = performance.now();
  const result = await Promise.all(Array.from({ length: clientCount }, (_, client) => run(client)));
  return { name, durationMs: Math.round(performance.now() - start), result };
}
const catalogPath = `/v2/sky/catalogs/bsc5p-bright-stars.v3/${bsc.derivedAssetSha256}`;
const indexPath = '/v2/sky/supplements/sao/v2';
const tilePath = id => `${indexPath}/${selected.saoPublicationHash}/tiles/${id}`;
const cold = await stage('narrow-cold', async () => {
  const [catalog, index] = await Promise.all([get(catalogPath), get(indexPath)]);
  assert.equal(catalog.status, 200);
  assert.equal(index.status, 200);
  assert.equal(catalog.bytes.length > 1_000_000, true);
  assert.equal(index.bytes.length > 200_000, true);
  const tiles = await boundedMap(selected.maximum.ids, 3, async id => {
    const tile = await get(tilePath(id));
    assert.equal(tile.status, 200, id);
    assert.equal(tile.bytes.length > 0, true, id);
    return { id, etag: tile.etag, bytes: tile.bytes.length };
  });
  return { catalogEtag: catalog.etag, indexEtag: index.etag, tiles };
});
const hot = await stage('narrow-conditional', async client => {
  const prior = cold.result[client];
  const [catalog, index] = await Promise.all([get(catalogPath, prior.catalogEtag), get(indexPath, prior.indexEtag)]);
  assert.equal(catalog.status, 304);
  assert.equal(index.status, 304);
  assert.equal(catalog.bytes.length + index.bytes.length, 0);
  const tiles = await boundedMap(prior.tiles, 3, async entry => {
    const tile = await get(tilePath(entry.id), entry.etag);
    assert.equal(tile.status, 304, entry.id);
    assert.equal(tile.bytes.length, 0, entry.id);
    return tile.status;
  });
  return { tileCount: tiles.length };
});
const wide = await stage('dome-w3-cold', async () => {
  const manifest = await get('/v2/sky/wide-field/manifest');
  assert.equal(manifest.status, 200);
  const data = JSON.parse(manifest.bytes.toString('utf8'));
  assert.equal(data.tiles.length, 12);
  const tiles = await boundedMap(data.tiles, 3, async entry => {
    const tile = await get(entry.downloadUrl);
    assert.equal(tile.status, 200, entry.file);
    assert.equal(tile.bytes.length, entry.bytes, entry.file);
    assert.equal(createHash('sha256').update(tile.bytes).digest('hex'), entry.sha256, entry.file);
    return tile.bytes.length;
  });
  return { tileCount: tiles.length, tileBytes: tiles.reduce((sum, bytes) => sum + bytes, 0) };
});

const logs = spawnSync('docker', ['logs', 'starward-cloudsky-d-egress-caddy-20260924'], { encoding: 'utf8' });
assert.equal(logs.status, 0, logs.stderr);
const access = `${logs.stdout}\n${logs.stderr}`.split(/\r?\n/u).filter(Boolean).flatMap(line => {
  try { const value = JSON.parse(line); return value.logger === 'http.log.access.log0' ? [value] : []; }
  catch { return []; }
});
const expectedCount = clientCount * (2 + selected.maximum.ids.length + 2 + selected.maximum.ids.length + 1 + 12);
assert.equal(access.length, expectedCount);
assert.ok(access.every(entry => !('request' in entry) && !('resp_headers' in entry) && typeof entry.size === 'number'));
const totals = {};
for (const entry of access) {
  const key = `${entry.sky_resource_class ?? 'unclassified'}:${entry.status}`;
  totals[key] ??= { requests: 0, responseBodyBytes: 0 };
  totals[key].requests++;
  totals[key].responseBodyBytes += entry.size;
}
assert.equal(totals['catalog:304']?.requests, clientCount * (2 + selected.maximum.ids.length));
assert.equal(totals['catalog:304']?.responseBodyBytes, 0);
assert.equal(totals['wide_field:200']?.requests, clientCount * 13);
process.stdout.write(`${JSON.stringify({ clientCount, narrowSelection: selected.maximum,
  stages: [cold, hot, wide].map(({ name, durationMs }) => ({ name, durationMs })), totals }, null, 2)}\n`);
