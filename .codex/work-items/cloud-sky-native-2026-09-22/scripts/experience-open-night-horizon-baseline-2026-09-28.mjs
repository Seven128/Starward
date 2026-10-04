// Open the existing pre-glow source baseline on its own official SDK port.
import path from "node:path";
import { resolveOfficialCli, runOfficialProcess } from "../../../../tools/miniapp/device-feedback-official.mjs";
const project = path.resolve("apps/wechat-miniapp/dist/weapp-check-sky-search-0928");
const invocation = await resolveOfficialCli();
const output = await runOfficialProcess(invocation.file,
  [...(invocation.prefix ?? []),"auto","--project",project,"--auto-port","9429","--trust-project"],
  {cwd:invocation.cwd,env:invocation.env,timeout:45000});
console.log(JSON.stringify({channel:"official_devtools_cli",action:"auto",candidate:"weapp-check-sky-search-0928",
  port:9429,responseBytes:output.length,limitation:"SDK runtime marker must still be verified"}));
