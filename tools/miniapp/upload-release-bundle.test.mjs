import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fingerprintBundle } from "./build-release-bundle.mjs";
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
