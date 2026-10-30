import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { createR17PhoneProbeHttpServer } from './r17-phone-probe-http.mjs';
import { R17_PHONE_PROBE_ROUTE as route, R17_PHONE_PROBE_MAX_BYTES as maxBytes } from './r17-phone-probe-protocol.mjs';
import { nativeRegionProbeDependencyStatus } from './r17-phone-probe-collector.mjs';
import { memoryCheckpointHarness } from './memory-checkpoint-test-support.mjs';
import { addD2DecodeCheckpoint } from './d2-decode-checkpoint-instrumentation.mjs';
import { validateD2DecodeCheckpoint } from './d2-decode-checkpoint-protocol.mjs';

const publicOrigin = 'http://127.0.0.1:49151'; // A declared header only; never contacted.
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const turn = () => new Promise(resolve => setImmediate(resolve));
async function until(check) {
  for (let attempt = 0; attempt < 200; attempt++) { if (check()) return; await new Promise(resolve => setTimeout(resolve, 5)); }
  throw Error('fixture_condition_missing');
}
async function listen(server) {
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return `http://127.0.0.1:${server.address().port}`;
}
async function upstream(handler) {
  const sockets = new Set(), server = http.createServer(handler);
  server.on('connection', socket => { sockets.add(socket); socket.once('close', () => sockets.delete(socket)); });
  return { server, origin: await listen(server), async close() {
    for (const socket of sockets) socket.destroy();
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  } };
}
async function bridge(target, options = {}) {
  const api = createR17PhoneProbeHttpServer({ upstreamOrigin: target.origin, publicOrigin,
    collector: { store: async () => 400 }, ...options });
  return { ...api, origin: await listen(api.server) };
}
function start(origin, { method = 'GET', path: requestPath = '/v2/probe', headers = {}, body, chunks, end = true, onData } = {}) {
  const url = new URL(origin); let request;
  const promise = new Promise((resolve, reject) => {
    request = http.request({ hostname: url.hostname, port: url.port, path: requestPath, method, headers, agent: false }, response => {
      const output = [];
      response.on('data', chunk => { output.push(chunk); onData?.(chunk); });
      response.once('aborted', () => reject(Error('fixture_response_incomplete')));
      response.once('error', reject);
      response.once('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(output) }));
    });
    request.once('error', reject);
    request.setTimeout(5_000, () => request.destroy(Error('fixture_client_timeout')));
    if (chunks) for (const chunk of chunks) request.write(chunk);
    else if (body !== undefined) request.write(body);
    if (end) request.end();
  });
  return { request, promise };
}
const call = (origin, options) => start(origin, options).promise;
const post = (origin, body, headers = {}) => call(origin, { method: 'POST', path: route,
  headers: { 'content-type': 'application/json', ...headers }, body });
async function raw(origin, text) {
  const url = new URL(origin);
  return new Promise((resolve, reject) => {
    const chunks = [], socket = net.connect(Number(url.port), url.hostname, () => socket.end(text));
    socket.setTimeout(2_000, () => socket.destroy(Error('fixture_raw_timeout')));
    socket.on('data', chunk => chunks.push(chunk)); socket.once('error', reject);
    socket.once('end', () => resolve(Buffer.concat(chunks).toString()));
  });
}
let packet;
async function actualPacket() {
  if (packet) return structuredClone(packet);
  const request = await fs.readFile(new URL('../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-request.ts', import.meta.url), 'utf8');
  const h = await memoryCheckpointHarness({ generation: 35, extraNames: ['d2-decode-observation'], validate: validateD2DecodeCheckpoint,
    transformAdapter: adapter => addD2DecodeCheckpoint({ request, adapter }).adapter });
  assert.equal(h.api.r25MemoryStarted(), true);
  packet = h.receipt(); assert.equal(packet.schemaVersion, 'starward-r25-memory-checkpoint-v2');
  return structuredClone(packet);
}
const tempRoot = await fs.realpath(os.tmpdir());
async function temp() { return fs.mkdtemp(path.join(tempRoot, 'starward-r17-http-fixture-')); }
async function remove(directory) {
  const resolved = await fs.realpath(directory);
  assert.equal(path.dirname(resolved).toLowerCase(), tempRoot.toLowerCase());
  assert(path.basename(resolved).startsWith('starward-r17-http-fixture-'));
  // Regenerable fixture only, after absolute-path ownership verification.
  await fs.rm(resolved, { recursive: true });
}

test('factory never listens and rejects undeclared origins/deadlines before any request', async () => {
  for (const value of ['https://127.0.0.1:9999', 'http://localhost:9999', 'http://0.0.0.0:9999',
    'http://127.0.0.1:0', 'http://u:p@127.0.0.1:9999', 'http://127.0.0.1:9999/path', 'http://127.0.0.1:9999/?query=1']) {
    assert.throws(() => createR17PhoneProbeHttpServer({ collector: { store() {} }, publicOrigin, upstreamOrigin: value }), /origin_invalid/);
  }
  assert.throws(() => createR17PhoneProbeHttpServer({ collector: { store() {} }, publicOrigin,
    upstreamOrigin: publicOrigin, apiTimeoutMs: 35_001 }), /deadline_invalid/);
  assert.throws(() => createR17PhoneProbeHttpServer({ collector: { store() {} }, publicOrigin,
    upstreamOrigin: publicOrigin }), /origins_must_differ/);
  const value = createR17PhoneProbeHttpServer({ collector: { store() {} }, publicOrigin, upstreamOrigin: 'http://127.0.0.1:49152' });
  assert.equal(value.server.listening, false);
  assert.deepEqual(value.inspect(), { closing: false, activeTransports: 0, metricsPending: false, metricsStorePending: false });
  await value.close();
});

test('one fixed upstream receives original API requests, controlled origin, raw gzip bytes and conditional responses', async () => {
  const bytes = gzipSync(Buffer.from('real nonempty byte fixture\n'.repeat(200))), seen = [];
  const target = await upstream((request, response) => {
    const chunks = []; request.on('data', chunk => chunks.push(chunk)); request.on('end', () => {
      seen.push({ path: request.url, headers: request.headers, body: Buffer.concat(chunks) });
      if (request.headers['if-none-match'] === '"immutable-fixture"') { response.writeHead(304, { etag: '"immutable-fixture"', 'cache-control': 'public,max-age=31536000,immutable' }); response.end(); }
      else if (request.method === 'POST') { response.writeHead(201, { 'content-type': 'application/json', 'x-request-id': 'fixture-readback' }); response.end(Buffer.concat(chunks)); }
      else { response.writeHead(200, { etag: '"immutable-fixture"', 'content-type': 'image/png', 'content-encoding': 'gzip',
        'content-length': bytes.length, 'cache-control': 'public,max-age=31536000,immutable', connection: 'close, x-hop', 'x-hop': 'remove-me' });
        response.write(bytes.subarray(0, 17)); response.end(bytes.subarray(17)); }
    });
  });
  const api = await bridge(target);
  try {
    const got = await call(api.origin, { path: '/v2/sky/image?key=%2Ffixture', headers: { host: 'untrusted.invalid',
      'x-forwarded-host': 'other.invalid', 'x-forwarded-proto': 'https', forwarded: 'host=other.invalid', authorization: 'fixture-session', 'proxy-connection': 'keep-alive',
      connection: 'close, x-private-hop', 'x-private-hop': 'drop' } });
    assert.equal(got.status, 200); assert(got.body.equals(bytes));
    assert.equal(createHash('sha256').update(got.body).digest('hex'), createHash('sha256').update(bytes).digest('hex'));
    assert.equal(got.headers.etag, '"immutable-fixture"'); assert.equal(got.headers['content-encoding'], 'gzip'); assert.equal(got.headers['x-hop'], undefined);
    assert.equal(seen[0].path, '/v2/sky/image?key=%2Ffixture'); assert.equal(seen[0].headers.host, new URL(publicOrigin).host);
    assert.equal(seen[0].headers['x-forwarded-host'], new URL(publicOrigin).host); assert.equal(seen[0].headers['x-forwarded-proto'], 'http');
    assert.equal(seen[0].headers.forwarded, undefined); assert.equal(seen[0].headers['x-private-hop'], undefined);
    assert.equal(seen[0].headers['proxy-connection'], undefined); assert.equal(seen[0].headers.authorization, 'fixture-session');
    const cached = await call(api.origin, { headers: { 'if-none-match': '"immutable-fixture"' } });
    assert.equal(cached.status, 304); assert.equal(cached.body.length, 0); assert.equal(cached.headers.etag, '"immutable-fixture"');
    const body = Buffer.from('{"selectedAt":"2026-10-28T00:00:00.000Z","label":"观星"}');
    const context = await call(api.origin, { method: 'POST', path: '/v2/observation-contexts/resolve', body,
      headers: { 'content-type': 'application/json', 'idempotency-key': 'fixture-once' } });
    assert.equal(context.status, 201); assert(context.body.equals(body)); assert.equal(context.headers['x-request-id'], 'fixture-readback');
    assert.equal(seen[2].headers['idempotency-key'], 'fixture-once'); assert(seen[2].body.equals(body));
  } finally { await api.close(); await target.close(); }
});

test('request targets, CONNECT and Upgrade cannot select another destination; redirects are returned without following', async () => {
  let hits = 0, redirectedHits = 0;
  const redirected = await upstream((_req, res) => { redirectedHits++; res.end('not reached'); });
  const target = await upstream((_req, res) => { hits++; res.writeHead(302, { location: redirected.origin + '/v2/other' }); res.end('original redirect'); });
  const api = await bridge(target);
  try {
    for (const requestPath of [redirected.origin + '/v2/other', '//127.0.0.1:1/v2/other', '/\\127.0.0.1/v2/other']) {
      assert.equal((await call(api.origin, { path: requestPath })).status, 400);
    }
    assert.match(await raw(api.origin, 'CONNECT 127.0.0.1:1 HTTP/1.1\r\nHost: invalid\r\n\r\n'), /^HTTP\/1\.1 405/);
    assert.match(await raw(api.origin, 'GET /v2/other HTTP/1.1\r\nHost: invalid\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n'), /^HTTP\/1\.1 400/);
    assert.equal(hits, 0); assert.equal(redirectedHits, 0);
    const redirect = await call(api.origin);
    assert.equal(redirect.status, 302); assert.equal(redirect.headers.location, redirected.origin + '/v2/other');
    assert.equal(redirect.body.toString(), 'original redirect'); assert.equal(hits, 1); assert.equal(redirectedHits, 0);
  } finally { await api.close(); await target.close(); await redirected.close(); }
});

test('metrics use the real strict collector and durable readback, preserving exact retry/conflict and missing-native status', async () => {
  const directory = await temp(), target = await upstream((_req, res) => res.end('unused'));
  const api = await bridge(target, { collector: undefined, directory });
  try {
    const value = await actualPacket(), body = JSON.stringify(value);
    assert.equal((await post(api.origin, body)).status, 200);
    const files = await fs.readdir(directory); assert.equal(files.length, 1);
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(directory, files[0]), 'utf8')), value);
    assert.equal((await post(api.origin, body)).status, 200); assert.equal((await fs.readdir(directory)).length, 1);
    const conflict = structuredClone(value); conflict.decode.diagnostics.duplicateRetirements++;
    assert.equal((await post(api.origin, JSON.stringify(conflict))).status, 409);
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(directory, files[0]), 'utf8')), value);
    const invalid = { ...value, runId: '../escape' };
    assert.equal((await post(api.origin, JSON.stringify(invalid))).status, 400); assert.equal((await fs.readdir(directory)).length, 1);
    const dependency = await nativeRegionProbeDependencyStatus();
    const native = await post(api.origin, JSON.stringify({ schemaVersion: 'starward-r17-native-region-v1' }));
    assert.equal(native.status, dependency === 'AVAILABLE' ? 400 : 503); assert.equal((await fs.readdir(directory)).length, 1);
  } finally { await api.close(); await target.close(); await remove(directory); }
});

test('only the exact JSON POST and bounded UTF8 body reach a collector; unknown writes never receive 200', async () => {
  let calls = 0;
  const target = await upstream((_req, res) => { res.writeHead(404); res.end(); });
  const api = await bridge(target, { collector: { store: async () => { calls++; return 200; } } });
  try {
    assert.equal((await call(api.origin, { path: route })).status, 405);
    assert.equal((await call(api.origin, { path: route + '?alias=1', method: 'POST', body: '{}' })).status, 400);
    assert.equal((await post(api.origin, '{}', { 'content-type': 'text/plain' })).status, 415);
    assert.equal((await post(api.origin, '{}', { 'content-encoding': 'gzip' })).status, 415);
    assert.equal((await post(api.origin, '{')).status, 400);
    assert.equal((await post(api.origin, Buffer.from([123, 34, 120, 34, 58, 34, 0xff, 34, 125]))).status, 400);
    assert.equal((await post(api.origin, Buffer.alloc(maxBytes + 1, 32), { 'content-length': String(maxBytes + 1) })).status, 413);
    assert.equal((await call(api.origin, { method: 'POST', path: route, headers: { 'content-type': 'application/json' },
      chunks: [Buffer.alloc(maxBytes, 32), Buffer.from('x')] })).status, 413);
    assert.equal(calls, 0);
  } finally { await api.close(); await target.close(); }
  for (const store of [async () => 201, async () => { throw Error('private-write-outcome'); }]) {
    const stub = await upstream((_req, res) => res.end());
    const unknown = await bridge(stub, { collector: { store } });
    try { const result = await post(unknown.origin, '{}'); assert.equal(result.status, 503); assert.equal(JSON.parse(result.body).outcome, 'unknown'); }
    finally { await unknown.close(); await stub.close(); }
  }
});

test('metrics single-flight survives an unconfirmed store deadline/close without serializing ordinary API work', async () => {
  const pending = deferred(), entered = deferred(); let calls = 0;
  const target = await upstream((_req, res) => res.end('independent API result'));
  const api = await bridge(target, { metricsTimeoutMs: 40, collector: { store() { calls++; entered.resolve(); return pending.promise; } } });
  try {
    const first = post(api.origin, '{}'); await entered.promise;
    assert.equal((await post(api.origin, '{}')).status, 503); assert.equal(calls, 1);
    assert.equal((await call(api.origin)).body.toString(), 'independent API result');
    const timed = await first; assert.equal(timed.status, 504); assert.equal(JSON.parse(timed.body).outcome, 'unknown');
    assert.equal(api.inspect().metricsStorePending, true);
    assert.equal((await post(api.origin, '{}')).status, 503); assert.equal(calls, 1);
    const closing = api.close(); assert.equal(api.close(), closing);
    const closed = await closing; assert.equal(closed.activeTransports, 0); assert.equal(closed.metricsStorePending, true);
    pending.resolve(200); await until(() => !api.inspect().metricsPending);
  } finally { pending.resolve(200); await api.close(); await target.close(); }
});

test('disconnect while storing retains the metrics slot; aborting an unfinished body releases only that unsubmitted slot', async () => {
  const pending = deferred(), entered = deferred(); let calls = 0;
  const target = await upstream((_req, res) => res.end('API'));
  const api = await bridge(target, { collector: { store() { calls++; if (calls === 1) { entered.resolve(); return pending.promise; } return 200; } } });
  try {
    const first = start(api.origin, { method: 'POST', path: route, headers: { 'content-type': 'application/json' }, body: '{}' });
    first.promise.catch(() => {}); await entered.promise; first.request.destroy();
    await until(() => api.inspect().activeTransports === 0);
    assert.equal(api.inspect().metricsStorePending, true); assert.equal((await post(api.origin, '{}')).status, 503); assert.equal(calls, 1);
    pending.resolve(200); await until(() => !api.inspect().metricsPending);
    assert.equal((await post(api.origin, '{}')).status, 200); assert.equal(calls, 2);
    const incomplete = start(api.origin, { method: 'POST', path: route, headers: { 'content-type': 'application/json' }, end: false });
    incomplete.promise.catch(() => {}); incomplete.request.write('{');
    await until(() => api.inspect().metricsPending); assert.equal(api.inspect().metricsStorePending, false);
    assert.equal((await post(api.origin, '{}')).status, 503);
    incomplete.request.destroy(); await until(() => !api.inspect().metricsPending);
    assert.equal((await post(api.origin, '{}')).status, 200); assert.equal(calls, 3);
  } finally { pending.resolve(200); await api.close(); await target.close(); }
});

test('streaming API failure/deadline, client cancellation and factory close retire the owned upstream transport', async () => {
  const modes = ['deadline-before-headers', 'deadline-with-chunks', 'upstream-drop-before-headers',
    'upstream-drop-after-headers', 'client-abort', 'factory-close'];
  for (const mode of modes) {
    const arrived = deferred(), gone = deferred(); let interval, targetResponse, effectBytes = 0;
    const target = await upstream((request, response) => {
      targetResponse = response;
      request.on('data', chunk => { effectBytes += chunk.length; });
      response.once('close', () => { clearInterval(interval); gone.resolve(!response.writableFinished); });
      arrived.resolve();
      if (mode === 'deadline-with-chunks' || mode === 'client-abort') { response.write('first chunk'); interval = setInterval(() => response.write('chunk'), 5); }
      else if (mode === 'upstream-drop-before-headers') response.destroy();
      else if (mode === 'upstream-drop-after-headers') response.write('deliberate partial body');
    });
    const api = await bridge(target, { apiTimeoutMs: mode.startsWith('deadline') ? 40 : 5_000 });
    try {
      if (mode === 'client-abort') {
        const url = new URL(api.origin);
        const request = http.get({ hostname: url.hostname, port: url.port, path: '/v2/stream', agent: false }, response => {
          response.on('error', () => {}); response.once('data', () => response.destroy());
        }); request.on('error', () => {});
        await arrived.promise; assert.equal(await gone.promise, true);
      } else {
        const reading = call(api.origin, mode === 'deadline-before-headers'
          ? { method: 'POST', body: 'explicit fixture effect' }
          : mode === 'upstream-drop-after-headers' ? { onData: () => targetResponse.destroy() } : undefined);
        reading.catch(() => {}); await arrived.promise;
        if (mode === 'factory-close') { await api.close(); await assert.rejects(reading); }
        else if (mode === 'deadline-before-headers') {
          const timed = await reading; assert.equal(timed.status, 504); assert.equal(JSON.parse(timed.body).outcome, 'unknown');
          assert.equal(effectBytes, Buffer.byteLength('explicit fixture effect'), 'the API may have applied a request before its missing response');
        }
        else if (mode === 'upstream-drop-before-headers') { const failed = await reading; assert.equal(failed.status, 502); assert.equal(JSON.parse(failed.body).outcome, 'unknown'); }
        else await assert.rejects(reading, /incomplete|aborted|reset/i);
        assert.equal(await gone.promise, true);
      }
      await until(() => api.inspect().activeTransports === 0);
    } finally { clearInterval(interval); await api.close(); await target.close(); }
  }
});
