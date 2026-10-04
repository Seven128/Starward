// Task-only Sky runtime: current compiled geometry/context and published
// public Sky assets. No private Context or request crosses to an older runtime.
import http from "node:http";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createPublicationBackend } from "./experience-w3-proxy-backend-2026-09-29.mts";

const local = await createPublicationBackend();
const astronomyModuleSha256 = createHash("sha256").update(await readFile(new URL(
  "../../../../workers/miniapp-api/dist/astronomy-service.js", import.meta.url))).digest("hex");
const counts = { local: 0, errors: 0, reports: 0, targets: 0, contextPuts: 0 };
const targetReads: { at: string | null; contextId: string | null; status: number; bytes: number; durationMs: number }[] = [];
let targetMode = "pass", targetDeadline = 0;
const activeTargetMode = () => {
  if (targetDeadline && Date.now() >= targetDeadline) { targetMode = "pass"; targetDeadline = 0; }
  return targetMode;
};
const server = http.createServer((request, response) => {
  response.setHeader("access-control-allow-origin", "*");
  if (request.method === "OPTIONS") {
    response.writeHead(204, { "access-control-allow-methods": "GET,HEAD,POST,PUT,OPTIONS",
      "access-control-allow-headers": "content-type,authorization,if-none-match,if-modified-since" });
    response.end();
    return;
  }
  const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1:60061");
  // Only this loopback task process exposes failure injection and bounded,
  // non-secret Sky request diagnostics. The product controller is unchanged.
  if (requestUrl.pathname === "/__task/time-target-state") {
    if (request.method === "POST") {
      const mode = requestUrl.searchParams.get("mode");
      if (mode !== "pass" && mode !== "fail") { response.writeHead(400); response.end(); return; }
      targetMode = mode; targetDeadline = mode === "fail" ? Date.now() + 120_000 : 0;
    } else if (request.method !== "GET") { response.writeHead(405); response.end(); return; }
    response.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    response.end(JSON.stringify({ mode: activeTargetMode(), counts, targetReads, astronomyModuleSha256 }));
    return;
  }
  if (request.method === "GET" && /^\/v2\/spots\/[^/]+\/sky$/u.test(requestUrl.pathname)) counts.reports++;
  if (request.method === "PUT" && requestUrl.pathname.startsWith("/v2/observation-contexts/")) counts.contextPuts++;
  const isTarget = request.method === "GET" && /^\/v2\/spots\/[^/]+\/sky\/targets$/u.test(requestUrl.pathname);
  const targetRead = isTarget ? { at: requestUrl.searchParams.get("at"), contextId: requestUrl.searchParams.get("contextId"),
    status: 0, bytes: 0, durationMs: 0 } : null;
  const startedAt = Date.now();
  if (targetRead) {
    counts.targets++;
    targetReads.push(targetRead);
    if (targetReads.length > 50) targetReads.shift();
    response.once("finish", () => { targetRead.status = response.statusCode; targetRead.durationMs = Date.now() - startedAt; });
    if (activeTargetMode() === "fail") {
      const body = JSON.stringify({ code: "task_target_unavailable", message: "Task-controlled Sky target HTTP failure" });
      targetRead.bytes = Buffer.byteLength(body);
      response.writeHead(503, { "content-type": "application/json", "cache-control": "no-store" });
      response.end(body);
      return;
    }
  }
  const port = local.port;
  counts.local++;
  const headers = { ...request.headers, host: `127.0.0.1:${port}` };
  const forwarded = http.request({ hostname: "127.0.0.1", port, method: request.method,
    path: request.url, headers }, received => {
    const responseHeaders = { ...received.headers,
      "access-control-allow-origin": "*" };
    delete responseHeaders.connection;
    delete responseHeaders["transfer-encoding"];
    response.writeHead(received.statusCode ?? 502, responseHeaders);
    if (targetRead) received.on("data", chunk => { targetRead.bytes += chunk.length; });
    received.pipe(response);
  });
  forwarded.on("error", () => {
    counts.errors++;
    if (!response.headersSent) response.writeHead(502);
    response.end();
  });
  request.pipe(forwarded);
});
await new Promise<void>((resolve, reject) => {
  server.once("error", reject);
  server.listen(60061, "127.0.0.1", resolve);
});
process.stdout.write(JSON.stringify({ kind: "sky-time-public-resources", port: 60061,
  localPort: local.port, publicationHash: local.publicationHash }) + "\n");
let closing = false;
const close = async () => {
  if (closing) return;
  closing = true;
  await new Promise<void>(resolve => server.close(() => resolve()));
  await local.close();
  process.stdout.write(JSON.stringify({ kind: "sky-time-public-resources-closed", counts }) + "\n");
  process.exit(0);
};
process.once("SIGINT", () => { void close(); });
process.once("SIGTERM", () => { void close(); });
