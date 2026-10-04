/** Current actual publication -> real HTTP controller -> standard static export.
 * Isolated local intent only; no default registration, deployment or renderer claim. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join, relative, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { assertSdssCalibratedOpticalManifest, assertSdssScienceOpticalManifest,
  SDSS_OPTICAL_LEVELS, SDSS_OPTICAL_PUBLICATIONS } from "@starward/miniapp-contracts";
import { SdssOpticalImageryService } from "../../../../workers/miniapp-api/src/sdss-optical-imagery.ts";
import { exportSkyPublicAssets } from "../../../../workers/miniapp-api/src/sky-public-asset-export.ts";
import { skyPublicAssetHeaders } from "../../../../workers/miniapp-api/src/sky-public-asset-headers.ts";
import { validateSkyStaticBundle } from "../../../../tools/deployment/sky-static-bundle.mjs";

const root = resolve(import.meta.dirname, "../../../.."), out = join(root, "output/sdss-m82-display-api-static-1004-r1");
mkdirSync(out);
const requireWorker = createRequire(join(root, "workers/miniapp-api/package.json"));
requireWorker("reflect-metadata");
const { Module } = requireWorker("@nestjs/common"), { NestFactory } = requireWorker("@nestjs/core");
const { FastifyAdapter } = requireWorker("@nestjs/platform-fastify");
const { MiniappController } = await import("../../../../workers/miniapp-api/src/controller.ts");
const { MiniappService } = await import("../../../../workers/miniapp-api/src/miniapp-service.ts");
const { createTestMiniappService } = await import("../../../../workers/miniapp-api/src/test-fixtures/create-test-service.ts");
const { ApiExceptionFilter } = await import("../../../../workers/miniapp-api/src/api-exception.filter.ts");
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
const bindings = new Map<string, { path: string; bytes: number; sha256: string }>();
function read(file: string, expected?: { bytes: number; sha256: string }) {
  const raw = readFileSync(file), row = { path: relative(root, file).replaceAll("\\", "/"), bytes: raw.length, sha256: sha(raw) };
  if (expected) { assert.equal(row.bytes, expected.bytes); assert.equal(row.sha256, expected.sha256); }
  if (bindings.has(file)) assert.deepEqual(row, bindings.get(file)); else bindings.set(file, row);
  return raw;
}
const save = (name: string, value: unknown) => writeFileSync(join(out, name), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
for (const file of ["packages/miniapp-contracts/src/index.ts", "packages/miniapp-contracts/src/sdss-calibrated-optical-publication.ts",
  "packages/miniapp-contracts/src/sdss-science-optical-publication.ts", "packages/miniapp-contracts/src/sdss-display-optical-publication.ts",
  "workers/miniapp-api/src/sdss-optical-imagery.ts", "workers/miniapp-api/src/target-optical-image-file.ts",
  "workers/miniapp-api/src/controller.ts", "workers/miniapp-api/src/miniapp-service.ts",
  "workers/miniapp-api/src/celestial-object-information.ts", "workers/miniapp-api/src/sky-public-asset-export.ts",
  "workers/miniapp-api/src/sky-public-asset-headers.ts", "tools/deployment/sky-static-bundle.mjs"])
  read(join(root, file));
read(import.meta.filename);
writeFileSync(join(out, "executed-runner.mts"), readFileSync(import.meta.filename), { flag: "wx" });
const manifestFile = join(root, "output/sdss-m82-display-publication-1004-r2/publication/manifest.json");
const publication = JSON.parse(read(manifestFile, { bytes: 26384, sha256: "398827534fab1003b7fbe4cad29ab7ae6e0b8a1a9eb7222e12ba1e926aa47a6a" }).toString());
const hash = "74f456febb06119883e1cf79f9d3d9d89d853ec4a78f7f5c93a229aef204c0ab";
assertSdssCalibratedOpticalManifest(publication, "M:82", hash);
assert.equal(publication.imageVersion, "sdss-display-optical-v1");
assert.throws(() => assertSdssScienceOpticalManifest(publication, "M:82", hash));
const descriptor = { reference: "M:82", expectedHash: hash, manifestUrl: pathToFileURL(manifestFile) };
const owner = new SdssOpticalImageryService({ calibratedPublications: [descriptor] });
const ordinary = new SdssOpticalImageryService();
assert.equal(ordinary.hasRegisteredPublicationHash(hash), false);
assert.throws(() => ordinary.manifest(hash), /not_found/u);
assert.throws(() => new SdssOpticalImageryService({ sciencePublications: [descriptor] }).manifest(hash));
const service = createTestMiniappService({ sdssOpticalImages: owner });
class LocalDisplayModule {}
Module({ controllers: [MiniappController], providers: [{ provide: MiniappService, useValue: service }] })(LocalDisplayModule);
const app = await NestFactory.create(LocalDisplayModule, new FastifyAdapter(), { logger: false });
app.useGlobalFilters(new ApiExceptionFilter());
const started = performance.now(), http: any[] = [], levels: any[] = [];
try {
  await app.listen(0, "127.0.0.1");
  const address = app.getHttpAdapter().getInstance().server.address(); assert(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  async function get(route: string, method = "GET") {
    const at = performance.now(), response = await fetch(origin + route, { method }), raw = Buffer.from(await response.arrayBuffer());
    http.push({ route, method, status: response.status, bytes: raw.length, sha256: sha(raw),
      headers: Object.fromEntries(response.headers), elapsedSeconds: (performance.now() - at) / 1000 });
    return { response, raw };
  }
  const metadata = await get(`/v2/sky/sdss-optical/${hash}/manifest`); assert.equal(metadata.response.status, 200);
  const wire = JSON.parse(metadata.raw.toString()); assertSdssCalibratedOpticalManifest(wire, "M:82", hash);
  assert.deepEqual(wire, owner.manifest(hash)); save("http-manifest.json", wire);
  for (const level of SDSS_OPTICAL_LEVELS) {
    const a = wire.levels[level], original = read(join(dirname(manifestFile), a.file), a);
    const { response, raw } = await get(a.downloadUrl); assert.equal(response.status, 200); assert.deepEqual(raw, original);
    const expected = skyPublicAssetHeaders("sdss-optical", "image/png", a.fieldDegrees);
    for (const [name, value] of Object.entries(expected)) assert.equal(response.headers.get(name), value);
    const head = await get(a.downloadUrl, "HEAD"); assert.equal(head.response.status, 200); assert.equal(head.raw.length, 0);
    assert.equal(Number(head.response.headers.get("content-length")), a.bytes);
    levels.push({ level, route: a.downloadUrl, bytes: a.bytes, sha256: a.sha256, fieldDegrees: a.fieldDegrees, headers: expected });
  }
  const old = await get("/v2/sky/sdss-optical/manifest?reference=M%3A82"); assert.equal(old.response.status, 200);
  assert.equal(JSON.parse(old.raw.toString()).publicationHash, SDSS_OPTICAL_PUBLICATIONS["M:82"].publicationHash);
  const information = await get(`/v2/celestial-objects/M%3A82?opticalPublicationHash=${hash}`);
  assert.equal(information.response.status, 200);
  const info = JSON.parse(information.raw.toString()), source = owner.source("M:82", hash)!;
  assert(JSON.stringify(info).includes(source.id)); assert(JSON.stringify(info).includes("显示估计"));
  save("http-information.json", info);
  for (const name of ["execution-receipt.json", "science-g.npy", "source-inputs-receipt.json", "admission-receipts/301-4264-5-260-g.json"])
    assert.equal((await get(`/v2/sky/sdss-optical/${hash}/${name}`)).response.status, 404);
  const exported = await exportSkyPublicAssets(join(out, "standard-static"), "72e65cf309d700cb7d40c5b7afd53660fd39fa35", undefined, owner);
  const verified = await validateSkyStaticBundle(exported.output);
  const display = verified.records.filter(r => r.route.startsWith(`/v2/sky/sdss-optical/${hash}/`));
  assert.equal(display.length, 3);
  for (const level of levels) {
    const row = display.find(r => r.route === level.route); assert(row);
    assert.deepEqual(row, { route: level.route, bytes: level.bytes, sha256: level.sha256, headers: level.headers });
    assert.deepEqual(readFileSync(join(exported.output, "files", row.route)), read(join(dirname(manifestFile), wire.levels[level.level].file)));
  }
  assert.equal(verified.records.filter(r => r.route.startsWith("/v2/sky/sdss-optical/")).length, 21);
  assert.equal(verified.records.some(r => r.route.startsWith(`/v2/sky/sdss-optical/${hash}/`) && /receipt|master|\.npy|manifest/u.test(r.route)), false);
  for (const [file, expected] of bindings) read(file, expected);
  const result = { scope: "Actual saved M82 display publication; isolated current HTTP and standard static output only",
    publicationHash: hash, imageVersion: wire.imageVersion, http, levels,
    publicationBindingsAfterExact: [...bindings.values()], threePngBytesAndHttpHeadExact: true,
    sourceIdentityAndDisplayMeaningExact: true, oldDiscoveryAndScienceOnlySemanticsPreserved: true,
    standardStatic: { ...exported, output: relative(root, exported.output).replaceAll("\\", "/"),
      displayFiles: display.length, displayBytes: display.reduce((n, r) => n + r.bytes, 0),
      totalScope: "all current standard static families, including the explicitly opted-in three display PNGs" },
    rawScienceOrProvenanceStaticAndImageHttpExports: false, elapsedSeconds: (performance.now() - started) / 1000,
    ordinaryAdoption: false, originalBffRestarted: false, clientHookSceneSourcesBack: "UNVERIFIED",
    quality: "UNVERIFIED_NOT_ADOPTED", nativeAndPhone: "UNVERIFIED", independentReview: "MISSING",
    capacity200Dau: "UNVERIFIED", otherBusinessLogicEdited: false };
  save("result.json", result);
  process.stdout.write(JSON.stringify({ publicationHash: hash, httpRequests: http.length, levels,
    standardStatic: result.standardStatic, elapsedSeconds: result.elapsedSeconds }) + "\n");
} finally { await app.close(); }
