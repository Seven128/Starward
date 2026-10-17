import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { writeCompiledSkyFixture } from "./compiled-sky-origin-test-support.mjs";
import { fingerprintBundle, verifyCompiledOrigin } from "./build-release-bundle.mjs";
import { createReleaseBundleOutput, inspectReleaseBundleBudget } from "./release-bundle-artifact.mjs";
import {
  executeWechatPlatformOperation,
  validatePlatformRequest,
} from "./upload-release-bundle.mjs";

const appId = `wx${"1".repeat(16)}`;

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function platformFixture(lane = "staging") {
  const root = await mkdtemp(path.join(os.tmpdir(), "starward-wechat-platform-"));
  const repositoryRoot = path.join(root, "repo");
  const bundleRoot = path.join(repositoryRoot, "apps", "wechat-miniapp", "dist", "weapp");
  const releaseRoot = path.join(repositoryRoot, "artifacts", "miniapp", "release");
  const platformRoot = path.join(repositoryRoot, "artifacts", "miniapp", "platform");
  const privateKeyPath = path.join(root, "private.upload.key");
  await mkdir(bundleRoot, { recursive: true });
  await mkdir(releaseRoot, { recursive: true });
  await writeFile(path.join(bundleRoot, "app.json"), `${JSON.stringify({ pages: ["pages/index/index"] })}\n`);
  await mkdir(path.join(bundleRoot, "pages", "index"), { recursive: true });
  await writeFile(path.join(bundleRoot, "pages", "index", "index.js"), "App({});\n");
  const projectConfig = Buffer.from(`${JSON.stringify({
    appid: appId,
    compileType: "miniprogram",
    miniprogramRoot: "./",
    setting: { urlCheck: true },
  }, null, 2)}\n`);
  await writeFile(path.join(bundleRoot, "project.config.json"), projectConfig);
  await writeFile(privateKeyPath, "private-upload-key-material\n".repeat(12), { mode: 0o600 });
  const fingerprint = await fingerprintBundle(bundleRoot);
  const manifestPath = path.join(releaseRoot, `${lane}.manifest.json`);
  const manifest = {
    schemaVersion: "starward-weapp-release-bundle-v1",
    status: "built",
    lane,
    candidateClass: "environment-bound",
    sourceRevision: "a".repeat(40),
    apiOrigin: lane === "production" ? "https://api.starward.cn" : "https://api-staging.starward.cn",
    appIdSha256: sha256(Buffer.from(appId)),
    sourceProjectConfigSha256: "b".repeat(64),
    bundleProjectConfigSha256: sha256(projectConfig),
    generatedAt: "2026-08-26T16:00:00.000Z",
    bundle: fingerprint,
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const roots = { repositoryRoot, bundleRoot, releaseRoot, platformRoot };
  const raw = {
    "--operation": "preview",
    "--lane": lane,
    "--manifest": manifestPath,
    "--app-id": appId,
    "--private-key-path": privateKeyPath,
    "--version": "1.2.3",
    "--description": "trusted release candidate",
    "--robot": "7",
  };
  return { root, repositoryRoot, bundleRoot, releaseRoot, platformRoot, privateKeyPath, manifestPath, manifest, roots, raw };
}

async function withFixture(lane, assertion) {
  const fixture = await platformFixture(lane);
  try {
    await assertion(fixture);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
}

test("v2 candidates bind the resource origin through consumption and receipts while old v1 cannot smuggle it", async () => {
  await withFixture("staging", async fixture => {
    fixture.manifest.skyResourceOrigin = "https://sky-images.starward.cn";
    await writeFile(fixture.manifestPath, JSON.stringify(fixture.manifest));
    const request = validatePlatformRequest(fixture.raw, fixture.roots);
    let calls = 0;
    const driver = { async preview(input) { calls++; await writeFile(input.qrcodeOutputPath, Buffer.alloc(256, 4));
      return { packages: [], pluginCount: 0 }; } };
    await assert.rejects(executeWechatPlatformOperation({ request, driver }), /legacy_resource_origin_unbound/u);
    assert.equal(calls, 0);
    fixture.manifest.schemaVersion = "starward-weapp-release-bundle-v2";
    await writeFile(fixture.manifestPath, JSON.stringify(fixture.manifest));
    await assert.rejects(executeWechatPlatformOperation({ request, driver }), /expected_origin_missing/u);
    assert.equal(calls, 0);
    await writeFile(path.join(fixture.bundleRoot, "pages", "index", "index.js"),
      `const api = ${JSON.stringify(fixture.manifest.apiOrigin)}; const resource = ${JSON.stringify(fixture.manifest.skyResourceOrigin)};`);
    await writeCompiledSkyFixture(fixture.bundleRoot, fixture.manifest);
    fixture.manifest.bundle = await fingerprintBundle(fixture.bundleRoot);
    await writeFile(fixture.manifestPath, JSON.stringify(fixture.manifest));
    const result = await executeWechatPlatformOperation({ request, driver });
    assert.equal(calls, 1); assert.equal(result.receipt.schemaVersion, "starward-weapp-platform-receipt-v2");
    assert.equal(result.receipt.skyResourceOrigin, fixture.manifest.skyResourceOrigin);
    const persisted = JSON.parse(await readFile(result.receiptPath, "utf8"));
    assert.equal(persisted.skyResourceOrigin, fixture.manifest.skyResourceOrigin);
    assert.equal(persisted.compiledSkyOrigin.scope, "COMPILED_PURE_ADDRESS_OWNER");
  });
});

test("v3 platform consumption uses the exact isolated directory and freshly verifies budget/binding before the driver", async () => {
  await withFixture("staging", async fixture => {
    const location = await createReleaseBundleOutput(fixture.repositoryRoot);
    await cp(fixture.bundleRoot, location.bundleRoot, { recursive: true, force: false, errorOnExist: true });
    fixture.manifest.schemaVersion = "starward-weapp-release-bundle-v3";
    fixture.manifest.bundleDirectory = location.bundleDirectory;
    fixture.manifest.skyResourceOrigin = "https://images-staging.starward.cn";
    await writeCompiledSkyFixture(location.bundleRoot, fixture.manifest);
    fixture.manifest.bundle = await fingerprintBundle(location.bundleRoot);
    fixture.manifest.compiledSkyOrigin = await verifyCompiledOrigin({ ...fixture.manifest, appId }, fixture.manifest.bundle, location.bundleRoot);
    fixture.manifest.packageBudget = await inspectReleaseBundleBudget(fixture.manifest.bundle, location.bundleRoot);
    // The legacy root is deliberately stale; reading it cannot satisfy the
    // selected candidate's fingerprint, even though request.bundleRoot retains it.
    await writeFile(path.join(fixture.bundleRoot, "app.json"), "{\"legacy\":true}\n");
    const retainedLegacy = await fingerprintBundle(fixture.bundleRoot);
    const request = validatePlatformRequest(fixture.raw, fixture.roots);
    let calls = 0;
    const driver = { preview: async input => {
      calls += 1; assert.equal(input.projectPath, location.bundleRoot);
      await writeFile(input.qrcodeOutputPath, Buffer.alloc(256, 3));
      return { packages: [], pluginCount: 0 };
    } };
    const canonical = JSON.stringify(fixture.manifest);
    for (const mutation of [manifest => { manifest.bundleDirectory = "../weapp"; },
      manifest => { manifest.packageBudget.packages.main.bytes += 1; },
      manifest => { delete manifest.packageBudget; },
      manifest => { manifest.compiledSkyOrigin.ownerId = "injected"; }]) {
      const manifest = JSON.parse(canonical); mutation(manifest);
      await writeFile(fixture.manifestPath, JSON.stringify(manifest));
      await assert.rejects(executeWechatPlatformOperation({ request, driver }), /release_bundle_output_|package_budget_mismatch|compiled_sky_binding_mismatch/u);
      assert.equal(calls, 0);
    }
    await writeFile(fixture.manifestPath, canonical);
    const result = await executeWechatPlatformOperation({ request, driver });
    assert.equal(calls, 1); assert.equal(result.receipt.schemaVersion, "starward-weapp-platform-receipt-v2");
    assert.equal(result.receipt.bundleDirectory, location.bundleDirectory);
    assert.deepEqual(result.receipt.packageBudget, fixture.manifest.packageBudget);
    assert.deepEqual(result.receipt.compiledSkyOrigin, fixture.manifest.compiledSkyOrigin);
    assert.deepEqual(await fingerprintBundle(fixture.bundleRoot), retainedLegacy);
  });
});

test("v2 compiled-origin pins are rederived before a platform driver can consume the candidate", async () => {
  await withFixture("staging", async fixture => {
    fixture.manifest.schemaVersion = "starward-weapp-release-bundle-v2";
    fixture.manifest.skyResourceOrigin = "https://sky-images.starward.cn";
    await writeCompiledSkyFixture(fixture.bundleRoot, fixture.manifest);
    fixture.manifest.bundle = await fingerprintBundle(fixture.bundleRoot);
    const binding = await verifyCompiledOrigin({ ...fixture.manifest, appId }, fixture.manifest.bundle, fixture.bundleRoot);
    fixture.manifest.compiledSkyOrigin = { ...binding, ownerId: "injected-owner" };
    await writeFile(fixture.manifestPath, JSON.stringify(fixture.manifest));
    const request = validatePlatformRequest(fixture.raw, fixture.roots); let calls = 0;
    const driver = { async preview(input) { calls++; await writeFile(input.qrcodeOutputPath, Buffer.alloc(256, 4));
      return { packages: [], pluginCount: 0 }; } };
    await assert.rejects(executeWechatPlatformOperation({ request, driver }), /compiled_sky_binding_mismatch/u);
    assert.equal(calls, 0);
    fixture.manifest.compiledSkyOrigin = binding;
    await writeFile(fixture.manifestPath, JSON.stringify(fixture.manifest));
    const result = await executeWechatPlatformOperation({ request, driver });
    assert.equal(calls, 1); assert.deepEqual(result.receipt.compiledSkyOrigin, binding);
  });
});

test("CI lane and repository-owned private keys are never platform candidates", async () => {
  await withFixture("staging", async (fixture) => {
    assert.throws(
      () => validatePlatformRequest({ ...fixture.raw, "--lane": "ci" }, fixture.roots),
      /wechat_platform_lane_invalid/u,
    );
    assert.throws(
      () => validatePlatformRequest({ ...fixture.raw, "--private-key-path": path.join(fixture.repositoryRoot, "private.key") }, fixture.roots),
      /wechat_platform_private_key_inside_repository/u,
    );
  });
});

test("staging preview consumes the exact bundle and emits only redacted receipt evidence", async () => {
  await withFixture("staging", async (fixture) => {
    const request = validatePlatformRequest(fixture.raw, fixture.roots);
    let received = null;
    const result = await executeWechatPlatformOperation({
      request,
      driver: {
        async preview(input) {
          received = input;
          await writeFile(input.qrcodeOutputPath, Buffer.alloc(256, 9));
          return { packages: [{ name: "__FULL__", size: 12345 }], pluginCount: 0 };
        },
      },
      now: () => new Date("2026-08-26T16:05:00.000Z"),
    });
    assert.equal(received.projectPath, fixture.bundleRoot);
    assert.equal(result.receipt.status, "succeeded");
    assert.equal(result.receipt.bundleSha256, fixture.manifest.bundle.sha256);
    const persisted = await readFile(result.receiptPath, "utf8");
    assert.doesNotMatch(persisted, new RegExp(appId, "u"));
    assert.doesNotMatch(persisted, /private\.upload\.key|private-upload-key-material/u);
    assert.equal(result.receipt.qrcode.bytes, 256);
  });
});

test("bundle drift fails before the platform driver", async () => {
  await withFixture("staging", async (fixture) => {
    const request = validatePlatformRequest(fixture.raw, fixture.roots);
    await writeFile(path.join(fixture.bundleRoot, "app.json"), "{}\n");
    let called = false;
    await assert.rejects(
      () => executeWechatPlatformOperation({ request, driver: { async preview() { called = true; } } }),
      /wechat_platform_bundle_fingerprint_mismatch/u,
    );
    assert.equal(called, false);
  });
});

test("production preview establishes the digest and production upload requires exact confirmation", async () => {
  await withFixture("production", async (fixture) => {
    const preview = validatePlatformRequest(fixture.raw, fixture.roots);
    const previewResult = await executeWechatPlatformOperation({
      request: preview,
      driver: {
        async preview(input) {
          await writeFile(input.qrcodeOutputPath, Buffer.alloc(256, 6));
          return { packages: [], pluginCount: 0 };
        },
      },
      now: () => new Date("2026-08-26T16:07:00.000Z"),
    });
    assert.equal(previewResult.receipt.bundleSha256, fixture.manifest.bundle.sha256);

    const withoutConfirmation = validatePlatformRequest({ ...fixture.raw, "--operation": "upload" }, fixture.roots);
    await assert.rejects(
      () => executeWechatPlatformOperation({ request: withoutConfirmation, driver: { async upload() {} } }),
      /wechat_platform_production_confirmation_required/u,
    );
    const confirmation = `upload:production:1.2.3:${fixture.manifest.bundle.sha256}`;
    const request = validatePlatformRequest({
      ...fixture.raw,
      "--operation": "upload",
      "--confirm": confirmation,
    }, fixture.roots);
    const result = await executeWechatPlatformOperation({
      request,
      driver: { async upload() { return { packages: [], pluginCount: 0 }; } },
      now: () => new Date("2026-08-26T16:10:00.000Z"),
    });
    assert.equal(result.receipt.operation, "upload");
    assert.equal(result.receipt.qrcode, null);
  });
});

test("unknown platform failure leaves an intent and blocks blind retry", async () => {
  await withFixture("staging", async (fixture) => {
    const request = validatePlatformRequest(fixture.raw, fixture.roots);
    await assert.rejects(
      () => executeWechatPlatformOperation({
        request,
        driver: { async preview() { throw new Error(`remote failure ${appId} ${fixture.privateKeyPath}`); } },
      }),
      /wechat_platform_operation_failed/u,
    );
    let retried = false;
    await assert.rejects(
      () => executeWechatPlatformOperation({
        request,
        driver: { async preview() { retried = true; } },
      }),
      /wechat_platform_incomplete_operation_requires_reconciliation/u,
    );
    assert.equal(retried, false);
    const intent = await readFile(`${request.receiptPath}.intent`, "utf8");
    assert.doesNotMatch(intent, new RegExp(appId, "u"));
    assert.doesNotMatch(intent, /private\.upload\.key/u);
  });
});

test("a driver cannot mutate the release bundle without invalidating the operation", async () => {
  await withFixture("staging", async (fixture) => {
    const request = validatePlatformRequest(fixture.raw, fixture.roots);
    await assert.rejects(
      () => executeWechatPlatformOperation({
        request,
        driver: {
          async preview(input) {
            await writeFile(input.qrcodeOutputPath, Buffer.alloc(256, 4));
            await writeFile(path.join(fixture.bundleRoot, "app.json"), "{}\n");
            return { packages: [], pluginCount: 0 };
          },
        },
      }),
      /wechat_platform_bundle_changed_during_operation/u,
    );
  });
});
