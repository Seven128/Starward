import { pathToFileURL } from "node:url";
import { readPlainSkyFile, skyStaticHash } from "./sky-static-bundle.mjs";
import { requestSkyStaticBytes } from "./sky-static-http.mjs";
import { readMapObjectStorePackage } from "./map-object-store-package.mjs";
import { mapStaticRouteFamily } from "./map-static-bundle.mjs";

const fail = code => { throw new Error(`map_object_store_${code}`); };
function checkHeaders(result, object, length, delivery) {
  if (result.headers.get("x-starward-map-delivery") !== delivery || result.headers.get("content-length") !== String(length) ||
      ![null, "identity"].includes(result.headers.get("content-encoding")) || result.headers.has("set-cookie")) fail("http_delivery_invalid");
  for (const [key, value] of Object.entries(object.uploadHeaders)) {
    if (key === "x-oss-forbid-overwrite" || key === "x-oss-meta-starward-content-sha256") continue;
    const name = key.replace(/^x-oss-meta-/u, "");
    if (result.headers.get(name) !== value) fail("http_header_mismatch");
  }
}
/** Shared bounded transport; Map admission/identity remain with this adapter.
 * Exact bytes for every PNG, grouped HEAD/Range/conditional semantics. Does not
 * infer cache hits, source entitlement, runtime activation or phone appearance. */
export async function verifyMapObjectStoreDelivery({ delivery = "oss", fetchImpl, ...args }) {
  if (!["oss", "static"].includes(delivery)) fail("delivery_invalid");
  const prepared = await readMapObjectStorePackage(args), { plan } = prepared;
  const request = (object, method, maximumBytes, headers = {}) => requestSkyStaticBytes(new URL(plan.resourceOrigin + "/" + object.objectKey), {
    method, maximumBytes, fetchImpl, headers: { "Accept-Encoding": "identity", ...headers } });
  let checkedFiles = 0, checkedBytes = 0, checkedHeads = 0, checkedRanges = 0, checkedConditionals = 0;
  const representatives = new Map();
  for (const object of plan.objects) {
    const response = await request(object, "GET", object.bytes);
    if (response.status !== 200 || response.bytes.length !== object.bytes || skyStaticHash(response.bytes) !== object.sha256) fail("http_identity_mismatch");
    checkHeaders(response, object, object.bytes, delivery); checkedFiles++; checkedBytes += response.bytes.length;
    const family = mapStaticRouteFamily("/" + object.objectKey);
    if (!representatives.has(family)) representatives.set(family, { object, etag: response.headers.get("etag") });
  }
  for (const { object, etag } of representatives.values()) {
    const head = await request(object, "HEAD", 0);
    if (head.status !== 200 || head.bytes.length) fail("http_head_invalid");
    checkHeaders(head, object, object.bytes, delivery); checkedHeads++;
    const end = Math.min(16, object.bytes) - 1, range = await request(object, "GET", end + 1, { Range: `bytes=0-${end}` });
    const source = await readPlainSkyFile(args.bundleDirectory, object.sourcePath);
    if (range.status !== 206 || range.headers.get("content-range") !== `bytes 0-${end}/${object.bytes}` ||
        !range.bytes.equals(source.subarray(0, end + 1))) fail("http_range_invalid");
    checkHeaders(range, object, end + 1, delivery); checkedRanges++;
    if (!etag) fail("http_validator_missing");
    const conditional = await request(object, "GET", 0, { "If-None-Match": etag });
    if (conditional.status !== 304 || conditional.bytes.length || conditional.headers.get("etag") !== etag ||
        conditional.headers.has("set-cookie")) fail("http_conditional_invalid");
    checkedConditionals++;
  }
  if ((await readMapObjectStorePackage(args)).packageSha256 !== prepared.packageSha256) fail("package_changed");
  return { status: "PASSED_MAP_STATIC_HTTP_CONTRACT", publicationHash: plan.publicationHash,
    packageSha256: prepared.packageSha256, resourceOrigin: plan.resourceOrigin, delivery,
    checkedFiles, checkedBytes, checkedHeads, checkedRanges, checkedConditionals,
    ...(prepared.sourceAdmissions.some(source => source.family === "cloud") ? { totalCloudSourceAdmission: "DEVELOPMENT_ONLY", totalCloudFormalReady: false } : {}),
    ...(prepared.sourceAdmissions.some(source => source.family === "night-light" && source.publicationVersion.startsWith("nightlight-sharded:"))
      ? { shardedNightLightSourceAdmission: "DEVELOPMENT_ONLY", shardedNightLightFormalReady: false } : {}),
    runtimeActivated: false, cdnCacheAndCapacity: "UNVERIFIED" };
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const option = key => { const index = process.argv.indexOf(key); return index < 0 ? null : process.argv[index + 1]; };
  try { process.stdout.write(JSON.stringify(await verifyMapObjectStoreDelivery({ bundleDirectory: option("--bundle"), packageDirectory: option("--package"),
    publicationHash: option("--expect-publication-hash"), resourceOrigin: option("--resource-origin") })) + "\n"); }
  catch (error) { process.stderr.write(JSON.stringify({ status: "FAILED", code: error.message?.startsWith("map_") ? error.message : "map_object_store_verification_failed" }) + "\n"); process.exitCode = 1; }
}
