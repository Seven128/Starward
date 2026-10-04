import assert from "node:assert/strict";
import path from "node:path";
import { resolveOfficialCli, runOfficialProcess } from "../../../../tools/miniapp/device-feedback-official.mjs";

const project = path.resolve("apps/wechat-miniapp/dist/weapp-check-sky-combined-clean-v12-0928");
const port = Number(process.argv[2] ?? 9445);
assert([9445, 9446].includes(port));
const invocation = await resolveOfficialCli("E:/微信web开发者工具/cli.bat");
const bytes = await runOfficialProcess(invocation.file, [...invocation.prefix, "auto", "--project", project,
  "--auto-port", String(port), "--trust-project"], { cwd: invocation.cwd, env: invocation.env, timeout: 45_000 });
const result = JSON.parse(bytes.toString().trim());
assert.ok(result.code === undefined || result.code === 0);
assert.ok([9445, 9446].includes(result.autoPort));
console.log(JSON.stringify({ officialCliAuto: true, requestedPort: port, actualPort: result.autoPort, outputBytes: bytes.length }));
