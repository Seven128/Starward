import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';

const base = 'http://127.0.0.1:18928';
const version = 'solar-system-luminaries@1';
async function read(path) {
  const response = await fetch(base + path, { signal: AbortSignal.timeout(10_000) });
  const bytes = Buffer.from(await response.arrayBuffer());
  return { status: response.status, bytes, json: () => JSON.parse(bytes.toString('utf8')), headers: response.headers };
}
const results = [];
for (const [name, reference, kind] of [['Sun','SOLAR:SUN','STAR'],['太阳','SOLAR:SUN','STAR'],
  ['Moon','SOLAR:MOON','MOON'],['月亮','SOLAR:MOON','MOON']]) {
  const path = `/v2/celestial-objects?q=${encodeURIComponent(name)}&catalogVersion=bsc5p-bright-stars.v3`;
  const old = await read(path);
  assert.equal(old.status, 200);
  assert.ok(old.json().data.results.every(row => !row.reference.startsWith('SOLAR:')));
  const current = await read(path + '&luminaryCatalogVersion=' + encodeURIComponent(version));
  assert.equal(current.status, 200);
  const result = current.json().data.results[0];
  assert.equal(result.reference, reference); assert.equal(result.kind, kind);
  results.push({ operation: 'search', query: name, oldStatus: old.status, currentStatus: current.status,
    reference: result.reference, kind: result.kind, bytes: current.bytes.length });
}
assert.equal((await read('/v2/celestial-objects?q=Sun&luminaryCatalogVersion=invalid')).status, 400);
for (const [reference, expectedSource] of [['SOLAR:SUN','hestroffer-magnan-1998-solar-limb'],
  ['SOLAR:MOON','usgs-clementine-uv750-v2'],['PLANET:VENUS','nasa-venus-visible-cloud-appearance']]) {
  const first = await read('/v2/celestial-objects/' + encodeURIComponent(reference));
  assert.equal(first.status, 200);
  const data = first.json(); assert.equal(data.dataState, 'FRESH');
  assert.equal(data.data.reference, reference);
  assert.ok(data.data.sources.some(source => source.id === expectedSource));
  const repeat = await read('/v2/celestial-objects/' + encodeURIComponent(reference));
  assert.equal(repeat.json().data.contentRevision, data.data.contentRevision);
  results.push({ operation: 'information', reference, status: first.status,
    contentRevision: data.data.contentRevision, sourceIds: data.data.sources.map(source => source.id),
    bytes: first.bytes.length });
}
// The Moon information source is read from the actual release image asset.
const moon = await read('/v2/sky/moon/manifest');
assert.equal(moon.status, 200);
const manifest = moon.json();
const image = await read(manifest.image.downloadUrl);
assert.equal(image.status, 200); assert.equal(image.bytes.length, manifest.image.bytes);
assert.equal(createHash('sha256').update(image.bytes).digest('hex'), manifest.image.sha256);
assert.match(image.headers.get('cache-control'), /immutable/);
assert.equal((await read(manifest.image.downloadUrl.replace(manifest.publicationHash, '0'.repeat(64)))).status, 404);
assert.equal((await read(manifest.image.downloadUrl)).status, 200);
results.push({ operation: 'lunar-publication', imageBytes: image.bytes.length, sha256: manifest.image.sha256,
  wrongPublicationStatus: 404, recoveredStatus: 200 });
const result = { scope: 'Compiled production-condition image, local MEMORY_TEST/LOCAL_TEST with development fixtures off; not deployed or device evidence', results };
await writeFile(new URL('./evidence/d-luminary-release-http-2026-09-28.json', import.meta.url), JSON.stringify(result, null, 2)+'\n');
console.log(JSON.stringify({ passed: true, checks: results.length, scope: result.scope }));
