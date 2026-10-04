// Open only this task's built local inspection candidate through the official CLI.
// Do not print CLI output: it can contain account or project details.
import path from "node:path";
import { resolveOfficialCli, runOfficialProcess } from "../../../../tools/miniapp/device-feedback-official.mjs";

const project = path.resolve("apps/wechat-miniapp/dist/weapp-check-sky-horizon-0928");
const invocation = await resolveOfficialCli();
const output = await runOfficialProcess(invocation.file,
  [...(invocation.prefix ?? []), "auto", "--project", project,
    "--auto-port", "9420", "--trust-project"],
  { cwd: invocation.cwd, env: invocation.env, timeout: 45_000 });
console.log(JSON.stringify({ channel: "official_devtools_cli", action: "auto",
  candidate: "weapp-check-sky-horizon-0928", completed: true,
  responseBytes: output.length }));
