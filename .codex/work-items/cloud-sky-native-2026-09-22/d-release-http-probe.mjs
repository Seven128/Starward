import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const base = process.env.STARWARD_CLOUD_SKY_PROBE_BASE ?? 'http://127.0.0.1:18790';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const results = [];

async function request(path, headers = {}) {
  const response = await fetch(new URL(path, base), { headers });
  const bytes = Buffer.from(await response.arrayBuffer());
  return { response, bytes, json: () => JSON.parse(bytes.toString('utf8')) };
}

for (const name of ['moon', 'mars', 'mercury', 'jupiter', 'saturn', 'galactic']) {
  const manifest = await request(`/v2/sky/${name}/manifest`);
  assert.equal(manifest.response.status, 200, name);
  assert.equal(manifest.response.headers.get('cache-control'), 'no-cache', name);
  const data = manifest.json();
  const image = await request(data.image.downloadUrl);
  assert.equal(image.response.status, 200, name);
  assert.equal(image.bytes.length, data.image.bytes, name);
  assert.equal(sha256(image.bytes), data.image.sha256, name);
  assert.match(image.response.headers.get('cache-control'), /immutable/u, name);
  const bad = await request(data.image.downloadUrl.replace(data.publicationHash, '0'.repeat(64)));
  assert.equal(bad.response.status, 404, name);
  const recovered = await request(data.image.downloadUrl);
  assert.equal(recovered.response.status, 200, name);
  assert.equal(sha256(recovered.bytes), data.image.sha256, name);
  results.push({ name, manifestBytes: manifest.bytes.length, imageBytes: image.bytes.length,
    imageHash: data.image.sha256, wrongHashStatus: bad.response.status,
    recoveryStatus: recovered.response.status, imageCache: image.response.headers.get('cache-control') });
}

const wideField = await request('/v2/sky/wide-field/manifest');
assert.equal(wideField.response.status, 200);
assert.equal(wideField.response.headers.get('cache-control'), 'no-cache');
const wideFieldData = wideField.json();
const properties = await request(wideFieldData.propertiesUrl);
assert.equal(properties.response.status, 200);
assert.equal(sha256(properties.bytes), wideFieldData.propertiesSha256);
let wideFieldTileBytes = 0;
for (const entry of wideFieldData.tiles) {
  const tile = await request(entry.downloadUrl);
  assert.equal(tile.response.status, 200, entry.file);
  assert.equal(tile.bytes.length, entry.bytes, entry.file);
  assert.equal(sha256(tile.bytes), entry.sha256, entry.file);
  assert.match(tile.response.headers.get('cache-control'), /immutable/u, entry.file);
  wideFieldTileBytes += tile.bytes.length;
}
const wideFieldBad = await request(wideFieldData.tiles[0].downloadUrl.replace(wideFieldData.publicationHash, '0'.repeat(64)));
assert.equal(wideFieldBad.response.status, 404);
results.push({ name: 'wide-field-w3', manifestBytes: wideField.bytes.length,
  propertiesBytes: properties.bytes.length, tileCount: wideFieldData.tiles.length,
  allTileBytes: wideFieldTileBytes, wrongHashStatus: wideFieldBad.response.status });

for (const version of ['v2', 'v3']) {
  const manifest = JSON.parse(await readFile(new URL(`../../../packages/astronomy-core/dist/data/bsc5p-bright-stars.${version}.manifest.json`, import.meta.url), 'utf8'));
  const path = `/v2/sky/catalogs/bsc5p-bright-stars.${version}/${manifest.derivedAssetSha256}`;
  const catalog = await request(path);
  assert.equal(catalog.response.status, 200, version);
  assert.equal(catalog.json().data.catalogHash, manifest.derivedAssetSha256, version);
  const etag = catalog.response.headers.get('etag');
  assert.ok(etag, version);
  const unchanged = await request(path, { 'If-None-Match': etag });
  assert.equal(unchanged.response.status, 304, version);
  assert.equal(unchanged.bytes.length, 0, version);
  const bad = await request(path.replace(manifest.derivedAssetSha256, '0'.repeat(64)));
  assert.equal(bad.response.status, 404, version);
  results.push({ name: `bsc5p-${version}`, bodyBytes: catalog.bytes.length, etag,
    conditionalStatus: unchanged.response.status, conditionalBytes: unchanged.bytes.length,
    wrongHashStatus: bad.response.status });
}

for (const route of ['/v2/sky/supplements/sao', '/v2/sky/supplements/sao/v2']) {
  const index = await request(route);
  assert.equal(index.response.status, 200, route);
  const data = index.json().data;
  const etag = index.response.headers.get('etag');
  const unchanged = await request(route, { 'If-None-Match': etag });
  assert.equal(unchanged.response.status, 304, route);
  const tilePath = `${route}/${data.publicationHash}/tiles/${data.index.tiles[0].id}`;
  const tile = await request(tilePath);
  assert.equal(tile.response.status, 200, route);
  const tile304 = await request(tilePath, { 'If-None-Match': tile.response.headers.get('etag') });
  assert.equal(tile304.response.status, 304, route);
  const bad = await request(tilePath.replace(data.publicationHash, '0'.repeat(64)));
  assert.equal(bad.response.status, 404, route);
  results.push({ name: route, indexBytes: index.bytes.length, tileBytes: tile.bytes.length,
    tileCount: data.index.tiles.length, conditionalIndexStatus: unchanged.response.status,
    conditionalTileStatus: tile304.response.status, wrongHashStatus: bad.response.status });
}

const optical = await request('/v2/sky/optical/manifest');
assert.equal(optical.response.status, 404);
results.push({ name: 'optical-commercial-gate', status: optical.response.status });

process.stdout.write(`${JSON.stringify({ base, results }, null, 2)}\n`);
