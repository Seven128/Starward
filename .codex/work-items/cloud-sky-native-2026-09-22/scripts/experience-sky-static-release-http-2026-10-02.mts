import "reflect-metadata";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { MiniappController } from "../../../../workers/miniapp-api/src/controller.ts";
import { MiniappService } from "../../../../workers/miniapp-api/src/miniapp-service.ts";
import { ConstellationController } from "../../../../workers/miniapp-api/src/constellation.controller.ts";
import { ConstellationPublicationService } from "../../../../workers/miniapp-api/src/constellation-publication.ts";
import { MoonTexturePublicationService } from "../../../../workers/miniapp-api/src/moon-texture-publication.ts";
import { MarsTexturePublicationService } from "../../../../workers/miniapp-api/src/mars-texture-publication.ts";
import { MercuryTexturePublicationService } from "../../../../workers/miniapp-api/src/mercury-texture-publication.ts";
import { JupiterBandsPublicationService } from "../../../../workers/miniapp-api/src/jupiter-bands-publication.ts";
import { SaturnBandsPublicationService } from "../../../../workers/miniapp-api/src/saturn-bands-publication.ts";
import { UranusBandsPublicationService } from "../../../../workers/miniapp-api/src/uranus-bands-publication.ts";
import { NeptuneBandsPublicationService } from "../../../../workers/miniapp-api/src/neptune-bands-publication.ts";
import { GalacticImagePublicationService } from "../../../../workers/miniapp-api/src/galactic-image-publication.ts";
import { SkyLandscapePublicationService } from "../../../../workers/miniapp-api/src/sky-landscape-publication.ts";
import { WideFieldW3PublicationService } from "../../../../workers/miniapp-api/src/wide-field-w3-publication.ts";
import { verifySkyStaticDelivery } from "../../../../tools/deployment/sky-static-release.mjs";
import { SdssOpticalImageryService } from "../../../../workers/miniapp-api/src/sdss-optical-imagery.ts";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const outputName = process.argv[2], bundleName = process.argv[3];
assert.match(outputName ?? "", /^output\/[a-z0-9-]+$/);
assert.match(bundleName ?? "", /^output\/[a-z0-9-]+\/publication$/);
const out = path.join(root, outputName), bundle = path.join(root, bundleName);
fs.mkdirSync(out);
const save = (file: string, data: unknown) => fs.writeFileSync(path.join(out, file), JSON.stringify(data, null, 2) + "\n", { flag: "wx" });
const sha = (bytes: Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");
const bind = (relative: string) => { const b = fs.readFileSync(path.join(root, relative)); return { path: relative, bytes: b.length, sha256: sha(b) }; };
const sources = ["workers/miniapp-api/src/sky-public-asset-export.ts", "workers/miniapp-api/src/sky-public-asset-headers.ts",
  "workers/miniapp-api/src/controller.ts", "workers/miniapp-api/src/constellation.controller.ts", "workers/miniapp-api/src/moon-texture-publication.ts",
  bundleName + "/index.json", bundleName + "/delivery.caddy", bundleName + "/image-artifact.json",
  "tools/deployment/sky-static-bundle.mjs", "tools/deployment/sky-static-release.mjs",
  "infrastructure/deployment/Caddyfile", "infrastructure/deployment/Caddyfile.operator-preview",
  "infrastructure/deployment/compose.yml", "infrastructure/deployment/compose.operator-preview.yml",
  "infrastructure/deployment/sky-static-empty.caddy", "infrastructure/deployment/sky-resource-logging.caddy"].map(bind);
save("source-binding-before.json", sources);
fs.copyFileSync(fileURLToPath(import.meta.url), path.join(out, "executed-script.mts.txt"), fs.constants.COPYFILE_EXCL);
const index = JSON.parse(fs.readFileSync(path.join(bundle, "index.json"), "utf8"));
assert.equal(index.schemaVersion, "starward-sky-static-export-v1");
assert.equal(sha(JSON.stringify(index.records)), index.publicationHash);
const original = index.records.map((record: any) => bind(bundleName + "/files" + record.route));
for (let i = 0; i < original.length; i++) { assert.equal(original[i].sha256, index.records[i].sha256); assert.equal(original[i].bytes, index.records[i].bytes); }
const working = path.join(out, "working-publication");
fs.cpSync(bundle, working, { recursive: true, errorOnExist: true, force: false });
// A file inside the served filesystem that is absent from the publication map
// must still take the API 404 route. This is a synthetic non-sensitive marker.
fs.writeFileSync(path.join(working, "files", "never-approved.txt"), "synthetic unapproved marker\n", { flag: "wx" });

const owners = { moonTexture: new MoonTexturePublicationService(), marsTexture: new MarsTexturePublicationService(),
  mercuryTexture: new MercuryTexturePublicationService(), jupiterBands: new JupiterBandsPublicationService(),
  saturnBands: new SaturnBandsPublicationService(), uranusBands: new UranusBandsPublicationService(),
  neptuneBands: new NeptuneBandsPublicationService(), galacticImage: new GalacticImagePublicationService(),
  landscape: new SkyLandscapePublicationService(), wideFieldW3: new WideFieldW3PublicationService(), sdssOpticalImages: new SdssOpticalImageryService() };
class LocalModule {}
Module({ controllers: [MiniappController, ConstellationController], providers: [
  { provide: MiniappService, useValue: owners }, ConstellationPublicationService] })(LocalModule);
const app = await NestFactory.create(LocalModule, new FastifyAdapter(), { logger: false });
const apiRequests: string[] = [];
app.getHttpAdapter().getInstance().addHook("onRequest", (request: any, _reply: any, done: any) => { apiRequests.push(request.url); done(); });
const cases: any[] = [], name = outputName.replace("output/", "");
const image = "caddy:2.11.4-alpine@sha256:5f5c8640aae01df9654968d946d8f1a56c497f1dd5c5cda4cf95ab7c14d58648";
const docker = (args: string[], timeout = 15_000) => {
  const result = spawnSync("docker", args, { encoding: "utf8", windowsHide: true, timeout, maxBuffer: 2 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`local docker ${args[0]} failed: ${result.stderr.trim()}`);
  return (args[0] === "logs" ? result.stdout + result.stderr : result.stdout).trim();
};
let running = false;
try {
  await app.listen(0, "0.0.0.0");
  const apiPort = app.getHttpAdapter().getInstance().server.address().port;
  // The local adapter changes only listener, issuer and upstream/health fixture.
  const production = fs.readFileSync(path.join(root, "infrastructure/deployment/Caddyfile"), "utf8").replaceAll("\r", "");
  const previewSource = fs.readFileSync(path.join(root, "infrastructure/deployment/Caddyfile.operator-preview"), "utf8").replaceAll("\r", "");
  const siteStart = production.indexOf("{$STARWARD_API_DOMAIN} {"); assert.ok(siteStart > 0);
  const global = production.slice(0, siteStart).replace("\temail {$CADDY_EMAIL}", "\temail sky-static-local@starward.invalid\n\tskip_install_trust");
  const normalSite = (port: number, empty = false) => production.slice(siteStart)
    .replace("{$STARWARD_API_DOMAIN} {", `https://localhost:${port} {\n tls internal`)
    .replaceAll("api:8787", `host.docker.internal:${apiPort}`)
    .replaceAll("health_uri /health/ready", "health_uri /v2/sky/moon/coverage/manifest")
    .replaceAll("/etc/caddy/sky-static-delivery.caddy", empty ? "/etc/caddy/sky-static-empty.caddy" : "/etc/caddy/sky-static-delivery.caddy");
  const previewSite = previewSource.slice(previewSource.indexOf("https://{$STARWARD_API_DOMAIN}"))
    .replace("https://{$STARWARD_API_DOMAIN}", "https://localhost:8444")
    .replace(/\ttls \{[\s\S]*?\n\t\}\n/, " tls internal\n")
    .replaceAll("{$STARWARD_OPERATOR_PREVIEW_TOKEN}", "synthetic-local-test")
    .replaceAll("api:8787", `host.docker.internal:${apiPort}`)
    .replaceAll("health_uri /health/ready", "health_uri /v2/sky/moon/coverage/manifest");
  const config = global + normalSite(8443) + previewSite + normalSite(8445, true);
  save("local-adapter.json", {scope:"Only TLS/listeners/upstream/health fixture adapted; actual static/auth/fallback/headers/logging retained"});
  fs.writeFileSync(path.join(out, "Caddyfile"), config, { flag: "wx" });
  const mounts = ["--mount", `type=bind,source=${working},target=/srv/sky-public,readonly`,
    "--mount", `type=bind,source=${path.join(bundle, "delivery.caddy")},target=/etc/caddy/sky-static-delivery.caddy,readonly`,
    "--mount", `type=bind,source=${path.join(root, "infrastructure/deployment/sky-static-empty.caddy")},target=/etc/caddy/sky-static-empty.caddy,readonly`,
    "--mount", `type=bind,source=${path.join(out, "Caddyfile")},target=/etc/caddy/Caddyfile,readonly`,
    "--mount", `type=bind,source=${path.join(root, "infrastructure/deployment/sky-resource-logging.caddy")},target=/etc/caddy/sky-resource-logging.caddy,readonly`];
  save("validation.json", { image, output: docker(["run", "--rm", "--pull", "never", ...mounts, image, "caddy", "adapt", "--config", "/etc/caddy/Caddyfile", "--validate"], 20_000) });
  const id = docker(["run", "-d", "--pull", "never", "--name", name, "--memory", "128m", "--cpus", "1", "--pids-limit", "64",
    "--read-only", "--tmpfs", "/data:size=16m", "--tmpfs", "/config:size=8m", "--tmpfs", "/tmp:size=8m",
    "-p", "127.0.0.1::8443", "-p", "127.0.0.1::8444", "-p", "127.0.0.1::8445", ...mounts, image]);
  running = true;
  const port = (inside: string) => Number(docker(["port", name, inside]).split(":").at(-1));
  const normalPort = port("8443/tcp"), previewPort = port("8444/tcp"), legacyPort = port("8445/tcp");
  const assetRequests = () => apiRequests.filter(url => index.records.some((record: any) => record.route === url));
  docker(["exec", name, "sh", "-c", "i=0; while [ ! -s /data/caddy/pki/authorities/local/root.crt ] && [ $i -lt 50 ]; do i=$((i+1)); sleep 0.1; done; test -s /data/caddy/pki/authorities/local/root.crt"], 8_000);
  // Docker's archive-copy path cannot read this Desktop tmpfs mount; read the
  // already present public CA through the container filesystem instead.
  fs.writeFileSync(path.join(out, "local-ca.crt"), docker(["exec", name, "cat", "/data/caddy/pki/authorities/local/root.crt"]) + "\n", { flag: "wx" });
  const ca = fs.readFileSync(path.join(out, "local-ca.crt"));
  const request = (url: string, selectedPort = normalPort, headers: Record<string, string> = {}, method = "GET") => new Promise<any>((resolve, reject) => {
    const req = https.request({ hostname: "127.0.0.1", port: selectedPort, servername: "localhost", ca, path: url, method,
      headers: { Host: "localhost", ...headers } }, res => {
      const chunks: Buffer[] = []; res.on("data", part => chunks.push(part));
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.setTimeout(5_000, () => req.destroy(new Error("local TLS request timeout"))); req.on("error", reject); req.end();
  });
  let staticBytes = 0;
  for (const record of index.records) {
    const response = await request(record.route);
    assert.equal(response.status, 200, record.route);
    assert.equal(response.headers["x-starward-sky-delivery"], "static");
    assert.equal(response.body.length, record.bytes); assert.equal(sha(response.body), record.sha256);
    for (const [header, value] of Object.entries(record.headers)) assert.equal(response.headers[header], value, record.route + " " + header);
    staticBytes += response.body.length;
  }
  assert.equal(assetRequests().length, 0);
  cases.push({ name: "all approved actual files over verified local TLS preserve bytes/headers with zero API requests", status: "PASS", files: index.records.length, bytes: staticBytes });
  const chosen = index.records.find((r: any) => r.route.includes("/moon/coverage/"));
  const warm = await request(chosen.route), head = await request(chosen.route, normalPort, {}, "HEAD");
  assert.equal(sha(warm.body), chosen.sha256); assert.equal(head.status, 200); assert.equal(head.body.length, 0);
  assert.equal(assetRequests().length, 0);
  cases.push({ name: "warm and HEAD use static bytes without API invocation", status: "PASS", warmBytes: warm.body.length, headBytes: 0 });
  const beforePreview = assetRequests().length;
  for (const token of [undefined, "synthetic-wrong"]) {
    const response = await request(chosen.route, previewPort, token ? { "X-Starward-Operator-Preview": token } : {});
    assert.equal(response.status, 404); assert.equal(assetRequests().length, beforePreview);
  }
  const allowed = await request(chosen.route, previewPort, { "X-Starward-Operator-Preview": "synthetic-local-test" });
  assert.equal(allowed.status, 200); assert.equal(sha(allowed.body), chosen.sha256);
  cases.push({ name: "operator preview static bytes remain inside explicit authorization handle", status: "PASS" });
  const discovery = await request("/v2/sky/moon/coverage/manifest");
  assert.equal(discovery.status, 200); assert.equal(discovery.headers["cache-control"], "no-cache");
  assert.equal(JSON.parse(discovery.body.toString()).publicationHash, owners.moonTexture.coverageManifest().publicationHash);
  const target = path.resolve(working, "files", chosen.route.slice(1)), held = path.resolve(out, "held-published-asset.png");
  assert.ok(target.startsWith(path.resolve(working) + path.sep)); assert.ok(held.startsWith(path.resolve(out) + path.sep));
  fs.renameSync(target, held);
  try {
    const missing = await request(chosen.route);
    assert.equal(missing.status, 200); assert.equal(sha(missing.body), chosen.sha256);
    assert.equal(apiRequests.at(-1), chosen.route);
    assert.equal(missing.headers["x-starward-sky-delivery"], undefined);
  } finally { fs.renameSync(held, target); }
  cases.push({ name: "discovery and an absent exported file retain actual API fallback", status: "PASS" });
  for (const url of ["/index.json", "/delivery.caddy", "/never-approved.txt", chosen.route.replace(/\/([a-f0-9]{64})\//, "/" + "0".repeat(64) + "/"),
    "/v2/sky/constellations/" + "0".repeat(64) + "/assets/../never-approved.txt"]) {
    const response = await request(url); assert.equal(response.status, 404, url);
  }
  assert.equal((await request(chosen.route, normalPort, {}, "POST")).status, 404);
  cases.push({ name: "unapproved filesystem files, bundle metadata, stale version, traversal and wrong method are not served", status: "PASS" });
  const legacy = await request(chosen.route, legacyPort);
  assert.equal(legacy.status, 200); assert.equal(sha(legacy.body), chosen.sha256);
  assert.equal(legacy.headers["x-starward-sky-delivery"], undefined); assert.equal(apiRequests.at(-1), chosen.route);
  cases.push({name:"actual unconfigured Caddy preserves API bytes with no static marker",status:"PASS"});
  const identity = {schemaVersion:"starward-sky-static-delivery-v1", revision:"1".repeat(40), imageDigest:"sha256:"+"1".repeat(64),
    imagePublicationHash:index.publicationHash, deliveryPublicationHash:index.publicationHash, files:index.records.length, bytes:staticBytes};
  const delivery = {directory:bundle,identity};
  const fetchFor = (selectedPort: number) => async (url: string, options: any) => {
    const result = await request(new URL(url).pathname, selectedPort, options.headers, options.method);
    return new Response(options.method === "HEAD" ? null : result.body, {status:result.status,headers:result.headers});
  };
  const validation = {domain:"localhost",revision:identity.revision,imageDigest:identity.imageDigest};
  const normalVerification = await verifySkyStaticDelivery({delivery,validation,deploy:{},fetchImpl:fetchFor(normalPort)});
  const previewVerification = await verifySkyStaticDelivery({delivery,validation,deploy:{STARWARD_OPERATOR_PREVIEW_TOKEN:"synthetic-local-test"},fetchImpl:fetchFor(previewPort)});
  assert.equal(normalVerification.checkedFiles,136); assert.equal(previewVerification.unauthorizedStatus,404);
  await assert.rejects(verifySkyStaticDelivery({delivery,validation,deploy:{},fetchImpl:fetchFor(legacyPort)}),/sky_static_http_identity_mismatch/);
  cases.push({name:"actual verifier complete TLS bytes/headers/HEAD, protected preview, same-API-bytes rejection",status:"PASS",normalVerification,previewVerification});
  save("container.json", { id, name, image, normalPort, previewPort, legacyPort, readonlyPublicationMount: true, memoryLimitBytes: 128 * 1024 * 1024 });
  save("result.json", { scope: "Actual sealed bytes + adapted current production Caddy auth/fallback + actual verifier + Nest + pinned Caddy with verified private test CA and injected fetch transport; no actual source OCI extraction/cloud/native/device/capacity claim",
    status: "PASS", publicationHash: index.publicationHash, cases, apiRequests, staticBytes, sources });
} catch (cause) {
  save("failure.json", { message: String(cause), stack: (cause as Error).stack, cases, apiRequests, sources });
  throw cause;
} finally {
  if (running) {
    fs.writeFileSync(path.join(out, "caddy.log"), docker(["logs", name]), { flag: "wx" });
    const stats = docker(["stats", "--no-stream", "--format", "{{json .}}", name]);
    save("final-stats.json", { scope: "one end-of-trial snapshot, not a measured peak or capacity", raw: JSON.parse(stats) });
    docker(["stop", "--time", "5", name]);
    // Removing this newly created stopped lab container does not remove files,
    // images, volumes or any existing development service.
    docker(["rm", name]);
  }
  await app.close();
  const after = [...sources, ...original].map(item => bind(item.path));
  assert.deepEqual(after, [...sources, ...original]);
  save("binding.json", { before: [...sources, ...original], after, unchanged: true, script: bind(outputName + "/executed-script.mts.txt") });
}
console.log(JSON.stringify({ result: bind(outputName + "/result.json"), binding: bind(outputName + "/binding.json"), cases }));
