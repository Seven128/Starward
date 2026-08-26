import { createHash } from "node:crypto";
import { mkdir, open, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { bundleRoot, fail, releaseArtifactRoot, sha256 } from "./release-bundle-request.mjs";

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
