// Open only this task's combined development candidate. CLI success does not
// bind an SDK connection; the rendered FLOW0928 marker fences later operations.
import path from "node:path";
import { resolveOfficialCli, runOfficialProcess } from "../../../../tools/miniapp/device-feedback-official.mjs";

const project = path.resolve("apps/wechat-miniapp/dist/weapp-check-sky-flow-recovery-0928");
const invocation = await resolveOfficialCli();
const output = await runOfficialProcess(invocation.file,
  [...(invocation.prefix ?? []), "auto", "--project", project,
    "--auto-port", "9430", "--trust-project"],
  { cwd: invocation.cwd, env: invocation.env, timeout: 45_000 });
let response;
try { response = JSON.parse(output.trim()); } catch { response = null; }
console.log(JSON.stringify({ channel: "official_devtools_cli", action: "auto",
  candidate: "weapp-check-sky-flow-recovery-0928", port: 9430,
  responseCode: response?.code ?? null, responseKeys: response ? Object.keys(response) : [],
  responseBytes: output.length }));
