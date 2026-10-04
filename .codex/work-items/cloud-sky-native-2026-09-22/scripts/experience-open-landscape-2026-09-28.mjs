// CLI opens only the current local combined candidate. SDK operations must
// separately fence the visible LAND0928 generation before/after observation.
import path from "node:path";
import { resolveOfficialCli, runOfficialProcess } from "../../../../tools/miniapp/device-feedback-official.mjs";
const marker=process.argv[2]??"IMGSEP28";
const candidates={LAND0928:{slot:"sky-landscape-0928",port:9431},LAND2SEP28:{slot:"sky-landscape-final-0928",port:9432},IMGSEP28:{slot:"sky-imagery-flow-0928",port:9433}};
const candidate=candidates[marker];if(!candidate)throw Error("unexpected_task_candidate");
const project = path.resolve(`apps/wechat-miniapp/dist/weapp-check-${candidate.slot}`);
const invocation = await resolveOfficialCli();
const output = await runOfficialProcess(invocation.file,
  [...(invocation.prefix ?? []),"auto","--project",project,"--auto-port",String(candidate.port),"--trust-project"],
  { cwd:invocation.cwd,env:invocation.env,timeout:45_000 });
let response;try { response=JSON.parse(output.trim()); } catch { response=null; }
console.log(JSON.stringify({channel:"official_devtools_cli",action:"auto",
  candidate:`weapp-check-${candidate.slot}`,marker,port:candidate.port,responseCode:response?.code??null,
  responseKeys:response?Object.keys(response):[],responseBytes:output.length}));
