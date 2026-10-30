import { createHash } from "node:crypto";
import { mkdir, realpath, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { readPlainSkyFile, skyStaticHash } from "./sky-static-bundle.mjs";
import { validateMapStaticBundle } from "./map-static-bundle.mjs";

const fail = code => { throw new Error(`map_object_store_${code}`); };
const digestMetadata = "x-oss-meta-starward-content-sha256";
export function mapResourceOrigin(value) {
  if (typeof value !== "string") fail("origin_invalid");
  let url; try { url = new URL(value); } catch { fail("origin_invalid"); }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/" ||
      !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/u.test(url.hostname) ||
      ![url.origin, url.origin + "/"].includes(value)) fail("origin_invalid");
  return url.origin;
}
async function planFor({ bundleDirectory, publicationHash, resourceOrigin }) {
  const origin = mapResourceOrigin(resourceOrigin), bundle = await validateMapStaticBundle(bundleDirectory);
  if (bundle.publicationHash !== publicationHash) fail("publication_mismatch");
  const sourceAdmissions = bundle.sources.map(source => ({ family: source.family, publicationVersion: source.publicationVersion,
    ...(source.admission ? { admission: source.admission } : {}) }));
  const hasCloud = sourceAdmissions.some(source => source.family === "cloud");
  const hasShardedLight = sourceAdmissions.some(source => source.family === "night-light" && source.publicationVersion.startsWith("nightlight-sharded:"));
  const objects = [], restoredHeaders = new Set();
  for (const record of bundle.records) {
    const sourcePath = `files${record.route}`, bytes = await readPlainSkyFile(bundle.directory, sourcePath);
    if (bytes.length !== record.bytes || skyStaticHash(bytes) !== record.sha256) fail("source_changed");
    const uploadHeaders = { "x-oss-forbid-overwrite": "true", [digestMetadata]: record.sha256 };
    for (const [name, value] of Object.entries(record.headers)) {
      if (["content-type", "cache-control"].includes(name)) uploadHeaders[name] = value;
      else { uploadHeaders[`x-oss-meta-${name}`] = value; if (name !== "x-content-type-options") restoredHeaders.add(name); }
    }
    const metadataBytes = Object.entries(uploadHeaders).filter(([name]) => name.startsWith("x-oss-meta-"))
      .reduce((sum, [name, value]) => sum + Buffer.byteLength(`${name}: ${value}\r\n`, "ascii"), 0);
    if (metadataBytes > 8 * 1024) fail("metadata_too_large");
    objects.push({ objectKey: record.route.slice(1), sourcePath, bytes: record.bytes, sha256: record.sha256,
      contentMd5: createHash("md5").update(bytes).digest("base64"), uploadHeaders, metadataBytes });
  }
  const scope = `(http.host eq ${JSON.stringify(new URL(origin).hostname)} and (starts_with(http.request.uri.path, "/v2/terrain/assets/") or starts_with(http.request.uri.path, "/v2/night-light/assets/")${hasCloud ? ' or starts_with(http.request.uri.path, "/v2/cloud/assets/")' : ""}))`;
  const esaRules = [{ name: "starward-map-delivery", phase: "ORIGIN_TO_ESA", condition: `${scope} and exists(http.response.headers[${JSON.stringify(digestMetadata)}])`,
    operations: [{ name: "x-content-type-options", action: "add", type: "static", value: "nosniff" },
      { name: "x-starward-map-delivery", action: "add", type: "static", value: "oss" }] }];
  for (const name of [...restoredHeaders].sort()) {
    const field = `http.response.headers[${JSON.stringify(`x-oss-meta-${name}`)}]`;
    esaRules.push({ name: `starward-map-${name.replace(/^x-starward-/u, "")}`, phase: "ORIGIN_TO_ESA", condition: `${scope} and exists(${field})`,
      operations: [{ name, action: "add", type: "dynamic", value: field }] });
  }
  if (esaRules.some(rule => JSON.stringify(rule).length > 4096)) fail("rule_too_large");
  const plan = { schemaVersion: "starward-map-oss-esa-package-v1", publicationHash,
    indexSha256: skyStaticHash(await readPlainSkyFile(bundle.directory, "index.json")),
    fragmentSha256: skyStaticHash(await readPlainSkyFile(bundle.directory, "delivery.caddy")), resourceOrigin: origin,
    files: bundle.files, bytes: bundle.bytes, objects, esaRules,
    requirements: { bucketVersioning: "NEVER_ENABLED", immutableKeys: "PUT_WITH_FORBID_OVERWRITE_AND_EXACT_CONFLICT_READBACK",
      sourceBody: "EXACT_SEALED_MAP_FINAL_BYTES_NO_GENERATION", objectPath: "ORIGINAL_PUBLIC_MAP_ROUTE_WITHOUT_LEADING_SLASH",
      provenance: "SEALED_ORIGINAL_MAP_INVENTORIES_PROOFS_AND_DECLARED_PUBLISHED_RECORD", privateData: "EXCLUDED",
      sourceAdmission: "LOCAL_MAP_PUBLICATION_CONTRACTS_ONLY", runtimeActivation: "NOT_PERFORMED",
      origin: "OSS_NOT_BUSINESS_HOST", responseHeaders: "RESTORE_BEFORE_ESA_CACHE",
      esaRuleCompilation: "UNVERIFIED", accountDomainAndQuota: "UNVERIFIED", cloudPublication: "NOT_PERFORMED", cdnAcceptanceAndCapacity: "UNVERIFIED",
      ...(hasCloud ? { totalCloudSourceAdmission: "DEVELOPMENT_ONLY_NOT_UPLOADABLE", totalCloudFormalReady: false } : {}),
      ...(hasShardedLight ? { shardedNightLightSourceAdmission: "DEVELOPMENT_ONLY_NOT_UPLOADABLE", shardedNightLightFormalReady: false } : {}) } };
  return { plan, sourceAdmissions };
}
export async function prepareMapObjectStorePackage(args) {
  if (!path.isAbsolute(args.outputDirectory ?? "") || !path.isAbsolute(args.bundleDirectory ?? "")) fail("path_not_absolute");
  const output = path.resolve(args.outputDirectory), bundle = path.resolve(args.bundleDirectory);
  const within = (parent, child) => { const relative = path.relative(parent.toLowerCase(), child.toLowerCase());
    return !relative || relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative); };
  if (within(bundle, output) || within(output, bundle) || output === path.parse(output).root ||
      path.resolve(await realpath(path.dirname(output))).toLowerCase() !== path.dirname(output).toLowerCase()) fail("output_invalid");
  const { plan } = await planFor(args), bytes = Buffer.from(JSON.stringify(plan, null, 2) + "\n");
  await mkdir(output, { mode: 0o700 }); const stage = path.join(output, ".preparing"); await mkdir(stage);
  await writeFile(path.join(stage, "plan.json"), bytes, { flag: "wx" });
  if (!(await readPlainSkyFile(stage, "plan.json")).equals(bytes) || JSON.stringify((await planFor(args)).plan) !== JSON.stringify(plan)) fail("source_changed");
  const directory = path.join(output, "package"); await rename(stage, directory);
  return { status: "PREPARED_LOCAL_MAP_OSS_ESA_PACKAGE", directory, publicationHash: plan.publicationHash,
    packageSha256: skyStaticHash(bytes), files: plan.files, bytes: plan.bytes, resourceOrigin: plan.resourceOrigin, cloudPublication: false };
}
export async function readMapObjectStorePackage(args) {
  const bytes = await readPlainSkyFile(args.packageDirectory, "plan.json");
  let actual; try { actual = JSON.parse(bytes.toString("utf8")); } catch { fail("package_invalid"); }
  const expected = await planFor(args);
  if (JSON.stringify(actual) !== JSON.stringify(expected.plan)) fail("package_changed");
  // Derived again from the admitted source set, never trusted from a mutable
  // display field in plan.json or accepted from caller arguments.
  return Object.freeze({ plan: expected.plan, packageSha256: skyStaticHash(bytes),
    sourceAdmissions: Object.freeze(expected.sourceAdmissions.map(source => Object.freeze(source))) });
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const option = key => { const index = process.argv.indexOf(key); return index < 0 ? null : process.argv[index + 1]; };
  try { process.stdout.write(JSON.stringify(await prepareMapObjectStorePackage({ bundleDirectory: option("--bundle"), outputDirectory: option("--output"),
    publicationHash: option("--expect-publication-hash"), resourceOrigin: option("--resource-origin") })) + "\n"); }
  catch (error) { process.stderr.write(JSON.stringify({ status: "FAILED", code: error.message?.startsWith("map_") ? error.message : "map_object_store_preparation_failed" }) + "\n"); process.exitCode = 1; }
}
