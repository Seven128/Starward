// TASK ONLY HTTP adapter for the existing collector and one declared Mini API.
// Importing or constructing it never listens, changes a firewall, or starts API/DB work.
import http from 'node:http';
import { isIP } from 'node:net';
import { TextDecoder } from 'node:util';
import { createR17PhoneProbeCollector } from './r17-phone-probe-collector.mjs';
import { R17_PHONE_PROBE_ROUTE, R17_PHONE_PROBE_MAX_BYTES } from './r17-phone-probe-protocol.mjs';

// Existing r25 client POST timeout and Mini API request/handler window, not performance targets.
const METRICS_TIMEOUT_MS = 10_000, API_TIMEOUT_MS = 35_000;
const hopHeaders = ['connection', 'keep-alive', 'proxy-connection', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade'];
const collectorStatuses = new Set([200, 400, 409, 424, 429, 503]);
function origin(value) {
  let url;
  try { url = new URL(value); } catch { throw Error('r17_http_origin_invalid'); }
  if (typeof value !== 'string' || url.protocol !== 'http:' || isIP(url.hostname) !== 4
    || url.hostname === '0.0.0.0' || url.port === '0' || url.username || url.password || url.pathname !== '/' || url.search || url.hash)
    throw Error('r17_http_origin_invalid');
  return url;
}
function timeout(value, maximum) {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) throw Error('r17_http_deadline_invalid');
  return value;
}
function endToEndHeaders(headers) {
  const omitted = new Set([...hopHeaders, ...String(headers.connection ?? '').split(',').map(value => value.trim().toLowerCase())]);
  return Object.fromEntries(Object.entries(headers).filter(([name, value]) => value !== undefined && !omitted.has(name.toLowerCase())));
}
function reply(response, status, unknown = false) {
  if (response.destroyed || response.writableEnded) return;
  if (response.headersSent) { response.destroy(); return; }
  const body = JSON.stringify(status === 200 ? { stored: true } : { acknowledged: false, ...(unknown ? { outcome: 'unknown' } : {}) });
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store', connection: 'close', ...(status === 405 ? { allow: 'POST' } : {}) });
  response.end(body);
}
function rejectSocket(socket, status) {
  socket.end(`HTTP/1.1 ${status} Unsupported\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
}

/** Pure factory. Call server.listen explicitly only after the Root's network admission.
 * close() cancels owned transport, not an already-started collector write or API effect.
 * Smaller timeout options support bounded local tests; the existing maximums cannot expand.
 */
export function createR17PhoneProbeHttpServer({ directory, collector, upstreamOrigin, publicOrigin,
  metricsTimeoutMs = METRICS_TIMEOUT_MS, apiTimeoutMs = API_TIMEOUT_MS } = {}) {
  const upstream = origin(upstreamOrigin), publicUrl = origin(publicOrigin);
  metricsTimeoutMs = timeout(metricsTimeoutMs, METRICS_TIMEOUT_MS);
  apiTimeoutMs = timeout(apiTimeoutMs, API_TIMEOUT_MS);
  if (upstream.origin === publicUrl.origin) throw Error('r17_http_origins_must_differ');
  if (collector !== undefined && directory !== undefined) throw Error('r17_http_one_collector_required');
  const store = collector ?? createR17PhoneProbeCollector(directory);
  if (!store || typeof store.store !== 'function') throw Error('r17_http_collector_required');
  const active = new Set(), sockets = new Set();
  let closing = false, closePromise, metricsOwner;
  const inspect = () => ({ closing, activeTransports: active.size, metricsPending: Boolean(metricsOwner),
    metricsStorePending: Boolean(metricsOwner?.storeStarted && !metricsOwner.settled) });
  const server = http.createServer({ requestTimeout: API_TIMEOUT_MS, headersTimeout: API_TIMEOUT_MS,
    keepAliveTimeout: 10_000 }, (request, response) => {
    if (closing) { reply(response, 503); return; }
    const rawPath = request.url;
    if (typeof rawPath !== 'string' || !rawPath.startsWith('/') || rawPath.startsWith('//')
      || /[\\\x00-\x20\x7f]/u.test(rawPath) || request.method === 'CONNECT' || request.headers.upgrade) {
      reply(response, 400); request.resume(); return;
    }
    const metrics = rawPath.split('?')[0] === R17_PHONE_PROBE_ROUTE;
    let outgoing, incoming, timer, complete = false, metric;
    const releaseMetric = () => {
      if (metric && metricsOwner === metric && (!metric.storeStarted || metric.settled)) metricsOwner = undefined;
    };
    const cleanup = () => { clearTimeout(timer); active.delete(cancel); releaseMetric(); };
    const cancel = () => {
      if (complete) return;
      complete = true; cleanup();
      if (outgoing) { request.unpipe(outgoing); outgoing.destroy(); }
      incoming?.destroy(); response.destroy();
    };
    const finish = (status, unknown = false) => {
      if (complete) return;
      complete = true; cleanup();
      if (outgoing) { request.unpipe(outgoing); outgoing.destroy(); }
      incoming?.destroy(); reply(response, status, unknown);
    };
    active.add(cancel);
    request.once('aborted', cancel);
    request.once('error', cancel);
    response.once('close', () => { if (!response.writableFinished) cancel(); else cleanup(); });
    response.once('finish', () => {
      complete = true; cleanup();
      if (outgoing) { request.unpipe(outgoing); outgoing.destroy(); }
      incoming?.destroy(); if (!request.complete) request.destroy();
    });
    timer = setTimeout(() => finish(504, metrics ? Boolean(metric?.storeStarted) : Boolean(outgoing)), metrics ? metricsTimeoutMs : apiTimeoutMs);
    if (metrics) {
      if (rawPath !== R17_PHONE_PROBE_ROUTE) { finish(400); request.resume(); return; }
      if (request.method !== 'POST') { finish(405); request.resume(); return; }
      const type = String(request.headers['content-type'] ?? '').toLowerCase();
      if (!/^application\/json(?:\s*;\s*charset=(?:"?utf-8"?|"?utf8"?))?\s*$/u.test(type)
        || request.headers['content-encoding'] && request.headers['content-encoding'] !== 'identity') {
        finish(415); request.resume(); return;
      }
      const declared = request.headers['content-length'];
      if (declared !== undefined && (!/^\d+$/u.test(declared) || Number(declared) > R17_PHONE_PROBE_MAX_BYTES)) {
        finish(413); request.resume(); return;
      }
      if (metricsOwner) { finish(503); request.resume(); return; }
      metric = { storeStarted: false, settled: false }; metricsOwner = metric;
      const chunks = []; let bytes = 0;
      request.on('data', chunk => {
        if (complete) return;
        bytes += chunk.length;
        if (bytes > R17_PHONE_PROBE_MAX_BYTES) { chunks.length = 0; finish(413); return; }
        chunks.push(chunk);
      });
      request.once('end', async () => {
        if (complete) return;
        let value;
        try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks, bytes))); }
        catch { chunks.length = 0; finish(400); return; }
        chunks.length = 0;
        try {
          // A disconnect/deadline after this point cannot undo the store. Only its 200 is acknowledged.
          metric.storeStarted = true;
          const result = await store.store(value);
          finish(collectorStatuses.has(result) ? result : 503, !collectorStatuses.has(result));
        } catch { finish(503, true); }
        finally { metric.settled = true; releaseMetric(); }
      });
      return;
    }
    const headers = endToEndHeaders(request.headers);
    for (const name of Object.keys(headers)) if (name === 'forwarded' || name.startsWith('x-forwarded-')) delete headers[name];
    headers.host = publicUrl.host;
    headers['x-forwarded-host'] = publicUrl.host;
    headers['x-forwarded-proto'] = publicUrl.protocol.slice(0, -1);
    headers['x-forwarded-port'] = publicUrl.port || '80';
    try {
      outgoing = http.request({ hostname: upstream.hostname, port: upstream.port || 80,
        method: request.method, path: rawPath, headers, agent: false }, upstreamResponse => {
        if (complete) { upstreamResponse.destroy(); return; }
        incoming = upstreamResponse;
        response.writeHead(upstreamResponse.statusCode, endToEndHeaders(upstreamResponse.headers));
        upstreamResponse.once('aborted', cancel);
        upstreamResponse.once('error', cancel);
        upstreamResponse.pipe(response);
      });
      outgoing.once('error', () => { if (!incoming) finish(502, true); });
      request.pipe(outgoing);
    } catch { finish(502); }
  });
  server.maxRequestsPerSocket = 1_000;
  server.on('connection', socket => { sockets.add(socket); socket.once('close', () => sockets.delete(socket)); });
  server.on('upgrade', (_request, socket) => rejectSocket(socket, 400));
  server.on('connect', (_request, socket) => rejectSocket(socket, 405));
  return { server, inspect, close() {
    return closePromise ??= new Promise((resolve, reject) => {
      closing = true;
      for (const cancel of [...active]) cancel();
      for (const socket of sockets) socket.destroy();
      server.close(error => error && error.code !== 'ERR_SERVER_NOT_RUNNING' ? reject(error) : resolve(inspect()));
    });
  } };
}
