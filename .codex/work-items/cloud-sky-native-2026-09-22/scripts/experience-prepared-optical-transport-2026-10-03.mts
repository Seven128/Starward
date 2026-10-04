/** One actual pinned prepared publication through the real HTTP/file owners.
 * Uses the existing local test service, not production deployment or native UI. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const worker = path.join(root, "workers/miniapp-api"), requireWorker = createRequire(path.join(worker, "package.json"));
requireWorker("reflect-metadata");
const { Module } = requireWorker("@nestjs/common"), { NestFactory } = requireWorker("@nestjs/core");
const { FastifyAdapter } = requireWorker("@nestjs/platform-fastify");
const load = (relative: string) => import(pathToFileURL(path.join(root, relative)).href);
const contracts = await load("packages/miniapp-contracts/src/index.ts");
const { PreparedOpticalImageryService } = await load("workers/miniapp-api/src/prepared-optical-imagery.ts");
const { MiniappController } = await load("workers/miniapp-api/src/controller.ts");
const { MiniappService } = await load("workers/miniapp-api/src/miniapp-service.ts");
const { createTestMiniappService } = await load("workers/miniapp-api/src/test-fixtures/create-test-service.ts");
const { skyPublicAssetHeaders } = await load("workers/miniapp-api/src/sky-public-asset-headers.ts");
const { writeSkyStaticBundle, validateSkyStaticBundle } = await load("tools/deployment/sky-static-bundle.mjs");

const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
assert.equal(typeof process.argv[2], "string");
const output = path.resolve(process.argv[2]!);
const relativeOutput = path.relative(path.join(root, "output"), output);
assert(relativeOutput && !path.isAbsolute(relativeOutput) && relativeOutput !== ".." && !relativeOutput.startsWith(`..${path.sep}`));
await mkdir(output);
const save = async (name: string, value: unknown) => writeFile(path.join(output, name), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
const record = async (file: string) => { const bytes = await readFile(file); return { path: path.relative(root, file).replaceAll("\\", "/"), bytes: bytes.length, sha256: hash(bytes) }; };
const publicationDirectory = path.join(root, "output/prepared-optical-publication-1003-r4/publication");
const publicationHash = "8eb8336aa5a75d104807327acab5990f38e0e22000713ab639a4c95cd443a802";
const manifestPath = path.join(publicationDirectory, "manifest.json"), manifestBytes = await readFile(manifestPath);
assert.equal(hash(manifestBytes), "23faa1521ae39a6a7d92f36c87ebf691a75b6bd7b91a3654e9b24f63f4d793f1");
const original = JSON.parse(manifestBytes.toString("utf8"));
contracts.assertPreparedOpticalManifest(original, "M:51", publicationHash);
const preserved = JSON.parse(await readFile(path.join(root, ".codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json"), "utf8"));
const sources = [fileURLToPath(import.meta.url), ...[
  "workers/miniapp-api/src/prepared-optical-imagery.ts", "workers/miniapp-api/src/target-optical-image-file.ts",
  "workers/miniapp-api/src/sdss-optical-imagery.ts", "workers/miniapp-api/src/sky-public-asset-headers.ts",
  "workers/miniapp-api/src/controller.ts", "workers/miniapp-api/src/miniapp-service.ts",
  "workers/miniapp-api/src/test-fixtures/create-test-service.ts", "workers/miniapp-api/package.json",
  "packages/miniapp-contracts/src/prepared-optical-publication.ts", "packages/miniapp-contracts/src/optical-publication-content.ts",
  "packages/miniapp-contracts/src/sdss-optical-publication.ts", "packages/miniapp-contracts/src/sdss-science-optical-publication.ts",
  "packages/miniapp-contracts/src/index.ts", "packages/miniapp-contracts/src/index-types.ts",
  "packages/miniapp-contracts/api/miniapp.operations.json", "packages/miniapp-contracts/src/generated/miniapp-api.generated.ts",
  "packages/miniapp-contracts/src/api-shapes.ts", "tools/deployment/sky-static-bundle.mjs", "tools/run-node.cjs",
  "output/prepared-optical-publication-1003-r4/publication/writer-receipt.json",
].map(p => path.join(root, p)), manifestPath,
  ...Object.values(original.levels).map((asset: any) => path.join(publicationDirectory, asset.file)),
  ...preserved.map((row: any) => path.join(root, row.path))];
const before = await Promise.all(sources.map(record)); await save("inputs-before.json", before);
for (const row of preserved) assert.equal(before.find(b => b.path === row.path)!.sha256, row.sha256);
await writeFile(path.join(output, "executed-script.mts"), await readFile(fileURLToPath(import.meta.url)), { flag: "wx" });
const owner = new PreparedOpticalImageryService([{ reference: "M:51", expectedHash: publicationHash, manifestUrl: pathToFileURL(manifestPath) }]);
const service = createTestMiniappService({ preparedOpticalImages: owner });
class TestModule {}
Module({ controllers: [MiniappController], providers: [{ provide: MiniappService, useValue: service }] })(TestModule);
const app = await NestFactory.create(TestModule, new FastifyAdapter(), { logger: false });
try {
  await app.listen(0, "127.0.0.1"); const base = await app.getUrl();
  const response = await fetch(`${base}/v2/sky/prepared-optical/${publicationHash}/manifest`);
  assert.equal(response.status, 200); const actual = await response.json(); assert.deepEqual(actual, original);
  assert.equal(response.headers.get("cache-control"), "public, max-age=31536000, immutable");
  await save("http-manifest.json", actual);
  const rows = [];
  for (const level of contracts.OPTICAL_IMAGE_LEVELS) {
    const asset = actual.levels[level], image = await fetch(`${base}${asset.downloadUrl}`), bytes = Buffer.from(await image.arrayBuffer());
    assert.equal(image.status, 200); assert.equal(image.headers.get("content-type"), "image/png");
    assert.equal(image.headers.get("cache-control"), "public, max-age=31536000, immutable");
    assert.equal(image.headers.get("x-content-type-options"), "nosniff");
    assert.equal(image.headers.get("x-starward-image-source"), "Historical prepared observation RGB");
    assert.equal(Number(image.headers.get("x-starward-image-field-degrees")), asset.fieldDegrees);
    assert.equal(bytes.length, asset.bytes); assert.equal(hash(bytes), asset.sha256);
    assert(bytes.equals(await readFile(path.join(publicationDirectory, asset.file))));
    await writeFile(path.join(output, asset.file), bytes, { flag: "wx" });
    rows.push({ level, url: asset.downloadUrl, ...await record(path.join(output, asset.file)), headers: Object.fromEntries(image.headers) });
  }
  const denied = [];
  for (const suffix of ["prepared-rgb-tan-master.npy", "heic0506a.jpg", "writer-receipt.json", "M-82-detail.png"]) {
    const path = `/v2/sky/prepared-optical/${publicationHash}/${suffix}`;
    const response = await fetch(`${base}${path}`); assert.equal(response.status, 404); denied.push(path);
  }
  const old = await (await fetch(`${base}/v2/sky/sdss-optical/manifest`)).json();
  assert.equal(old.publicationHash, contracts.SDSS_OPTICAL_PUBLICATIONS["M:51"].publicationHash);
  assert.equal((await fetch(`${base}/v2/sky/sdss-optical/${publicationHash}/manifest`)).status, 404);
  const inputs = (async function* () {
    for (const asset of Object.values(actual.levels) as any[]) {
      const result = await owner.getByFile(publicationHash, asset.file);
      yield { route: asset.downloadUrl, bytes: result.bytes, headers: skyPublicAssetHeaders("prepared-optical", result.contentType, result.fieldDegrees) };
    }
  })();
  const bundle = await writeSkyStaticBundle(path.join(output, "static-bundle"), inputs);
  const readback = await validateSkyStaticBundle(bundle.output);
  assert.equal(readback.files, 3); assert.equal(readback.bytes, 1315239);
  const source = owner.source("M:51", publicationHash);
  assert.equal(source.attribution!.name, original.source.credit);
  assert(source.attribution!.statements.includes(original.source.credit));
  assert(source.limitations.includes(original.source.nominalAvm.spatialNotes));
  await save("source.json", source);
  const after = await Promise.all(sources.map(record)); assert.deepEqual(after, before); await save("inputs-after.json", after);
  const result = { status: "PASSED_BOUNDED_REAL_PREPARED_TRANSPORT_AND_STATIC_FORMAT", publicationHash, rows, denied,
    source: await record(path.join(output, "source.json")), preservedRows: sources.length, boundInputsBeforeAfterExact: true,
    staticBundle: { files: readback.files, bytes: readback.bytes, publicationHash: readback.publicationHash,
      index: await record(path.join(bundle.output, "index.json")), fragment: await record(path.join(bundle.output, "delivery.caddy")) },
    realSourceDecodesOrReprojections: 0, outputOnlyMetadataAndThreePngs: true,
    scope: "Real loopback Nest/Fastify HTTP and actual pinned publisher files plus shared static disk/layout/fragment readback. Local MEMORY_TEST fixture service; no actual Caddy/TLS/operator/production deployment, WEAPP/native image, Scene/visible attribution, final quality or capacity acceptance." };
  await save("result.json", result); console.log(JSON.stringify({ ...await record(path.join(output, "result.json")), status: result.status, pngBytes: readback.bytes }));
} catch (cause) {
  await save("result.json", { status: "FAILED", error: String(cause), scope: "Partial exclusive output retained." }); throw cause;
} finally { await app.close(); }
