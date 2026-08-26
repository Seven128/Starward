import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  acquireBuildLock,
  bindBundleProjectIdentity,
  fingerprintBundle,
} from "./release-bundle-artifact.mjs";
import {
  bundleRoot,
  fail,
  repositoryRoot,
  sha256,
  validateBuildRequest,
} from "./release-bundle-request.mjs";

export { acquireBuildLock, bindBundleProjectIdentity, fingerprintBundle, validateBuildRequest };

const textExtensions = new Set([".css", ".html", ".js", ".json", ".map", ".txt", ".wxml", ".wxss"]);

export function resolveNpmCli(environment = process.env) {
  const configured = environment.npm_execpath;
  if (!configured) fail("release_bundle_npm_execpath_missing");
  if (!path.isAbsolute(configured)) fail("release_bundle_npm_execpath_not_absolute");
  if (path.basename(configured).toLowerCase() !== "npm-cli.js")
    fail("release_bundle_npm_execpath_invalid");
  return path.normalize(configured);
}

function parseArguments(argv) {
  const values = new Map();
  const supported = new Set(["--lane", "--api-origin", "--source-revision", "--app-id", "--output-manifest"]);
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

async function runWeappBuild(request) {
  const npmCli = resolveNpmCli();
  await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [npmCli, "run", "build:weapp", "--workspace", "@starward/wechat-miniapp"],
      {
        cwd: repositoryRoot,
        env: {
          ...process.env,
          NODE_ENV: "production",
          TARO_ENV: "weapp",
          MINIAPP_API_BASE: request.apiOrigin,
          MINIAPP_ACCEPTANCE_DIAGNOSTICS: "0",
          MINIAPP_DEVELOPMENT_FIXTURE_MODE: "0",
        },
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

async function verifyCompiledOrigin(request, fingerprint) {
  let expectedOriginFound = false;
  const compiledAppIds = new Set();
  for (const file of fingerprint.files) {
    if (!textExtensions.has(path.extname(file.path).toLowerCase())) continue;
    const text = await readFile(path.join(bundleRoot, file.path), "utf8");
    if (text.includes(request.apiOrigin)) expectedOriginFound = true;
    for (const match of text.matchAll(/\bwx[a-f0-9]{16}\b/gu)) compiledAppIds.add(match[0]);
    if (
      request.lane !== "ci" &&
      (text.includes("http://127.0.0.1:8787") || text.includes("http://localhost:8787"))
    ) fail("release_bundle_loopback_origin_compiled");
  }
  if (!expectedOriginFound) fail("release_bundle_expected_origin_missing");
  if (request.lane === "ci" && compiledAppIds.size > 0) fail("release_bundle_ci_app_id_compiled");
  if (request.lane !== "ci" && (compiledAppIds.size !== 1 || !compiledAppIds.has(request.appId)))
    fail("release_bundle_deployable_app_id_compiled_mismatch");
}

async function buildReleaseBundle(request) {
  const releaseLock = await acquireBuildLock();
  try {
    const expectedBundleRoot = path.resolve(repositoryRoot, "apps", "wechat-miniapp", "dist", "weapp");
    if (path.resolve(bundleRoot) !== expectedBundleRoot) fail("release_bundle_output_root_invalid");
    await rm(bundleRoot, { recursive: true, force: true });
    await runWeappBuild(request);
    const appJson = await readFile(path.join(bundleRoot, "app.json"));
    if (appJson.length === 0) fail("release_bundle_app_json_empty");
    const bundleProjectConfigSha256 = await bindBundleProjectIdentity(request);
    const fingerprint = await fingerprintBundle(bundleRoot);
    await verifyCompiledOrigin(request, fingerprint);
    const projectConfig = await readFile(path.join(repositoryRoot, "apps", "wechat-miniapp", "project.config.json"));
    const manifest = {
      schemaVersion: "starward-weapp-release-bundle-v1",
      status: "built",
      lane: request.lane,
      candidateClass: request.candidateClass,
      sourceRevision: request.sourceRevision,
      apiOrigin: request.apiOrigin,
      appIdSha256: request.appIdSha256,
      sourceProjectConfigSha256: sha256(projectConfig),
      bundleProjectConfigSha256,
      generatedAt: new Date().toISOString(),
      bundle: fingerprint,
    };
    await mkdir(path.dirname(request.outputManifest), { recursive: true });
    await writeFile(request.outputManifest, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
    process.stdout.write(`${JSON.stringify({
      status: manifest.status,
      lane: manifest.lane,
      candidateClass: manifest.candidateClass,
      sourceRevision: manifest.sourceRevision,
      apiOrigin: manifest.apiOrigin,
      bundleSha256: manifest.bundle.sha256,
      manifestPath: path.relative(repositoryRoot, request.outputManifest).replaceAll("\\", "/"),
    })}\n`);
  } finally {
    await releaseLock();
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const request = validateBuildRequest(parseArguments(process.argv.slice(2)));
  await buildReleaseBundle(request);
}
