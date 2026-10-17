import { pathToFileURL } from "node:url";
import { assertSkyStaticIndex, readPlainSkyFile, skyStaticHash } from "./sky-static-bundle.mjs";
import { readSkyObjectStorePackage } from "./sky-object-store-package.mjs";
import { requestSkyStaticBytes } from "./sky-static-http.mjs";

const fail = code => { throw new Error(`sky_object_store_${code}`); };
function checkHeaders(result, record, length) {
  if (result.headers.get("x-starward-sky-delivery") !== "oss" || result.headers.get("content-length") !== String(length) ||
      ![null, "identity"].includes(result.headers.get("content-encoding"))) fail("http_delivery_invalid");
  for (const [name, value] of Object.entries(record.headers)) if (result.headers.get(name) !== value) fail("http_header_mismatch");
}

/** Read-only HTTP contract verification. Every admitted GET is byte/header
 * checked; HEAD and single-range semantics are exercised for each distinct
 * header-presence/content-type group. This is not proof of CDN cache hit rate,
 * cloud ownership, source rights, adoption, native display or live capacity. */
export async function verifySkyObjectStoreDelivery({ packageDirectory, bundleDirectory, publicationHash, resourceOrigin, fetchImpl }) {
  const args = { packageDirectory, bundleDirectory, publicationHash, resourceOrigin };
  const prepared = await readSkyObjectStorePackage(args), { plan } = prepared;
  const indexBytes = await readPlainSkyFile(bundleDirectory, "index.json");
  if (skyStaticHash(indexBytes) !== plan.indexSha256) fail("source_changed");
  const index = assertSkyStaticIndex(JSON.parse(indexBytes.toString("utf8")));
  const representatives = new Map(), objects = new Map(plan.objects.map(object => ["/" + object.objectKey, object]));
  const request = (record, method, maximumBytes, headers = {}) => requestSkyStaticBytes(new URL(plan.resourceOrigin + record.route), {
    headers: { "Accept-Encoding": "identity", ...headers }, method, maximumBytes, fetchImpl,
  });
  let checkedFiles = 0, checkedBytes = 0, checkedHeads = 0, checkedRanges = 0, rangeBytes = 0;
  for (const record of index.records) {
    const result = await request(record, "GET", record.bytes);
    if (result.status !== 200 || result.bytes.length !== record.bytes || skyStaticHash(result.bytes) !== record.sha256) fail("http_identity_mismatch");
    checkHeaders(result, record, record.bytes);
    checkedFiles++; checkedBytes += result.bytes.length;
    const signature = JSON.stringify([record.headers["content-type"], Object.keys(record.headers).sort()]);
    if (!representatives.has(signature)) representatives.set(signature, record);
  }
  for (const record of representatives.values()) {
    const head = await request(record, "HEAD", 0);
    if (head.status !== 200 || head.bytes.length) fail("http_head_invalid");
    checkHeaders(head, record, record.bytes); checkedHeads++;
    const end = Math.min(record.bytes, 16) - 1, ranged = await request(record, "GET", end + 1, { Range: `bytes=0-${end}` });
    if (ranged.status !== 206 || ranged.headers.get("content-range") !== `bytes 0-${end}/${record.bytes}` || ranged.bytes.length !== end + 1) fail("http_range_invalid");
    checkHeaders(ranged, record, end + 1);
    const body = await readPlainSkyFile(bundleDirectory, objects.get(record.route).sourcePath);
    if (body.length !== record.bytes || skyStaticHash(body) !== record.sha256 || !ranged.bytes.equals(body.subarray(0, end + 1))) fail("http_range_identity_mismatch");
    checkedRanges++; rangeBytes += ranged.bytes.length;
  }
  // Local inputs must still be the same explicitly selected package/source.
  if ((await readSkyObjectStorePackage(args)).packageSha256 !== prepared.packageSha256) fail("package_changed");
  return Object.freeze({ status: "PASSED_OBJECT_STORE_HTTP_CONTRACT", publicationHash: plan.publicationHash,
    packageSha256: prepared.packageSha256, resourceOrigin: plan.resourceOrigin,
    checkedFiles, checkedBytes, checkedHeads, checkedRanges, rangeBytes,
    sourceAdmission: "SEALED_LOCAL_BUNDLE_INTEGRITY_ONLY", cdnCacheAndCapacity: "UNVERIFIED" });
}

function option(name) { const index = process.argv.indexOf(name); return index < 0 ? null : process.argv[index + 1]; }
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    process.stdout.write(JSON.stringify(await verifySkyObjectStoreDelivery({ packageDirectory: option("--package"), bundleDirectory: option("--bundle"),
      publicationHash: option("--expect-publication-hash"), resourceOrigin: option("--resource-origin") })) + "\n");
  } catch (error) {
    process.stderr.write(JSON.stringify({ status: "failed", code: error instanceof Error ? error.message : "sky_object_store_verification_failed" }) + "\n");
    process.exitCode = 1;
  }
}
