import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import {fingerprintBundle} from "../../../../tools/miniapp/release-bundle-artifact.mjs";
import {resolveOfficialCli,runOfficialProcess} from "../../../../tools/miniapp/device-feedback-official.mjs";
const generation=process.argv[2]??"v2";
assert.ok(["v2","v3","v4","v5"].includes(generation),"known_task_candidate");
const autoPort={v2:9435,v3:9436,v4:9437,v5:9438}[generation];
const root=path.resolve("."),bundle=`apps/wechat-miniapp/dist/weapp-check-sky-combined-clean-${generation}-0928`;
const project=path.join(root,bundle),evidence=path.join(root,".codex/work-items/cloud-sky-native-2026-09-22/evidence");
const output=path.join(evidence,`experience-combined-clean-${generation}-candidate-2026-09-28.json`);
assert.ok(!await fs.access(output).then(()=>true,()=>false),"preserve_historical_candidate");
const previous=JSON.parse(await fs.readFile(path.join(root,"apps/wechat-miniapp/dist/weapp-check-sky-combined-clean-0928/project.config.json"),"utf8"));
const configuration=JSON.parse(await fs.readFile(path.join(project,"project.config.json"),"utf8"));
configuration.appid=previous.appid;configuration.projectname=`Starward-Sky-Combined-Clean-${generation.toUpperCase()}-0928`;
configuration.miniprogramRoot="./";configuration.libVersion=previous.libVersion;
configuration.setting={...configuration.setting,urlCheck:false};
await fs.writeFile(path.join(project,"project.config.json"),JSON.stringify(configuration,null,2)+"\n");
const fingerprint=await fingerprintBundle(project),diagnostics={};
for(const needle of ["IMGSEP28","LAND2SEP28","P1BATCH28","__starwardAcceptance","starward.acceptance.request-diagnostics.v1","vConsole","vconsole"]){
 let absent=true;for(const file of fingerprint.files.filter(file=>file.path.endsWith(".js")))
  if((await fs.readFile(path.join(project,file.path),"utf8")).includes(needle))absent=false;
 assert.ok(absent,"diagnostic_present:"+needle);diagnostics[needle]="absent";
}
const source=await fs.readFile(path.join(project,"sky/detail/index.js"),"utf8");
const sourcePage=await fs.readFile(path.join(project,"sky/sources/index.js"),"utf8");
const readableSourcePage=sourcePage.replace(/\\u([0-9a-f]{4})/gi,(_match,hex)=>String.fromCharCode(parseInt(hex,16)));
assert.ok(source.includes("u_infraredCutout")&&source.includes("coverage-v2"),"current_renderer_or_moon_missing");
if(generation!=="v2")assert.ok(source.includes("intersectCanopy"),"current_landscape_missing");
assert.ok(readableSourcePage.includes("淡出不表示没有天体或缺测")&&sourcePage.includes('startsWith("imagery:")'),"current_display_explanation_missing");
let apiOriginPresent=false;
for(const file of fingerprint.files.filter(file=>file.path.endsWith(".js"))){
 const text=await fs.readFile(path.join(project,file.path),"utf8");
 assert.ok(!text.includes("http://127.0.0.1:8787")&&!text.includes("http://127.0.0.1:8788"),"stale_api_origin");
 apiOriginPresent ||= text.includes("http://127.0.0.1:8789");
}
assert.ok(apiOriginPresent);
const packages={main:0,content:0,spot:0,sky:0};
for(const file of fingerprint.files){const first=file.path.split("/")[0];packages[first in packages?first:"main"]+=file.bytes;}
const record={scope:"Immutable combined local development candidate; raw bytes are not official WeChat package accounting or phone acceptance",
 bundle,apiOrigin:"http://127.0.0.1:8789",diagnostics,appDebug:configuration.debug??false,
 fingerprint,rawPackageBytes:packages,sourceMaps:fingerprint.files.filter(file=>file.path.endsWith(".map")).length};
await fs.writeFile(output,JSON.stringify(record,null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify({bundle,sha256:fingerprint.sha256,files:fingerprint.fileCount,totalBytes:fingerprint.totalBytes,rawPackageBytes:packages,diagnostics}));
const invocation=await resolveOfficialCli();
const responseBytes=await runOfficialProcess(invocation.file,[...(invocation.prefix??[]),"auto","--project",project,"--auto-port",String(autoPort),"--trust-project"],
 {cwd:invocation.cwd,env:invocation.env,timeout:45_000});
let response;try{response=JSON.parse(responseBytes.toString().trim());}catch{response=null;}
console.log(JSON.stringify({channel:"official_devtools_cli",candidate:bundle,requestedPort:autoPort,code:response?.code??null,
 actualAutoPort:response?.autoPort??null,responseKeys:response?Object.keys(response):[],responseBytes:responseBytes.length}));
