import assert from "node:assert/strict";
import path from "node:path";
import { resolveOfficialCli, runOfficialProcess } from "../../../../tools/miniapp/device-feedback-official.mjs";
const project = path.resolve("apps/wechat-miniapp/dist/weapp-check-sky-combined-clean-v12-0928");
const invocation = await resolveOfficialCli("E:/微信web开发者工具/cli.bat");
const options = { cwd: invocation.cwd, env: invocation.env, timeout: 45_000 };
const closed = await runOfficialProcess(invocation.file, [...invocation.prefix, "close", "--project", project], options);
console.log(JSON.stringify({ officialProjectClosed: true, outputBytes: closed.length }));
const bytes = await runOfficialProcess(invocation.file, [...invocation.prefix, "auto", "--project", project,
  "--auto-port", "9446", "--trust-project"], options);
const result = JSON.parse(bytes.toString().trim());
assert.ok([9445, 9446].includes(result.autoPort));
console.log(JSON.stringify({ sameProjectReopened: true, autoPort: result.autoPort }));
