import { spawnSync } from "node:child_process";
import { createReadStream } from "node:fs";
import { readdir, rm, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const outputRoot = path.join(root, "apps", "wechat-miniapp", "dist", "h5");
const args = new Map();
for (let index = 2; index < process.argv.length; index += 2)
  args.set(process.argv[index], process.argv[index + 1]);
const port = Number(args.get("--port"));
if (!Number.isInteger(port) || port < 1 || port > 65_535)
  throw new Error("valid_h5_acceptance_port_required");

function stage(name, detail = {}) {
  process.stderr.write(
    `${JSON.stringify({ runner: "miniapp-h5-acceptance", stage: name, ...detail })}\n`,
  );
}

stage("clean:start", { output: path.relative(root, outputRoot) });
await rm(outputRoot, { recursive: true, force: true });
stage("clean:complete");
const npmCli = path.join(
  path.dirname(process.execPath),
  "node_modules",
  "npm",
  "bin",
  "npm-cli.js",
);
stage("build:start");
const buildStartedAt = Date.now();
const build = spawnSync(
  process.execPath,
  [npmCli, "run", "build:h5", "--workspace", "@starward/wechat-miniapp"],
  {
    cwd: root,
    env: process.env,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    windowsHide: true,
  },
);
if (build.status !== 0) {
  process.stderr.write(build.stdout ?? "");
  process.stderr.write(build.stderr ?? "");
  throw new Error(`h5_acceptance_build_failed:${build.status}`);
}
stage("build:complete", { duration_ms: Date.now() - buildStartedAt });

async function generatedJavaScript(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await generatedJavaScript(absolute)));
    else if (entry.isFile() && entry.name.endsWith(".js")) files.push(absolute);
  }
  return files.sort();
}

const javascriptFiles = await generatedJavaScript(outputRoot);
stage("syntax:start", { files: javascriptFiles.length });
for (const file of javascriptFiles) {
  const syntax = spawnSync(process.execPath, ["--check", file], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
    windowsHide: true,
  });
  if (syntax.status !== 0) {
    const relative = path.relative(root, file).replaceAll("\\", "/");
    process.stderr.write(syntax.stderr ?? "");
    throw new Error(`h5_bundle_syntax_invalid:${relative}`);
  }
}
stage("syntax:complete", { files: javascriptFiles.length });

const mime = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
]);

function safeFile(urlValue) {
  const pathname = decodeURIComponent(new URL(urlValue, "http://127.0.0.1").pathname);
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const absolute = path.resolve(outputRoot, ...relative.split("/"));
  if (
    absolute.toLowerCase() !== outputRoot.toLowerCase() &&
    !absolute.toLowerCase().startsWith(`${outputRoot.toLowerCase()}${path.sep}`)
  )
    return null;
  return absolute;
}

const server = createServer(async (request, response) => {
  const absolute = safeFile(request.url ?? "/");
  const info = absolute ? await stat(absolute).catch(() => null) : null;
  if (!info?.isFile()) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }
  response.writeHead(200, {
    "cache-control": "no-store",
    "content-type": mime.get(path.extname(absolute).toLowerCase()) ?? "application/octet-stream",
  });
  createReadStream(absolute).pipe(response);
});

const close = () => {
  stage("server:closing");
  server.close(() => process.exit(0));
};
process.once("SIGINT", close);
process.once("SIGTERM", close);
server.listen(port, "127.0.0.1", () => {
  stage("server:ready", { port });
  process.stdout.write(`${JSON.stringify({ status: "ready", port })}\n`);
});
