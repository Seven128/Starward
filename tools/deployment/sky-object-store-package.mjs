import { createHash } from "node:crypto";
import { mkdir, realpath, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { readPlainSkyFile, skyStaticFilePath, skyStaticHash, validateSkyStaticBundle } from "./sky-static-bundle.mjs";

const fail = code => { throw new Error(`sky_object_store_${code}`); };
const standardHeaders = new Set(["content-type", "cache-control", "content-disposition"]);
const digestMetadata = "x-oss-meta-starward-content-sha256";
const comparable = value => process.platform === "win32" ? value.toLowerCase() : value;

function resourceOrigin(value) {
  if (typeof value !== "string") fail("origin_invalid");
  let url;
  try { url = new URL(value); } catch { fail("origin_invalid"); }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/" ||
      !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/u.test(url.hostname) ||
      ![url.origin, `${url.origin}/`].includes(value)) fail("origin_invalid");
  return url.origin;
}

/** Provider declarations are derived from the existing sealed export. Neither
 * this package nor OSS metadata is a publication/adoption authority. */
async function packagePlan({ bundleDirectory, publicationHash, origin }) {
  const bundle = await validateSkyStaticBundle(bundleDirectory);
  if (bundle.publicationHash !== publicationHash) fail("publication_mismatch");
  const routes = new Set(bundle.records.map(record => record.route)), objects = [], customNames = new Set();
  for (const record of bundle.records) {
    const sourcePath = skyStaticFilePath(record.route, routes);
    const body = await readPlainSkyFile(bundle.directory, sourcePath);
    if (body.length !== record.bytes || skyStaticHash(body) !== record.sha256) fail("source_changed");
    const uploadHeaders = { "x-oss-forbid-overwrite": "true", [digestMetadata]: record.sha256 };
    for (const [name, value] of Object.entries(record.headers).sort(([a], [b]) => a.localeCompare(b, "en"))) {
      if (standardHeaders.has(name)) uploadHeaders[name] = value;
      else {
        uploadHeaders[`x-oss-meta-${name}`] = value;
        if (name !== "x-content-type-options") customNames.add(name);
      }
    }
    const metadataBytes = Object.entries(uploadHeaders).filter(([name]) => name.startsWith("x-oss-meta-"))
      .reduce((total, [name, value]) => total + Buffer.byteLength(`${name}: ${value}\r\n`, "ascii"), 0);
    if (metadataBytes > 8 * 1024) fail("metadata_too_large");
    objects.push({ objectKey: record.route.slice(1), sourcePath, bytes: record.bytes, sha256: record.sha256,
      contentMd5: createHash("md5").update(body).digest("base64"), uploadHeaders, metadataBytes });
  }
  // http.response.headers is supported in the origin-to-ESA phase. Restoring
  // it there also retains the restored values with cached response bytes.
  // These are console configuration inputs, not fabricated provider API calls.
  const scope = `(http.host eq ${JSON.stringify(new URL(origin).hostname)} and starts_with(http.request.uri.path, "/v2/sky/"))`;
  const rules = [{ name: "starward-sky-delivery", phase: "ORIGIN_TO_ESA",
    condition: `${scope} and exists(http.response.headers[${JSON.stringify(digestMetadata)}])`,
    operations: [{ name: "x-content-type-options", action: "add", type: "static", value: "nosniff" },
      { name: "x-starward-sky-delivery", action: "add", type: "static", value: "oss" }] }];
  for (const name of [...customNames].sort()) {
    const field = `http.response.headers[${JSON.stringify(`x-oss-meta-${name}`)}]`;
    rules.push({ name: `starward-sky-${name.replace(/^x-starward-/u, "")}`, phase: "ORIGIN_TO_ESA",
      condition: `${scope} and exists(${field})`, operations: [{ name, action: "add", type: "dynamic", value: field }] });
  }
  if (rules.some(rule => JSON.stringify(rule).length > 4096)) fail("rule_too_large");
  return {
    schemaVersion: "starward-sky-oss-esa-package-v1", publicationHash: bundle.publicationHash,
    indexSha256: skyStaticHash(await readPlainSkyFile(bundle.directory, "index.json")),
    fragmentSha256: skyStaticHash(await readPlainSkyFile(bundle.directory, "delivery.caddy")),
    resourceOrigin: origin, files: bundle.files, bytes: bundle.bytes, objects, esaRules: rules,
    requirements: {
      bucketVersioning: "NEVER_ENABLED", immutableKeys: "PUT_WITH_FORBID_OVERWRITE_AND_EXACT_CONFLICT_READBACK",
      sourceBody: "EXACT_SEALED_BYTES_NO_REENCODING", resourcePath: "PUBLIC_ROUTE_WITHOUT_LEADING_SLASH",
      origin: "OSS_NOT_BUSINESS_HOST", responseHeaders: "RESTORE_BEFORE_ESA_CACHE",
      uploadAuthentication: "EXTERNAL_MATURE_OSS_CLIENT", requestAuthentication: "NO_CLIENT_CREDENTIAL_OR_PREVIEW_HEADER",
      sourceAdmission: "SEALED_LOCAL_BUNDLE_INTEGRITY_ONLY", esaRuleCompilation: "UNVERIFIED",
      accountEntitlementAndAvailableQuota: "UNVERIFIED", cloudPublication: "NOT_PERFORMED",
      cdnAcceptanceAndCapacity: "UNVERIFIED",
    },
  };
}

/** Local preparation only. No cloud client, network call, credential, source
 * copying, image processing, current pointer change or overwrite is involved.
 * Existing failed/prepared directories are preserved for readback. */
export async function prepareSkyObjectStorePackage({ bundleDirectory, outputDirectory, publicationHash, resourceOrigin: inputOrigin }) {
  if (!path.isAbsolute(bundleDirectory ?? "") || !path.isAbsolute(outputDirectory ?? "")) fail("path_not_absolute");
  const origin = resourceOrigin(inputOrigin), output = path.resolve(outputDirectory), source = path.resolve(bundleDirectory);
  const within = (parent, child) => {
    const relative = path.relative(parent, child);
    return !relative || !relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative);
  };
  if (within(source, output) || within(output, source) || output === path.parse(output).root ||
      comparable(await realpath(path.dirname(output))) !== comparable(path.dirname(output))) fail("output_invalid");
  const plan = await packagePlan({ bundleDirectory: source, publicationHash, origin });
  await mkdir(output, { mode: 0o700 });
  const stage = path.join(output, ".preparing");
  await mkdir(stage);
  const text = JSON.stringify(plan, null, 2) + "\n";
  await writeFile(path.join(stage, "plan.json"), text, { flag: "wx" });
  if (!(await readPlainSkyFile(stage, "plan.json")).equals(Buffer.from(text))) fail("write_readback_failed");
  // Re-read the source seal and exact bodies before making this package ready.
  if (JSON.stringify(await packagePlan({ bundleDirectory: source, publicationHash, origin })) !== JSON.stringify(plan)) fail("source_changed");
  const directory = path.join(output, "package");
  await rename(stage, directory);
  return Object.freeze({ status: "PREPARED_LOCAL_OSS_ESA_PACKAGE", directory, publicationHash,
    packageSha256: skyStaticHash(text), resourceOrigin: origin, files: plan.files, bytes: plan.bytes,
    metadataMaximumBytes: plan.objects.reduce((maximum, object) => Math.max(maximum, object.metadataBytes), 0), esaRules: plan.esaRules.length,
    cloudPublication: false, cdnAcceptance: "UNVERIFIED" });
}

/** A future executor must use this readback against its explicitly selected
 * source before upload. Rehashed package JSON cannot authorize changed keys,
 * metadata, bytes, scope or policy; the existing source remains authoritative. */
export async function readSkyObjectStorePackage({ packageDirectory, bundleDirectory, publicationHash, resourceOrigin: inputOrigin }) {
  if (!path.isAbsolute(packageDirectory ?? "") || !path.isAbsolute(bundleDirectory ?? "")) fail("path_not_absolute");
  const origin = resourceOrigin(inputOrigin);
  const text = await readPlainSkyFile(packageDirectory, "plan.json");
  let actual;
  try { actual = JSON.parse(text.toString("utf8")); } catch { fail("package_invalid"); }
  const expected = await packagePlan({ bundleDirectory, publicationHash, origin });
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail("package_changed");
  return Object.freeze({ plan: expected, packageSha256: skyStaticHash(text) });
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    const result = await prepareSkyObjectStorePackage({ bundleDirectory: option("--bundle"), outputDirectory: option("--output"),
      publicationHash: option("--expect-publication-hash"), resourceOrigin: option("--resource-origin") });
    process.stdout.write(JSON.stringify(result) + "\n");
  } catch (error) {
    process.stderr.write(JSON.stringify({ status: "failed", code: error instanceof Error ? error.message : "sky_object_store_failed" }) + "\n");
    process.exitCode = 1;
  }
}
