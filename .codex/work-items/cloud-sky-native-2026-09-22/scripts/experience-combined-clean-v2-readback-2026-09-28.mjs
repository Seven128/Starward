// Read only: exact candidate page context plus actual current local services.
// Private route/context identifiers are neither printed nor saved.
import sdk from "miniprogram-automator";
import assert from "node:assert/strict";
import path from "node:path";
import {readFile,writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {boundedWechatConnect,boundWechatProtocol} from "../../../../tools/miniapp/wechat-protocol.mjs";
const root=path.resolve("."),evidence=path.join(root,".codex/work-items/cloud-sky-native-2026-09-22/evidence");
const generation=process.argv[2]??"v2";assert.ok(["v2","v3","v4","v5"].includes(generation));
const autoPort={v2:9435,v3:9436,v4:9437,v5:9438}[generation];
const candidate=JSON.parse(await readFile(path.join(evidence,`experience-combined-clean-${generation}-candidate-2026-09-28.json`),"utf8"));
for(const file of candidate.fingerprint.files)
 assert.equal(createHash("sha256").update(await readFile(path.join(root,candidate.bundle,file.path))).digest("hex"),file.sha256,"candidate_changed");
const program=await boundedWechatConnect(()=>sdk.launcher.connectTool({wsEndpoint:`ws://127.0.0.1:${autoPort}`}),5000);
boundWechatProtocol(program,5000);
try{
 const page=await program.currentPage();assert.equal(page?.path,"sky/detail/index");
 assert.ok(page.query.contextId,"context_route_missing");
 const json=async(relative)=>{const response=await fetch(candidate.apiOrigin+relative,{signal:AbortSignal.timeout(8000)});
  assert.equal(response.status,200,"local_service_not_current");return response.json();};
 const context=(await json("/v2/observation-contexts/"+encodeURIComponent(page.query.contextId))).data;
 assert.equal(context.selectedAtUtc,generation==="v2"?"2026-09-28T16:30:00.000Z":"2026-09-28T16:00:00.000Z");
 const w3Info=await json("/v2/celestial-objects/M%3A31?locale=zh-CN&catalogVersion=bsc5p-bright-stars.v3");
 const source=w3Info.data.sources.find(value=>value.id.startsWith("imagery:"));assert.ok(source);
 const hash=source.id.split(":").at(-1),w3=await json("/v2/sky/deep-sky/"+hash+"/manifest");
 assert.equal(w3.schemaVersion,"allwise-w3-deep-sky-publication-v2");
 assert.ok(w3.entries.every(entry=>Object.values(entry.levels).every(asset=>asset.validFraction===null&&asset.coverageState==="NOT_MEASURED")));
 const moon=await json("/v2/sky/moon/coverage/manifest"),moonInfo=await json("/v2/celestial-objects/SOLAR%3AMOON?locale=zh-CN&catalogVersion=bsc5p-bright-stars.v3&moonTextureVersion=coverage-v2");
 assert.equal(moon.schemaVersion,"starward-clementine-moon-coverage-v2");
 assert.ok(moonInfo.data.sources.some(source=>source.id==="usgs-clementine-uv750-v21-coverage"));
 const record={scope:"Actual LOCAL/MEMORY_TEST/LOCAL_TEST fixture service and immutable clean candidate readback; no production persistence, cloud or phone acceptance",
  candidateHash:candidate.fingerprint.sha256,candidateFilesUnchanged:true,apiOrigin:candidate.apiOrigin,
  context:{selectedAtUtc:context.selectedAtUtc,timezone:context.timezone,localDate:context.localDate},
  w3:{schemaVersion:w3.schemaVersion,publicationHash:hash,entries:w3.entries.length,sourceCoverageNotMeasured:true},
  moon:{schemaVersion:moon.schemaVersion,publicationHash:moon.publicationHash,imageSha256:moon.image.sha256,imageBytes:moon.image.bytes,sourceVariant:"coverage-v2"}};
 await writeFile(path.join(evidence,`experience-combined-clean-${generation}-service-readback-2026-09-28.json`),JSON.stringify(record,null,2)+"\n",{flag:"wx"});
 console.log(JSON.stringify(record));
}finally{program.disconnect();}
