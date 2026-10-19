import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Readable, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import test from 'node:test';
import { terrainRequestKey, terrainWindowViewport } from '../../../../workers/miniapp-api/src/terrain-request.ts';
import { createTerrainIdentityReceiptOwner, TERRAIN_IDENTITY_RECEIPT_VERSION,
  TERRAIN_METADATA_RECEIPT_MAX_BYTES } from './r17-terrain-identity-receipt.mjs';
const digest = value => createHash('sha256').update(value).digest('hex');
const request = { purpose: 'MAP', center: { system: 'GCJ02', latitude: 30, longitude: 110 },
  viewportBounds: { west: 109.99, south: 29.99, east: 110.01, north: 30.01 } };
const url = () => new URL('http://fixture.invalid/v2/terrain/overlay?purpose=MAP&centerLat=30&centerLng=110&viewportBounds=109.99,29.99,110.01,30.01');
const file = '/v2/terrain/assets/fixture-public.png';

test('one response binds its producer key and declared image without retaining private input', async () => {
  const owner = createTerrainIdentityReceiptOwner(), body = Buffer.from('fixture-png-body'), sha = digest(body);
  const start = owner.start(url(), 'GET');
  const response = new Response(JSON.stringify({ dataState: 'PARTIAL', data: { state: 'AVAILABLE', imageUrl: file,
    imageSha256: sha, imageBytes: body.length, centerGcj02: request.center, privateUnexpected: 'never-retain' } }));
  const facts = await owner.metadata(response, start);
  assert.equal(facts.terrainReceiptVersion, TERRAIN_IDENTITY_RECEIPT_VERSION);
  assert.equal(facts.requestKeySha256, digest(terrainRequestKey(terrainWindowViewport(request))));
  assert.equal(facts.imageSha256, sha); assert.equal(facts.imageBytes, body.length);
  assert.equal(facts.assetPathSha256, digest(file)); assert.equal(facts.metadataReadState, 'COMPLETE');
  assert.equal(JSON.stringify(facts).includes('109.99'), false);
  assert.equal(JSON.stringify(facts).includes('never-retain'), false);
  assert.equal(JSON.stringify(facts).includes('/v2/'), false);
  assert.equal((await response.json()).data.privateUnexpected, 'never-retain', 'original response is unchanged');
});

test('concurrent/reversed completion retains distinct request ordinals; ambiguous query stays unknown', async () => {
  const owner = createTerrainIdentityReceiptOwner(), first = owner.start(url(), 'GET'), second = owner.start(url(), 'GET');
  const later = await owner.metadata(Response.json({ data: {} }), second);
  const earlier = await owner.metadata(Response.json({ data: {} }), first);
  assert.equal(later.receiptRunId, earlier.receiptRunId);
  assert.equal(earlier.requestOrdinal, 1); assert.equal(later.requestOrdinal, 2);
  const duplicate = url(); duplicate.searchParams.append('centerLat', '31');
  assert.equal(owner.start(duplicate, 'GET').requestKeyState, 'UNKNOWN');
  assert.equal(owner.start(new URL('http://fixture.invalid/v2/operations'), 'GET'), null);
  assert.equal(owner.start(url(), 'POST'), null);
});

test('asset hashing forwards bytes with normal stream backpressure and bounded buffering', async () => {
  const owner = createTerrainIdentityReceiptOwner(), body = Buffer.alloc(65537, 27), output = [];
  const facts = owner.start(new URL('http://fixture.invalid' + file), 'GET');
  const response = new Response(body, { headers: { 'content-length': String(body.length) } });
  const transform = owner.asset(response, facts, 'GET');
  const sink = new Writable({ highWaterMark: 1, write(chunk, _encoding, callback) {
    output.push(Buffer.from(chunk)); setImmediate(callback);
  } });
  await pipeline(Readable.from([body.subarray(0, 17), body.subarray(17, 32000), body.subarray(32000)]), transform, sink);
  assert.deepEqual(Buffer.concat(output), body);
  assert.equal(facts.assetPathSha256, digest(file)); assert.equal(facts.responseBodySha256, digest(body));
  assert.equal(facts.responseBodyBytes, body.length); assert.equal(facts.responseHashState, 'COMPLETE_RESPONSE');
});

test('source errors and bodyless/error responses never fabricate a complete asset hash', async () => {
  const owner = createTerrainIdentityReceiptOwner(), facts = owner.start(new URL('http://fixture.invalid' + file), 'GET');
  const transform = owner.asset(new Response('partial'), facts, 'GET');
  const source = Readable.from((async function* () { yield Buffer.from('partial'); throw Error('fixture_source_error'); })());
  await assert.rejects(pipeline(source, transform, new Writable({ write(_chunk, _encoding, callback) { callback(); } })), /fixture_source_error/);
  assert.equal(facts.responseHashState, 'INCOMPLETE'); assert.equal(facts.responseBodySha256, null);
  const cancelled = owner.start(new URL('http://fixture.invalid' + file), 'GET'); let sourceDestroyed = false;
  const blockedSource = new Readable({ read() { this.push(Buffer.from('first')); this._read = () => {}; },
    destroy(error, callback) { sourceDestroyed = true; callback(error); } });
  await assert.rejects(pipeline(blockedSource, owner.asset(new Response('expected'), cancelled, 'GET'),
    new Writable({ write(_chunk, _encoding, callback) { callback(Error('fixture_client_closed')); } })), /fixture_client_closed/);
  assert.equal(sourceDestroyed, true); assert.equal(cancelled.responseHashState, 'INCOMPLETE');
  assert.equal(cancelled.responseBodySha256, null);
  const head = {}; assert.equal(owner.asset(new Response(null), head, 'HEAD'), null); assert.equal(head.responseHashState, 'NOT_GET');
  const failed = {}; assert.equal(owner.asset(new Response('no', { status: 404 }), failed, 'GET'), null);
  assert.equal(failed.responseBodySha256, null); assert.equal(failed.responseHashState, 'NOT_SUCCESS');
});

test('metadata cap rejects excess diagnostics while original body remains available', async () => {
  const owner = createTerrainIdentityReceiptOwner(), text = 'x'.repeat(TERRAIN_METADATA_RECEIPT_MAX_BYTES + 1);
  const response = new Response(text), pending = owner.metadata(response, owner.start(url(), 'GET'));
  const original = response.text(), facts = await pending;
  assert.equal(facts.metadataReadState, 'OVER_LIMIT'); assert.equal(facts.imageSha256, undefined);
  assert.equal((await original).length, text.length);
});

test('untrusted response fields do not escape allowlists or create misleading hashes', async () => {
  const owner = createTerrainIdentityReceiptOwner();
  const facts = await owner.metadata(Response.json({ dataState: 'secret-value', data: { state: 'secret-value',
    imageUrl: '/v2/terrain/assets/private.png?secret-value', imageSha256: 'secret-value', imageBytes: -2 } }), owner.start(url(), 'GET'));
  assert.equal(facts.envelopeState, null); assert.equal(facts.terrainState, null); assert.equal(facts.imageSha256, null);
  assert.equal(facts.assetPathSha256, null); assert.equal(facts.imageBytes, null);
  assert.equal(JSON.stringify(facts).includes('secret-value'), false);
});
