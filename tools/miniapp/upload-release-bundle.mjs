import path from "node:path";
import { pathToFileURL } from "node:url";
import { executeWechatPlatformOperation } from "./wechat-platform-operation.mjs";
import {
  defaultRepositoryRoot,
  fail,
  validatePlatformRequest,
} from "./wechat-platform-request.mjs";

export { executeWechatPlatformOperation, validatePlatformRequest };

function parseArguments(argv) {
  const supported = new Set([
    "--operation",
    "--lane",
    "--manifest",
    "--app-id",
    "--private-key-path",
    "--version",
    "--description",
    "--robot",
    "--confirm",
  ]);
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!supported.has(key)) fail("wechat_platform_unknown_argument", key);
    if (values.has(key)) fail("wechat_platform_duplicate_argument", key);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) fail("wechat_platform_argument_value_required", key);
    values.set(key, value);
    index += 1;
  }
  return Object.fromEntries(values);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  try {
    const request = validatePlatformRequest(parseArguments(process.argv.slice(2)));
    const { createOfficialWechatDriver } = await import("../miniapp-uploader/official-driver.mjs");
    const driver = await createOfficialWechatDriver();
    const result = await executeWechatPlatformOperation({ request, driver });
    process.stdout.write(`${JSON.stringify({
      status: result.receipt.status,
      operation: result.receipt.operation,
      lane: result.receipt.lane,
      version: result.receipt.version,
      bundleSha256: result.receipt.bundleSha256,
      receiptPath: path.relative(defaultRepositoryRoot, result.receiptPath).replaceAll("\\", "/"),
    })}\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const code = /^wechat_[a-z0-9_-]+(?::[A-Za-z0-9_.-]+)?$/u.test(message)
      ? message
      : "wechat_platform_unexpected_failure";
    process.stderr.write(`${JSON.stringify({ status: "failed", code })}\n`);
    process.exitCode = 1;
  }
}
