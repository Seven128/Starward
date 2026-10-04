import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PostgresMiniappRepository } from '../../../workers/miniapp-api/src/postgres-repository.ts';
import { insertExplicitTestSpot } from '../../../workers/miniapp-api/src/test-fixtures/infrastructure-spot.ts';

const stage = process.env.D_PG_PROBE_STAGE;
assert.ok(stage === 'before' || stage === 'after');
const base = process.env.D_PG_PROBE_API_BASE ?? 'http://127.0.0.1:18792';
const spotId = 'spot:cloudsky-d-pg-20260924';
const statePath = join(import.meta.dirname, 'evidence/d-current-pg-sky-state-2026-09-24.json');
async function json(path: string) {
  const response = await fetch(new URL(path, base));
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  return body;
}

let contextId: string;
if (stage === 'before') {
  const url = process.env.DATABASE_URL;
  assert.ok(url, 'isolated DATABASE_URL required');
  const repository = await new PostgresMiniappRepository(url).initialize({ migrate: false });
  try {
    const spot = await insertExplicitTestSpot(repository, { spotId });
    assert.equal(spot.spotId, spotId);
  } finally { await repository.close(); }
  const response = await fetch(`${base}/v2/observation-contexts/resolve`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ location: { kind: 'FORMAL_SPOT', spotId }, localDate: '2026-09-23' }),
  });
  const resolved = await response.json();
  assert.ok(response.status === 200 || response.status === 201, JSON.stringify(resolved));
  contextId = resolved.data.contextId;
  assert.ok(contextId);
  await writeFile(statePath, JSON.stringify({ spotId, contextId }));
} else {
  const prior = JSON.parse(await readFile(statePath, 'utf8'));
  assert.equal(prior.spotId, spotId);
  contextId = prior.contextId;
}

const context = await json(`/v2/observation-contexts/${encodeURIComponent(contextId)}`);
assert.equal(context.data.contextId, contextId);
assert.equal(context.data.location.spotId, spotId);
const sky = await json(`/v2/spots/${encodeURIComponent(spotId)}/sky?contextId=${encodeURIComponent(contextId)}&catalogVersion=bsc5p-bright-stars.v3`);
assert.equal(sky.data.skyScene.state, 'AVAILABLE');
assert.equal(sky.data.skyScene.catalog.catalogVersion, 'bsc5p-bright-stars.v3');
assert.equal(sky.data.skyScene.catalog.rowCount, 8404);
assert.equal(sky.data.observationFrames.length, 48);
assert.equal(sky.data.observationFrames[0].at, sky.data.hourly[0].at);
const sao = await json('/v2/sky/supplements/sao/v2');
assert.equal(sao.data.index.baseCatalogVersion, 'bsc5p-bright-stars.v3');
assert.equal(sao.data.index.baseAssetSha256, sky.data.skyScene.catalog.catalogHash);
const search = await json(`/v2/celestial-objects?q=${encodeURIComponent('张宿二')}&catalogVersion=bsc5p-bright-stars.v3`);
assert.equal(search.dataState, 'FRESH');
assert.equal(search.data.results[0]?.reference, 'HR:3994');
const details = await json('/v2/celestial-objects/HR%3A3994?catalogVersion=bsc5p-bright-stars.v3');
assert.equal(details.data.reference, 'HR:3994');
const saturn = await json('/v2/sky/saturn/manifest');
assert.equal(saturn.source.license, 'CC BY 4.0');
assert.ok(saturn.image.downloadUrl.includes(saturn.publicationHash));
process.stdout.write(`${JSON.stringify({ stage, contextId, contextFingerprint: context.data.contextFingerprint,
  selectedAtUtc: context.data.selectedAtUtc, skyDataState: sky.dataState,
  skySceneState: sky.data.skyScene.state, bsc: sky.data.skyScene.catalog.catalogVersion,
  bscHash: sky.data.skyScene.catalog.catalogHash, saoHash: sao.data.publicationHash,
  hourlyRows: sky.data.hourly.length, observationFrames: sky.data.observationFrames.length,
  searchIdentity: search.data.results[0].reference, detailsIdentity: details.data.reference,
  saturnImageHash: saturn.image.sha256 }, null, 2)}\n`);
