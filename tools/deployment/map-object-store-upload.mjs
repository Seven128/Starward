import { randomUUID } from "node:crypto";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { readPlainSkyFile } from "./sky-static-bundle.mjs";
import { readMapObjectStorePackage } from "./map-object-store-package.mjs";
import { assertSkyOssTarget, createSkyOssClient } from "./sky-oss-client.mjs";
import { assertNeverVersionedOss, ensureImmutableOssObject } from "./object-store-immutable.mjs";

const fail = code => { throw new Error(`map_object_store_${code}`); };
const active = signal => { if (signal?.aborted) fail("aborted"); };
const known = new Set(["versioning_invalid", "remote_metadata_mismatch", "remote_identity_mismatch", "put_result_missing",
  "source_changed", "package_changed", "client_target_mismatch", "aborted", "cloud_source_qualification_not_ready", "sharded_nightlight_publication_not_ready"]);
const safeError = error => known.has(error?.message?.replace(/^map_object_store_/u, "")) ? error.message : "map_object_store_provider_or_readback_failed";

/** Explicit writing operator, separate from ordinary build/deployment. Reuses
 * the same SDK and immutable byte/metadata/recovery state machine as Sky while
 * admitting only this Map package. It does not select a live account, configure
 * ESA, activate a DB row/current version, overwrite or delete objects. Caller
 * must establish target entitlement/quota and prohibit concurrent version-policy
 * changes before invoking it. No source-side generation is possible here. */
export async function uploadMapObjectStore({ receiptDirectory, bucket, region, credentials, signal, clientFactory = createSkyOssClient, ...args }) {
  active(signal); const target = assertSkyOssTarget({ bucket, region });
  const prepared = await readMapObjectStorePackage(args), { plan } = prepared;
  // The current cloud family is deliberately local DEVELOPMENT_ONLY. Numeric
  // readiness/pilot pixels do not establish source-group or full map readiness.
  // There is no boolean override or accepted "qualified" variant. Reject before
  // opening a journal, constructing a client or performing any remote request.
  if (prepared.sourceAdmissions.some(source => source.family === "cloud")) fail("cloud_source_qualification_not_ready");
  if (prepared.sourceAdmissions.some(source => source.family === "night-light" && source.publicationVersion.startsWith("nightlight-sharded:"))) fail("sharded_nightlight_publication_not_ready");
  if (!path.isAbsolute(receiptDirectory ?? "")) fail("receipt_path_invalid");
  const receiptRoot = path.resolve(receiptDirectory), info = await lstat(receiptRoot);
  const comparable = value => process.platform === "win32" ? value.toLowerCase() : value;
  const relative = path.relative(path.resolve(args.bundleDirectory), receiptRoot);
  if (!info.isDirectory() || info.isSymbolicLink() || receiptRoot === path.parse(receiptRoot).root ||
      comparable(await realpath(receiptRoot)) !== comparable(receiptRoot) ||
      !relative || relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)) fail("receipt_path_invalid");
  const receiptPath = path.join(receiptRoot, `map-oss-upload-${randomUUID()}.jsonl`), handle = await open(receiptPath, "wx", 0o600);
  const append = async value => { await handle.writeFile(JSON.stringify(value) + "\n"); await handle.sync(); };
  let client, current, status = "FAILED", code = null, putAttempts = 0; const results = [];
  const onAbort = () => client?.dispose();
  try {
    await append({ schemaVersion: "starward-map-oss-upload-journal-v1", event: "STARTED", target,
      publicationHash: plan.publicationHash, packageSha256: prepared.packageSha256, resourceOrigin: plan.resourceOrigin,
      files: plan.files, bytes: plan.bytes, sourceAdmission: "LOCAL_MAP_PUBLICATION_CONTRACTS_ONLY", runtimeActivated: false });
    active(signal); client = clientFactory({ ...target, credentials, signal });
    if (client?.bucket !== bucket || client?.region !== region || typeof client.dispose !== "function") fail("client_target_mismatch");
    signal?.addEventListener("abort", onAbort, { once: true }); active(signal);
    await assertNeverVersionedOss(client, fail);
    for (const object of plan.objects) {
      active(signal); current = object;
      await append({ event: "OBJECT_STARTED", objectKey: object.objectKey, sha256: object.sha256, bytes: object.bytes });
      const outcome = await ensureImmutableOssObject({ client, object, fail, active: () => active(signal),
        beforePut: async () => { active(signal); }, readSource: () => readPlainSkyFile(args.bundleDirectory, object.sourcePath),
        onPut: () => { putAttempts++; } });
      active(signal);
      const result = { event: "OBJECT_VERIFIED", objectKey: object.objectKey, sha256: object.sha256, bytes: object.bytes, outcome };
      await append(result); results.push(result); current = null;
    }
    await assertNeverVersionedOss(client, fail);
    if ((await readMapObjectStorePackage(args)).packageSha256 !== prepared.packageSha256) fail("source_changed");
    active(signal); status = "VERIFIED_MAP_OSS_OBJECTS";
  } catch (error) {
    status = signal?.aborted ? "ABORTED" : "FAILED"; code = signal?.aborted ? "map_object_store_aborted" : safeError(error);
    await append({ event: "FAILED", status, code, ...(current ? { objectKey: current.objectKey } : {}) });
  } finally {
    signal?.removeEventListener("abort", onAbort); client?.dispose();
    try { await append({ event: "FINISHED", status, code, verifiedFiles: results.length,
      verifiedBytes: results.reduce((sum, value) => sum + value.bytes, 0), remainingFiles: plan.files - results.length, putAttempts,
      runtimeActivated: false, cdnAcceptanceAndCapacity: "UNVERIFIED" }); }
    finally { await handle.close(); }
  }
  return { status, code, receiptPath, publicationHash: plan.publicationHash, packageSha256: prepared.packageSha256, target,
    verifiedFiles: results.length, verifiedBytes: results.reduce((sum, value) => sum + value.bytes, 0), remainingFiles: plan.files - results.length,
    putAttempts, results, runtimeActivated: false, cdnAcceptanceAndCapacity: "UNVERIFIED" };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const option = key => { const index = process.argv.indexOf(key); return index < 0 ? null : process.argv[index + 1]; };
  const controller = new AbortController(), abort = () => controller.abort(); process.once("SIGINT", abort); process.once("SIGTERM", abort);
  try {
    const result = await uploadMapObjectStore({ bundleDirectory: option("--bundle"), packageDirectory: option("--package"),
      publicationHash: option("--expect-publication-hash"), resourceOrigin: option("--resource-origin"), receiptDirectory: option("--receipt-directory"),
      bucket: option("--bucket"), region: option("--region"), signal: controller.signal,
      credentials: { accessKeyId: process.env.OSS_ACCESS_KEY_ID, accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
        ...(process.env.OSS_SECURITY_TOKEN ? { stsToken: process.env.OSS_SECURITY_TOKEN } : {}) } });
    const { results: _results, ...summary } = result; process.stdout.write(JSON.stringify(summary) + "\n");
    if (result.status !== "VERIFIED_MAP_OSS_OBJECTS") process.exitCode = 1;
  } catch (error) { process.stderr.write(JSON.stringify({ status: "FAILED", code: safeError(error) }) + "\n"); process.exitCode = 1; }
  finally { process.removeListener("SIGINT", abort); process.removeListener("SIGTERM", abort); }
}
