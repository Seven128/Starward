import { connect as tlsConnect } from "node:tls";

const publicResponseMaximumBytes = 64 * 1024;
const minimumCertificateValidityMs = 7 * 24 * 60 * 60 * 1000;
const requiredSecurityHeaders = Object.freeze({
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
});

async function boundedJson(response) {
  const declaredLength = response.headers.get("content-length");
  if (declaredLength !== null) {
    const parsed = Number(declaredLength);
    if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > publicResponseMaximumBytes)
      throw new Error("release_public_body_size_invalid");
  }
  if (!response.body || typeof response.body.getReader !== "function")
    throw new Error("release_public_body_missing");
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > publicResponseMaximumBytes) {
        await reader.cancel();
        throw new Error("release_public_body_too_large");
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks, total).toString("utf8"));
  } catch {
    throw new Error("release_public_json_invalid");
  }
}

function verifyPublicResponse({ response, url }) {
  if (response.url !== url) throw new Error("release_public_url_mismatch");
  const contentType = response.headers.get("content-type") ?? "";
  if (!/^application\/json(?:\s*;|$)/iu.test(contentType))
    throw new Error("release_public_content_type_invalid");
  if (response.headers.get("server") !== null)
    throw new Error("release_public_server_header_exposed");
  for (const [name, expected] of Object.entries(requiredSecurityHeaders)) {
    if (response.headers.get(name) !== expected)
      throw new Error(`release_public_security_header_invalid:${name}`);
  }
}

export function inspectPublicTls({ domain, now = new Date(), connect = tlsConnect }) {
  return new Promise((resolve, reject) => {
    let socket;
    let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      socket?.destroy();
      if (error) reject(error);
      else resolve(value);
    };
    try {
      socket = connect({
        host: domain,
        port: 443,
        servername: domain,
        rejectUnauthorized: true,
        minVersion: "TLSv1.2",
      }, () => {
        try {
          if (socket.authorized !== true) throw new Error("release_tls_peer_invalid");
          const protocol = socket.getProtocol();
          if (protocol !== "TLSv1.2" && protocol !== "TLSv1.3")
            throw new Error("release_tls_protocol_unsupported");
          const certificate = socket.getPeerCertificate();
          const validTo = Date.parse(certificate.valid_to ?? "");
          if (!Number.isFinite(validTo) || validTo - now.getTime() < minimumCertificateValidityMs)
            throw new Error("release_tls_certificate_expiring");
          if (!/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/iu.test(certificate.fingerprint256 ?? ""))
            throw new Error("release_tls_certificate_fingerprint_invalid");
          if (!socket.remoteAddress) throw new Error("release_tls_peer_invalid");
          finish(null, Object.freeze({
            protocol,
            certificateValidTo: new Date(validTo).toISOString(),
            certificateFingerprint256: certificate.fingerprint256.toUpperCase(),
            remoteAddress: socket.remoteAddress,
          }));
        } catch (error) {
          finish(error);
        }
      });
      socket.setTimeout(10_000, () => finish(new Error("release_tls_timeout")));
      socket.once("error", () => finish(new Error("release_tls_unreachable")));
    } catch {
      finish(new Error("release_tls_unreachable"));
    }
  });
}

function permanentPublicFailure(error) {
  return error instanceof Error && /^(?:release_health_identity_mismatch|release_public_|release_tls_(?:certificate|peer|protocol))/u.test(error.message);
}

export async function publicReadiness({
  validation,
  fetchImpl = fetch,
  inspectTls = ({ domain, now }) => inspectPublicTls({ domain, now }),
  delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now = () => new Date(),
}) {
  const url = `https://${validation.domain}/health/ready`;
  let lastCode = "release_health_unreachable";
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        signal: AbortSignal.timeout(10_000),
        redirect: "error",
        headers: { accept: "application/json" },
      });
      if (!response.ok) {
        lastCode = `release_health_http_${response.status}`;
      } else {
        verifyPublicResponse({ response, url });
        const body = await boundedJson(response);
        if (
          body.status !== "ready" ||
          body.release?.environment !== validation.environment ||
          body.release?.revision !== validation.revision ||
          body.release?.imageDigest !== validation.imageDigest
        ) throw new Error("release_health_identity_mismatch");
        const tls = await inspectTls({ domain: validation.domain, now: now() });
        return Object.freeze({
          status: body.status,
          release: body.release,
          http: Object.freeze({ url, securityHeaders: "passed" }),
          tls,
        });
      }
    } catch (error) {
      if (permanentPublicFailure(error)) throw error;
      lastCode = "release_health_unreachable";
    }
    if (attempt < 12) await delay(2_000);
  }
  throw new Error(lastCode);
}
