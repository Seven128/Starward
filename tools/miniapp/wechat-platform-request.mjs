import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const defaultRepositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
export const defaultBundleRoot = path.join(
  defaultRepositoryRoot,
  "apps",
  "wechat-miniapp",
  "dist",
  "weapp",
);
export const defaultReleaseRoot = path.join(
  defaultRepositoryRoot,
  "artifacts",
  "miniapp",
  "release",
);
export const defaultPlatformRoot = path.join(
  defaultRepositoryRoot,
  "artifacts",
  "miniapp",
  "platform",
);

const APP_ID_PATTERN = /^wx[a-f0-9]{16}$/u;

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function fail(code, field) {
  throw new Error(field ? `${code}:${field}` : code);
}

function within(root, selected, code) {
  const resolved = path.resolve(selected);
  const relative = path.relative(path.resolve(root), resolved);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) fail(code);
  return resolved;
}

function safeVersion(selected) {
  if (!/^[0-9A-Za-z][0-9A-Za-z._-]{0,63}$/u.test(selected ?? ""))
    fail("wechat_platform_version_invalid");
  return selected;
}

function safeDescription(selected) {
  const value = selected?.trim();
  if (!value || value.length > 128 || /[\0\r\n]/u.test(value))
    fail("wechat_platform_description_invalid");
  return value;
}

export function validatePlatformRequest(raw, roots = {}) {
  const repositoryRoot = path.resolve(roots.repositoryRoot ?? defaultRepositoryRoot);
  const bundleRoot = path.resolve(roots.bundleRoot ?? defaultBundleRoot);
  const releaseRoot = path.resolve(roots.releaseRoot ?? defaultReleaseRoot);
  const platformRoot = path.resolve(roots.platformRoot ?? defaultPlatformRoot);
  const operation = raw["--operation"];
  if (operation !== "preview" && operation !== "upload") fail("wechat_platform_operation_invalid");
  const lane = raw["--lane"];
  if (lane !== "staging" && lane !== "production") fail("wechat_platform_lane_invalid");
  const appId = raw["--app-id"];
  if (!APP_ID_PATTERN.test(appId ?? "")) fail("wechat_platform_app_id_invalid");
  const privateKeyPath = path.resolve(raw["--private-key-path"] ?? "");
  if (!raw["--private-key-path"] || !path.isAbsolute(raw["--private-key-path"]))
    fail("wechat_platform_private_key_path_not_absolute");
  const keyRelative = path.relative(repositoryRoot, privateKeyPath);
  if (!keyRelative.startsWith("..") && !path.isAbsolute(keyRelative))
    fail("wechat_platform_private_key_inside_repository");
  const manifestPath = within(
    releaseRoot,
    path.resolve(raw["--manifest"] ?? ""),
    "wechat_platform_manifest_outside_release_root",
  );
  if (path.extname(manifestPath) !== ".json") fail("wechat_platform_manifest_extension_invalid");
  const version = safeVersion(raw["--version"]);
  const description = safeDescription(raw["--description"]);
  const robot = Number(raw["--robot"]);
  if (!Number.isSafeInteger(robot) || robot < 1 || robot > 30) fail("wechat_platform_robot_invalid");
  const receiptDirectory = path.join(platformRoot, lane);
  const receiptPath = path.join(receiptDirectory, `${operation}-${version}.receipt.json`);
  const qrcodeOutputPath = operation === "preview"
    ? path.join(receiptDirectory, `${operation}-${version}.qrcode.jpg`)
    : null;
  return Object.freeze({
    operation,
    lane,
    appId,
    appIdSha256: sha256(Buffer.from(appId)),
    privateKeyPath,
    manifestPath,
    version,
    description,
    robot,
    confirmation: raw["--confirm"] ?? null,
    repositoryRoot,
    bundleRoot,
    releaseRoot,
    platformRoot,
    receiptDirectory,
    receiptPath,
    qrcodeOutputPath,
  });
}
