import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const publicConfigPath = path.join(
  repositoryRoot,
  "apps",
  "wechat-miniapp",
  "project.config.json",
);
const privateConfigPath = path.join(
  repositoryRoot,
  "apps",
  "wechat-miniapp",
  "project.private.config.json",
);
const APP_ID_PATTERN = /^wx[0-9a-f]{16}$/u;

function fail(code) {
  throw new Error(code);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseConfig(bytes, code) {
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    fail(code);
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code);
  return value;
}

async function optionalBytes(selectedPath) {
  try {
    return await readFile(selectedPath);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function normalizedTrackedPath(root, selectedPath) {
  return path.relative(root, path.resolve(root, selectedPath)).replaceAll("\\", "/");
}

export async function inspectWechatAppId({
  root = repositoryRoot,
  publicPath = publicConfigPath,
  privatePath = privateConfigPath,
  trackedAppIdFiles = ["apps/wechat-miniapp/project.config.json"],
} = {}) {
  const publicBytes = await readFile(publicPath);
  const publicConfig = parseConfig(publicBytes, "wechat_app_id_public_config_invalid");
  if (
    publicConfig.compileType !== "miniprogram" ||
    !APP_ID_PATTERN.test(publicConfig.appid ?? "")
  )
    fail("wechat_app_id_public_identity_invalid");
  const privateBytes = await optionalBytes(privatePath);
  const privateConfig = privateBytes
    ? parseConfig(privateBytes, "wechat_app_id_private_config_invalid")
    : null;
  if (privateConfig && privateConfig.appid !== publicConfig.appid)
    fail("wechat_app_id_private_identity_mismatch");
  const expectedTrackedPath = normalizedTrackedPath(root, publicPath);
  const normalizedFiles = [...new Set(trackedAppIdFiles.map((entry) =>
    normalizedTrackedPath(root, entry),
  ))].sort();
  if (
    normalizedFiles.length !== 1 ||
    normalizedFiles[0] !== expectedTrackedPath
  )
    fail("wechat_app_id_tracked_identity_ambiguous");
  return Object.freeze({
    appId: publicConfig.appid,
    publicBytes,
    publicConfig,
    privateBytes,
    privateConfig,
    publicPath,
    privatePath,
    trackedPath: expectedTrackedPath,
  });
}

async function replaceFileAtomically(selectedPath, bytes, mode) {
  const temporaryPath = `${selectedPath}.starward-appid-${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryPath, bytes, { flag: "wx", mode });
    await rename(temporaryPath, selectedPath);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

async function requireUnchanged(selectedPath, expected, code) {
  const current = await optionalBytes(selectedPath);
  if (
    (current === null) !== (expected === null) ||
    (current && expected && !current.equals(expected))
  )
    fail(code);
}

async function restoreOwned(selectedPath, ownedBytes, originalBytes, mode) {
  const current = await optionalBytes(selectedPath);
  if (!current?.equals(ownedBytes)) return false;
  if (originalBytes === null) {
    await rm(selectedPath, { force: true });
  } else {
    await replaceFileAtomically(selectedPath, originalBytes, mode);
  }
  return true;
}

export async function migrateWechatAppId({
  fromAppId,
  toAppId,
  apply = false,
  root = repositoryRoot,
  publicPath = publicConfigPath,
  privatePath = privateConfigPath,
  trackedAppIdFiles = ["apps/wechat-miniapp/project.config.json"],
  replaceFile = replaceFileAtomically,
} = {}) {
  if (!APP_ID_PATTERN.test(fromAppId ?? ""))
    fail("wechat_app_id_expected_current_invalid");
  if (!APP_ID_PATTERN.test(toAppId ?? ""))
    fail("wechat_app_id_replacement_invalid");
  if (fromAppId === toAppId) fail("wechat_app_id_replacement_unchanged");
  const current = await inspectWechatAppId({
    root,
    publicPath,
    privatePath,
    trackedAppIdFiles,
  });
  if (current.appId !== fromAppId)
    fail("wechat_app_id_expected_current_mismatch");
  const nextPublic = Buffer.from(
    `${JSON.stringify({ ...current.publicConfig, appid: toAppId }, null, 2)}\n`,
  );
  const nextPrivate = current.privateConfig
    ? Buffer.from(
        `${JSON.stringify({ ...current.privateConfig, appid: toAppId }, null, 2)}\n`,
      )
    : null;
  const summary = {
    status: apply ? "applied" : "planned",
    fromAppIdSha256: sha256(fromAppId),
    toAppIdSha256: sha256(toAppId),
    trackedPath: current.trackedPath,
    localPrivateConfig: current.privateBytes ? "updated" : "absent",
  };
  if (!apply) return Object.freeze(summary);

  await requireUnchanged(publicPath, current.publicBytes, "wechat_app_id_public_config_changed");
  await requireUnchanged(privatePath, current.privateBytes, "wechat_app_id_private_config_changed");
  let publicReplaced = false;
  let privateReplaced = false;
  try {
    await replaceFile(publicPath, nextPublic, 0o644);
    publicReplaced = true;
    if (nextPrivate) {
      await requireUnchanged(
        privatePath,
        current.privateBytes,
        "wechat_app_id_private_config_changed",
      );
      await replaceFile(privatePath, nextPrivate, 0o600);
      privateReplaced = true;
    }
  } catch (error) {
    const privateRestored = !privateReplaced ||
      await restoreOwned(privatePath, nextPrivate, current.privateBytes, 0o600);
    const publicRestored = !publicReplaced ||
      await restoreOwned(publicPath, nextPublic, current.publicBytes, 0o644);
    if (!privateRestored || !publicRestored)
      fail("wechat_app_id_rollback_ownership_lost");
    throw error;
  }
  const verified = await inspectWechatAppId({
    root,
    publicPath,
    privatePath,
    trackedAppIdFiles,
  });
  if (verified.appId !== toAppId) fail("wechat_app_id_apply_verification_failed");
  return Object.freeze(summary);
}

function trackedAppIdFiles() {
  const result = spawnSync(
    "git",
    ["grep", "-l", "-E", "wx[0-9a-f]{16}", "--"],
    { cwd: repositoryRoot, encoding: "utf8", windowsHide: true },
  );
  if (![0, 1].includes(result.status ?? -1))
    fail("wechat_app_id_tracked_scan_failed");
  return result.stdout
    .split(/\r?\n/u)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseOptions(argv) {
  const options = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === "--apply") {
      if (options.has(key)) fail("wechat_app_id_duplicate_argument");
      options.set(key, true);
      continue;
    }
    if (!["--from-app-id", "--to-app-id"].includes(key))
      fail("wechat_app_id_unknown_argument");
    if (options.has(key)) fail("wechat_app_id_duplicate_argument");
    const value = argv[index + 1];
    if (!value || value.startsWith("--"))
      fail("wechat_app_id_argument_value_required");
    options.set(key, value);
    index += 1;
  }
  return options;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const command = process.argv[2];
  const options = parseOptions(process.argv.slice(3));
  if (command === "check" && options.size > 0)
    fail("wechat_app_id_check_arguments_forbidden");
  const tracked = trackedAppIdFiles();
  const result = command === "check"
    ? await inspectWechatAppId({ trackedAppIdFiles: tracked }).then((value) => ({
        status: "valid",
        appIdSha256: sha256(value.appId),
        trackedPath: value.trackedPath,
        localPrivateConfig: value.privateBytes ? "matched" : "absent",
      }))
    : command === "migrate"
      ? await migrateWechatAppId({
          fromAppId: options.get("--from-app-id"),
          toAppId: options.get("--to-app-id"),
          apply: options.get("--apply") === true,
          trackedAppIdFiles: tracked,
        })
      : fail("wechat_app_id_command_invalid");
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
