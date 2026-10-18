import { createHash } from "node:crypto";
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");

/** Shared OSS byte/metadata boundary. Caller keeps its own domain admission,
 * lease, cancellation, journal and target authority; this is not a release. */
export async function assertNeverVersionedOss(client, fail) {
  const result = await client.versioning();
  if (result?.status !== 200 || !Object.hasOwn(result, "versionStatus") || result.versionStatus !== undefined) fail("versioning_invalid");
}
function checkRemoteHeaders(result, object, fail) {
  const headers = result?.headers;
  if (result?.status !== 200 || !headers || typeof headers.get !== "function" ||
      headers.get("content-length") !== String(object.bytes) || ![null, "identity"].includes(headers.get("content-encoding")) ||
      ![null, "null"].includes(headers.get("x-oss-version-id"))) fail("remote_metadata_mismatch");
  const expected = new Map(Object.entries(object.uploadHeaders).filter(([name]) => name !== "x-oss-forbid-overwrite"));
  for (const [name, value] of expected) if (headers.get(name) !== value) fail("remote_metadata_mismatch");
  if (!expected.has("content-disposition") && headers.get("content-disposition") !== null) fail("remote_metadata_mismatch");
  for (const [name] of headers) if (name.startsWith("x-oss-meta-") && !expected.has(name)) fail("remote_metadata_mismatch");
}
export async function readImmutableOssObject(client, object, fail) {
  let head;
  try { head = await client.head(object.objectKey); }
  catch (error) { if (error?.status === 404 && error?.code === "NoSuchKey") return false; throw error; }
  checkRemoteHeaders(head, object, fail);
  const result = await client.get(object.objectKey, object.bytes);
  checkRemoteHeaders(result, object, fail);
  if (!Buffer.isBuffer(result.bytes) || result.bytes.length !== object.bytes || sha256(result.bytes) !== object.sha256) fail("remote_identity_mismatch");
  return true;
}

/** At most one PUT. Success, conflict, timeout or lost response all receive the
 * same exact readback. Unknown/missing results stop, with no blind retry. */
export async function ensureImmutableOssObject({ client, object, fail, active, beforePut, readSource, onPut }) {
  if (await readImmutableOssObject(client, object, fail)) return "RETAINED_EXACT_EXISTING";
  active(); await beforePut(); await assertNeverVersionedOss(client, fail);
  const bytes = await readSource();
  if (!Buffer.isBuffer(bytes) || bytes.length !== object.bytes || sha256(bytes) !== object.sha256) fail("source_changed");
  active(); onPut(); let putError = false;
  try { const result = await client.put(object.objectKey, bytes, { ...object.uploadHeaders, "Content-MD5": object.contentMd5 });
    if (result?.status !== 200) putError = true; }
  catch { putError = true; }
  active(); await assertNeverVersionedOss(client, fail);
  if (!await readImmutableOssObject(client, object, fail)) fail("put_result_missing");
  return putError ? "RECONCILED_AFTER_PUT_ERROR" : "UPLOADED_AND_READ_BACK";
}
