import https from "node:https";
import { publicIpTlsOptions } from "./operator-preview-tls.mjs";

/** The static release and independent resource-origin readbacks share bounded
 * byte transport. Authentication, route admission and acceptance stay with the
 * caller; this transport neither follows redirects nor retries another host. */
export async function requestSkyStaticBytes(url, { headers, method, maximumBytes, preview = false, fetchImpl }) {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 0) throw new Error("sky_static_http_limit_invalid");
  if (fetchImpl) {
    const response = await fetchImpl(url.toString(), { headers, method, redirect: "error", signal: AbortSignal.timeout(15_000) });
    let bytes;
    if (response.body?.getReader) {
      const reader = response.body.getReader(), chunks = []; let count = 0;
      try {
        for (;;) {
          const part = await reader.read();
          if (part.done) break;
          count += part.value.byteLength;
          if (count > maximumBytes) throw new Error("sky_static_http_body_too_large");
          chunks.push(Buffer.from(part.value));
        }
        bytes = Buffer.concat(chunks, count);
      } catch (error) { await reader.cancel().catch(() => {}); throw error; }
      finally { reader.releaseLock(); }
    } else bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > maximumBytes) throw new Error("sky_static_http_body_too_large");
    return { status: response.status, headers: response.headers, bytes };
  }
  return new Promise((resolve, reject) => {
    const options = preview ? publicIpTlsOptions(url.hostname) : {};
    let deadline;
    const rejectRequest = error => { clearTimeout(deadline); reject(error); };
    const request = https.request(url, { ...options, headers, method, timeout: 15_000 }, response => {
      const chunks = []; let count = 0;
      response.on("data", chunk => {
        count += chunk.length;
        if (count > maximumBytes) { request.destroy(new Error("sky_static_http_body_too_large")); return; }
        chunks.push(chunk);
      });
      response.on("aborted", () => rejectRequest(new Error("sky_static_http_body_incomplete")));
      response.on("error", rejectRequest);
      response.on("end", () => {
        clearTimeout(deadline);
        resolve({ status: response.statusCode, headers: new Headers(response.headers), bytes: Buffer.concat(chunks, count) });
      });
    });
    // The socket timeout bounds inactivity; this deadline also bounds peers
    // that keep a response open by sending small periodic chunks.
    deadline = setTimeout(() => request.destroy(new Error("sky_static_http_timeout")), 15_000);
    request.on("timeout", () => request.destroy(new Error("sky_static_http_timeout")));
    request.on("error", rejectRequest);
    request.end();
  });
}
