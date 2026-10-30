import assert from "node:assert/strict";
import test from "node:test";
import http from "node:http";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { terrainFixture, nightLightFixture, cloudFixture, shardedNightLightFixture } from "./map-static-test-support.mjs";
import { prepareMapStaticBundle } from "./map-static-bundle.mjs";
import { prepareMapObjectStorePackage, readMapObjectStorePackage } from "./map-object-store-package.mjs";
import { verifyMapObjectStoreDelivery } from "./map-object-store-verification.mjs";
import { uploadMapObjectStore } from "./map-object-store-upload.mjs";
import { skyOssOracle, ossFixtureCredentials } from "./sky-oss-test-oracle.mjs";

test("Map OSS plan derives exact routes and bounded HTTP serves GET/HEAD/Range/304 without API or source generation", async t => {
  const root = await mkdtemp(path.join(tmpdir(), "starward-map-object-test-"));
  t.after(async () => { assert.equal(path.dirname(root), path.resolve(tmpdir())); await rm(root, { recursive: true, force: true }); });
  const terrain = await terrainFixture(root), light = await nightLightFixture(root);
  const bundle = await prepareMapStaticBundle({ publications: [terrain, light], outputDirectory: path.join(root, "sealed") });
  const origin = "https://map-assets.example.test";
  const prepared = await prepareMapObjectStorePackage({ bundleDirectory: bundle.directory, outputDirectory: path.join(root, "oss"), publicationHash: bundle.publicationHash, resourceOrigin: origin });
  const args = { bundleDirectory: bundle.directory, packageDirectory: prepared.directory, publicationHash: bundle.publicationHash, resourceOrigin: origin };
  const { plan } = await readMapObjectStorePackage(args);
  assert.equal(plan.files, 3); assert.equal(prepared.cloudPublication, false);
  assert.ok(plan.objects.every(object => !object.objectKey.includes("sky") && !object.objectKey.includes("proof") && object.uploadHeaders["x-oss-forbid-overwrite"] === "true"));
  assert.ok(plan.esaRules.every(rule => rule.phase === "ORIGIN_TO_ESA" && !rule.condition.includes("/v2/sky/")));
  assert.equal(plan.requirements.accountDomainAndQuota, "UNVERIFIED");
  let fault = null, requests = 0;
  const records = new Map(bundle.records.map(record => [record.route, record]));
  const server = http.createServer(async (request, response) => {
    requests++; const record = records.get(request.url);
    if (!record) { response.writeHead(404).end(); return; }
    const bytes = await readFile(path.join(bundle.directory, `files${record.route}`)), etag = `"${record.sha256}"`;
    if (request.headers["if-none-match"] === etag) { response.writeHead(304, { etag }).end(); return; }
    const headers = { ...record.headers, etag, "x-starward-map-delivery": "static" };
    if (fault === "header") headers["cache-control"] = "private";
    let body = bytes, status = 200;
    if (request.headers.range) { const end = Number(/^bytes=0-(\d+)$/u.exec(request.headers.range)[1]);
      body = bytes.subarray(0, end + 1); status = 206; headers["content-range"] = `bytes 0-${end}/${bytes.length}`; }
    headers["content-length"] = String(body.length);
    response.writeHead(status, headers);
    if (request.method === "HEAD") response.end(); else response.end(fault === "bytes" ? Buffer.alloc(body.length) : body);
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const fetchImpl = (url, options) => { const parsed = new URL(url); assert.equal(parsed.origin, origin);
    assert.equal(options.redirect, "error"); assert.equal(options.headers["Accept-Encoding"], "identity");
    assert.ok(!Object.keys(options.headers).some(name => /authorization|preview/iu.test(name)));
    return fetch(`http://127.0.0.1:${server.address().port}${parsed.pathname}`, options); };
  const verified = await verifyMapObjectStoreDelivery({ ...args, delivery: "static", fetchImpl });
  assert.equal(verified.checkedFiles, 3); assert.equal(verified.checkedBytes, bundle.bytes);
  assert.equal(verified.checkedHeads, 2); assert.equal(verified.checkedRanges, 2); assert.equal(verified.checkedConditionals, 2);
  assert.equal(requests, 9); assert.equal(verified.runtimeActivated, false);
  fault = "header"; await assert.rejects(verifyMapObjectStoreDelivery({ ...args, delivery: "static", fetchImpl }), /http_header_mismatch/u);
  fault = "bytes"; await assert.rejects(verifyMapObjectStoreDelivery({ ...args, delivery: "static", fetchImpl }), /http_identity_mismatch/u);
  const raw = JSON.parse(await readFile(path.join(prepared.directory, "plan.json"), "utf8")); raw.objects[0].objectKey = "private/database.sql";
  await writeFile(path.join(prepared.directory, "plan.json"), JSON.stringify(raw));
  await assert.rejects(readMapObjectStorePackage(args), /package_changed/u);
});

test("Map upload uses the actual pinned SDK and shared immutable recovery without Sky release identity", async t => {
  const root = await mkdtemp(path.join(tmpdir(), "starward-map-oss-test-"));
  t.after(async () => { assert.equal(path.dirname(root), path.resolve(tmpdir())); await rm(root, { recursive: true, force: true }); });
  const terrain = await terrainFixture(root), light = await nightLightFixture(root);
  const bundle = await prepareMapStaticBundle({ publications: [terrain, light], outputDirectory: path.join(root, "sealed") });
  const origin = "https://map-assets.example.test", receiptDirectory = path.join(root, "receipts"); await mkdir(receiptDirectory);
  const prepared = await prepareMapObjectStorePackage({ bundleDirectory: bundle.directory, outputDirectory: path.join(root, "oss"), publicationHash: bundle.publicationHash, resourceOrigin: origin });
  let loseOneResponse = true;
  const oracle = await skyOssOracle(t, { afterPut: async ({ response }) => {
    if (!loseOneResponse) return false; loseOneResponse = false; response.destroy(); return true;
  } });
  const args = { bundleDirectory: bundle.directory, packageDirectory: prepared.directory, publicationHash: bundle.publicationHash, resourceOrigin: origin,
    receiptDirectory, bucket: "starward-local-fixture", region: "oss-cn-hangzhou", credentials: ossFixtureCredentials, clientFactory: oracle.factory };
  const first = await uploadMapObjectStore(args);
  assert.equal(first.status, "VERIFIED_MAP_OSS_OBJECTS"); assert.equal(first.putAttempts, 3); assert.equal(first.verifiedBytes, bundle.bytes);
  assert.equal(first.results[0].outcome, "RECONCILED_AFTER_PUT_ERROR"); assert.equal(first.runtimeActivated, false);
  const warm = await uploadMapObjectStore(args);
  assert.equal(warm.status, "VERIFIED_MAP_OSS_OBJECTS"); assert.equal(warm.putAttempts, 0); assert.equal(oracle.puts, 3);
  assert.ok([...oracle.objects.keys()].every(key => /^(?:v2\/terrain\/assets\/|v2\/night-light\/assets\/)/u.test(key)));
  const journal = await readFile(first.receiptPath, "utf8");
  assert.ok(!journal.includes(ossFixtureCredentials.accessKeySecret)); assert.ok(!journal.includes("ORIGINAL_HELD_OCI_PREPARATION"));
  const original = [...oracle.objects.values()][0]; original.headers["cache-control"] = "private";
  const conflict = await uploadMapObjectStore(args);
  assert.equal(conflict.status, "FAILED"); assert.equal(conflict.code, "map_object_store_remote_metadata_mismatch"); assert.equal(conflict.putAttempts, 0);
  oracle.setVersionStatus("Suspended");
  const versioned = await uploadMapObjectStore(args);
  assert.equal(versioned.status, "FAILED"); assert.equal(versioned.code, "map_object_store_versioning_invalid"); assert.equal(versioned.putAttempts, 0);
});

test("sharded EOG OSS preparation remains local and rejects before journal or client", async t => {
  const root = await mkdtemp(path.join(tmpdir(), "starward-map-eog-oss-test-"));
  t.after(async () => { assert.equal(path.dirname(root), path.resolve(tmpdir())); await rm(root, { recursive: true, force: true }); });
  const sharded = await shardedNightLightFixture(root);
  const bundle = await prepareMapStaticBundle({ publications: [sharded], outputDirectory: path.join(root, "sealed") });
  const origin = "https://map-assets.example.test";
  const prepared = await prepareMapObjectStorePackage({ bundleDirectory: bundle.directory, outputDirectory: path.join(root, "oss"), publicationHash: bundle.publicationHash, resourceOrigin: origin });
  const args = { bundleDirectory: bundle.directory, packageDirectory: prepared.directory, publicationHash: bundle.publicationHash, resourceOrigin: origin };
  const { plan, sourceAdmissions } = await readMapObjectStorePackage(args);
  assert.equal(sourceAdmissions[0].admission, "DEVELOPMENT_ONLY");
  assert.equal(plan.requirements.shardedNightLightSourceAdmission, "DEVELOPMENT_ONLY_NOT_UPLOADABLE");
  assert.equal(plan.requirements.shardedNightLightFormalReady, false);
  assert.equal(plan.objects.length, 1);
  assert.match(plan.objects[0].objectKey, /^v2\/night-light\/assets\/.+\/nightlight-contrast-v1-window-/u);
  assert.match(plan.objects[0].uploadHeaders["x-oss-meta-x-starward-night-light-publication"], /^nightlight-display:[a-f0-9]{64}$/u);
  assert.ok(plan.objects.every(object => !object.objectKey.endsWith(".json")));
  let clientCalls = 0;
  const uploadArgs = { ...args, receiptDirectory: path.join(root, "must-not-exist"), bucket: "starward-map-test", region: "oss-cn-shenzhen",
    credentials: ossFixtureCredentials, clientFactory() { clientCalls++; throw new Error("client_must_not_be_created"); } };
  await assert.rejects(uploadMapObjectStore(uploadArgs), /sharded_nightlight_publication_not_ready/u);
  assert.equal(clientCalls, 0); await assert.rejects(stat(uploadArgs.receiptDirectory), { code: "ENOENT" });
  const raw = JSON.parse(await readFile(path.join(prepared.directory, "plan.json"), "utf8"));
  delete raw.requirements.shardedNightLightSourceAdmission; delete raw.requirements.shardedNightLightFormalReady;
  await writeFile(path.join(prepared.directory, "plan.json"), JSON.stringify(raw));
  await assert.rejects(uploadMapObjectStore(uploadArgs), /package_changed/u);
  assert.equal(clientCalls, 0);
});

test("cloud OSS preparation retains local admission and cannot reach a client or journal", async t => {
  const root = await mkdtemp(path.join(tmpdir(), "starward-map-cloud-oss-test-"));
  t.after(async () => { assert.equal(path.dirname(root), path.resolve(tmpdir())); await rm(root, { recursive: true, force: true }); });
  const cloud = await cloudFixture(root); t.after(() => cloud.dispose());
  const terrain = await terrainFixture(root), light = await nightLightFixture(root);
  const bundle = await prepareMapStaticBundle({ publications: [terrain, light, cloud], outputDirectory: path.join(root, "sealed") });
  const origin = "https://map-assets.example.test";
  const prepared = await prepareMapObjectStorePackage({ bundleDirectory: bundle.directory, outputDirectory: path.join(root, "oss"), publicationHash: bundle.publicationHash, resourceOrigin: origin });
  const args = { bundleDirectory: bundle.directory, packageDirectory: prepared.directory, publicationHash: bundle.publicationHash, resourceOrigin: origin };
  const { plan, sourceAdmissions } = await readMapObjectStorePackage(args);
  assert.equal(sourceAdmissions.find(source => source.family === "cloud").admission, "DEVELOPMENT_ONLY");
  assert.equal(plan.requirements.totalCloudSourceAdmission, "DEVELOPMENT_ONLY_NOT_UPLOADABLE");
  assert.equal(plan.requirements.totalCloudFormalReady, false);
  const cloudObjects = plan.objects.filter(object => object.objectKey.startsWith("v2/cloud/"));
  assert.equal(cloudObjects.length, 2);
  assert.ok(cloudObjects.every(object => object.uploadHeaders["x-oss-meta-x-starward-cloud-publication"].startsWith("cloud-display:")));
  assert.ok(plan.esaRules.some(rule => rule.condition.includes('starts_with(http.request.uri.path, "/v2/cloud/assets/")')));
  assert.ok(plan.objects.every(object => !object.objectKey.endsWith(".json")));
  let clientCalls = 0;
  const uploadArgs = { ...args, receiptDirectory: path.join(root, "must-not-exist"), bucket: "starward-map-test", region: "oss-cn-shenzhen",
    credentials: ossFixtureCredentials, clientFactory() { clientCalls++; throw new Error("client_must_not_be_created"); } };
  await assert.rejects(uploadMapObjectStore(uploadArgs), /cloud_source_qualification_not_ready/u);
  assert.equal(clientCalls, 0);
  await assert.rejects(stat(uploadArgs.receiptDirectory), { code: "ENOENT" });
  const originalPlan = await readFile(path.join(prepared.directory, "plan.json"));
  const deletedDisplayGate = JSON.parse(originalPlan.toString("utf8"));
  delete deletedDisplayGate.requirements.totalCloudSourceAdmission;
  delete deletedDisplayGate.requirements.totalCloudFormalReady;
  await writeFile(path.join(prepared.directory, "plan.json"), JSON.stringify(deletedDisplayGate));
  await assert.rejects(uploadMapObjectStore(uploadArgs), /package_changed/u);
  assert.equal(clientCalls, 0);
  await writeFile(path.join(prepared.directory, "plan.json"), originalPlan);

  // A local in-memory HTTP oracle proves the existing delivery protocol's new
  // family grouping only. It performs no external request and cannot upload.
  const objects = new Map(bundle.records.map(record => [record.route, record]));
  const fetchImpl = async (url, options) => {
    const parsed = new URL(url); assert.equal(parsed.origin, origin);
    const record = objects.get(parsed.pathname); assert.ok(record);
    const bytes = await readFile(path.join(bundle.directory, `files${record.route}`)), etag = `"${record.sha256}"`;
    const requestHeaders = new Headers(options.headers);
    if (requestHeaders.get("if-none-match") === etag) return new Response(null, { status: 304, headers: { etag } });
    const headers = { ...record.headers, etag, "x-starward-map-delivery": "oss", "content-length": String(bytes.length) };
    if (options.method === "HEAD") return new Response(null, { headers });
    const range = requestHeaders.get("range");
    if (range) {
      const end = Number(/^bytes=0-(\d+)$/u.exec(range)[1]), body = bytes.subarray(0, end + 1);
      return new Response(body, { status: 206, headers: { ...headers, "content-length": String(body.length), "content-range": `bytes 0-${end}/${bytes.length}` } });
    }
    return new Response(bytes, { headers });
  };
  const verified = await verifyMapObjectStoreDelivery({ ...args, fetchImpl });
  assert.equal(verified.checkedFiles, bundle.files);
  assert.equal(verified.checkedHeads, 3); assert.equal(verified.checkedRanges, 3); assert.equal(verified.checkedConditionals, 3);
  assert.equal(verified.totalCloudSourceAdmission, "DEVELOPMENT_ONLY"); assert.equal(verified.totalCloudFormalReady, false);
  await assert.rejects(uploadMapObjectStore(uploadArgs), /cloud_source_qualification_not_ready/u);
  assert.equal(clientCalls, 0);
});
