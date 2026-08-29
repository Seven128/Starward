import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  acquireBuildLock,
  bindBundleProjectIdentity,
  fingerprintBundle,
  releaseBuildEnvironment,
  resolveNpmCli,
  validateBuildRequest,
  validateSourceProjectIdentity,
} from "./build-release-bundle.mjs";

const revision = "a".repeat(40);
const stagingAppId = `wx${"1".repeat(16)}`;

test("formal release builds clear an inherited operator-preview access token", () => {
  const environment = releaseBuildEnvironment(
    { apiOrigin: "https://api.starward-ci.invalid" },
    {
      MINIAPP_OPERATOR_PREVIEW_TOKEN: "inherited-preview-token",
      MINIAPP_DEVICE_REQUEST_DIAGNOSTICS: "1",
      UNRELATED: "preserved",
    },
  );
  assert.equal(environment.MINIAPP_OPERATOR_PREVIEW_TOKEN, "");
  assert.equal(environment.MINIAPP_DEVICE_REQUEST_DIAGNOSTICS, "0");
  assert.equal(environment.MINIAPP_API_BASE, "https://api.starward-ci.invalid");
  assert.equal(environment.UNRELATED, "preserved");
});

test("release build uses npm's explicit CLI entry instead of guessing the Node layout", () => {
  const npmCli = path.resolve("node_modules", "npm", "bin", "npm-cli.js");
  assert.equal(resolveNpmCli({ npm_execpath: npmCli }), path.normalize(npmCli));
  assert.throws(() => resolveNpmCli({}), /release_bundle_npm_execpath_missing/u);
  assert.throws(
    () => resolveNpmCli({ npm_execpath: "node_modules/npm/bin/npm-cli.js" }),
    /release_bundle_npm_execpath_not_absolute/u,
  );
  assert.throws(
    () => resolveNpmCli({ npm_execpath: path.resolve("node_modules", "npm", "bin", "npm.js") }),
    /release_bundle_npm_execpath_invalid/u,
  );
});

function request(overrides = {}) {
  return validateBuildRequest({
    "--lane": "ci",
    "--api-origin": "https://api.starward-ci.invalid",
    "--source-revision": revision,
    ...overrides,
  });
}

test("CI bundles are structurally nondeployable and accept no AppID", () => {
  const validated = request();
  assert.equal(validated.candidateClass, "ci-structural-nondeployable");
  assert.equal(validated.appIdSha256, null);
  assert.throws(
    () => request({ "--app-id": stagingAppId }),
    /release_bundle_ci_app_id_forbidden/u,
  );
  assert.throws(
    () => request({ "--api-origin": "https://api.example.com" }),
    /release_bundle_ci_origin_must_be_invalid/u,
  );
});

test("deployable bundles require an AppID and a real HTTPS origin", () => {
  const validated = request({
    "--lane": "staging",
    "--api-origin": "https://api-staging.starward.cn",
    "--app-id": stagingAppId,
  });
  assert.equal(validated.candidateClass, "environment-bound");
  assert.match(validated.appIdSha256, /^[a-f0-9]{64}$/u);
  assert.throws(
    () =>
      request({
        "--lane": "production",
        "--api-origin": "https://api.starward.cn",
      }),
    /release_bundle_deployable_app_id_required/u,
  );
  for (const origin of [
    "http://api.starward.cn",
    "https://127.0.0.1",
    "https://api.starward.test",
    "https://api.starward.cn/path",
  ]) {
    assert.throws(
      () =>
        request({
          "--lane": "production",
          "--api-origin": origin,
          "--app-id": stagingAppId,
        }),
      /release_bundle_/u,
    );
  }
});

test("release bundle project identity is bound to its lane", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "starward-weapp-identity-"));
  try {
    const configPath = path.join(root, "project.config.json");
    await writeFile(
      configPath,
      `${JSON.stringify({ appid: `wx${"f".repeat(16)}`, compileType: "miniprogram" })}\n`,
    );
    const ciHash = await bindBundleProjectIdentity(request(), root);
    assert.match(ciHash, /^[a-f0-9]{64}$/u);
    assert.equal(
      JSON.parse(await readFile(configPath, "utf8")).appid,
      "starward-ci-nondeployable",
    );
    assert.equal(
      JSON.parse(await readFile(configPath, "utf8")).setting.urlCheck,
      false,
    );

    const staging = request({
      "--lane": "staging",
      "--api-origin": "https://api-staging.starward.cn",
      "--app-id": stagingAppId,
    });
    await bindBundleProjectIdentity(staging, root);
    const stagingConfig = JSON.parse(await readFile(configPath, "utf8"));
    assert.equal(stagingConfig.appid, stagingAppId);
    assert.equal(stagingConfig.setting.urlCheck, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("deployable bundle identity must equal the tracked source AppID", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "starward-weapp-source-identity-"));
  try {
    const configPath = path.join(root, "project.config.json");
    await writeFile(
      configPath,
      `${JSON.stringify({ appid: stagingAppId, compileType: "miniprogram" })}\n`,
    );
    const staging = request({
      "--lane": "staging",
      "--api-origin": "https://api-staging.starward.cn",
      "--app-id": stagingAppId,
    });
    assert.match(
      await validateSourceProjectIdentity(staging, configPath),
      /^[a-f0-9]{64}$/u,
    );
    const anotherAppId = `wx${"2".repeat(16)}`;
    await assert.rejects(
      validateSourceProjectIdentity(
        request({
          "--lane": "production",
          "--api-origin": "https://api.starward.cn",
          "--app-id": anotherAppId,
        }),
        configPath,
      ),
      /release_bundle_source_project_app_id_mismatch/u,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("bundle fingerprint is stable and changes with path or bytes", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "starward-weapp-fingerprint-"));
  try {
    await mkdir(path.join(root, "pages"), { recursive: true });
    await writeFile(path.join(root, "app.json"), "{}\n");
    await writeFile(path.join(root, "pages", "index.js"), "export default 1;\n");
    const first = await fingerprintBundle(root);
    const second = await fingerprintBundle(root);
    assert.deepEqual(first, second);
    await writeFile(path.join(root, "pages", "index.js"), "export default 2;\n");
    const changed = await fingerprintBundle(root);
    assert.notEqual(changed.sha256, first.sha256);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("build lock rejects a concurrent owner and can be reacquired after release", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "starward-weapp-lock-"));
  try {
    const release = await acquireBuildLock(root);
    await assert.rejects(
      () => acquireBuildLock(root),
      /release_bundle_build_locked/u,
    );
    await release();
    const releaseAgain = await acquireBuildLock(root);
    await releaseAgain();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
