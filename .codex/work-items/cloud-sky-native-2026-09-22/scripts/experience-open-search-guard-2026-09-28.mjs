// Open only this task's isolated local DevTools candidate through the official CLI.
// CLI output may contain account details, so emit only a bounded summary.
import path from "node:path";
import { resolveOfficialCli, runOfficialProcess } from "../../../../tools/miniapp/device-feedback-official.mjs";

const project = path.resolve("apps/wechat-miniapp/dist/weapp-check-sky-search-0928");
const invocation = await resolveOfficialCli();
const output = await runOfficialProcess(invocation.file,
  [...(invocation.prefix ?? []), "auto", "--project", project,
    "--auto-port", "9420", "--trust-project"],
  { cwd: invocation.cwd, env: invocation.env, timeout: 45_000 });
console.log(JSON.stringify({ channel: "official_devtools_cli", action: "auto",
  candidate: "weapp-check-sky-search-0928", completed: true,
  responseBytes: output.length }));
