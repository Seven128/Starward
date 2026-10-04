// Hold only a newly created test Context in memory across the owned proxy
// replacement. No IDs, account fields or request records are persisted.
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { SDSS_OPTICAL_PUBLICATIONS, assertSdssOpticalManifest } from "@starward/miniapp-contracts";
const output=".codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-sdss-running-adoption-2026-09-29.json";
await assert.rejects(fs.access(output),{code:"ENOENT"});
const origin="http://127.0.0.1:8791";
async function json(relative:string,body?:unknown):Promise<any>{
  const response=await fetch(origin+relative,{signal:AbortSignal.timeout(5000),
    ...(body===undefined?{}:{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)})});
  assert([200,201].includes(response.status));return response.json();
}
const beforePublication=await json("/__sky_test/publication-status");
assert(!beforePublication.sdssPublications,"only one known old proxy is being replaced");
const beforeTraffic=await json("/__sky_test/traffic-status");
assert.equal(beforeTraffic.heldResourceCount,0);assert.equal(beforeTraffic.active.length,0);
assert.equal(beforeTraffic.resourceMode,"pass");assert.equal((await json("/__sky_test/context-status")).mode,"pass");
const search=await json("/v2/places/search?q="+encodeURIComponent("示例观星点"));
const spot=search.data.formalSpots.find((row:any)=>row.name==="示例观星点");assert(spot?.spotId);
const context=(await json("/v2/observation-contexts/resolve",{location:{kind:"FORMAL_SPOT",spotId:spot.spotId},
  localDate:"2026-09-29",selectedAt:"2026-09-29T20:00:00.000Z"})).data;
const path=`/v2/observation-contexts/${encodeURIComponent(context.contextId)}`;
const before=(await json(path)).data;
console.log(JSON.stringify({readyForReplacement:true,scope:"new independent test Context in memory; no native Context read",revision:before.contextRevision,selectedAtUtc:before.selectedAtUtc}));
const deadline=Date.now()+60_000;let publication:any,unavailableChecks=0;
while(Date.now()<deadline){
  try { const value=await json("/__sky_test/publication-status");if(value.sdssPublications?.length===6){publication=value;break;} }
  catch { unavailableChecks++; }
  await delay(1000);
}
assert(publication,"owned proxy replacement must expose current publications within the bounded wait");
const after=(await json(path)).data;assert.deepEqual(after,before,"original Context upstream must remain unchanged");
const rows=[];
for(const [reference,offer] of Object.entries(SDSS_OPTICAL_PUBLICATIONS)){
  const manifest=await json(`/v2/sky/sdss-optical/${offer.publicationHash}/manifest`);
  assertSdssOpticalManifest(manifest,reference);
  const discovered=await json(`/v2/sky/sdss-optical/manifest${reference==="M:51"?"":`?reference=${encodeURIComponent(reference)}`}`);
  assert.deepEqual(discovered,manifest);
  const information=await json(`/v2/celestial-objects/${encodeURIComponent(reference)}?deepSkyImageVersion=source-finite-v3`);
  assert(information.data.sources.some((source:any)=>source.id===`optical-imagery:${offer.publicationId}:${offer.publicationHash}`));
  assert(information.data.sources.some((source:any)=>source.id.startsWith("imagery:")));
  for(const [level,asset] of Object.entries(manifest.levels) as [string,any][]){
    const response=await fetch(origin+asset.downloadUrl,{signal:AbortSignal.timeout(5000)});assert.equal(response.status,200);
    const bytes=Buffer.from(await response.arrayBuffer());assert.equal(bytes.length,asset.bytes);
    const hash=createHash("sha256").update(bytes).digest("hex");assert.equal(hash,asset.sha256);
    assert.equal(response.headers.get("content-type")?.split(";")[0],"image/jpeg");
    assert.equal(Number(response.headers.get("x-starward-image-field-degrees")),asset.fieldDegrees);
    rows.push({reference,level,bytes:bytes.length,sha256:hash,publicationHash:manifest.publicationHash});
  }
}
await delay(25);
const traffic=await json("/__sky_test/traffic-status"),status=await json("/__sky_test/context-status");
assert.equal(traffic.heldResourceCount,0);assert.equal(traffic.active.length,0);
assert.equal(status.mode,"pass");assert.equal(traffic.resourceMode,"pass");assert.equal(status.puts,0);
const result={scope:"Running task proxy and compiled publication reads only. Existing 8789 Context owner preserved; no native session, phone, cloud or full quality acceptance",
  contextDataEqual:true,contextRevision:before.contextRevision,selectedAtUtc:before.selectedAtUtc,
  contextUpstream:publication.contextUpstream,publicationBackendPort:publication.publicationBackendPort,
  epochStartedAt:traffic.epochStartedAt,unavailableChecks,rows,
  resourceMode:traffic.resourceMode,contextMode:status.mode,held:traffic.heldResourceCount,active:traffic.active.length,contextPuts:status.puts};
await fs.writeFile(output,JSON.stringify(result,null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify({contextDataEqual:true,images:rows.length,held:result.held,active:result.active,publicationBackendPort:result.publicationBackendPort}));
