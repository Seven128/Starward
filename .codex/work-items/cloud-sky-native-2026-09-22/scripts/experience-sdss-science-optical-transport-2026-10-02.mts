/** One real opt-in publication through service, existing controller and actual
 * extracted client/bare request owners. HTTP injection only; no listener/GPU. */
import "reflect-metadata";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import vm from "node:vm";
import ts from "typescript";
import { build } from "esbuild";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { SdssOpticalImageryService } from "../../../../workers/miniapp-api/src/sdss-optical-imagery.ts";
import { MiniappController } from "../../../../workers/miniapp-api/src/controller.ts";
import { MiniappService } from "../../../../workers/miniapp-api/src/miniapp-service.ts";
import { createTestMiniappService } from "../../../../workers/miniapp-api/src/test-fixtures/create-test-service.ts";
import { MINIAPP_API_BASE_PATH, SDSS_OPTICAL_PUBLICATIONS, SDSS_OPTICAL_LEVELS,
  assertSdssScienceOpticalManifest, assertSdssOpticalManifest, sdssOpticalPublication } from "../../../../packages/miniapp-contracts/src/index.ts";

const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const TASK = ".codex/work-items/cloud-sky-native-2026-09-22";
const OUT = "output/sdss-science-optical-transport-1002-r2";
const PUB = "output/sdss-science-optical-writer-1002-r1/publication";
const PIN = "34015aff7ebbbaa7ddabc0a100844c802ebc7f860d5d15b076dd0f169cffc1a0";
const MANIFEST_SHA = "3eaf04b366827c86ece835f48ed37089d5406be2ed4d73c2252960e7e9aa1dd5";
const hash = (b: Uint8Array | string) => createHash("sha256").update(b).digest("hex");
const read = (p: string) => fs.readFileSync(path.join(ROOT, p));
const json = (p: string) => JSON.parse(read(p).toString("utf8"));
const bind = (p: string) => { const b = read(p); return { path: p, bytes: b.length, sha256: hash(b) }; };
const save = (name: string, value: unknown) => fs.writeFileSync(path.join(ROOT, OUT, name), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
const inventory = (dir: string): ReturnType<typeof bind>[] => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory() ? inventory(`${dir}/${entry.name}`) : entry.isFile() ? [bind(`${dir}/${entry.name}`)] : []);
fs.mkdirSync(path.join(ROOT, OUT));
fs.copyFileSync(fileURLToPath(import.meta.url), path.join(ROOT, OUT, "executed-script.mts.txt"), fs.constants.COPYFILE_EXCL);
let app: NestFastifyApplication | undefined;
let before: ReturnType<typeof bind>[] = [];
const observations: any = { scope: "Actual service and existing Nest/Fastify controller with in-process HTTP injection. Extracted actual client and bare request functions, controlled Taro.request bridge; not actual WEAPP/Taro network, native decode/cache, GPU, source calibration, quality adoption or deployment." };
try {
  const frozenOwners = {
    "workers/miniapp-api/src/sdss-optical-imagery.ts": "de598a8f1f5494086644c860efb0988d3964867dbe2dc45e89ee89ae9a536e6c",
    "apps/wechat-miniapp/src/services/sdss-optical-client.ts": "360883a7ef6f08b450ebddaf71b69838629877c7c961496f5428be7a4177193a",
    "workers/miniapp-api/src/celestial-object-information.ts": "04c146b68c5855b20b1b24a0dd65745884fe8af00d2b636237dd0bbeb1d9731f",
    "workers/miniapp-api/src/controller.ts": "bc1aea2736da66c83abb38c65f2ace4bec320f7efb21f413deb290a801510359",
    "workers/miniapp-api/src/miniapp-service.ts": "ae828081917fc8f199c560376db64138673f6d301e68b8b6e769dbe0d0b40c9c",
    "apps/wechat-miniapp/src/services/api-client.ts": "fd0f7a916f0734767119bc654bf58c5c8170d26d4187b09aabf71bdd84412951",
    "apps/wechat-miniapp/src/services/celestial-information-response.ts": "299ba59a617259d92715a4cc321b49a22d56ea6eea91009511a55f5a2f19cf88",
    "apps/wechat-miniapp/src/hooks/use-celestial-information.ts": "54e0fb67294fc174ca6df3f07e6daacec818d170ad7302a80f849b604f5fe28e",
    "apps/wechat-miniapp/src/sky/sources/index.tsx": "3387e04a8720bcfc57584800ec24754923c118702b2f9e8132907017c161490c",
    "apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx": "bf3e075fd14da03fd298b22b6282fda6992a403ddd952e85378a1915df9f30c6",
  };
  for (const [p, expected] of Object.entries(frozenOwners)) assert.equal(bind(p).sha256, expected, p);
  const files = new Set<string>([fileURLToPath(import.meta.url).slice(ROOT.length).replaceAll("\\", "/"), "tools/run-node.cjs",
    `${PUB}/manifest.json`, `${PUB}/writer-receipt.json`, "output/sdss-science-optical-writer-1002-r1/result.json",
    `${TASK}/tmp/resume-preserved-hashes-2026-10-01.json`, "workers/miniapp-api/tsconfig.json",
    "apps/wechat-miniapp/src/services/sdss-optical-client.ts", "apps/wechat-miniapp/src/services/bare-sky-resource.ts",
    "apps/wechat-miniapp/src/services/api-client.ts"]);
  for (const p of Object.keys(frozenOwners)) files.add(p);
  const manifest = json(`${PUB}/manifest.json`);
  assert.equal(bind(`${PUB}/manifest.json`).sha256, MANIFEST_SHA); assertSdssScienceOpticalManifest(manifest, "M:51", PIN);
  for (const a of Object.values(manifest.levels) as any[]) { const b = bind(`${PUB}/${a.file}`); assert.equal(b.bytes, a.bytes); assert.equal(b.sha256, a.sha256); files.add(b.path); }
  const oldInventory = json("output/sdss-science-optical-writer-1002-r1/binding-before.json");
  for (const b of [...oldInventory.cached, ...oldInventory.oldAssets, ...oldInventory.preserved]) {
    assert.deepEqual(bind(b.path), b); files.add(b.path);
  }
  assert.deepEqual(inventory("workers/miniapp-api/assets/deep-sky").sort((a,b)=>a.path.localeCompare(b.path)), [...oldInventory.oldAssets].sort((a:any,b:any)=>a.path.localeCompare(b.path)));
  // Metadata-only local graph: bare packages are external explicitly. This is
  // not a runtime loaded-module trace. Actual package identities are recorded.
  const graph = await build({ absWorkingDir: ROOT, entryPoints: [
    "workers/miniapp-api/src/controller.ts", "workers/miniapp-api/src/test-fixtures/create-test-service.ts",
    "workers/miniapp-api/src/sdss-optical-imagery.ts", "packages/miniapp-contracts/src/index.ts",
    "packages/astronomy-core/src/deep-sky-catalog.ts"], bundle: true, write: false, metafile: true,
    platform: "node", format: "esm", packages: "external", outdir: path.join(ROOT, OUT, "unexecuted-metadata-only"),
    tsconfig: "workers/miniapp-api/tsconfig.json", logLevel: "silent" });
  for (const input of Object.keys(graph.metafile!.inputs)) {
    assert(!input.startsWith("<"), `Unbound virtual input ${input}`);
    const relativeInput = path.relative(ROOT, path.resolve(ROOT, input)).replaceAll("\\", "/");
    assert(relativeInput && !relativeInput.startsWith("../") && !path.isAbsolute(relativeInput), `Input outside ROOT ${input}`);
    assert(fs.existsSync(path.join(ROOT, relativeInput)), `Missing actual input ${relativeInput}`); files.add(relativeInput);
  }
  const externalPackages = ["@nestjs/common", "@nestjs/core", "@nestjs/platform-fastify", "fastify", "reflect-metadata", "rxjs", "tsx", "typescript", "esbuild"];
  const packageIdentities = externalPackages.map(name => {
    const packagePath = `node_modules/${name}/package.json`; files.add(packagePath);
    const p = json(packagePath); return { name, version: p.version, package: bind(packagePath) };
  });
  before = [...files].sort().map(bind); save("binding-before.json", before); save("metadata-only-graph.json", graph.metafile);
  save("inputs.json", { publicationHash: PIN, manifest: bind(`${PUB}/manifest.json`), packageIdentities, frozenOwners,
    metadataScope: "Local workspace preparation/producer/controller graph, all nonvirtual inputs ROOT-bound; bare packages external. Not the runtime loaded-module trace.",
    preserved: { cached: oldInventory.cached.length, oldAssets: oldInventory.oldAssets.length, settingsOutbox: oldInventory.preserved.length } });
  const service = new SdssOpticalImageryService({ sciencePublications: [{ reference: "M:51", expectedHash: PIN, manifestUrl: pathToFileURL(path.join(ROOT, PUB, "manifest.json")) }] });
  const v2 = service.manifest(PIN); assertSdssScienceOpticalManifest(v2, "M:51", PIN); assert.deepEqual(v2, manifest);
  const defaultManifest = service.currentManifest("M:51"); assert.equal(defaultManifest.publicationHash, SDSS_OPTICAL_PUBLICATIONS["M:51"].publicationHash);
  observations.direct = { scienceManifest: v2, scienceSource: service.source("M:51", PIN), defaultManifestHash: defaultManifest.publicationHash,
    defaultSource: service.source("M:51"), missingDefaultReference: service.source("M:31") };
  for (const [reference, pin] of [["M:82", PIN], ["M:51", "0".repeat(64)]]) assert.throws(() => service.source(reference!, pin), /not_found/u);
  assert.throws(() => new SdssOpticalImageryService().manifest(PIN), /not_found/u);
  const miniapp = createTestMiniappService({ sdssOpticalImages: service });
  class TestModule {}
  Module({ controllers: [MiniappController], providers: [{ provide: MiniappService, useValue: miniapp }] })(TestModule);
  app = await NestFactory.create<NestFastifyApplication>(TestModule, new FastifyAdapter(), { logger: false }); await app.init();
  const http = app.getHttpAdapter().getInstance();
  const httpManifest = await http.inject({ method: "GET", url: `/v2/sky/sdss-optical/${PIN}/manifest` });
  assert.equal(httpManifest.statusCode, 200); assert.deepEqual(httpManifest.json(), manifest);
  observations.httpManifest = { status: httpManifest.statusCode, headers: httpManifest.headers, body: httpManifest.json() };
  fs.writeFileSync(path.join(ROOT, OUT, "http-manifest-body.json.txt"), httpManifest.rawPayload, { flag: "wx" });
  observations.images = [];
  for (const level of SDSS_OPTICAL_LEVELS) {
    const a = manifest.levels[level], direct = await service.getByFile(PIN, a.file), response = await http.inject({ method: "GET", url: a.downloadUrl });
    fs.writeFileSync(path.join(ROOT, OUT, `http-${a.file}`), response.rawPayload, { flag: "wx" });
    assert.equal(response.statusCode, 200); assert.equal(response.headers["content-type"], "image/png");
    assert.equal(response.headers["x-starward-image-source"], "Sloan Digital Sky Survey - DR17 optical");
    assert.equal(Number(response.headers["x-starward-image-field-degrees"]), a.fieldDegrees);
    assert.deepEqual(response.rawPayload, read(`${PUB}/${a.file}`)); assert.deepEqual(direct.bytes, response.rawPayload);
    observations.images.push({ level, headers: response.headers, actual: bind(`${OUT}/http-${a.file}`), directBytes: direct.bytes.length, source: bind(`${PUB}/${a.file}`), exactEncodedBytes: true });
  }
  observations.httpControls = [];
  for (const resource of [`${PIN}/source-science-g.npy`, `${PIN}/receipt.json`, `${PIN}/../M-51-detail.png`, `${PIN}/M-82-detail.png`, `${"0".repeat(64)}/manifest`]) {
    const response = await http.inject({ method: "GET", url: `/v2/sky/sdss-optical/${resource}` });
    assert.equal(response.statusCode, 404); observations.httpControls.push({ resource, status: response.statusCode });
  }
  const defaultHttp = await http.inject({ method: "GET", url: "/v2/sky/sdss-optical/manifest" });
  assert.deepEqual(defaultHttp.json(), defaultManifest);
  const oldImage = await http.inject({ method: "GET", url: defaultManifest.levels.DETAIL.downloadUrl });
  assert.equal(oldImage.headers["content-type"], "image/jpeg"); assert.equal(hash(oldImage.rawPayload), defaultManifest.levels.DETAIL.sha256);
  observations.defaultHttp = { publicationHash: defaultHttp.json().publicationHash, detailBytes: oldImage.rawPayload.length, contentType: oldImage.headers["content-type"], sha256: hash(oldImage.rawPayload) };
  observations.information = [];
  const defaultInformation = await http.inject({ method: "GET", url: "/v2/celestial-objects/M%3A51" });
  assert.equal(defaultInformation.statusCode, 200);
  assert(defaultInformation.json().data.sources.some((s: any) => s.id === service.source("M:51")!.id));
  const pinnedInformation = await http.inject({ method: "GET", url: `/v2/celestial-objects/M%3A51?opticalPublicationHash=${PIN}` });
  assert.equal(pinnedInformation.statusCode, 200); const pinnedBody = pinnedInformation.json();
  assert.equal(pinnedBody.dataState, "FRESH"); assert.deepEqual(pinnedBody.data.facts, defaultInformation.json().data.facts);
  assert(pinnedBody.data.sources.some((s: any) => s.id === service.source("M:51", PIN)!.id));
  assert(!pinnedBody.data.sources.some((s: any) => s.id === service.source("M:51")!.id));
  assert(pinnedBody.data.sources.some((s: any) => s.id.startsWith("imagery:")), "W3 is independent of optical identity");
  observations.information.push({ condition: "default-v1", body: defaultInformation.json() }, { condition: "explicit-v2", body: pinnedBody });
  for (const [reference, pin] of [["M:51", "0".repeat(64)], ["M:82", PIN]]) {
    const response = await http.inject({ method: "GET", url: `/v2/celestial-objects/${encodeURIComponent(reference!)}?opticalPublicationHash=${pin}` });
    const body = response.json(); assert.equal(response.statusCode, 200); assert.equal(body.dataState, "PARTIAL");
    assert.equal(body.data.reference, reference); assert(body.warnings.includes("sdss_optical_publication_unavailable"));
    assert(!body.data.sources.some((s: any) => s.id.startsWith("optical-imagery:")));
    assert(body.data.sources.some((s: any) => s.id.startsWith("imagery:")));
    if (reference === "M:51") assert.deepEqual(body.data.facts, pinnedBody.data.facts);
    observations.information.push({ condition: reference === "M:51" ? "unknown-optical-hash" : "foreign-optical-reference", body });
  }
  const extracted = (p: string, names: string[]) => {
    const source = ts.createSourceFile(p, read(p).toString("utf8"), ts.ScriptTarget.Latest, true);
    const declarations = names.map(name => { const found = source.statements.find((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === name); assert(found, name); return found.getText(source).replace(/^export\s+/u, ""); }).join("\n");
    return { declarations, js: ts.transpileModule(declarations, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText };
  };
  const bare = extracted("apps/wechat-miniapp/src/services/bare-sky-resource.ts", ["skyResourceUrl", "requestBareSkyResource"]);
  const client = extracted("apps/wechat-miniapp/src/services/sdss-optical-client.ts", ["getSdssScienceOpticalManifest", "getSdssOpticalManifest"]);
  const link = extracted("apps/wechat-miniapp/src/services/api-client.ts", ["deepSkyManifestUrl"]);
  fs.writeFileSync(path.join(ROOT, OUT, "executed-bare.js.txt"), bare.js, { flag: "wx" }); fs.writeFileSync(path.join(ROOT, OUT, "actual-bare-declarations.ts.txt"), bare.declarations, { flag: "wx" });
  fs.writeFileSync(path.join(ROOT, OUT, "executed-client.js.txt"), client.js, { flag: "wx" }); fs.writeFileSync(path.join(ROOT, OUT, "actual-client-declarations.ts.txt"), client.declarations, { flag: "wx" });
  fs.writeFileSync(path.join(ROOT, OUT, "executed-source-link.js.txt"), link.js, { flag: "wx" }); fs.writeFileSync(path.join(ROOT, OUT, "actual-source-link-declarations.ts.txt"), link.declarations, { flag: "wx" });
  const sourceLink = vm.runInNewContext(link.js + "\ndeepSkyManifestUrl;", { SDSS_OPTICAL_PUBLICATIONS, MINIAPP_API_BASE_PATH, __MINIAPP_API_BASE__: "http://task-injection.invalid" });
  const v2SourceId = service.source("M:51", PIN)!.id;
  assert.equal(sourceLink(v2SourceId), undefined); assert.equal(sourceLink(v2SourceId, "0".repeat(64)), undefined);
  assert.equal(sourceLink(v2SourceId, PIN), `http://task-injection.invalid/v2/sky/sdss-optical/${PIN}/manifest`);
  assert.equal(sourceLink(service.source("M:51")!.id, PIN), undefined);
  observations.sourceLink = { exactSourceId: v2SourceId, linkWithExplicitPin: sourceLink(v2SourceId, PIN), unpinnedRejected: true, foreignPinRejected: true, oldRegisteredIdentityCannotReplaceExplicitPin: true };
  const calls: any[] = []; let aborts = 0, hold = false;
  const Taro = { request(options: any) {
    const pathname = new URL(options.url).pathname; calls.push({ url: options.url, pathname, method: options.method, timeout: options.timeout });
    if (!hold) void http.inject({ method: "GET", url: pathname }).then((response: any) => options.success({ statusCode: response.statusCode, data: response.json() }), () => options.fail());
    return { abort() { aborts++; } };
  } };
  const request = vm.runInNewContext(bare.js + "\nrequestBareSkyResource;", { Taro, __MINIAPP_API_BASE__: "http://task-injection.invalid" });
  const get = vm.runInNewContext(client.js + "\n({getSdssScienceOpticalManifest,getSdssOpticalManifest});", { MINIAPP_API_BASE_PATH, assertSdssScienceOpticalManifest, assertSdssOpticalManifest, sdssOpticalPublication, requestBareSkyResource: request });
  const signal = new AbortController().signal;
  const returned = await get.getSdssScienceOpticalManifest("M:51", PIN, signal); assert.deepEqual(returned, manifest);
  const legacyReturned = await get.getSdssOpticalManifest(signal, "M:51"); assert.deepEqual(legacyReturned, defaultManifest);
  await assert.rejects(get.getSdssScienceOpticalManifest("M:82", PIN, signal), /publication_invalid/u);
  await assert.rejects(get.getSdssScienceOpticalManifest("M:51", "0".repeat(64), signal), /manifest_unavailable/u);
  const requestsBeforePreabort = calls.length, alreadyAborted = new AbortController(); alreadyAborted.abort();
  await assert.rejects(get.getSdssScienceOpticalManifest("M:51", PIN, alreadyAborted.signal), /request_cancelled/u); assert.equal(calls.length, requestsBeforePreabort);
  hold = true; const cancel = new AbortController(), pending = get.getSdssScienceOpticalManifest("M:51", PIN, cancel.signal); cancel.abort();
  await assert.rejects(pending, /request_cancelled/u); assert.equal(aborts, 1); hold = false;
  observations.client = { actualManifest: returned, defaultHash: legacyReturned.publicationHash, calls, aborts, preabortRequests: calls.length - requestsBeforePreabort - 1, controlledBridge: true };
  // A bounded mutation of this exact client call shows why the explicit hash
  // admission is essential; it is not claimed to be a historical implementation.
  const needle = "assertSdssScienceOpticalManifest(response.body, reference, expectedOpticalHash);"; assert.equal(client.declarations.split(needle).length, 2);
  const mutated = client.declarations.replace(needle, "/* task-only removal of exact science admission */");
  fs.writeFileSync(path.join(ROOT, OUT, "mutated-client-admission.ts.txt"), mutated, { flag: "wx" });
  const mutant = vm.runInNewContext(ts.transpileModule(mutated, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText + "\ngetSdssScienceOpticalManifest;",
    { MINIAPP_API_BASE_PATH, requestBareSkyResource: async () => ({ status: 200, body: manifest }) });
  const guarded = vm.runInNewContext(client.js + "\ngetSdssScienceOpticalManifest;", { MINIAPP_API_BASE_PATH, assertSdssScienceOpticalManifest,
    requestBareSkyResource: async () => ({ status: 200, body: manifest }) });
  await assert.rejects(guarded("M:51", "3".repeat(64)), /publication_invalid/u);
  assert.deepEqual(await mutant("M:51", "3".repeat(64)), manifest);
  observations.hashAdmissionMutation = { exactCurrentCallerRemoved: true, unrelatedPinAcceptedOnlyByMutant: true, noHistoricalClaim: true };
  await app.close(); app = undefined;
  // Complete actual observations and final owner first; no native-resource claim.
  save("actual-observations.json", observations); save("actual-final-owner.json", { applicationClosed: true, listening: false, aborts, heldBridgeRequests: 1, scope: "App injection lifetime and controlled pending request cancellation only; no native decoded/GPU resource model." });
  const after = before.map(b => bind(b.path)); save("binding-after.json", after); assert.deepEqual(after, before);
  const result = { status: "ACTUAL_OPT_IN_SCIENCE_OPTICAL_TRANSPORT_PASSED", publicationHash: PIN,
    manifest: bind(`${PUB}/manifest.json`), observations: bind(`${OUT}/actual-observations.json`), finalOwner: bind(`${OUT}/actual-final-owner.json`),
    sourceBindings: before.length, images: observations.images, currentService: bind("workers/miniapp-api/src/sdss-optical-imagery.ts"),
    currentClient: bind("apps/wechat-miniapp/src/services/sdss-optical-client.ts"), defaultV1Preserved: true, allInputsPreserved: true,
    scope: observations.scope, next: "Explicit normal Hook/source/group-contribution integration remains separate. No default registry or static export adoption." };
  save("result.json", result); console.log(JSON.stringify({ result: bind(`${OUT}/result.json`), observations: result.observations, publicationHash: PIN }));
} catch (cause) {
  if (app) await app.close();
  save("actual-partial-observations.json", observations); save("failed.json", { status: "ACTUAL_TRANSPORT_FAILED", message: String(cause), before }); throw cause;
}
