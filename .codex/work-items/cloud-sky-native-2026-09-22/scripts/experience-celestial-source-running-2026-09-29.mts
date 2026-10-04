// Keep one independent example Context in RAM across the owned 8791 replacement.
// Existing native/private Context is not read, transferred, changed or logged.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { SDSS_OPTICAL_PUBLICATIONS } from "@starward/miniapp-contracts";
const output=".codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-celestial-source-running-2026-09-29.json";
await assert.rejects(fs.access(output),{code:"ENOENT"});
const expectedModuleSha256=createHash("sha256").update(await fs.readFile("workers/miniapp-api/dist/celestial-object-information.js")).digest("hex");
const origin="http://127.0.0.1:8791";
async function json(path:string,body?:unknown):Promise<any>{
 const response=await fetch(origin+path,{signal:AbortSignal.timeout(4500),
  ...(body===undefined?{}:{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)})});
 assert([200,201].includes(response.status));return response.json();
}
const beforePublication=await json("/__sky_test/publication-status");
assert.notEqual(beforePublication.informationModuleSha256,expectedModuleSha256);
const traffic=await json("/__sky_test/traffic-status"),contextStatus=await json("/__sky_test/context-status");
assert.equal(traffic.resourceMode,"pass");assert.equal(traffic.heldResourceCount,0);assert.equal(traffic.active.length,0);assert.equal(contextStatus.mode,"pass");
const search=await json("/v2/places/search?q="+encodeURIComponent("示例观星点"));
const spot=search.data.formalSpots.find((row:any)=>row.name==="示例观星点");assert(spot?.spotId);
const context=(await json("/v2/observation-contexts/resolve",{location:{kind:"FORMAL_SPOT",spotId:spot.spotId},
 localDate:"2026-09-29",selectedAt:"2026-09-29T21:00:00.000Z"})).data;
const path=`/v2/observation-contexts/${encodeURIComponent(context.contextId)}`,before=(await json(path)).data;
assert(Number.isInteger(before.revision),"actual revision field must be read, not an invented contextRevision");
console.log(JSON.stringify({readyForReplacement:true,scope:"independent test Context held only in memory",revision:before.revision,selectedAtUtc:before.selectedAtUtc}));
let publication:any,unavailableChecks=0;
const deadline=Date.now()+60_000;
while(Date.now()<deadline){
 try {const value=await json("/__sky_test/publication-status");if(value.informationModuleSha256===expectedModuleSha256){publication=value;break;}}
 catch {unavailableChecks++;}
 await delay(1000);
}
assert(publication,"fresh compiled source-recovery owner must be started within this bounded observation");
assert.deepEqual((await json(path)).data,before);
const rows=[];
for(const [reference,offer] of Object.entries(SDSS_OPTICAL_PUBLICATIONS)){
 const response=await json(`/v2/celestial-objects/${encodeURIComponent(reference)}?deepSkyImageVersion=source-finite-v3&deepSkyPublicationHash=${publication.publicationHash}`);
 assert.equal(response.dataState,"FRESH");assert.deepEqual(response.warnings,[]);
 assert(response.data.sources.some((source:any)=>source.id===`optical-imagery:${offer.publicationId}:${offer.publicationHash}`));
 assert(response.data.sources.some((source:any)=>source.id.endsWith(`:${publication.publicationHash}`)));
 rows.push({reference,publicationHash:offer.publicationHash,informationEtag:response.etag,sourceCount:response.data.sources.length});
}
const finalTraffic=await json("/__sky_test/traffic-status"),finalContext=await json("/__sky_test/context-status");
assert.equal(finalTraffic.heldResourceCount,0);assert.equal(finalTraffic.active.length,0);
assert.equal(finalTraffic.resourceMode,"pass");assert.equal(finalContext.mode,"pass");assert.equal(finalContext.puts,0);
const result={scope:"compiled current source owner and public provenance reads; original 8789 Context retained, no native/device acceptance",
 contextDataEqual:true,revision:before.revision,selectedAtUtc:before.selectedAtUtc,contextUpstream:publication.contextUpstream,
 publicationBackendPort:publication.publicationBackendPort,informationModuleSha256:expectedModuleSha256,
 epochStartedAt:finalTraffic.epochStartedAt,unavailableChecks,rows,publicationHash:publication.publicationHash,
 resourceMode:finalTraffic.resourceMode,contextMode:finalContext.mode,held:finalTraffic.heldResourceCount,active:finalTraffic.active.length,contextPuts:finalContext.puts};
await fs.writeFile(output,JSON.stringify(result,null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify({contextDataEqual:true,revision:result.revision,publications:rows.length,held:0,active:0,internalPort:result.publicationBackendPort}));
