// New isolated task epoch. Real compiled Sky controllers/publications; no
// private Context is copied from 60061 and no product response is rewritten.
import http from "node:http";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createPublicationBackend } from "./experience-w3-proxy-backend-2026-09-29.mts";
const local = await createPublicationBackend();
const sha = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const moduleSha256 = sha(await readFile(new URL("../../../../workers/miniapp-api/dist/chinese-star-alias-publication.js", import.meta.url)));
const publication = JSON.parse(await readFile(new URL("../../../../workers/miniapp-api/assets/celestial-names-v3/publication.json", import.meta.url), "utf8"));
const counts = { requests: 0, search: 0, information: 0, position: 0, report: 0, targets: 0, contextPuts: 0, errors: 0 };
const reads: { kind: string; query: string | null; reference: string | null; status: number; bytes: number; sha256: string }[] = [];
const server = http.createServer((request, response) => {
  response.setHeader("access-control-allow-origin", "*");
  if (request.method === "OPTIONS") {
    response.writeHead(204, { "access-control-allow-methods": "GET,HEAD,POST,PUT,OPTIONS",
      "access-control-allow-headers": "content-type,authorization,if-none-match,if-modified-since" });
    response.end(); return;
  }
  const url = new URL(request.url ?? "/", "http://127.0.0.1:60065");
  if (request.method === "GET" && url.pathname === "/__task/alias-state") {
    response.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    response.end(JSON.stringify({ scope: "task-local MEMORY_TEST weather/spot, real compiled Sky",
      publicPort: 60065, localPort: local.port, moduleSha256,
      catalogVersion: publication.catalogVersion, publicationHash: publication.assetSha256, counts, reads }));
    return;
  }
  counts.requests++;
  if (request.method === "GET" && /^\/v2\/spots\/[^/]+\/sky$/u.test(url.pathname)) counts.report++;
  if (request.method === "GET" && /^\/v2\/spots\/[^/]+\/sky\/targets$/u.test(url.pathname)) counts.targets++;
  if (request.method === "PUT" && url.pathname.startsWith("/v2/observation-contexts/")) counts.contextPuts++;
  const kind = request.method !== "GET" ? null : url.pathname === "/v2/celestial-objects" ? "search" :
    /^\/v2\/celestial-objects\/[^/]+\/position$/u.test(url.pathname) ? "position" :
    /^\/v2\/celestial-objects\/[^/]+$/u.test(url.pathname) ? "information" : null;
  const record = kind ? { kind, query: url.searchParams.get("q"),
    reference: kind === "search" ? null : decodeURIComponent(url.pathname.split("/")[3]!), status: 0, bytes: 0, sha256: "" } : null;
  if (kind) counts[kind as "search" | "information" | "position"]++;
  if (record) { reads.push(record); if (reads.length > 80) reads.shift(); }
  const forwarded = http.request({ hostname: "127.0.0.1", port: local.port, method: request.method,
    path: request.url, headers: { ...request.headers, host: `127.0.0.1:${local.port}` } }, received => {
    const headers = { ...received.headers, "access-control-allow-origin": "*" };
    delete headers.connection; delete headers["transfer-encoding"];
    response.writeHead(received.statusCode ?? 502, headers);
    if (record) {
      record.status = received.statusCode ?? 502;
      const digest = createHash("sha256");
      received.on("data", chunk => { record.bytes += chunk.length; digest.update(chunk); });
      received.once("end", () => { record.sha256 = digest.digest("hex"); });
    }
    received.pipe(response);
  });
  response.once("close", () => { if (!response.writableFinished) forwarded.destroy(); });
  forwarded.on("error", () => {
    if (response.destroyed) return;
    counts.errors++; if (!response.headersSent) response.writeHead(502); response.end();
  });
  request.pipe(forwarded);
});
await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(60065, "127.0.0.1", resolve); });
process.stdout.write(JSON.stringify({ kind: "sky-alias-v44", publicPort: 60065, localPort: local.port,
  moduleSha256, publicationHash: publication.assetSha256 }) + "\n");
let closing = false;
const close = async () => {
  if (closing) return; closing = true;
  await new Promise<void>(resolve => server.close(() => resolve())); await local.close(); process.exit(0);
};
process.once("SIGINT", () => { void close(); }); process.once("SIGTERM", () => { void close(); });
