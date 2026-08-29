import tls from "node:tls";
import { setTimeout as delay } from "node:timers/promises";

// The preview has public PKI now. Never inherit an extra/private CA or skip IP SAN checks.
export function publicIpTlsOptions(ip) {
  return {
    host: ip, port: 443, servername: "", ca: tls.rootCertificates,
    rejectUnauthorized: true, minVersion: "TLSv1.2",
    checkServerIdentity: (_name, certificate) => tls.checkServerIdentity(ip, certificate),
  };
}

export function certificateLifetime(certificate, now = Date.now()) {
  const starts = Date.parse(certificate.valid_from);
  const expires = Date.parse(certificate.valid_to);
  if (!Number.isFinite(starts) || !Number.isFinite(expires) || starts > now || expires - now < 86_400_000)
    throw new Error("operator_preview_certificate_invalid_or_expiring");
  return { validFrom: new Date(starts).toISOString(), expiresAt: new Date(expires).toISOString() };
}

export function inspectPublicIpCertificate(ip) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(publicIpTlsOptions(ip));
    const deadline = setTimeout(() => socket.destroy(new Error("operator_preview_certificate_timeout")), 10_000);
    socket.once("secureConnect", () => {
      try { resolve(certificateLifetime(socket.getPeerCertificate())); }
      catch (error) { reject(error); }
      finally { clearTimeout(deadline); socket.destroy(); }
    });
    socket.once("error", () => { clearTimeout(deadline); reject(new Error("operator_preview_public_certificate_unavailable")); });
  });
}

export async function waitForPublicIpCertificate({ ip, probe = inspectPublicIpCertificate, sleep = delay, now = Date.now, timeoutMs = 180_000 }) {
  const deadline = now() + timeoutMs;
  for (;;) {
    try { return await probe(ip); }
    catch (error) {
      if (error.message !== "operator_preview_public_certificate_unavailable" || now() >= deadline) throw error;
      await sleep(Math.min(2_000, deadline - now()));
    }
  }
}
