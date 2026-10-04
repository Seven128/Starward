// Task-only loopback proxy. All responses are from the existing current BFF
// epoch; no Context is migrated, no published tile is replaced or invented.
import http from "node:http";
import { createHash } from "node:crypto";

const port = 60063, upstreamPort = 60061;
const counts = { other: 0, indexes: 0, tiles: 0, failedTiles: 0, delayedTiles: 0,
  abortedTiles: 0, activeTiles: 0, maxActiveTiles: 0, upstreamErrors: 0 };
type TileRead = { sequence: number; tileId: string; publicationHash: string;
  mode: string; delayMs: number; ifNoneMatch: boolean; receivedAt: string;
  upstreamStatus: number | null; status: number | null; bytes: number;
  sha256: string | null; aborted: boolean; durationMs: number | null };
const tileReads: TileRead[] = [];
let mode = "pass", tileId = "*", delayMs = 8_000, deadline = 0;
function activeMode() {
  if (deadline && Date.now() >= deadline) { mode = "pass"; deadline = 0; }
  return mode;
}
const server = http.createServer((request, response) => {
  response.setHeader("access-control-allow-origin", "*");
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);
  if (url.pathname === "/__task/sao-state") {
    if (request.method === "POST") {
      const nextMode = url.searchParams.get("mode"), nextId = url.searchParams.get("tileId") ?? "*";
      const nextDelay = Number(url.searchParams.get("delayMs") ?? 8_000);
      if (!["pass", "fail", "delay"].includes(nextMode ?? "") ||
          (nextId !== "*" && !/^\d{2}-\d{2}-\d{1,2}-\d+$/u.test(nextId)) ||
          !Number.isInteger(nextDelay) || nextDelay < 1 || nextDelay > 10_000) {
        response.writeHead(400).end(); return;
      }
      mode = nextMode!; tileId = nextId; delayMs = nextDelay;
      deadline = mode === "pass" ? 0 : Date.now() + 120_000;
    } else if (request.method !== "GET") { response.writeHead(405).end(); return; }
    response.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    response.end(JSON.stringify({ port, upstreamPort, mode: activeMode(), tileId, delayMs,
      modeDeadline: deadline ? new Date(deadline).toISOString() : null, counts, tileReads }));
    return;
  }
  const tile = request.method === "GET" ? url.pathname.match(
    /^\/v2\/sky\/supplements\/sao\/v2\/([a-f0-9]{64})\/tiles\/(\d{2}-\d{2}-\d{1,2}-\d+)$/u) : null;
  const isIndex = request.method === "GET" && url.pathname === "/v2/sky/supplements/sao/v2";
  let read: TileRead | null = null, timer: ReturnType<typeof setTimeout> | undefined;
  let forwarded: http.ClientRequest | undefined;
  const started = Date.now();
  if (tile) {
    counts.tiles++; counts.activeTiles++; counts.maxActiveTiles = Math.max(counts.maxActiveTiles, counts.activeTiles);
    const requestMode = tileId === "*" || tileId === tile[2] ? activeMode() : "pass";
    read = { sequence: counts.tiles, tileId: tile[2]!, publicationHash: tile[1]!, mode: requestMode,
      delayMs: requestMode === "delay" ? delayMs : 0, ifNoneMatch: Boolean(request.headers["if-none-match"]),
      receivedAt: new Date(started).toISOString(), upstreamStatus: null, status: null, bytes: 0,
      sha256: null, aborted: false, durationMs: null };
    tileReads.push(read); if (tileReads.length > 200) tileReads.shift();
    let finished = false;
    const settle = (aborted: boolean) => {
      if (finished) return; finished = true;
      counts.activeTiles--; read!.aborted = aborted; read!.durationMs = Date.now() - started;
      if (aborted) { counts.abortedTiles++; if (timer) clearTimeout(timer); forwarded?.destroy(); }
      else read!.status = response.statusCode;
    };
    response.once("finish", () => settle(false));
    response.once("close", () => { if (!response.writableFinished) settle(true); });
  } else if (isIndex) counts.indexes++; else counts.other++;
  const forward = () => {
    if (response.destroyed) return;
    forwarded = http.request({ hostname: "127.0.0.1", port: upstreamPort, method: request.method,
      path: request.url, headers: { ...request.headers, host: `127.0.0.1:${upstreamPort}` } }, received => {
      if (read) read.upstreamStatus = received.statusCode ?? 502;
      const headers = { ...received.headers, "access-control-allow-origin": "*" };
      delete headers.connection; delete headers["transfer-encoding"];
      response.writeHead(received.statusCode ?? 502, headers);
      const digest = read ? createHash("sha256") : null;
      received.on("data", chunk => { if (read) { read.bytes += chunk.length; digest!.update(chunk); } });
      received.once("end", () => { if (read) read.sha256 = digest!.digest("hex"); });
      received.pipe(response);
    });
    forwarded.on("error", () => {
      if (response.destroyed) return;
      counts.upstreamErrors++; if (!response.headersSent) response.writeHead(502); response.end();
    });
    request.pipe(forwarded);
  };
  if (read?.mode === "fail") {
    counts.failedTiles++;
    const body = JSON.stringify({ code: "task_sao_unavailable", message: "Task-controlled SAO tile HTTP failure" });
    read.bytes = Buffer.byteLength(body); read.sha256 = createHash("sha256").update(body).digest("hex");
    response.writeHead(503, { "content-type": "application/json", "cache-control": "no-store" });
    response.end(body);
  } else if (read?.mode === "delay") {
    counts.delayedTiles++; timer = setTimeout(forward, read.delayMs);
  } else forward();
});
await new Promise<void>((resolve, reject) => {
  server.once("error", reject); server.listen(port, "127.0.0.1", resolve);
});
process.stdout.write(JSON.stringify({ kind: "sky-sao-controlled-proxy", port, upstreamPort, pid: process.pid }) + "\n");
let closing = false;
const close = () => {
  if (closing) return; closing = true;
  server.closeAllConnections(); server.close(() => process.exit(0));
};
process.once("SIGINT", close); process.once("SIGTERM", close);
