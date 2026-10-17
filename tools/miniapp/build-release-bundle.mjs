import { spawn } from "node:child_process";
import { lstat, open, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  acquireBuildLock,
  bindBundleProjectIdentity,
  fingerprintBundle,
  verifyCompiledOrigin,
  validateSourceProjectIdentity,
  createReleaseBundleOutput,
  ensureReleaseDirectory,
  inspectReleaseBundleBudget,
} from "./release-bundle-artifact.mjs";
import {
  fail,
  repositoryRoot,
  sha256,
  validateBuildRequest,
} from "./release-bundle-request.mjs";

export { acquireBuildLock, bindBundleProjectIdentity, fingerprintBundle, validateBuildRequest, validateSourceProjectIdentity, verifyCompiledOrigin };

export function resolveNpmCli(environment = process.env) {
  const configured = environment.npm_execpath;
  if (!configured) fail("release_bundle_npm_execpath_missing");
  if (!path.isAbsolute(configured)) fail("release_bundle_npm_execpath_not_absolute");
  if (path.basename(configured).toLowerCase() !== "npm-cli.js")
    fail("release_bundle_npm_execpath_invalid");
  return path.normalize(configured);
}

export function releaseBuildEnvironment(request, environment = process.env, location = null) {
  return {
    ...environment,
    NODE_ENV: "production",
    TARO_ENV: "weapp",
    MINIAPP_API_BASE: request.apiOrigin,
    MINIAPP_SKY_RESOURCE_BASE: request.skyResourceOrigin ?? request.apiOrigin,
    MINIAPP_OPERATOR_PREVIEW_TOKEN: "",
    MINIAPP_ACCEPTANCE_DIAGNOSTICS: "0",
    MINIAPP_DEVICE_REQUEST_DIAGNOSTICS: "0",
    MINIAPP_DEVELOPMENT_FIXTURE_MODE: "0",
    MINIAPP_ISOLATED_FIXTURE_BUILD: "0",
    MINIAPP_ISOLATED_CHECK_BUILD: "0",
    MINIAPP_ISOLATED_CHECK_BUILD_SLOT: "",
    MINIAPP_SKY_FEEDBACK_ID: "",
    MINIAPP_RELEASE_BUNDLE_ID: location?.id ?? "",
  };
}

function parseArguments(argv) {
  const values = new Map();
  const supported = new Set(["--lane", "--api-origin", "--sky-resource-origin", "--source-revision", "--app-id", "--output-manifest"]);
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!supported.has(key)) fail(`release_bundle_unknown_argument:${key}`);
    if (values.has(key)) fail(`release_bundle_duplicate_argument:${key}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) fail(`release_bundle_argument_value_required:${key}`);
    values.set(key, value);
    index += 1;
  }
  return Object.fromEntries(values);
}

async function runWeappBuild(request, location) {
  const npmCli = resolveNpmCli();
  await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [npmCli, "run", "build:weapp", "--workspace", "@starward/wechat-miniapp"],
      {
        cwd: repositoryRoot,
        env: releaseBuildEnvironment(request, process.env, location),
        stdio: "inherit",
        windowsHide: true,
      },
    );
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`release_bundle_build_failed:${code ?? signal}`));
    });
  });
}

export async function buildReleaseBundle(request, { root = repositoryRoot, build = runWeappBuild } = {}) {
  root = path.resolve(root);
  const releaseRoot = path.join(root, "artifacts", "miniapp", "release");
  const outputManifest = path.resolve(request.outputManifest);
  const relative = path.relative(releaseRoot, outputManifest);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative) || path.extname(outputManifest) !== ".json")
    fail("release_bundle_manifest_path_outside_artifact_root");
  await ensureReleaseDirectory(root, releaseRoot, { create: true });
  const releaseLock = await acquireBuildLock(releaseRoot);
  try {
    const sourceConfig = path.join(root, "apps", "wechat-miniapp", "project.config.json");
    const sourceProjectConfigSha256 = await validateSourceProjectIdentity(request, sourceConfig);
    await ensureReleaseDirectory(root, path.dirname(outputManifest), { create: true });
    try { await lstat(outputManifest); fail("release_bundle_manifest_exists"); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
    const location = await createReleaseBundleOutput(root), bundleRoot = location.bundleRoot;
    await build(request, location);
    await ensureReleaseDirectory(root, bundleRoot);
    const appJson = await readFile(path.join(bundleRoot, "app.json"));
    if (appJson.length === 0) fail("release_bundle_app_json_empty");
    if (await validateSourceProjectIdentity(request, sourceConfig) !== sourceProjectConfigSha256)
      fail("release_bundle_source_project_changed");
    const bundleProjectConfigSha256 = await bindBundleProjectIdentity(request, bundleRoot);
    const fingerprint = await fingerprintBundle(bundleRoot);
    const compiledSkyOrigin = await verifyCompiledOrigin(request, fingerprint, bundleRoot);
    const packageBudget = await inspectReleaseBundleBudget(fingerprint, bundleRoot);
    const manifest = {
      schemaVersion: "starward-weapp-release-bundle-v3",
      status: "built",
      lane: request.lane,
      candidateClass: request.candidateClass,
      sourceRevision: request.sourceRevision,
      apiOrigin: request.apiOrigin,
      skyResourceOrigin: request.skyResourceOrigin,
      compiledSkyOrigin,
      bundleDirectory: location.bundleDirectory,
      packageBudget,
      appIdSha256: request.appIdSha256,
      sourceProjectConfigSha256,
      bundleProjectConfigSha256,
      generatedAt: new Date().toISOString(),
      bundle: fingerprint,
    };
    if (JSON.stringify(await fingerprintBundle(bundleRoot)) !== JSON.stringify(fingerprint))
      fail("release_bundle_changed_before_manifest");
    await ensureReleaseDirectory(root, path.dirname(outputManifest));
    const handle = await open(outputManifest, "wx", 0o600);
    try { await handle.writeFile(`${JSON.stringify(manifest, null, 2)}\n`); await handle.sync(); }
    finally { await handle.close(); }
    process.stdout.write(`${JSON.stringify({
      status: manifest.status,
      lane: manifest.lane,
      candidateClass: manifest.candidateClass,
      sourceRevision: manifest.sourceRevision,
      apiOrigin: manifest.apiOrigin,
      skyResourceOrigin: manifest.skyResourceOrigin,
      bundleSha256: manifest.bundle.sha256,
      bundleDirectory: manifest.bundleDirectory,
      manifestPath: path.relative(root, outputManifest).replaceAll("\\", "/"),
    })}\n`);
    return Object.freeze({ manifest, outputManifest, bundleRoot });
  } finally {
    await releaseLock();
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const request = validateBuildRequest(parseArguments(process.argv.slice(2)));
  await buildReleaseBundle(request);
}
