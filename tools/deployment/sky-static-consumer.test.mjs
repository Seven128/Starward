import assert from "node:assert/strict";
import { appendFile, cp, mkdir, readFile, readdir, realpath, rm, stat, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { executeRelease } from "./release.mjs";
import { operatePreview } from "./operator-preview.mjs";
import { validateOperatorPreviewEnvironment, validateReleaseEnvironment } from "./validate-release-environment.mjs";
import { prepareSkyStaticDelivery, restoreManagedSkyStaticBackup } from "./sky-static-release.mjs";
import { skyStaticHash, writeSkyStaticBundle } from "./sky-static-bundle.mjs";
import { createSkyStaticBackup, readSkyStaticBackup } from "./sky-static-backup.mjs";
import { decryptBackup, encryptBackup, executeVerifiedBackup, readBackupKeyFile } from "./verified-backup.mjs";
import { readEnvironmentFile } from "./env-file.mjs";
import { validateStagingQualification } from "./promote-release-candidate.mjs";
import { prepareReleaseCandidate } from "./prepare-release-candidate.mjs";
import { createPromotionRequest, runPromotionRequest } from "./promotion-request.mjs";
import { createReleaseEnvironmentFixture, createVerifiedBackupFixture, releaseRevision, releaseImageDigest } from "./test-support.mjs";
import { dependencies, configuration } from "./operator-preview-test-support.mjs";

const imagePublicationHash="4e07f34b96b37d7c89294ffca73ea89ce531dd0bd1cf0e8468426cd5f63e197a";
const identity={schemaVersion:"starward-sky-static-delivery-v1",imagePublicationHash,
  deliveryPublicationHash:"c".repeat(64),imageDigest:releaseImageDigest,revision:releaseRevision,files:136,bytes:22954411};
const oldSteps=["backup-verification","compose-version","compose-config","image-pull","migration","converge","worker-readiness","public-readiness"];
const securityHeaders={"strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff",
  "referrer-policy":"no-referrer","permissions-policy":"camera=(), microphone=(), geolocation=()","content-security-policy":"default-src 'none'; frame-ancestors 'none'"};
async function removeFixture(root) {
 const resolved=await realpath(root),temporary=await realpath(os.tmpdir());
 assert.equal(path.dirname(resolved).toLowerCase(),temporary.toLowerCase());assert.ok(path.basename(resolved).startsWith("starward-release-env-"));
 await rm(resolved,{recursive:true,force:true});
}
async function configured(f){const directory=path.join(f.root,"sky-store");for(const p of [f.baseDeployPath,f.deployPath])await appendFile(p,`STARWARD_SKY_STATIC_DIRECTORY=${directory}\n`);return directory;}
function delivery(f,dispose=async()=>{}){return {overlayPaths:[path.join(f.root,"sky-store","delivery-overlay.yml")],directory:path.join(f.root,"sky-store","publication"),identity,dispose};}
function checkResult(d){return {status:"passed",identity:d.identity,checkedFiles:d.identity.files,checkedBytes:d.identity.bytes,unauthorizedStatus:null};}
async function releaseSetup(t,environment="staging"){
 const f=await createReleaseEnvironmentFixture({environment});t.after(()=>removeFixture(f.root));
 await configured(f);
 const source=await writeSkyStaticBundle(path.join(f.root,"backup-image"),[{route:`/v2/sky/moon/${"1".repeat(64)}/texture.jpg`,bytes:Buffer.from("previous-published-url"),
  headers:{"content-type":"image/jpeg","cache-control":"public, max-age=31536000, immutable","x-content-type-options":"nosniff"}}]);
 const {record}=await createSkyStaticBackup({bundleDirectory:source.output,backupDirectory:f.backupDirectory,inventoryBytes:Buffer.from(JSON.stringify({
  schemaVersion:"starward-sky-static-prepared-inventory-v1",generation:"generation-00000000-0000-0000-0000-000000000001",publicationHash:source.publicationHash,
  sources:[{directory:"source-00000000-0000-0000-0000-000000000001",revision:"1".repeat(40),imageDigest:`sha256:${"1".repeat(64)}`,imagePublicationHash:source.publicationHash}]}))});
 const b=await createVerifiedBackupFixture({fixture:f,overrides:{schemaVersion:"starward-verified-backup-v2",skyStaticBackup:record}});const calls=[];let tick=0;
 return {f,calls,args:{deployEnvPath:f.deployPath,backupManifestPath:b.manifestPath,operator:"test:release",
  ...(environment==="production"?{confirmProductionDigest:releaseImageDigest}:{}),
  execute(call){calls.push(call);return {stdout:Buffer.alloc(0),stderr:Buffer.alloc(0)};},
  fetchImpl:async()=>{const r=new Response(JSON.stringify({status:"ready",release:{environment,revision:releaseRevision,imageDigest:releaseImageDigest}}),{headers:{"content-type":"application/json; charset=utf-8",...securityHeaders}});
   Object.defineProperty(r,"url",{value:`https://${f.domain}/health/ready`});return r;},
  inspectTls:async()=>({protocol:"TLSv1.3"}),delay:async()=>{},now:()=>new Date(Date.parse("2026-08-26T12:00:00Z")+tick++*1000)}};
}
function finalOverlay(call,d){const paths=call.args.flatMap((value,i)=>value==="-f"?[call.args[i+1]]:[]);assert.equal(paths.at(-1),d.overlayPaths[0]);}

// Restore the two sealed, inherited real PNG sources into this test's private
// directory. The output probe is readonly input, not a production OCI claim.
async function archivedFileBackup(validation, deploy) {
 const key = await readBackupKeyFile(validation.operations.backupKeyFile);
 try { return await executeVerifiedBackup({ validation, deploy, postgres: await readEnvironmentFile(validation.lanes.postgres), key,
   now: () => new Date("2026-08-26T11:00:00Z"), run(call) {
    return { stdout: Buffer.from(call.step.endsWith("-schema-relation") ? "t" : call.step === "backup-dump" ? "PGDMP".repeat(200) :
      ["backup-source-schema", "backup-restored-schema"].includes(call.step) ? "006_verified_fixture" : ""), stderr: Buffer.alloc(0) };
   } }); } finally { key.fill(0); }
}
async function restoreArchivedSourceFixture({ f, store, validation, deploy }) {
 const archived = JSON.parse(await readFile(path.resolve("output/sky-offline-source-backup-1006-e2-r1/result.json"), "utf8"));
 const record = archived.publicSnapshot;
 await mkdir(f.backupDirectory, { recursive: true });
 await cp(path.resolve("output/sky-offline-source-backup-1006-e2-r1/backups", record.directory), path.join(f.backupDirectory, record.directory), { recursive: true });
 let restorationImageCalls = 0;
 const restored = await restoreManagedSkyStaticBackup({ validation: { ...validation, operations: { ...validation.operations, skyStaticDirectory: null } },
  deploy, record, outputDirectory: store, confirmPublicationHash: record.publicationHash,
  execute() { restorationImageCalls++; throw new Error("original_cached_images_unavailable"); } });
 assert.equal(restorationImageCalls, 0); assert.equal(restored.runtimeApplied, false);
 return restored;
}
async function archivedReleaseSetup(t) {
 const revision = "2".repeat(40), imageDigest = `sha256:${"2".repeat(64)}`;
 const f = await createReleaseEnvironmentFixture({ baseDeploy: { STARWARD_BACKUP_MAX_BYTES: "1048576" },
  deploy: { STARWARD_RELEASE_REVISION: revision, STARWARD_IMAGE_DIGEST: imageDigest, STARWARD_IMAGE_REF: `registry.example/starward@${imageDigest}` } });
 t.after(() => removeFixture(f.root)); const store = await configured(f);
 const validation = await validateReleaseEnvironment({ deployEnvPath: f.deployPath }), deploy = await readEnvironmentFile(f.deployPath);
 const restored = await restoreArchivedSourceFixture({ f, store, validation, deploy });
 const backup = await archivedFileBackup(validation, deploy);
 assert.equal(backup.manifest.skyStaticBackup.schemaVersion, "starward-sky-static-backup-v2");
 const snapshot = await readSkyStaticBackup({ backupDirectory: f.backupDirectory, record: backup.manifest.skyStaticBackup });
 const calls = [], http = []; let tick = 0;
 const args = { deployEnvPath: f.deployPath, backupManifestPath: backup.manifestPath, operator: "test:restored-release",
  now: () => new Date(Date.parse("2026-08-26T12:00:00Z") + tick++ * 1000),
  execute(call) { calls.push(call); return { stdout: Buffer.from(call.step === "sky-static-image-revision" ? revision : ""), stderr: Buffer.alloc(0) }; },
  async fetchImpl(url, options = {}) {
   const route = new URL(url).pathname; http.push({ route, method: options.method ?? "GET" });
   if (route === "/health/ready") { const response = new Response(JSON.stringify({ status: "ready", release: { environment: "staging", revision, imageDigest } }),
     { headers: { "content-type": "application/json; charset=utf-8", ...securityHeaders } }); Object.defineProperty(response, "url", { value: url }); return response; }
   const row = snapshot.bundle.records.find(r => r.route === route); assert(row);
   return new Response(options.method === "HEAD" ? null : await readFile(path.join(restored.directory, `files${route}`)),
    { headers: { ...row.headers, "x-starward-sky-delivery": "static" } });
  }, inspectTls: async () => ({ protocol: "TLSv1.3" }), delay: async () => {} };
 return { f, store, validation, deploy, restored, backup, snapshot, revision, imageDigest, calls, http, args };
}

test("archived-source release rejects unbound, self-consistently rehashed, damaged-authentication and wrong-key backups before any process", async t => {
 for (const fault of ["unbound", "rehashed-source", "ciphertext", "wrong-key"]) {
  const s = await archivedReleaseSetup(t), manifest = structuredClone(s.backup.manifest), record = manifest.skyStaticBackup;
  const encryptedPath = path.join(s.f.backupDirectory, manifest.encrypted.fileName);
  if (fault === "unbound") { const key = await readBackupKeyFile(s.validation.operations.backupKeyFile);
   try { await writeFile(encryptedPath, encryptBackup(Buffer.from("PGDMP".repeat(200)), key)); } finally { key.fill(0); }
  } else if (fault === "rehashed-source") {
   const pool = path.join(s.f.backupDirectory, record.directory), inventory = JSON.parse(await readFile(path.join(pool, `inventory-${record.inventorySha256}.json`), "utf8"));
   inventory.sources[0].imageDigest = `sha256:${"0".repeat(64)}`;
   const inventoryBytes = Buffer.from(JSON.stringify(inventory) + "\n"), archive = JSON.parse(await readFile(path.join(pool, `sources-${record.sourceMetadataSha256}.json`), "utf8"));
   record.inventorySha256 = skyStaticHash(inventoryBytes); archive.inventorySha256 = record.inventorySha256;
   const archiveBytes = Buffer.from(JSON.stringify(archive) + "\n"); record.sourceMetadataSha256 = skyStaticHash(archiveBytes);
   await writeFile(path.join(pool, `inventory-${record.inventorySha256}.json`), inventoryBytes, { flag: "wx" });
   await writeFile(path.join(pool, `sources-${record.sourceMetadataSha256}.json`), archiveBytes, { flag: "wx" });
   await readSkyStaticBackup({ backupDirectory: s.f.backupDirectory, record }); // Integrity passes; original GCM binding must reject.
  } else if (fault === "ciphertext") { const bytes = await readFile(encryptedPath); bytes[bytes.length - 1] ^= 1; await writeFile(encryptedPath, bytes); }
  else await writeFile(s.validation.operations.backupKeyFile, `${"3".repeat(64)}\n`);
  const encrypted = await readFile(encryptedPath); manifest.encrypted.byteLength = encrypted.length; manifest.encrypted.sha256 = skyStaticHash(encrypted);
  await writeFile(s.backup.manifestPath, JSON.stringify(manifest));
  const pointerBefore = await readFile(path.join(s.store, "prepared-inventory.json"));
  await assert.rejects(executeRelease(s.args), /release_backup_sky_authentication_invalid/, fault);
  assert.equal(s.calls.length, 0); assert.equal(s.http.length, 0);
  assert((await readFile(path.join(s.store, "prepared-inventory.json"))).equals(pointerBefore));
  const receipts = await readdir(s.f.receiptDirectory); assert.equal(receipts.length, 1);
  const failed = JSON.parse(await readFile(path.join(s.f.receiptDirectory, receipts[0]), "utf8"));
  assert.equal(failed.status, "failed"); assert.equal(failed.backup, null); assert.equal(failed.skyStaticDelivery, null);
  assert.equal(failed.errorCode, "release_backup_sky_authentication_invalid");
 }
});

test("default release uses offline-restored original sources and authenticated backup through actual preparation and byte verification", async t => {
 const s = await archivedReleaseSetup(t), before = await readFile(path.join(s.store, "prepared-inventory.json"));
 const result = await executeRelease(s.args);
 assert.equal(result.receipt.status, "succeeded");
 assert.equal(result.receipt.backup.skyStaticAuthentication, "AES_256_GCM_BOUND_COMPONENT_VERIFIED");
 assert.equal(result.receipt.skyStaticDelivery.files, 2); assert.equal(result.receipt.skyStaticDelivery.bytes, 6838);
 assert.equal(result.receipt.skyStaticDelivery.deliveryPublicationHash, s.backup.manifest.skyStaticBackup.publicationHash);
 assert.equal(result.receipt.skyStaticDelivery.revision, s.revision); assert.equal(result.receipt.skyStaticDelivery.imageDigest, s.imageDigest);
 assert((await readFile(path.join(s.store, "prepared-inventory.json"))).equals(before));
 assert.equal(s.calls.filter(c => c.step === "sky-static-image-revision").length, 1);
 assert.ok(!s.calls.some(c => c.args[0] === "create" || c.args[0] === "cp"));
 assert.deepEqual(s.http.filter(r => r.route !== "/health/ready").map(r => r.method), ["GET", "GET", "HEAD"]);
 assert.ok(result.receipt.steps.some(r => r.name === "sky-static-verification" && r.result.checkedBytes === 6838));
 for (const call of s.calls.filter(c => ["release-static-compose-config", "release-migration", "release-converge", "release-worker-readiness"].includes(c.step)))
  finalOverlay(call, { overlayPaths: s.restored.overlayPaths });
 await assert.rejects(stat(path.join(s.store, "preparation.lock")), { code: "ENOENT" });
 assert.ok(!(await readdir(s.f.receiptDirectory)).includes("operator-preview-current.json")); // Formal receipt never fabricates preview current.
});

test("source-capable release bounds encrypted input before reading or authenticating oversized data", async t => {
 const s = await archivedReleaseSetup(t), manifest = structuredClone(s.backup.manifest);
 const oversized = Buffer.alloc(s.validation.operations.maxBackupBytes + 4097, 5);
 await writeFile(path.join(s.f.backupDirectory, manifest.encrypted.fileName), oversized);
 manifest.encrypted.byteLength = oversized.length; manifest.encrypted.sha256 = skyStaticHash(oversized);
 await writeFile(s.backup.manifestPath, JSON.stringify(manifest));
 await assert.rejects(executeRelease(s.args), /release_backup_size_limit_exceeded/);
 assert.equal(s.calls.length, 0); assert.equal(s.http.length, 0);
});

test("retained prior-image release after failed verification keeps restored old URLs and reuses sources with a fresh authenticated backup", async t => {
 const s = await archivedReleaseSetup(t), pointerBefore = await readFile(path.join(s.store, "prepared-inventory.json"));
 const first = await executeRelease(s.args);
 await assert.rejects(executeRelease({ ...s.args, fetchImpl: async (url, options) => new URL(url).pathname === "/health/ready"
  ? s.args.fetchImpl(url, options) : new Response(Buffer.from("wrong-static-body")) }), /sky_static_http_identity_mismatch/);
 assert((await readFile(path.join(s.store, "prepared-inventory.json"))).equals(pointerBefore));
 // Application/schema compatibility and accepted writes are only fixtures here.
 // The original documented rollback mechanism selects a fresh prior descriptor,
 // never treats a prepared generation as prior runtime current.
 const revision = "1".repeat(40), imageDigest = `sha256:${"1".repeat(64)}`;
 const deploy = { ...s.deploy, STARWARD_RELEASE_REVISION: revision, STARWARD_IMAGE_DIGEST: imageDigest,
  STARWARD_IMAGE_REF: `registry.example/starward@${imageDigest}` };
 const deployEnvPath = path.join(s.f.root, "retained-prior.deploy.env");
 await writeFile(deployEnvPath, Object.entries(deploy).map(([key, value]) => `${key}=${value}`).join("\n") + "\n");
 const validation = await validateReleaseEnvironment({ deployEnvPath }), backup = await archivedFileBackup(validation, deploy), calls = [];
 assert.notEqual(backup.manifestPath, s.backup.manifestPath);
 assert.equal(backup.manifest.releaseRevision, revision); assert.equal(backup.manifest.releaseImageDigest, imageDigest);
 const result = await executeRelease({ ...s.args, deployEnvPath, backupManifestPath: backup.manifestPath,
  execute(call) { calls.push(call); return { stdout: Buffer.from(call.step === "sky-static-image-revision" ? revision : ""), stderr: Buffer.alloc(0) }; },
  fetchImpl: async (url, options) => {
   if (new URL(url).pathname !== "/health/ready") return s.args.fetchImpl(url, options);
   const response = new Response(JSON.stringify({ status: "ready", release: { environment: "staging", revision, imageDigest } }),
    { headers: { "content-type": "application/json; charset=utf-8", ...securityHeaders } }); Object.defineProperty(response, "url", { value: url }); return response;
  } });
 assert.equal(result.receipt.status, "succeeded"); assert.equal(result.receipt.backup.skyStaticAuthentication, "AES_256_GCM_BOUND_COMPONENT_VERIFIED");
 assert.equal(result.receipt.skyStaticDelivery.revision, revision); assert.equal(result.receipt.skyStaticDelivery.imageDigest, imageDigest);
 assert.notEqual(result.receipt.skyStaticDelivery.imagePublicationHash, first.receipt.skyStaticDelivery.imagePublicationHash);
 assert.equal(result.receipt.skyStaticDelivery.deliveryPublicationHash, first.receipt.skyStaticDelivery.deliveryPublicationHash);
 assert.equal(result.receipt.skyStaticDelivery.files, 2); assert.equal(result.receipt.skyStaticDelivery.bytes, 6838);
 assert((await readFile(path.join(s.store, "prepared-inventory.json"))).equals(pointerBefore));
 assert.equal(calls.filter(c => c.step === "sky-static-image-revision").length, 1);
 assert.ok(!calls.some(c => c.args[0] === "create" || c.args[0] === "cp"));
 await validateStagingQualification({ receiptPath: first.receiptPath, revision: s.revision, imageDigest: s.imageDigest, requireSkyStatic: true });
 await validateStagingQualification({ receiptPath: result.receiptPath, revision, imageDigest, requireSkyStatic: true });
 const receipts = await readdir(s.f.receiptDirectory); assert.equal(receipts.length, 3);
 assert.ok(!receipts.includes("operator-preview-current.json"));
 assert.equal((await Promise.all(receipts.map(async p => JSON.parse(await readFile(path.join(s.f.receiptDirectory, p), "utf8"))))).filter(r => r.status === "failed").length, 1);
 await assert.rejects(stat(path.join(s.store, "preparation.lock")), { code: "ENOENT" });
});

test("offline-restored preview publishes current only after real static verification and preserves it through failed prior-image selection", async t => {
 const dep = await dependencies(t), store = await configured(dep.f);
 const original = await readEnvironmentFile(dep.f.deployPath);
 const selectedDeploy = version => ({ ...original, STARWARD_RELEASE_REVISION: version.repeat(40), STARWARD_IMAGE_DIGEST: `sha256:${version.repeat(64)}`,
  STARWARD_IMAGE_REF: `registry.example/starward@sha256:${version.repeat(64)}` });
 let deploy = selectedDeploy("2"), failStatic = false;
 const writeSelected = () => writeFile(dep.f.deployPath, Object.entries(deploy).map(([key, value]) => `${key}=${value}`).join("\n") + "\n");
 await writeSelected(); let validation = await validateOperatorPreviewEnvironment({ deployEnvPath: dep.f.deployPath });
 const restored = await restoreArchivedSourceFixture({ f: dep.f, store, validation, deploy });
 const pointerBefore = await readFile(path.join(store, "prepared-inventory.json")), calls = [];
 const execute = call => {
  calls.push(call); let value;
  if (["preview-image-revision", "sky-static-image-revision"].includes(call.step)) value = deploy.STARWARD_RELEASE_REVISION;
  else if (call.step === "preview-compose-config") value = JSON.stringify(configuration(deploy));
  else if (call.step === "preview-static-compose-config") value = JSON.stringify(staticConfiguration(deploy, { directory: restored.directory }));
  else if (["backup-source-schema", "backup-restored-schema"].includes(call.step)) value = "006_verified_fixture";
  else if (call.step.endsWith("-schema-relation")) value = "t";
  else if (call.step === "backup-dump") value = "PGDMP".repeat(200);
  else if (call.step === "sky-static-retention-runtime-discovery") value = "a".repeat(64);
  else if (call.step === "sky-static-retention-runtime-mounts") value = JSON.stringify({ id: "a".repeat(64), running: true, mounts: [
   { Type: "bind", RW: false, Source: restored.directory, Destination: "/srv/sky-public" },
   { Type: "bind", RW: false, Source: path.join(restored.directory, "delivery.caddy"), Destination: "/etc/caddy/sky-static-delivery.caddy" } ] });
  if (value !== undefined) return { stdout: Buffer.from(value), stderr: Buffer.alloc(0) };
  return dep.execute(call);
 };
 const fetchImpl = async (url, options = {}) => {
  if (options.headers["X-Starward-Operator-Preview"] !== deploy.STARWARD_OPERATOR_PREVIEW_TOKEN) return new Response(null, { status: 404 });
  const route = new URL(url).pathname, index = JSON.parse(await readFile(path.join(restored.directory, "index.json"), "utf8"));
  const row = index.records.find(r => r.route === route); assert(row);
  return new Response(options.method === "HEAD" ? null : failStatic ? Buffer.from("wrong-static-body") : await readFile(path.join(restored.directory, `files${route}`)),
   { headers: { ...row.headers, "x-starward-sky-delivery": "static" } });
 };
 const args = { ...dep, deployEnvPath: dep.f.deployPath, operator: "test:restored-preview", backup: executeVerifiedBackup, execute, fetchImpl };
 const unavailable = await operatePreview({ ...args, operation: "check" });
 assert.equal(unavailable.receipt.status, "failed"); assert.equal(unavailable.receipt.errorCode, "sky_static_load_current_pointer_missing");
 assert.equal(calls.length, 0);
 const first = await operatePreview({ ...args, operation: "deploy" });
 assert.equal(first.receipt.status, "succeeded"); assert.equal(first.receipt.skyStaticDelivery.files, 2); assert.equal(first.receipt.skyStaticDelivery.bytes, 6838);
 const currentPath = path.join(dep.f.receiptDirectory, "operator-preview-current.json"), currentBefore = await readFile(currentPath);
 const manifest = JSON.parse(await readFile(first.receipt.backupManifestPath, "utf8")), key = await readBackupKeyFile(validation.operations.backupKeyFile);
 let dump;
 try { dump = decryptBackup(await readFile(path.join(dep.f.backupDirectory, manifest.encrypted.fileName)), key, manifest.skyStaticBackup);
  assert.equal(dump.toString(), "PGDMP".repeat(200)); } finally { dump?.fill(0); key.fill(0); }
 // The actual current loader needs the mounted overlay configuration too.
 const currentExecute = call => call.step === "preview-compose-config"
  ? { stdout: Buffer.from(JSON.stringify(staticConfiguration(deploy, { directory: restored.directory }))), stderr: Buffer.alloc(0) } : execute(call);
 const checked = await operatePreview({ ...args, operation: "check", execute: currentExecute });
 assert.equal(checked.receipt.status, "succeeded");
 assert.equal(checked.receipt.steps.find(r => r.name === "sky-static-load").result.basis, "CURRENT_RECEIPT_AND_RUNNING_MOUNT");
 assert((await readFile(currentPath)).equals(currentBefore));
 deploy = selectedDeploy("1"); await writeSelected(); failStatic = true;
 const failed = await operatePreview({ ...args, operation: "deploy" });
 assert.equal(failed.receipt.status, "failed"); assert.equal(failed.receipt.errorCode, "sky_static_http_identity_mismatch");
 assert((await readFile(currentPath)).equals(currentBefore)); assert((await readFile(path.join(store, "prepared-inventory.json"))).equals(pointerBefore));
 failStatic = false; const prior = await operatePreview({ ...args, operation: "deploy" });
 assert.equal(prior.receipt.status, "succeeded"); assert.equal(prior.receipt.skyStaticDelivery.revision, "1".repeat(40));
 assert.equal(prior.receipt.skyStaticDelivery.deliveryPublicationHash, first.receipt.skyStaticDelivery.deliveryPublicationHash);
 assert.notEqual(prior.receipt.skyStaticDelivery.imagePublicationHash, first.receipt.skyStaticDelivery.imagePublicationHash);
 assert.equal(prior.receipt.skyStaticDelivery.files, 2); assert.equal(prior.receipt.skyStaticDelivery.bytes, 6838);
 const pointer = JSON.parse(await readFile(currentPath, "utf8")); assert.equal(pointer.receiptPath, prior.receiptPath);
 const checkedPrior = await operatePreview({ ...args, operation: "check", execute: currentExecute });
 assert.equal(checkedPrior.receipt.status, "succeeded"); assert.equal(checkedPrior.receipt.skyStaticDelivery.revision, "1".repeat(40));
 assert.ok(!calls.some(c => c.args[0] === "create" || c.args[0] === "cp"));
 assert((await readFile(path.join(store, "prepared-inventory.json"))).equals(pointerBefore));
 await assert.rejects(stat(path.join(store, "preparation.lock")), { code: "ENOENT" });
 assert.equal(JSON.parse(await readFile(first.receiptPath, "utf8")).status, "succeeded");
 // All runtime discovery, PostgreSQL, readiness, certificate and HTTP are
 // injected; this is a file-owner consumer check, not a live restore drill.
});

test("configured release prepares after pull, uses final overlay and verifies before a v2 success receipt",async t=>{
 const {f,calls,args}=await releaseSetup(t);let disposed=0;const d=delivery(f,async()=>{disposed++});
 const result=await executeRelease({...args,prepareStatic:async input=>{assert.ok(calls.some(c=>c.step==="release-image-pull"));assert.equal(input.validation.operations.skyStaticDirectory,path.join(f.root,"sky-store"));calls.push({step:"static-prepare"});return d;},
  verifyStatic:async input=>{assert.equal(input.delivery,d);assert.ok(calls.some(c=>c.step==="release-converge"));calls.push({step:"static-verify"});return checkResult(d);}});
 assert.equal(result.receipt.schemaVersion,"starward-release-receipt-v2");assert.deepEqual(result.receipt.skyStaticDelivery,identity);assert.equal(disposed,1);
 for(const call of calls.filter(c=>["release-static-compose-config","release-migration","release-converge","release-worker-readiness"].includes(c.step)))finalOverlay(call,d);
 assert.ok(calls.some(c=>c.step==="static-verify"));assert.ok(result.receipt.steps.some(s=>s.name==="sky-static-verification"&&s.status==="passed"));
 assert.deepEqual(JSON.parse(await readFile(result.receiptPath,"utf8")).skyStaticDelivery,identity);
});
test("static preparation failure cannot converge; verification failure cannot emit successful qualification",async t=>{
 for(const phase of ["prepare","verify"]){const {f,calls,args}=await releaseSetup(t);let disposed=0;const d=delivery(f,async()=>{disposed++});
  await assert.rejects(executeRelease({...args,prepareStatic:async()=>{if(phase==="prepare")throw new Error("sky_static_source_invalid");return d;},verifyStatic:async()=>{throw new Error("sky_static_actual_bytes_mismatch");}}),/sky_static_/);
  assert.equal(calls.some(c=>c.step==="release-converge"),phase==="verify");assert.equal(disposed,phase==="verify"?1:0);
  const names=await readdir(f.receiptDirectory),receipt=JSON.parse(await readFile(path.join(f.receiptDirectory,names[0]),"utf8"));
  assert.equal(receipt.status,"failed");assert.equal(receipt.schemaVersion,"starward-release-receipt-v2");assert.ok(!receipt.steps.some(s=>s.name==="sky-static-verification"&&s.status==="passed"));
 }
});
test("production static lane requires actual v2 staging qualification, and compares current image publication",async t=>{
 const {f,calls,args}=await releaseSetup(t,"production");const receiptPath=path.join(f.root,"staging.json");
 const old={schemaVersion:"starward-release-receipt-v1",status:"succeeded",environment:"staging",revision:releaseRevision,imageDigest:releaseImageDigest,steps:oldSteps.map(name=>({name,status:"passed"}))};
 await writeFile(receiptPath,JSON.stringify(old));
 await assert.rejects(validateStagingQualification({receiptPath,revision:releaseRevision,imageDigest:releaseImageDigest,requireSkyStatic:true}),/sky_static/);
 const current={...old,schemaVersion:"starward-release-receipt-v2",skyStaticDelivery:identity,steps:[...old.steps,{name:"sky-static-preparation",status:"passed"},{name:"sky-static-compose-config",status:"passed"},{name:"sky-static-verification",status:"passed",result:checkResult({identity})}]};
 await writeFile(receiptPath,JSON.stringify(current));const q=await validateStagingQualification({receiptPath,revision:releaseRevision,imageDigest:releaseImageDigest,requireSkyStatic:true});assert.deepEqual(q.skyStaticDelivery,identity);
 let disposed=0;const d=delivery(f,async()=>{disposed++});d.identity={...identity,imagePublicationHash:"d".repeat(64)};
 await assert.rejects(executeRelease({...args,stagingReceiptPath:receiptPath,prepareStatic:async()=>d,verifyStatic:async()=>checkResult(d)}),/sky_static.*publication.*mismatch/);
 assert.equal(disposed,1);assert.ok(!calls.some(c=>c.step==="release-converge"));
});
function staticConfiguration(deploy,d){const c=configuration(deploy);c.services.caddy.volumes=c.services.caddy.volumes.filter(v=>v.target!=="/etc/caddy/sky-static-delivery.caddy");c.services.caddy.volumes.push(
 {type:"bind",source:path.join(d.directory,"delivery.caddy"),target:"/etc/caddy/sky-static-delivery.caddy",read_only:true},
 {type:"bind",source:d.directory,target:"/srv/sky-public",read_only:true});return c;}

test("actual preview non-deploy loader keeps current mounted overlay after another generation was prepared, before any Compose action", async t=>{
 const dep=await dependencies(t),store=await configured(dep.f);
 const validation=await validateOperatorPreviewEnvironment({deployEnvPath:dep.f.deployPath});
 // Supply real sealed producer files through the synchronous artifact extraction boundary.
 const {cpSync}=await import("node:fs");
 const prepare=async(version,selected)=>{
  const bundle=await writeSkyStaticBundle(path.join(dep.f.root,`sealed-${version}`),(async function*(){yield {
   route:`/v2/sky/moon/${version.repeat(64)}/texture.jpg`,bytes:Buffer.from(version),headers:{"content-type":"image/jpeg",
   "cache-control":"public, max-age=31536000, immutable","x-content-type-options":"nosniff"}};})());
  await writeFile(path.join(bundle.output,"image-artifact.json"),JSON.stringify({schemaVersion:"starward-sky-static-image-artifact-v1",
   revision:selected.revision,publicationHash:bundle.publicationHash,indexSha256:skyStaticHash(await readFile(path.join(bundle.output,"index.json"))),
   fragmentSha256:skyStaticHash(await readFile(path.join(bundle.output,"delivery.caddy")))}));
  const d=await prepareSkyStaticDelivery({validation:selected,deploy:{...dep.deploy,STARWARD_SKY_STATIC_DIRECTORY:store,STARWARD_IMAGE_REF:`fixture@${selected.imageDigest}`},
   execute:call=>{const command=call.args[0];if(command==="image")return {stdout:Buffer.from(selected.revision)};
    if(command==="cp")cpSync(bundle.output,call.args[2],{recursive:true});
    return {stdout:Buffer.from(command==="create"||command==="container"?"a".repeat(12):"")};}});
  await d.dispose();return d;
 };
 const current=await prepare("1",validation);
 const newer=await prepare("2",{...validation,revision:"2".repeat(40),imageDigest:`sha256:${"2".repeat(64)}`});
 const receiptFile=`operator-preview-${randomUUID()}.json`;await mkdir(dep.f.receiptDirectory,{recursive:true});
 await writeFile(path.join(dep.f.receiptDirectory,receiptFile),JSON.stringify({schemaVersion:"starward-operator-preview-operation-v2",operation:"deploy",
  status:"succeeded",environment:"staging",productionQualified:false,revision:validation.revision,imageDigest:validation.imageDigest,skyStaticDelivery:current.identity,
  steps:["sky-static-preparation","sky-static-compose-config","sky-static-verification"].map(name=>({name,status:"passed",
   ...(name==="sky-static-verification"?{result:{...checkResult(current),unauthorizedStatus:404}}:{})}))}));
 await writeFile(path.join(dep.f.receiptDirectory,"operator-preview-current.json"),JSON.stringify({revision:validation.revision,imageDigest:validation.imageDigest,
  receiptPath:path.join(dep.f.receiptDirectory,receiptFile),skyStaticDelivery:current.identity,skyStaticOverlayPaths:current.overlayPaths}));
 let mounted=current;const calls=[];
 const execute=call=>{calls.push(call);if(call.step==="sky-static-retention-runtime-discovery")return {stdout:Buffer.from("a".repeat(64))};
  if(call.step==="sky-static-retention-runtime-mounts")return {stdout:Buffer.from(JSON.stringify({id:"a".repeat(64),running:true,mounts:[
   {Type:"bind",RW:false,Source:mounted.directory,Destination:"/srv/sky-public"},
   {Type:"bind",RW:false,Source:path.join(mounted.directory,"delivery.caddy"),Destination:"/etc/caddy/sky-static-delivery.caddy"}]}))};
  if(call.step==="preview-compose-config")return {stdout:Buffer.from(JSON.stringify(staticConfiguration(dep.deploy,current)))};
  return dep.execute(call);};
 const passed=await operatePreview({...dep,deployEnvPath:dep.f.deployPath,operation:"check",operator:"test",execute,
  verifyStatic:async input=>{assert.deepEqual(input.delivery.identity,current.identity);return {...checkResult(current),unauthorizedStatus:404};}});
 assert.equal(passed.receipt.status,"succeeded");assert.equal(passed.receipt.skyStaticDelivery.files,1);
 assert.equal(passed.receipt.steps.find(s=>s.name==="sky-static-load").result.preparedGenerationMatches,false);
 for(const call of calls.filter(c=>c.step.startsWith("preview-")))finalOverlay(call,current);
 const backed=await operatePreview({...dep,deployEnvPath:dep.f.deployPath,operation:"backup",operator:"test",backup:executeVerifiedBackup,
  execute:call=>{
   if(call.step.endsWith("-schema-relation"))return {stdout:Buffer.from("t"),stderr:Buffer.alloc(0)};
   if(["backup-source-schema","backup-restored-schema"].includes(call.step))return {stdout:Buffer.from("006_verified_fixture"),stderr:Buffer.alloc(0)};
   if(call.step==="backup-dump")return {stdout:Buffer.from("PGDMP".repeat(200)),stderr:Buffer.alloc(0)};
   return execute(call);
  }});
 assert.equal(backed.receipt.status,"succeeded");assert.deepEqual(backed.receipt.skyStaticDelivery,current.identity);
 const backupManifest=JSON.parse(await readFile(backed.receipt.backupManifestPath,"utf8"));
 assert.equal(backupManifest.schemaVersion,"starward-verified-backup-v2");
 const snapshot=await readSkyStaticBackup({backupDirectory:validation.operations.backupDirectory,record:backupManifest.skyStaticBackup});
 assert.equal(snapshot.bundle.files,2);assert.equal(snapshot.record.scope,"RETAINED_PUBLIC_URL_UNION");
 assert.notEqual(snapshot.record.publicationHash,current.identity.deliveryPublicationHash);
 calls.length=0;mounted=newer;
 const failed=await operatePreview({...dep,deployEnvPath:dep.f.deployPath,operation:"stop",operator:"test",execute});
 assert.equal(failed.receipt.status,"failed");assert.equal(failed.receipt.errorCode,"sky_static_load_current_runtime_mismatch");
 assert.ok(!calls.some(c=>c.step.startsWith("preview-")));assert.equal(failed.receipt.writersStopped,false);
 assert.ok((await readdir(store)).some(n=>n.startsWith("generation-")));
});
test("preview static stage precedes drain, preserves preview overlay last and verifies before current pointer",async t=>{
 const dep=await dependencies(t);await configured(dep.f);let disposed=0;const d=delivery(dep.f,async()=>{disposed++});const calls=[];
 const result=await operatePreview({...dep,deployEnvPath:dep.f.deployPath,operation:"deploy",operator:"test",
  execute(call){calls.push(call);if(call.step==="preview-static-compose-config")return {stdout:Buffer.from(JSON.stringify(staticConfiguration(dep.deploy,d))),stderr:Buffer.alloc(0)};return dep.execute(call);},
  prepareStatic:async()=>{calls.push({step:"static-prepare"});assert.ok(dep.calls.some(c=>c.step==="preview-image-pull"));return d;},
  verifyStatic:async()=>{calls.push({step:"static-verify"});await assert.rejects(readFile(path.join(dep.f.receiptDirectory,"operator-preview-current.json")));return {...checkResult(d),unauthorizedStatus:404};}});
 assert.equal(result.receipt.status,"succeeded");assert.equal(result.receipt.schemaVersion,"starward-operator-preview-operation-v2");assert.equal(disposed,1);assert.deepEqual(result.receipt.skyStaticDelivery,identity);
 assert.ok(calls.findIndex(c=>c.step==="static-prepare")<calls.findIndex(c=>c.step==="preview-stop-writers"));
 for(const call of calls.filter(c=>["preview-static-compose-config","preview-stop-writers","preview-start-edge","preview-migration"].includes(c.step))){finalOverlay(call,d);assert.ok(call.args.some(v=>v.endsWith("compose.operator-preview.yml")));}
 assert.deepEqual(JSON.parse(await readFile(path.join(dep.f.receiptDirectory,"operator-preview-current.json"),"utf8")).skyStaticDelivery,identity);
});
test("preview prep failure leaves current writers/pointer untouched and check loads existing overlay without pull",async t=>{
 const dep=await dependencies(t);await configured(dep.f);const pointer=path.join(dep.f.receiptDirectory,"operator-preview-current.json");
 const result=await operatePreview({...dep,deployEnvPath:dep.f.deployPath,operation:"deploy",operator:"test",prepareStatic:async()=>{throw new Error("sky_static_manifest_invalid")}});
 assert.equal(result.receipt.status,"failed");assert.equal(result.receipt.writersStopped,false);assert.ok(!dep.calls.some(c=>c.step==="preview-stop-writers"));await assert.rejects(readFile(pointer));
 let disposed=0;const d=delivery(dep.f,async()=>{disposed++});const calls=[];
 d.observation={basis:"CURRENT_RECEIPT_AND_RUNNING_MOUNT",fixture:true};
 const check=await operatePreview({...dep,deployEnvPath:dep.f.deployPath,operation:"check",operator:"test",loadStatic:async input=>{
  assert.equal(input.operation,"check");assert.equal(input.execute instanceof Function,true);return d;},
  execute(call){calls.push(call);if(call.step==="preview-compose-config")return {stdout:Buffer.from(JSON.stringify(staticConfiguration(dep.deploy,d))),stderr:Buffer.alloc(0)};return dep.execute(call);},
  verifyStatic:async()=>({...checkResult(d),unauthorizedStatus:404})});
 assert.equal(check.receipt.status,"succeeded");assert.equal(disposed,1);assert.ok(!calls.some(c=>c.step==="preview-image-pull"));calls.forEach(c=>finalOverlay(c,d));
 assert.deepEqual(check.receipt.steps.find(s=>s.name==="sky-static-load").result,d.observation);
});
test("base directory propagates without accepting operator publication identity or changing request v1 fields",async t=>{
 const f=await createReleaseEnvironmentFixture();t.after(()=>removeFixture(f.root));await configured(f);
 const outputPath=path.join(f.root,"candidate.env"),imageReference=`registry.example/starward@${releaseImageDigest}`;
 await prepareReleaseCandidate({baseDeployEnvPath:f.baseDeployPath,outputPath,imageReference,revision:releaseRevision,releasedAt:"2026-08-26T10:00:00Z"});
 assert.equal((await validateReleaseEnvironment({deployEnvPath:outputPath})).operations.skyStaticDirectory,path.join(f.root,"sky-store"));
 const r=await createPromotionRequest({outputPath:path.join(f.root,"request.json"),baseDeployEnvPath:f.baseDeployPath,candidateOutputPath:outputPath,imageReference,revision:releaseRevision,releasedAt:"2026-08-26T10:00:00Z",operator:"test",stagingReceiptPath:null,confirmProductionDigest:null});
 assert.equal(r.request.schemaVersion,"starward-release-request-v1");assert.equal(Object.keys(r.request).length,9);
 await appendFile(f.baseDeployPath,`STARWARD_SKY_PUBLICATION_HASH=${imagePublicationHash}\n`);
 await assert.rejects(prepareReleaseCandidate({baseDeployEnvPath:f.baseDeployPath,outputPath:path.join(f.root,"manual.env"),imageReference,revision:releaseRevision,releasedAt:"2026-08-26T10:00:00Z"}),/sky_static.*identity.*forbidden/);
 const untrusted={...r.request,skyStaticDelivery:identity};await writeFile(r.outputPath,JSON.stringify(untrusted));
 await assert.rejects(runPromotionRequest({requestPath:r.outputPath,promote:async()=>{throw new Error("must not reach promotion")}}),/release_request_fields_invalid/);
});

test("staging static receipt tampering cannot become production qualification",async t=>{
 const f=await createReleaseEnvironmentFixture();t.after(()=>removeFixture(f.root));
 const receiptPath=path.join(f.root,"staging-static.json"),base={schemaVersion:"starward-release-receipt-v2",status:"succeeded",environment:"staging",
  revision:releaseRevision,imageDigest:releaseImageDigest,skyStaticDelivery:identity,
  steps:[...oldSteps.map(name=>({name,status:"passed"})),{name:"sky-static-preparation",status:"passed"},{name:"sky-static-compose-config",status:"passed"},{name:"sky-static-verification",status:"passed",result:checkResult({identity})}]};
 for(const mutate of [
  r=>r.skyStaticDelivery.imageDigest="sha256:"+"e".repeat(64),
  r=>r.steps.at(-1).result.checkedBytes--,
  r=>r.steps.at(-1).result.identity={...r.steps.at(-1).result.identity,imagePublicationHash:"e".repeat(64)},
  r=>r.steps.at(-1).status="failed",
  r=>delete r.steps.at(-1).result,
  r=>r.skyStaticDelivery.operatorClaim="approved",
 ]){const r=structuredClone(base);mutate(r);await writeFile(receiptPath,JSON.stringify(r));
  await assert.rejects(validateStagingQualification({receiptPath,revision:releaseRevision,imageDigest:releaseImageDigest,requireSkyStatic:true}),/sky_static/);}
});
test("production compares image contents but permits its own larger historical delivery union",async t=>{
 const {f,args}=await releaseSetup(t,"production");const receiptPath=path.join(f.root,"staging.json");
 await writeFile(receiptPath,JSON.stringify({schemaVersion:"starward-release-receipt-v2",status:"succeeded",environment:"staging",revision:releaseRevision,imageDigest:releaseImageDigest,skyStaticDelivery:identity,
  steps:[...oldSteps.map(name=>({name,status:"passed"})),{name:"sky-static-preparation",status:"passed"},{name:"sky-static-compose-config",status:"passed"},{name:"sky-static-verification",status:"passed",result:checkResult({identity})}]}));
 let disposed=0;const d=delivery(f,async()=>{disposed++});d.identity={...identity,deliveryPublicationHash:"f".repeat(64),files:137,bytes:identity.bytes+10};
 const result=await executeRelease({...args,stagingReceiptPath:receiptPath,prepareStatic:async()=>d,verifyStatic:async()=>checkResult(d)});
 assert.equal(result.receipt.status,"succeeded");assert.equal(result.receipt.skyStaticDelivery.imagePublicationHash,imagePublicationHash);
 assert.equal(result.receipt.skyStaticDelivery.deliveryPublicationHash,"f".repeat(64));assert.equal(disposed,1);
});
test("actual static release receipt loses staging qualification when its mounted compose check is removed",async t=>{
 const {f,args}=await releaseSetup(t);const d=delivery(f);
 const result=await executeRelease({...args,prepareStatic:async()=>d,verifyStatic:async()=>checkResult(d)});
 assert.equal(result.receipt.status,"succeeded");
 await validateStagingQualification({receiptPath:result.receiptPath,revision:releaseRevision,imageDigest:releaseImageDigest,requireSkyStatic:true});
 const edited=structuredClone(result.receipt);edited.steps=edited.steps.filter(step=>step.name!=="sky-static-compose-config");
 const editedPath=path.join(f.root,"staging-without-static-compose.json");await writeFile(editedPath,JSON.stringify(edited));
 await assert.rejects(validateStagingQualification({receiptPath:editedPath,revision:releaseRevision,imageDigest:releaseImageDigest,requireSkyStatic:true}),/sky_static_staging_step_missing:sky-static-compose-config/);
});
test("preview invalid mounted overlay or incomplete verification releases lease without publishing pointer",async t=>{
 for(const phase of ["mount","verify"]){const dep=await dependencies(t);await configured(dep.f);let disposed=0;const d=delivery(dep.f,async()=>{disposed++});
  const result=await operatePreview({...dep,deployEnvPath:dep.f.deployPath,operation:"deploy",operator:"test",prepareStatic:async()=>d,
   execute(call){if(call.step==="preview-static-compose-config"){
    const c=staticConfiguration(dep.deploy,d);if(phase==="mount")c.services.caddy.volumes.find(v=>v.target==="/srv/sky-public").read_only=false;
    return {stdout:Buffer.from(JSON.stringify(c)),stderr:Buffer.alloc(0)};}return dep.execute(call);},
   verifyStatic:async()=>({...checkResult(d),checkedFiles:0,unauthorizedStatus:404})});
  assert.equal(result.receipt.status,"failed");assert.equal(disposed,1);assert.equal(dep.calls.some(c=>c.step==="preview-stop-writers"),phase==="verify");
  assert.ok(!result.receipt.steps.some(s=>s.name==="sky-static-verification"&&s.status==="passed"));
  await assert.rejects(readFile(path.join(dep.f.receiptDirectory,"operator-preview-current.json")));
 }
 const dep=await dependencies(t);await configured(dep.f);
 const result=await operatePreview({...dep,deployEnvPath:dep.f.deployPath,operation:"check",operator:"test",loadStatic:async()=>null});
 assert.equal(result.receipt.status,"failed");assert.equal(dep.calls.length,0);
});
test("static store rejects relative, broad and private-path overlap rather than exposing control files",async t=>{
 for(const invalid of ["relative/store",path.parse(path.resolve('.')).root]){
  const f=await createReleaseEnvironmentFixture({deploy:{STARWARD_SKY_STATIC_DIRECTORY:invalid}});t.after(()=>removeFixture(f.root));
  await assert.rejects(validateReleaseEnvironment({deployEnvPath:f.deployPath}),/sky_static_directory|path_not_absolute/);
 }
 for(const select of [f=>f.root,f=>f.receiptDirectory,f=>path.join(f.backupDirectory,"public")]){
  const f=await createReleaseEnvironmentFixture();t.after(()=>removeFixture(f.root));await appendFile(f.deployPath,`STARWARD_SKY_STATIC_DIRECTORY=${select(f)}\n`);
  await assert.rejects(validateReleaseEnvironment({deployEnvPath:f.deployPath}),/sky_static_directory_private_path_overlap/);
 }
});
