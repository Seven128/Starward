import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import { inspectPublicTls, publicReadiness } from "./public-readiness.mjs";
import { releaseImageDigest, releaseRevision } from "./test-support.mjs";

const securityHeaders = Object.freeze({
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
});

const tlsEvidence = Object.freeze({
  protocol: "TLSv1.3",
  certificateValidTo: "2026-10-01T00:00:00.000Z",
  certificateFingerprint256: "AA:".repeat(31) + "AA",
  remoteAddress: "203.0.113.10",
});

const validation = Object.freeze({
  environment: "staging",
  domain: "api-staging.starward.test",
  revision: releaseRevision,
  imageDigest: releaseImageDigest,
});

function clock() {
  let tick = 0;
  return () => new Date(Date.parse("2026-08-26T12:00:00.000Z") + tick++ * 1_000);
}

function readyResponse({ headers = {}, url = `https://${validation.domain}/health/ready` } = {}) {
  const response = new Response(JSON.stringify({
    status: "ready",
    release: {
      environment: validation.environment,
      revision: validation.revision,
      imageDigest: validation.imageDigest,
    },
  }), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8", ...securityHeaders, ...headers },
  });
  Object.defineProperty(response, "url", { value: url });
  return response;
}

test("public readiness retries transient reachability then records bounded HTTPS and TLS evidence", async () => {
  let attempts = 0;
  let delays = 0;
  const result = await publicReadiness({
    validation,
    fetchImpl: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("temporary_network_failure");
      return readyResponse();
    },
    inspectTls: async ({ domain }) => {
      assert.equal(domain, validation.domain);
      return tlsEvidence;
    },
    delay: async (milliseconds) => {
      assert.equal(milliseconds, 2_000);
      delays += 1;
    },
    now: clock(),
  });
  assert.equal(attempts, 2);
  assert.equal(delays, 1);
  assert.deepEqual(result.tls, tlsEvidence);
});

test("public readiness fails closed without retry for redirects, invalid headers and oversized bodies", async () => {
  const cases = [
    {
      code: /release_public_url_mismatch/u,
      response: readyResponse({ url: "https://redirected.starward.test/health/ready" }),
    },
    {
      code: /release_public_security_header_invalid:referrer-policy/u,
      response: readyResponse({ headers: { "referrer-policy": "unsafe-url" } }),
    },
    {
      code: /release_public_body_size_invalid/u,
      response: readyResponse({ headers: { "content-length": String(64 * 1024 + 1) } }),
    },
  ];
  for (const sample of cases) {
    let attempts = 0;
    let tlsCalls = 0;
    await assert.rejects(
      () => publicReadiness({
        validation,
        fetchImpl: async () => {
          attempts += 1;
          return sample.response;
        },
        inspectTls: async () => {
          tlsCalls += 1;
          return tlsEvidence;
        },
        delay: async () => assert.fail("permanent failures must not retry"),
      }),
      sample.code,
    );
    assert.equal(attempts, 1);
    assert.equal(tlsCalls, 0);
  }
});

function fakeTlsSocket({ validTo, protocol = "TLSv1.3", fingerprint256 = "AA:".repeat(31) + "AA" }) {
  const socket = new EventEmitter();
  socket.authorized = true;
  socket.remoteAddress = "203.0.113.10";
  socket.destroyedByProbe = false;
  socket.setTimeout = () => socket;
  socket.destroy = () => { socket.destroyedByProbe = true; };
  socket.getProtocol = () => protocol;
  socket.getPeerCertificate = () => ({ valid_to: validTo, fingerprint256 });
  return socket;
}

test("TLS inspection enforces system authorization, protocol, certificate lifetime and cleanup", async () => {
  const now = new Date("2026-08-26T12:00:00.000Z");
  const validSocket = fakeTlsSocket({ validTo: "Oct 01 00:00:00 2026 GMT" });
  const evidence = await inspectPublicTls({
    domain: "api.starward.test",
    now,
    connect(options, connected) {
      assert.deepEqual(options, {
        host: "api.starward.test",
        port: 443,
        servername: "api.starward.test",
        rejectUnauthorized: true,
        minVersion: "TLSv1.2",
      });
      queueMicrotask(connected);
      return validSocket;
    },
  });
  assert.equal(evidence.protocol, "TLSv1.3");
  assert.equal(validSocket.destroyedByProbe, true);

  const expiringSocket = fakeTlsSocket({ validTo: "Aug 30 00:00:00 2026 GMT" });
  await assert.rejects(
    () => inspectPublicTls({
      domain: "api.starward.test",
      now,
      connect(_options, connected) {
        queueMicrotask(connected);
        return expiringSocket;
      },
    }),
    /release_tls_certificate_expiring/u,
  );
  assert.equal(expiringSocket.destroyedByProbe, true);
});
