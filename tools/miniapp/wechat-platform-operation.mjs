import {
  access,
  mkdir,
  open,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fingerprintBundle } from "./release-bundle-artifact.mjs";
import { fail, sha256 } from "./wechat-platform-request.mjs";

const SHA_PATTERN = /^[0-9a-f]{64}$/u;

async function validatePrivateKey(request) {
  const metadata = await stat(request.privateKeyPath);
  if (!metadata.isFile()) fail("wechat_platform_private_key_not_file");
  if (metadata.size < 128 || metadata.size > 32 * 1024)
    fail("wechat_platform_private_key_size_invalid");
  if (process.platform !== "win32" && (metadata.mode & 0o077) !== 0)
    fail("wechat_platform_private_key_permissions_too_open");
}

async function verifyCandidate(request) {
  const manifestBytes = await readFile(request.manifestPath);
  let manifest;
  try {
    manifest = JSON.parse(manifestBytes.toString("utf8"));
  } catch {
    fail("wechat_platform_manifest_invalid");
  }
  if (
    manifest.schemaVersion !== "starward-weapp-release-bundle-v1" ||
    manifest.status !== "built" ||
    manifest.candidateClass !== "environment-bound"
  ) fail("wechat_platform_manifest_not_deployable");
  if (manifest.lane !== request.lane) fail("wechat_platform_manifest_lane_mismatch");
  if (manifest.appIdSha256 !== request.appIdSha256)
    fail("wechat_platform_manifest_app_id_mismatch");
  if (!SHA_PATTERN.test(manifest.bundle?.sha256 ?? ""))
    fail("wechat_platform_manifest_bundle_invalid");
  if (!Number.isFinite(Date.parse(manifest.generatedAt)))
    fail("wechat_platform_manifest_timestamp_invalid");
  const confirmation = `${request.operation}:${request.lane}:${request.version}:${manifest.bundle.sha256}`;
  if (
    request.lane === "production" &&
    request.operation === "upload" &&
    request.confirmation !== confirmation
  ) fail("wechat_platform_production_confirmation_required");
  const projectConfigPath = path.join(request.bundleRoot, "project.config.json");
  const projectConfigBytes = await readFile(projectConfigPath);
  const projectConfig = JSON.parse(projectConfigBytes.toString("utf8"));
  if (
    projectConfig.appid !== request.appId ||
    projectConfig.compileType !== "miniprogram" ||
    projectConfig.miniprogramRoot !== "./" ||
    projectConfig.setting?.urlCheck !== true
  ) fail("wechat_platform_project_config_mismatch");
  if (sha256(projectConfigBytes) !== manifest.bundleProjectConfigSha256)
    fail("wechat_platform_project_config_digest_mismatch");
  const fingerprint = await fingerprintBundle(request.bundleRoot);
  if (JSON.stringify(fingerprint) !== JSON.stringify(manifest.bundle))
    fail("wechat_platform_bundle_fingerprint_mismatch");
  return Object.freeze({
    manifest,
    manifestSha256: sha256(manifestBytes),
    fingerprint,
    confirmation,
    projectConfigSha256: sha256(projectConfigBytes),
  });
}

async function acquirePlatformLock(platformRoot) {
  await mkdir(platformRoot, { recursive: true });
  const lockPath = path.join(platformRoot, ".weapp-platform-operation.lock");
  let handle;
  try {
    handle = await open(lockPath, "wx", 0o600);
  } catch (error) {
    if (error instanceof Error && error.code === "EEXIST") fail("wechat_platform_operation_locked");
    throw error;
  }
  await handle.writeFile(`${JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() })}\n`);
  return async () => {
    await handle.close();
    await rm(lockPath, { force: true });
  };
}

function safePlatformSummary(result) {
  if (!result || typeof result !== "object" || Array.isArray(result))
    fail("wechat_platform_result_invalid");
  const packages = Array.isArray(result.packages)
    ? result.packages.map((entry) => {
        if (
          !entry ||
          typeof entry.name !== "string" ||
          entry.name.length > 128 ||
          (entry.size !== null && (!Number.isSafeInteger(entry.size) || entry.size < 0))
        ) fail("wechat_platform_result_invalid");
        return Object.freeze({ name: entry.name, size: entry.size });
      })
    : [];
  if (!Number.isSafeInteger(result.pluginCount) || result.pluginCount < 0)
    fail("wechat_platform_result_invalid");
  return Object.freeze({ packages, pluginCount: result.pluginCount });
}

export async function executeWechatPlatformOperation({ request, driver, now = () => new Date() }) {
  await validatePrivateKey(request);
  const releaseLock = await acquirePlatformLock(request.platformRoot);
  try {
    const verified = await verifyCandidate(request);
    await mkdir(request.receiptDirectory, { recursive: true, mode: 0o700 });
    try {
      await access(request.receiptPath);
      fail("wechat_platform_receipt_exists");
    } catch (error) {
      if (!(error instanceof Error) || error.code !== "ENOENT") throw error;
    }
    const intentPath = `${request.receiptPath}.intent`;
    const intent = {
      schemaVersion: "starward-weapp-platform-intent-v1",
      status: "started",
      operation: request.operation,
      lane: request.lane,
      version: request.version,
      robot: request.robot,
      sourceRevision: verified.manifest.sourceRevision,
      appIdSha256: request.appIdSha256,
      bundleSha256: verified.fingerprint.sha256,
      startedAt: now().toISOString(),
    };
    try {
      await writeFile(intentPath, `${JSON.stringify(intent, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    } catch (error) {
      if (error instanceof Error && error.code === "EEXIST")
        fail("wechat_platform_incomplete_operation_requires_reconciliation");
      throw error;
    }
    let platformResult;
    try {
      platformResult = await driver[request.operation]({
        appId: request.appId,
        privateKeyPath: request.privateKeyPath,
        projectPath: request.bundleRoot,
        version: request.version,
        description: request.description,
        robot: request.robot,
        qrcodeOutputPath: request.qrcodeOutputPath,
      });
    } catch {
      fail("wechat_platform_operation_failed");
    }
    const summary = safePlatformSummary(platformResult);
    const after = await fingerprintBundle(request.bundleRoot);
    if (JSON.stringify(after) !== JSON.stringify(verified.fingerprint))
      fail("wechat_platform_bundle_changed_during_operation");
    let qrcode = null;
    if (request.operation === "preview") {
      const bytes = await readFile(request.qrcodeOutputPath);
      if (bytes.length < 128 || bytes.length > 1024 * 1024)
        fail("wechat_platform_qrcode_invalid");
      qrcode = Object.freeze({
        path: path.relative(request.repositoryRoot, request.qrcodeOutputPath).replaceAll("\\", "/"),
        bytes: bytes.length,
        sha256: sha256(bytes),
      });
    }
    const receipt = Object.freeze({
      schemaVersion: "starward-weapp-platform-receipt-v1",
      status: "succeeded",
      operation: request.operation,
      lane: request.lane,
      version: request.version,
      description: request.description,
      robot: request.robot,
      sourceRevision: verified.manifest.sourceRevision,
      apiOrigin: verified.manifest.apiOrigin,
      appIdSha256: request.appIdSha256,
      bundleSha256: verified.fingerprint.sha256,
      manifestSha256: verified.manifestSha256,
      projectConfigSha256: verified.projectConfigSha256,
      platform: summary,
      qrcode,
      startedAt: intent.startedAt,
      finishedAt: now().toISOString(),
    });
    await writeFile(request.receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    await rm(intentPath);
    return Object.freeze({ receiptPath: request.receiptPath, receipt });
  } finally {
    await releaseLock();
  }
}
