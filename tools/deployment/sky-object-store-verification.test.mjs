import assert from "node:assert/strict";
import http from "node:http";
import { gzipSync } from "node:zlib";
import test from "node:test";
import { prepareSkyObjectStorePackage } from "./sky-object-store-package.mjs";
import { verifySkyObjectStoreDelivery } from "./sky-object-store-verification.mjs";
import { requestSkyStaticBytes } from "./sky-static-http.mjs";
import { objectStoreFixture } from "./sky-object-store-test-support.mjs";

/** This deliberately supplies an HTTP contract oracle, not an ESA rule
 * interpreter. Provider rule compilation and real TLS/CDN stay unverified. */
async function served(t, mode = "valid") {
  const s = await objectStoreFixture(t), prepared = await prepareSkyObjectStorePackage(s.args), calls = [];
  const server = http.createServer((request, response) => {
    const key = new URL(request.url, "http://local.invalid").pathname.slice(1);
    calls.push({ key, method: request.method, range: request.headers.range ?? null, preview: Boolean(request.headers["x-starward-operator-preview"]),
      credentials: Boolean(request.headers.authorization || request.headers.cookie), encoding: request.headers["accept-encoding"] });
    const input = s.inputs.find(input => input.route.slice(1) + (mode === "physical-key" && input.route === s.base ? ".tile" : "") === key);
    if (!input || mode === "unavailable") { response.writeHead(mode === "unavailable" ? 503 : 404, { "content-length": "0" }); response.end(); return; }
    const headers = { ...input.headers, "x-starward-sky-delivery": mode === "api-fallback" ? "static" : "oss", "content-length": String(input.bytes.length) };
    if (mode === "missing-metadata" || mode === "head-metadata" && request.method === "HEAD") delete headers["x-starward-image-source"];
    if (mode === "encoded") headers["content-encoding"] = "gzip";
    const ranged = request.headers.range, end = ranged ? Number(ranged.match(/^bytes=0-(\d+)$/u)?.[1]) : undefined;
    let body = Buffer.from(input.bytes), status = 200;
    if (ranged && mode !== "range-ignored") {
      status = mode === "range-status" ? 200 : 206; body = body.subarray(0, end + 1);
      headers["content-range"] = `bytes 0-${end}/${input.bytes.length + (mode === "range-total" ? 1 : 0)}`;
      headers["content-length"] = String(body.length);
    }
    if (mode === "body" && !ranged || mode === "range-body" && ranged) body[0] ^= 1;
    if (mode === "encoded") { body = gzipSync(body); headers["content-length"] = String(body.length); }
    response.writeHead(status, headers); response.end(request.method === "HEAD" ? undefined : body);
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const port = server.address().port;
  const fetchImpl = (url, options) => {
    const parsed = new URL(url); assert.equal(parsed.origin, s.args.resourceOrigin);
    assert.deepEqual(Object.keys(options.headers).sort(), options.headers.Range ? ["Accept-Encoding", "Range"] : ["Accept-Encoding"]);
    assert.equal(options.redirect, "error"); assert(options.signal instanceof AbortSignal);
    return fetch(`http://127.0.0.1:${port}${parsed.pathname}`, options);
  };
  return { ...s, calls, args: { ...s.args, packageDirectory: prepared.directory, fetchImpl } };
}

test("public resource readback checks all exact GETs and grouped HEAD/ranges over real HTTP without credentials", async t => {
  const s = await served(t), result = await verifySkyObjectStoreDelivery(s.args);
  assert.equal(result.status, "PASSED_OBJECT_STORE_HTTP_CONTRACT");
  assert.equal(result.checkedFiles, 3); assert.equal(result.checkedBytes, s.inputs.reduce((total, input) => total + input.bytes.length, 0));
  assert.equal(result.checkedHeads, 3); assert.equal(result.checkedRanges, 3);
  assert.equal(s.calls.length, 9);
  // Node fetch may append a second identity token when adding Range. Both
  // tokens still require an unencoded representation; gzip/br must fail.
  assert(s.calls.every(call => !call.preview && !call.credentials && call.encoding &&
    call.encoding.split(",").every(value => value.trim() === "identity")));
  assert(s.calls.some(call => call.key === s.base.slice(1)));
  assert(s.calls.some(call => call.key === s.base.slice(1) + "/index"));
  assert.equal(result.sourceAdmission, "SEALED_LOCAL_BUNDLE_INTEGRITY_ONLY");
  assert.equal(result.cdnCacheAndCapacity, "UNVERIFIED");
});

test("wrong object layout, transformed bytes, missing metadata, API fallback and malformed range contracts fail", async t => {
  for (const [mode, code] of [
    ["physical-key", /http_identity_mismatch/u], ["body", /http_identity_mismatch/u], ["missing-metadata", /http_header_mismatch/u],
    ["head-metadata", /http_header_mismatch/u], ["encoded", /http_delivery_invalid/u], ["api-fallback", /http_delivery_invalid/u],
    ["range-ignored", /http_(?:range_invalid|body_too_large)/u], ["range-status", /http_range_invalid/u],
    ["range-total", /http_range_invalid/u], ["range-body", /http_range_identity_mismatch/u],
  ]) await t.test(mode, async child => { const s = await served(child, mode); await assert.rejects(verifySkyObjectStoreDelivery(s.args), code); });
});

test("resource failure makes one resource request and never falls back to an API or retries", async t => {
  const s = await served(t, "unavailable");
  await assert.rejects(verifySkyObjectStoreDelivery(s.args), /http_identity_mismatch/u);
  assert.equal(s.calls.length, 1); assert.equal(s.calls[0].preview, false);
});

test("shared HTTP transport cancels an excessive streaming response and rejects invalid limits", async () => {
  let cancelled = false;
  const body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(5)); }, cancel() { cancelled = true; } });
  await assert.rejects(requestSkyStaticBytes(new URL("https://sky-assets.invalid/file"), { headers: {}, method: "GET", maximumBytes: 4,
    fetchImpl: async () => new Response(body) }), /http_body_too_large/u);
  assert.equal(cancelled, true);
  await assert.rejects(requestSkyStaticBytes(new URL("https://sky-assets.invalid/file"), { maximumBytes: NaN }), /http_limit_invalid/u);
});
