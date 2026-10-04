import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {createHash} from "node:crypto";

const output=".codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-bound-source-preflight-2026-09-29.json";
await assert.rejects(fs.access(output),{code:"ENOENT"});
const current="http://127.0.0.1:8791",stage="http://127.0.0.1:8792";
const headers={"x-starward-measurement-probe":"1"};
const sha=value=>createHash("sha256").update(value).digest("hex");
async function get(base,route,extra={}){return fetch(base+route,{headers:{...headers,...extra},signal:AbortSignal.timeout(5000)});}
async function json(base,route){const response=await get(base,route);assert.equal(response.status,200);return response.json();}
async function control(route,mode){const response=await fetch(stage+route,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({mode}),signal:AbortSignal.timeout(5000)});assert.equal(response.status,200);return response.json();}
const before=await json(current,"/__sky_test/publication-status"),candidate=await json(stage,"/__sky_test/publication-status");
assert.equal(candidate.publicationHash,before.publicationHash);
assert.equal(candidate.informationModuleSha256,before.informationModuleSha256);
assert.equal(candidate.contextUpstream,8789);assert.deepEqual(candidate.sdssPublications,before.sdssPublications);
const hash=candidate.publicationHash;
const information=`/v2/celestial-objects/M%3A82?deepSkyImageVersion=source-finite-v3&deepSkyPublicationHash=${hash}&catalogVersion=bsc5p-bright-stars.v3`;
const rows=[],images=[];let previousEtag;
try {
  for(const [mode,warnings,infrared,optical]of [
    ["both-offline",["deep_sky_image_publication_unavailable","sdss_optical_publication_unavailable"],false,false],
    ["infrared-offline",["deep_sky_image_publication_unavailable"],false,true],
    ["optical-offline",["sdss_optical_publication_unavailable"],true,false],
    ["pass",[],true,true],
  ]){
    await control("/__sky_test/source-mode",mode);
    const response=await get(stage,information,previousEtag?{"if-none-match":previousEtag}:{});
    assert.equal(response.status,200);previousEtag=response.headers.get("etag");
    const body=await response.json();
    assert.equal(body.data.reference,"M:82");assert.equal(body.dataState,mode==="pass"?"FRESH":"PARTIAL");
    assert.deepEqual(body.warnings,warnings);
    const ids=body.data.sources.map(source=>source.id);
    assert.equal(ids.some(id=>id.startsWith("imagery:")),infrared);
    assert.equal(ids.some(id=>id.startsWith("optical-imagery:")),optical);
    assert.equal(body.data.sources.length,1+Number(infrared)+Number(optical));
    assert(body.data.sources.some(source=>source.provider.startsWith("OpenNGC")));
    if(infrared)assert(ids.some(id=>id.endsWith(":"+hash)));
    rows.push({mode,status:response.status,dataState:body.dataState,warnings,sourceIds:ids,factsSha256:sha(JSON.stringify(body.data.facts))});
    if(mode==="infrared-offline"){
      const repeated=await get(stage,information,{"if-none-match":previousEtag});assert.equal(repeated.status,304);
      rows.push({mode,status:304,scope:"Unchanged PARTIAL revalidated, not recovered"});
    }
    if(mode==="pass"){
      const original=await json(current,information);
      assert.deepEqual(body.data,original.data);assert.deepEqual(body.warnings,original.warnings);
      rows.at(-1).identicalToOriginalPublicData=true;
    }
  }
  const facts=rows.filter(row=>row.factsSha256).map(row=>row.factsSha256);assert.equal(new Set(facts).size,1);
  await control("/__sky_test/resource-mode","reject-details");
  const detail=`/v2/celestial-objects/M%3A42/image?level=DETAIL&imageVersion=source-finite-v3&publicationHash=${hash}`;
  const failed=await get(stage,detail);assert.equal(failed.status,503);assert.equal((await failed.json()).code,"PROVIDER_UNAVAILABLE");
  await control("/__sky_test/resource-mode","pass");
  for(const level of ["OVERVIEW","MEDIUM","DETAIL"]){
    const route=`/v2/celestial-objects/M%3A42/image?level=${level}&imageVersion=source-finite-v3&publicationHash=${hash}`;
    const [a,b]=await Promise.all([get(current,route),get(stage,route)]);
    assert.equal(a.status,200);assert.equal(b.status,200);
    const [aa,bb]=await Promise.all([a.arrayBuffer(),b.arrayBuffer()]);assert.deepEqual(Buffer.from(aa),Buffer.from(bb));
    for(const header of ["content-type","content-length","cache-control","x-starward-image-publication-hash","x-starward-image-field-degrees","x-starward-image-source-id"])
      assert.equal(a.headers.get(header),b.headers.get(header),header);
    images.push({level,bytes:bb.byteLength,sha256:sha(Buffer.from(bb)),contentType:b.headers.get("content-type")});
  }
  const sourceStatus=await json(stage,"/__sky_test/source-status"),traffic=await json(stage,"/__sky_test/traffic-status");
  assert.equal(sourceStatus.mode,"pass");assert(sourceStatus.reads.infraredFailed>0);assert(sourceStatus.reads.opticalFailed>0);
  assert.equal(traffic.resourceMode,"pass");assert.equal(traffic.heldResourceCount,0);assert.equal(traffic.active.length,0);
  assert.equal(traffic.records.filter(row=>row.controlledFault==="image-detail-reject-before-upstream").length,1);
  const result={scope:"Task-only staging8792, real compiled information controllers/provider exceptions and real image503/restore. Desktop HTTP checks, not native/phone/whole-scene acceptance. No source assets or existing Context changed.",
    original:before,staging:candidate,rows,images,sourceStatus,epochStartedAt:traffic.epochStartedAt,
    controlledImageFailure:traffic.records.find(row=>row.controlledFault==="image-detail-reject-before-upstream"),
    harnessSources:await Promise.all(["experience-w3-proxy-backend-2026-09-29.mts","experience-context-http-fault-2026-09-28.mjs"].map(async name=>({name,sha256:sha(await fs.readFile(".codex/work-items/cloud-sky-native-2026-09-22/scripts/"+name))}))),
    settled:{sourceMode:sourceStatus.mode,resourceMode:traffic.resourceMode,held:traffic.heldResourceCount,active:traffic.active.length}};
  await fs.writeFile(output,JSON.stringify(result,null,2)+"\n",{flag:"wx"});
  console.log(JSON.stringify({output,sourcePhases:rows,images,sourceStatus,scope:result.scope}));
} finally {
  await control("/__sky_test/source-mode","pass");
  await control("/__sky_test/resource-mode","pass");
}
