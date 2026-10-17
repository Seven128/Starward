import { createHash } from "node:crypto";
import { lstat, mkdir, open, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { bundleRoot, fail, releaseArtifactRoot, repositoryRoot, sha256 } from "./release-bundle-request.mjs";
import { verifyCompiledSkyOrigin } from "./compiled-sky-origin.mjs";
import { releaseBundleLocation, resolveReleaseBundleLocation } from "./release-bundle-location.cjs";
import { packageBudgetWithinLimits, summarizePackageBytes, WEAPP_PACKAGE_BYTE_LIMIT, WEAPP_AGGREGATE_BYTE_LIMIT } from "./inspect-production.mjs";

const textExtensions = new Set([".css", ".html", ".js", ".json", ".map", ".txt", ".wxml", ".wxss"]);

/** Validate every directory below the selected repository before writing or
 * reading a v3 candidate. Neither reparse points nor arbitrary manifest paths
 * may redirect the build/platform owner outside its artifact scope. */
export async function ensureReleaseDirectory(root, selected, { create = false } = {}) {
  const repository = path.resolve(root), directory = path.resolve(selected);
  const relative = path.relative(repository, directory);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) fail("release_bundle_directory_outside_repository");
  let current = repository;
  for (const part of relative.split(path.sep)) {
    current = path.join(current, part);
    if (create) {
      try { await mkdir(current); } catch (error) { if (error.code !== "EEXIST") throw error; }
    }
    const metadata = await lstat(current);
    if (metadata.isSymbolicLink() || !metadata.isDirectory()) fail("release_bundle_directory_not_owned");
  }
  return directory;
}

export async function createReleaseBundleOutput(root = repositoryRoot) {
  const location = releaseBundleLocation(randomUUID(), root);
  const parent = path.dirname(path.dirname(location.bundleRoot));
  await ensureReleaseDirectory(root, parent, { create: true });
  // Exclusive creation refuses any existing candidate; nothing is removed.
  await mkdir(path.dirname(location.bundleRoot));
  return location;
}

export async function resolveManifestBundleRoot(manifest, roots = {}) {
  if (manifest.schemaVersion !== "starward-weapp-release-bundle-v3") {
    if (!["starward-weapp-release-bundle-v1", "starward-weapp-release-bundle-v2"].includes(manifest.schemaVersion) ||
        manifest.bundleDirectory !== undefined) fail("release_bundle_legacy_output_unbound");
    return path.resolve(roots.bundleRoot ?? bundleRoot);
  }
  const root = roots.repositoryRoot ?? repositoryRoot;
  const location = resolveReleaseBundleLocation(manifest.bundleDirectory, root);
  await ensureReleaseDirectory(root, location.bundleRoot);
  return location.bundleRoot;
}

export async function inspectReleaseBundleBudget(fingerprint, root) {
  const pin = fingerprint.files.find(file => file.path === "app.json");
  const bytes = await readFile(path.join(root, "app.json"));
  if (!pin || pin.bytes !== bytes.length || pin.sha256 !== sha256(bytes)) fail("release_bundle_app_config_changed");
  let app;
  try { app = JSON.parse(bytes.toString("utf8")); } catch { fail("release_bundle_app_config_invalid"); }
  const subPackages = app?.subPackages ?? [];
  if (!Array.isArray(subPackages) || subPackages.some(item => typeof item?.root !== "string" ||
      !/^[a-z0-9_-]+(?:\/[a-z0-9_-]+)*$/u.test(item.root)) || new Set(subPackages.map(item => item.root)).size !== subPackages.length)
    fail("release_bundle_package_roots_invalid");
  const packages = summarizePackageBytes(fingerprint.files.map(file => ({ file: file.path, size: file.bytes })), subPackages);
  const limits = { perPackageBytes: WEAPP_PACKAGE_BYTE_LIMIT, aggregateBytes: WEAPP_AGGREGATE_BYTE_LIMIT };
  if (!packageBudgetWithinLimits(packages, fingerprint.totalBytes, limits)) fail("release_bundle_package_budget_exceeded");
  return Object.freeze({ packages, totalBytes: fingerprint.totalBytes, limits });
}

/** Build and platform consumption share the byte-bound environment check.
 * This establishes compiled binding, never domain/platform entitlement. */
export async function verifyCompiledOrigin(request, fingerprint, root = bundleRoot) {
  let expectedOriginFound = false, expectedSkyOriginFound = false;
  const compiledAppIds = new Set();
  for (const file of fingerprint.files) {
    if (!textExtensions.has(path.extname(file.path).toLowerCase())) continue;
    const text = await readFile(path.join(root, file.path), "utf8");
    if (text.includes(request.apiOrigin)) expectedOriginFound = true;
    if (text.includes(request.skyResourceOrigin ?? request.apiOrigin)) expectedSkyOriginFound = true;
    for (const match of text.matchAll(/\bwx[a-f0-9]{16}\b/gu)) compiledAppIds.add(match[0]);
    if (request.lane !== "ci" && (text.includes("http://127.0.0.1:8787") || text.includes("http://localhost:8787")))
      fail("release_bundle_loopback_origin_compiled");
  }
  if (!expectedOriginFound) fail("release_bundle_expected_origin_missing");
  if (!expectedSkyOriginFound) fail("release_bundle_expected_sky_resource_origin_missing");
  if (request.lane === "ci" && compiledAppIds.size > 0) fail("release_bundle_ci_app_id_compiled");
  if (request.lane !== "ci" && (compiledAppIds.size !== 1 || !compiledAppIds.has(request.appId)))
    fail("release_bundle_deployable_app_id_compiled_mismatch");
  return verifyCompiledSkyOrigin(request, fingerprint, root);
}

export async function validateSourceProjectIdentity(
  request,
  configPath = path.join(
    repositoryRoot,
    "apps",
    "wechat-miniapp",
    "project.config.json",
  ),
) {
  let bytes;
  let config;
  try {
    bytes = await readFile(configPath);
    config = JSON.parse(bytes.toString("utf8"));
  } catch {
    fail("release_bundle_source_project_config_invalid");
  }
  if (
    !config ||
    typeof config !== "object" ||
    Array.isArray(config) ||
    config.compileType !== "miniprogram" ||
    !/^wx[a-f0-9]{16}$/u.test(config.appid ?? "")
  )
    fail("release_bundle_source_project_identity_invalid");
  if (request.lane !== "ci" && config.appid !== request.appId)
    fail("release_bundle_source_project_app_id_mismatch");
  return sha256(bytes);
}

export async function bindBundleProjectIdentity(request, root = bundleRoot) {
  const configPath = path.join(root, "project.config.json");
  let config;
  try {
    config = JSON.parse(await readFile(configPath, "utf8"));
  } catch {
    fail("release_bundle_project_config_invalid");
  }
  if (!config || typeof config !== "object" || Array.isArray(config))
    fail("release_bundle_project_config_invalid");
  config.appid = request.lane === "ci" ? "starward-ci-nondeployable" : request.appId;
  config.setting = config.setting && typeof config.setting === "object" && !Array.isArray(config.setting)
    ? config.setting
    : {};
  config.setting.urlCheck = request.lane !== "ci";
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);

  const persisted = JSON.parse(await readFile(configPath, "utf8"));
  if (request.lane === "ci") {
    if (/^wx[a-f0-9]{16}$/u.test(persisted.appid ?? "")) fail("release_bundle_ci_project_app_id_deployable");
  } else if (persisted.appid !== request.appId) {
    fail("release_bundle_project_app_id_mismatch");
  }
  if (persisted.setting?.urlCheck !== (request.lane !== "ci"))
    fail("release_bundle_project_url_check_mismatch");
  return sha256(await readFile(configPath));
}

async function listBundleFiles(root, current = root) {
  const entries = await readdir(current, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name, "en"));
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(current, entry.name);
    if (entry.isSymbolicLink()) fail("release_bundle_symlink_forbidden");
    if (entry.isDirectory()) files.push(...(await listBundleFiles(root, absolute)));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

export async function fingerprintBundle(root) {
  const files = await listBundleFiles(root);
  if (files.length === 0) fail("release_bundle_empty");
  const aggregate = createHash("sha256");
  const manifestFiles = [];
  let totalBytes = 0;
  for (const absolute of files) {
    const relative = path.relative(root, absolute).replaceAll("\\", "/");
    const bytes = await readFile(absolute);
    aggregate.update(relative, "utf8");
    aggregate.update("\0");
    aggregate.update(bytes);
    aggregate.update("\0");
    totalBytes += bytes.length;
    manifestFiles.push({ path: relative, bytes: bytes.length, sha256: sha256(bytes) });
  }
  return Object.freeze({
    sha256: aggregate.digest("hex"),
    totalBytes,
    fileCount: manifestFiles.length,
    files: manifestFiles,
  });
}

export async function acquireBuildLock(root = releaseArtifactRoot) {
  await mkdir(root, { recursive: true });
  const lockPath = path.join(root, ".weapp-release-build.lock");
  let handle;
  try {
    handle = await open(lockPath, "wx", 0o600);
  } catch (error) {
    if (error?.code === "EEXIST") fail("release_bundle_build_locked");
    throw error;
  }
  await handle.writeFile(`${JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() })}\n`);
  let released = false;
  return async () => {
    if (released) return;
    released = true;
    await handle.close();
    await rm(lockPath, { force: true });
  };
}
