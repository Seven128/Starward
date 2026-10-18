import { randomUUID } from "node:crypto";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { readEnvironmentFile } from "./env-file.mjs";
import { validateReleaseEnvironment } from "./validate-release-environment.mjs";
import { assertSkyStaticReleaseLease, prepareSkyStaticRelease, reuseSkyStaticRelease } from "./sky-static-release.mjs";
import { readPlainSkyFile } from "./sky-static-bundle.mjs";
import { readSkyObjectStorePackage } from "./sky-object-store-package.mjs";
import { assertSkyOssTarget, createSkyOssClient } from "./sky-oss-client.mjs";
import { assertNeverVersionedOss, ensureImmutableOssObject } from "./object-store-immutable.mjs";

const fail = code => { throw new Error(`sky_object_store_${code}`); };
const safeCodes = new Set(["sky_oss_aborted", "sky_oss_body_too_large", "sky_oss_request_timeout",
  "sky_oss_versioning_response_invalid", "sky_oss_credential_diagnostics_enabled", "sky_oss_credentials_missing",
  "sky_oss_client_initialization_failed", "sky_oss_response_invalid", "sky_oss_stream_invalid",
  "sky_static_release_preparation_invalid", "sky_static_release_preparation_changed",
  "sky_object_store_versioning_invalid", "sky_object_store_remote_metadata_mismatch",
  "sky_object_store_remote_identity_mismatch", "sky_object_store_put_result_missing",
  "sky_object_store_source_changed", "sky_object_store_package_changed", "sky_object_store_client_target_mismatch",
  "sky_object_store_aborted"]);
const safeError = error => safeCodes.has(error?.message) ? error.message : "sky_object_store_provider_or_readback_failed";
const active = signal => { if (signal?.aborted) fail("aborted"); };

const neverVersioned = client => assertNeverVersionedOss(client, fail);

async function journal(directory) {
  if (!path.isAbsolute(directory ?? "")) fail("receipt_path_invalid");
  const target = path.resolve(directory), info = await lstat(target);
  const comparable = value => process.platform === "win32" ? value.toLowerCase() : value;
  if (!info.isDirectory() || info.isSymbolicLink() || target === path.parse(target).root ||
      comparable(await realpath(target)) !== comparable(target)) fail("receipt_path_invalid");
  const receiptPath = path.join(target, `sky-oss-upload-${randomUUID()}.jsonl`);
  const handle = await open(receiptPath, "wx", 0o600);
  return { receiptPath, async append(value) { await handle.writeFile(JSON.stringify(value) + "\n"); await handle.sync(); },
    close: () => handle.close() };
}

/** Explicit cloud-writing operation, never run by package preparation, HTTP
 * verification or ordinary business deployment. The original held OCI/source
 * preparation is mandatory; serialized assertions cannot replace it. Runs are
 * serial, issue at most one PUT per missing key, and never overwrite/delete.
 * Journals retain verified independent results; a resume always reads remote
 * bytes/metadata again and never trusts journal rows as publication authority. */
export async function uploadSkyObjectStore({ validation, deploy, deployEnvPath, delivery, packageDirectory,
  publicationHash, resourceOrigin, bucket, region, credentials, signal, clientFactory = createSkyOssClient }) {
  const target = assertSkyOssTarget({ bucket, region }), releaseArgs = { validation, deploy, deployEnvPath, delivery };
  active(signal);
  const reused = await reuseSkyStaticRelease(releaseArgs), canonical = reused.delivery;
  if (canonical.identity.deliveryPublicationHash !== publicationHash) fail("publication_mismatch");
  const packageArgs = { packageDirectory, bundleDirectory: canonical.directory, publicationHash, resourceOrigin };
  const prepared = await readSkyObjectStorePackage(packageArgs), { plan } = prepared;
  const log = await journal(validation.operations.receiptDirectory), results = [];
  let client, current, status = "FAILED", code = null, putAttempts = 0;
  const onAbort = () => client?.dispose();
  try {
    await log.append({ schemaVersion: "starward-sky-oss-upload-journal-v1", event: "STARTED",
      packageSha256: prepared.packageSha256, publicationHash, resourceOrigin: plan.resourceOrigin, target,
      sourceIdentity: canonical.identity, files: plan.files, bytes: plan.bytes,
      authority: "ORIGINAL_HELD_OCI_PREPARATION", cdnAcceptanceAndCapacity: "UNVERIFIED" });
    active(signal);
    client = clientFactory({ ...target, credentials, signal });
    if (client?.bucket !== bucket || client?.region !== region || typeof client.dispose !== "function") fail("client_target_mismatch");
    signal?.addEventListener("abort", onAbort, { once: true });
    active(signal);
    await neverVersioned(client);
    for (const object of plan.objects) {
      active(signal); current = object;
      await log.append({ event: "OBJECT_STARTED", objectKey: object.objectKey, sha256: object.sha256, bytes: object.bytes });
      const outcome = await ensureImmutableOssObject({ client, object, fail, active: () => active(signal),
        beforePut: () => assertSkyStaticReleaseLease(releaseArgs), readSource: () => readPlainSkyFile(canonical.directory, object.sourcePath),
        onPut: () => { putAttempts++; } });
      active(signal);
      const verified = Object.freeze({ event: "OBJECT_VERIFIED", objectKey: object.objectKey, sha256: object.sha256, bytes: object.bytes, outcome });
      await log.append(verified); results.push(verified); current = null;
    }
    await neverVersioned(client);
    const final = await reuseSkyStaticRelease(releaseArgs);
    if (final.delivery.directory !== canonical.directory || final.delivery.identity.deliveryPublicationHash !== publicationHash ||
        (await readSkyObjectStorePackage(packageArgs)).packageSha256 !== prepared.packageSha256) fail("source_changed");
    active(signal); status = "VERIFIED_OSS_OBJECTS";
  } catch (error) {
    status = signal?.aborted ? "ABORTED" : "FAILED"; code = signal?.aborted ? "sky_object_store_aborted" : safeError(error);
    await log.append({ event: "FAILED", status, code, ...(current ? { objectKey: current.objectKey } : {}) });
  } finally {
    signal?.removeEventListener("abort", onAbort); client?.dispose();
    try {
      await log.append({ event: "FINISHED", status, code, verifiedFiles: results.length,
        verifiedBytes: results.reduce((sum, result) => sum + result.bytes, 0), remainingFiles: plan.files - results.length,
        putAttempts, cdnAcceptanceAndCapacity: "UNVERIFIED" });
    } finally { await log.close(); }
  }
  return Object.freeze({ status, code, receiptPath: log.receiptPath, publicationHash, packageSha256: prepared.packageSha256,
    target, sourceIdentity: canonical.identity, verifiedFiles: results.length,
    verifiedBytes: results.reduce((sum, result) => sum + result.bytes, 0), remainingFiles: plan.files - results.length,
    putAttempts, results, cdnAcceptanceAndCapacity: "UNVERIFIED" });
}

/** The standalone operator command reuses the existing environment/preflight
 * and owns its preparation lease/client. It does not deploy services, alter a
 * current pointer, configure ESA, change bucket policies or publish a Mini App. */
export async function runSkyObjectStoreUpload({ deployEnvPath, packageDirectory, publicationHash, resourceOrigin, bucket, region, signal }) {
  const validation = await validateReleaseEnvironment({ deployEnvPath }), deploy = await readEnvironmentFile(deployEnvPath);
  const delivery = await prepareSkyStaticRelease({ validation, deploy, deployEnvPath });
  if (!delivery) fail("managed_source_required");
  try {
    return await uploadSkyObjectStore({ validation, deploy, deployEnvPath, delivery, packageDirectory, publicationHash, resourceOrigin,
      bucket, region, signal, credentials: { accessKeyId: process.env.OSS_ACCESS_KEY_ID, accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
        ...(process.env.OSS_SECURITY_TOKEN ? { stsToken: process.env.OSS_SECURITY_TOKEN } : {}) } });
  } finally { await delivery.dispose(); }
}

function option(name) { const index = process.argv.indexOf(name); return index < 0 ? null : process.argv[index + 1]; }
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const controller = new AbortController(), abort = () => controller.abort();
  process.once("SIGINT", abort); process.once("SIGTERM", abort);
  try {
    const result = await runSkyObjectStoreUpload({ deployEnvPath: option("--deploy-env"), packageDirectory: option("--package"),
      publicationHash: option("--expect-publication-hash"), resourceOrigin: option("--resource-origin"),
      bucket: option("--bucket"), region: option("--region"), signal: controller.signal });
    const { results: _results, ...summary } = result;
    process.stdout.write(JSON.stringify(summary) + "\n");
    if (result.status !== "VERIFIED_OSS_OBJECTS") process.exitCode = 1;
  } catch (error) {
    process.stderr.write(JSON.stringify({ status: "FAILED", code: safeError(error) }) + "\n"); process.exitCode = 1;
  } finally { process.removeListener("SIGINT", abort); process.removeListener("SIGTERM", abort); }
}
