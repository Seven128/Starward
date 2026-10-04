import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const base = 'http://127.0.0.1:18791';
const sentinel = 'PRIVATE_QUERY_MUST_NOT_BE_LOGGED_0924';
const manifest = JSON.parse(await readFile(new URL('../../../packages/astronomy-core/dist/data/bsc5p-bright-stars.v3.manifest.json', import.meta.url), 'utf8'));
const catalogPath = `/v2/sky/catalogs/bsc5p-bright-stars.v3/${manifest.derivedAssetSha256}`;
const cases = [
  { path: `/v2/sky/saturn/manifest?private=${sentinel}`, expectedStatus: 200, category: 'fixed_image' },
  { path: catalogPath, expectedStatus: 200, category: 'catalog' },
  { path: '/v2/sky/wide-field/manifest', expectedStatus: 200, category: 'wide_field' },
  { path: '/v2/sky/optical/manifest', expectedStatus: 404, category: 'optical_trial' },
  { path: `/v2/sky/deep-sky/${'0'.repeat(64)}/manifest`, expectedStatus: 404, category: 'deep_sky' },
  { path: '/health/live', expectedStatus: 200, category: null },
];

let catalogEtag;
for (const item of cases) {
  const response = await fetch(new URL(item.path, base), { headers: { 'X-Private-Probe': sentinel } });
  assert.equal(response.status, item.expectedStatus, item.path);
  if (item.path === catalogPath) catalogEtag = response.headers.get('etag');
  await response.arrayBuffer();
}
assert.ok(catalogEtag);
const conditional = await fetch(new URL(catalogPath, base), { headers: { 'If-None-Match': catalogEtag } });
assert.equal(conditional.status, 304);
assert.equal((await conditional.arrayBuffer()).byteLength, 0);
cases.push({ path: catalogPath, expectedStatus: 304, category: 'catalog' });

const logs = spawnSync('docker', ['logs', 'starward-cloudsky-d-egress-caddy-20260924'], { encoding: 'utf8' });
assert.equal(logs.status, 0, logs.stderr);
const raw = `${logs.stdout}\n${logs.stderr}`;
assert.ok(!raw.includes(sentinel), 'sensitive query/header was logged');
const access = raw.split(/\r?\n/u).filter(Boolean).flatMap(line => {
  try { const value = JSON.parse(line); return value.logger === 'http.log.access.log0' ? [value] : []; }
  catch { return []; }
}).slice(-cases.length);
assert.equal(access.length, cases.length);
for (const [index, item] of cases.entries()) {
  const log = access[index];
  assert.equal(log.status, item.expectedStatus, item.path);
  assert.equal(log.sky_resource_class ?? null, item.category, item.path);
  assert.equal(typeof log.size, 'number', item.path);
  assert.ok(!('request' in log) && !('resp_headers' in log), item.path);
  assert.ok(!('uri' in log) && !('url' in log), item.path);
}
assert.equal(access.at(-1).size, 0, '304 must have no response body');
process.stdout.write(`${JSON.stringify(access.map(({ status, size, sky_resource_class }) => ({ status, size, sky_resource_class: sky_resource_class ?? null })), null, 2)}\n`);
