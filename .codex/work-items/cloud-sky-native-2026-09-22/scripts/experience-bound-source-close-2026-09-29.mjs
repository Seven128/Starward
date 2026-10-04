import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {createHash} from "node:crypto";
import {PNG} from "pngjs";
import {fingerprintBundle} from "../../../../tools/miniapp/release-bundle-artifact.mjs";

const task=path.resolve(".codex/work-items/cloud-sky-native-2026-09-22"),evidence=path.join(task,"evidence");
const output=path.join(evidence,"experience-bound-source-validation-2026-09-29.json");
await assert.rejects(fs.access(output),{code:"ENOENT"});
const digest=(bytes,algorithm="sha256")=>createHash(algorithm).update(bytes).digest("hex");
const hash=async file=>digest(await fs.readFile(file));
const trace=path.join(evidence,"experience-bound-source-native-2026-09-29.jsonl");
const events=(await fs.readFile(trace,"utf8")).trim().split(/\r?\n/u).map(JSON.parse);
const value=(stage,predicate=item=>!(item?.path&&item?.width&&item?.height))=>{
  const event=events.findLast(event=>event.stage===stage&&predicate(event.value));assert(event,stage);return event.value;
};
const text=stage=>{const item=value(stage);const result=typeof item==="string"?item:item.text;assert.equal(typeof result,"string",stage);return result;};
const candidate=JSON.parse(await fs.readFile(path.join(evidence,"experience-combined-clean-v26-candidate-2026-09-29.json"),"utf8"));
const fingerprint=await fingerprintBundle(path.resolve(candidate.bundle));
assert.equal(fingerprint.sha256,candidate.fingerprint.sha256);
for(const input of [...candidate.sourceInputs,...candidate.testInputs,...candidate.retainedSkyTests])
  assert.equal(await hash(path.resolve(input.file)),input.sha256,input.file);
const preflight=JSON.parse(await fs.readFile(path.join(evidence,"experience-bound-source-preflight-2026-09-29.json"),"utf8"));
for(const source of preflight.harnessSources)
  assert.equal(await hash(path.join(task,"scripts",source.name)),source.sha256,source.name);

const context=value("baseline-context"),current=value("m82-final-context"),runtime=value("m82-final-runtime");
assert.equal(context.revision,2);assert.equal(context.selectedAtUtc,"2026-09-29T21:00:00Z");
for(const stage of ["post-adoption-stored-context","m82-bound-recovered-modal-context","m82-image-detail-failed-context",
  "m82-image-detail-recovered-context","m82-image-source-roundtrip-context","m82-final-context"])
  assert.deepEqual(value(stage),context,stage);
for(const stage of ["canonical-context-before-adoption","canonical-context-after-adoption","canonical-context-final"]){
  const canonical=value(stage);assert.equal(canonical.status,200);assert.equal(canonical.dataState,"FRESH");assert.equal(canonical.sameId,true);
  for(const key of ["revision","selectedAtUtc","localDate","timezone","contextFingerprint"])assert.equal(canonical[key],context[key],stage+" "+key);
}
const adoption=value("adoption-runtime"),baseline=value("baseline-runtime");
for(const key of ["publicationHash","informationModuleSha256"])assert.equal(runtime[key],baseline[key],key);
assert.equal(runtime.epochStartedAt,adoption.epochStartedAt);assert.equal(adoption.proxyPid,1144);
assert.equal(runtime.contextUpstream,8789);assert.equal(runtime.publicationBackendPort,59162);assert.equal(runtime.putsInNewEpoch,0);
for(const key of ["retiredStaging17008Absent","old54424Closed","staging8792Closed","retiredProxy19616Absent"])assert.equal(adoption[key],true,key);
assert.equal(runtime.sourceStatus.mode,"pass");assert.equal(runtime.sourceStatus.deadlineUtc,null);
assert.equal(runtime.contextMode,"pass");assert.equal(runtime.resourceMode,"pass");assert.equal(runtime.held,0);assert.equal(runtime.active,0);
assert.equal(runtime.windows.length,1);assert.equal(runtime.windows[0].Id,25916);
assert.equal(runtime.windows[0].MainWindowTitle,"Starward-Sky-Combined-Clean-V26-0929");
assert.equal(runtime.display.mode,"DAY");assert.equal(runtime.display.largeText,false);
assert.equal(runtime.display.pagePath,"sky/detail/index");assert.equal(runtime.display.pageDepth,2);
for(const port of [8791,59162])assert(runtime.ports.some(row=>row.LocalPort===port&&row.OwningProcess===1144));
for(const [port,pid]of [[8789,22124],[8787,2408],[8788,15508]])assert(runtime.ports.some(row=>row.LocalPort===port&&row.OwningProcess===pid));
for(const port of [8792,54424])assert(!runtime.ports.some(row=>row.LocalPort===port));
for(const label of Object.values(value("m82-final-layer-intentions")))assert.match(label,/^关闭/u);
assert.match(value("m82-final-frame").presentedCanvasLabel,/2\.3 度.*4208.*2026-09-29T21:00:00\.000Z.*手动视角/u);

const both=text("m82-both-source-page-content"),infraredPartial=text("m82-bound-infrared-partial-content"),opticalPartial=text("m82-bound-optical-partial-content");
assert(both.includes("OpenNGC")&&both.includes("暂不可用"));assert(!both.includes("NASA/IPAC")&&!both.includes("Sloan Digital"));
assert(infraredPartial.includes("OpenNGC")&&infraredPartial.includes("Sloan Digital")&&infraredPartial.includes("暂不可用"));
assert(!infraredPartial.includes("NASA/IPAC"));
assert(opticalPartial.includes("OpenNGC")&&opticalPartial.includes("NASA/IPAC")&&opticalPartial.includes("暂不可用"));
assert(!opticalPartial.includes("Sloan Digital"));
assert.equal(value("m82-both-source-provider-readback").reads.infraredFailed,1);
assert.equal(value("m82-both-source-provider-readback").reads.opticalFailed,1);
const unbound=value("m82-both-source-route");assert.equal(unbound.imagePublicationHash,undefined);
for(const stage of ["m82-actual-bound-source-route","m82-image-recovered-bound-source-route"]){
  const route=value(stage,item=>item?.path==="sky/sources/index");assert.equal(decodeURIComponent(route.reference),"M:82");
  assert.equal(route.imagePublicationHash,runtime.publicationHash);assert.equal(route.pageDepth,3);
}
const sourceRevalidation=value("m82-bound-still-partial-retry");
for(const key of ["catalogueRetained","opticalRetained","infraredAbsent","partialRetained"])assert.equal(sourceRevalidation[key],true,key);
const sourceTransaction=(stage,status)=>{
  const records=value(stage).records.filter(row=>row.resourceKind==="object_information"&&!row.agentProbe);
  assert.equal(records.length,1,stage);assert.equal(records[0].status,status);assert.equal(records[0].conditional,true);
  assert.equal(records[0].downstreamFinished,true);return records[0];
};
const sourceRequests=[sourceTransaction("m82-optical-restored-native-requests",200),sourceTransaction("m82-bound-still-partial-retry",304),
  sourceTransaction("m82-bound-optical-partial-native-requests",200),sourceTransaction("m82-bound-all-sources-recovery-requests",200)];
const sourceRecovered=value("m82-bound-all-sources-recovered",item=>item?.partialAbsent!==undefined);
for(const key of ["partialAbsent","opticalPresent","infraredPresent","cataloguePresent"])assert.equal(sourceRecovered[key],true,key);
const recoveredContent=text("m82-image-recovered-bound-source-content");
for(const provider of ["OpenNGC","NASA/IPAC","Sloan Digital"])assert(recoveredContent.includes(provider));
assert(!recoveredContent.includes("暂不可用"));assert.equal(sourceRecovered.textSha256,digest(recoveredContent));
for(const stage of ["m82-bound-recovered-modal-content","m82-image-recovered-modal-content"]){
  const body=text(stage);for(const provider of ["OpenNGC","NASA/IPAC","Sloan Digital"])assert(body.includes(provider));
  for(const datum of ["方位 21.9°","高度 27.5°","8.30 mag","11.0 角分","5.1 角分"])assert(body.includes(datum),stage+" "+datum);
}
const picked=value("m82-image-recovered-natural-pick");assert.equal(picked.title,"M 82");assert.equal(picked.kind,"星系 · M 82");

const publicationRoot=path.resolve("workers/miniapp-api/assets/deep-sky");
const manifest=JSON.parse(await fs.readFile(path.join(publicationRoot,"manifest.json"),"utf8"));
assert.equal(digest(JSON.stringify(manifest)),runtime.publicationHash);
const m82=manifest.entries.find(entry=>entry.objectRef==="M:82");assert(m82);
const files=stage=>{const rows=value(stage).files;assert(Array.isArray(rows));return rows;};
const levels=[];
for(const [level,stage]of [["OVERVIEW","m82-image-baseline-owned-files"],["MEDIUM","m82-image-medium-owned-files"],["DETAIL","m82-image-detail-recovered-owned-files"]]){
  const publication=m82.levels[level],bytes=await fs.readFile(path.join(publicationRoot,publication.file));
  assert.equal(bytes.length,publication.bytes);assert.equal(digest(bytes),publication.sha256);
  assert.equal(publication.validFraction,null);assert.equal(publication.coverageState,"NOT_MEASURED");
  const observed=files(stage);assert.equal(observed.length,1);assert.equal(observed[0].level,level);
  assert.equal(observed[0].bytes,bytes.length);assert.equal(observed[0].md5,digest(bytes,"md5"));
  levels.push({level,fieldDegrees:publication.fieldDegrees,bytes:bytes.length,sha256:publication.sha256,md5:observed[0].md5,coverageState:publication.coverageState});
}
for(const stage of ["m82-image-detail-failed-owned-files","m82-image-detail-restored-before-retry-files"])
  assert.deepEqual(files(stage),files("m82-image-medium-owned-files"),stage);
assert.deepEqual(files("m82-image-source-roundtrip-owned-files"),files("m82-image-detail-recovered-owned-files"));
assert(text("m82-image-detail-failed-status").includes("影像更新失败 · 重试"));
assert.equal(text("m82-image-detail-restored-still-latched-status"),text("m82-image-detail-failed-status"));
const ready=text("m82-image-detail-recovered-status");assert(ready.includes("NASA/IPAC"));assert(!ready.includes("失败"));
assert.equal(value("m82-image-detail-restored-before-retry-requests").records.length,0);
const imageFailure=value("m82-image-detail-failed-native-requests").records.filter(row=>row.resourceKind==="object_image");
assert.equal(imageFailure.length,1);assert.equal(imageFailure[0].status,503);assert.equal(imageFailure[0].agentProbe,false);
assert.equal(imageFailure[0].controlledFault,"image-detail-reject-before-upstream");assert.equal(imageFailure[0].upstreamBodyBytes,0);
const recoveryRecords=value("m82-image-detail-recovered-native-requests").records;
const imageRecovery=recoveryRecords.filter(row=>row.resourceKind==="object_image");assert.equal(imageRecovery.length,1);
assert.equal(imageRecovery[0].status,200);assert.equal(imageRecovery[0].agentProbe,false);assert.equal(imageRecovery[0].downstreamFinished,true);
assert.equal(imageRecovery[0].upstreamBodyBytes,levels[2].bytes);assert.equal(imageRecovery[0].imageFieldDegrees,levels[2].fieldDegrees);
for(const stage of ["m82-image-detail-failed-frame","m82-image-detail-recovered-frame","m82-image-source-roundtrip-frame"])
  assert.equal(value(stage).presentedCanvasLabel,value("m82-final-frame").presentedCanvasLabel);

const captures=[];
for(const event of events){const observed=event.value;if(!observed?.path||!observed.width||!observed.height||!observed.sha256)continue;
  assert.equal(path.resolve(observed.project),path.resolve(candidate.bundle));
  const bytes=await fs.readFile(observed.path);assert.equal(digest(bytes),observed.sha256);
  const png=PNG.sync.read(bytes);assert.equal(png.width,observed.width);assert.equal(png.height,observed.height);
  captures.push({stage:event.stage,...observed});
}
const pixels=[];
for(const [name,beforeStage,afterStage]of [
  ["failed-coarse-remains-without-retry","m82-image-detail-failed-retained-medium","m82-image-detail-restored-awaiting-public-retry"],
  ["public-retry-replaces-with-detail","m82-image-detail-restored-awaiting-public-retry","m82-image-detail-recovered-by-public-retry"],
  ["detail-bound-source-roundtrip","m82-image-detail-recovered-by-public-retry","m82-image-source-roundtrip"],
]){
  const before=PNG.sync.read(await fs.readFile(value(beforeStage,item=>!!item?.path).path)),after=PNG.sync.read(await fs.readFile(value(afterStage,item=>!!item?.path).path));
  assert.equal(before.width,after.width);assert.equal(before.height,after.height);
  const crop={left:4,top:Math.ceil(runtime.display.capsule.bottom*before.height/runtime.display.screenHeight)+4,right:before.width-4,bottom:before.height-20};
  let changed=0,maxDelta=0;
  for(let y=crop.top;y<crop.bottom;y++)for(let x=crop.left;x<crop.right;x++){
    const offset=4*(y*before.width+x);let delta=0;
    for(let c=0;c<4;c++)delta=Math.max(delta,Math.abs(before.data[offset+c]-after.data[offset+c]));
    if(delta)changed++;maxDelta=Math.max(maxDelta,delta);
  }
  pixels.push({name,before:beforeStage,after:afterStage,crop,changed,maxDelta});
}
assert(pixels.find(row=>row.name==="public-retry-replaces-with-detail").changed>0);
const previous=[];
for(const file of ["experience-m42-validation-2026-09-29.json","experience-mode-layer-validation-2026-09-29.json"]){
  const validation=JSON.parse(await fs.readFile(path.join(evidence,file),"utf8"));
  assert.equal(await hash(validation.trace.file),validation.trace.sha256);previous.push({file,traceSha256:validation.trace.sha256,unchanged:true});
}
const scopedTraffic=value("m82-final-scoped-traffic");assert.equal(scopedTraffic.epochStartedAt,runtime.epochStartedAt);
assert.equal(scopedTraffic.records.filter(row=>row.controlledFault==="image-detail-reject-before-upstream").length,1);
const result={scope:"Unchanged fixed v26 native DevTools: compiled providers fail independently, actual bound PARTIAL and public conditional retry/recovery; real W3 detail503 retains rendered MEDIUM, public retry downloads and paints DETAIL. Initial unbound sources are explicitly separate. No phone or overall quality acceptance.",
  candidate:{bundle:candidate.bundle,sha256:fingerprint.sha256,files:fingerprint.fileCount,rawBytes:fingerprint.totalBytes,sourceBindings:candidate.sourceInputs.length},
  trace:{file:trace,sha256:await hash(trace),events:events.length},context:{before:context,after:current},runtime,
  harness:{sources:preflight.harnessSources,preflight:"experience-bound-source-preflight-2026-09-29.json",adoption,priorProxyEpoch:baseline.epochStartedAt,priorProxyPuts:baseline.puts},
  source:{publicationHash:runtime.publicationHash,initialUnboundRoute:unbound,providerReads:runtime.sourceStatus.reads,requests:sourceRequests,recovered:sourceRecovered},
  image:{levels,failure:imageFailure[0],recovery:imageRecovery[0],recoveryOtherResources:recoveryRecords.filter(row=>row.resourceKind!=="object_image"),noAutomaticRequestsBeforePublicRetry:true},
  captures,pixels,previous,toolFailures:events.filter(event=>event.stage==="tool-failure"),
  remaining:["Sky WXML/Canvas visible and physical touch composition; Canvas-only captures remain unresolved",
    "B3/C whole-scene quality, finite-source bands/saturation, W3 patterns, registration and scientific coverage",
    "SDSS image503, decode/GPU/native OS lifecycle mechanisms not exercised by this case",
    "Other modes, large text and attribution consumers",
    "Android/iOS, real orientation/full calibration/OS background and new Moon phone acceptance",
    "Target cold start, resource peaks, performance, official package sizes, actual operational cost and final required review"]};
await fs.writeFile(output,JSON.stringify(result,null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify({output,events:events.length,captures:captures.length,candidate:result.candidate,providerReads:runtime.sourceStatus.reads,levels,pixels,remaining:result.remaining}));
