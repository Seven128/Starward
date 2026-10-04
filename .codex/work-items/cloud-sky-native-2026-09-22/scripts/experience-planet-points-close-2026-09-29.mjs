import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { fingerprintBundle } from "../../../../tools/miniapp/release-bundle-artifact.mjs";

const root=process.cwd(),task=".codex/work-items/cloud-sky-native-2026-09-22";
const read=async file=>JSON.parse(await fs.readFile(path.join(root,file),"utf8"));
const digest=bytes=>createHash("sha256").update(bytes).digest("hex");
const output=path.join(root,task,"evidence/experience-planet-points-close-2026-09-29.json");
await assert.rejects(fs.access(output),{code:"ENOENT"});
const candidate=await read(`${task}/evidence/experience-combined-clean-v24-candidate-2026-09-29.json`);
assert.equal((await fingerprintBundle(path.join(root,candidate.bundle))).sha256,candidate.fingerprint.sha256);
assert.equal((await fingerprintBundle(path.join(root,candidate.previousCandidate.bundle))).sha256,candidate.previousCandidate.sha256);
const before=await read("output/playwright/cloud-sky-planet-points-0929-before/result.json"),after=await read("output/playwright/cloud-sky-planet-points-0929-after/result.json");
const consumers=await read("output/playwright/cloud-sky-planet-point-consumers-0929/result.json");
assert(!before.useful&&after.useful);
for(const input of [...after.sourceHashes,...after.gpuSourceHashes])assert.equal(digest(await fs.readFile(path.join(root,input.file))),input.sha256);
const status=async route=>{const response=await fetch(`http://127.0.0.1:8791/__sky_test/${route}`,{signal:AbortSignal.timeout(10000)});assert.equal(response.status,200);return response.json();};
const [publication,context,traffic]=await Promise.all([status("publication-status"),status("context-status"),status("traffic-status")]);
assert.equal(publication.informationModuleSha256,"3ae1fcda98d31ec91469e7c2e92aa1d8d314b8e4203dadb24359c5483ce67cd9");
assert.equal(publication.contextUpstream,8789);assert.equal(publication.publicationBackendPort,54424);
assert.equal(context.mode,"pass");assert.equal(context.puts,0);assert.equal(traffic.resourceMode,"pass");
assert.equal(traffic.heldResourceCount,0);assert.equal(traffic.active.length,0);
const referencePath=`${task}/evidence/experience-planet-points-reference-restored-2026-09-29.json`;
const reference=await read(referencePath);assert.equal(reference.meta.atmosphere,"bottom-button on");
assert.equal(digest(await fs.readFile(reference.png.file)),reference.png.sha256);
const record={scope:"B1/B2/B3 unresolved planetary-point daylight/low-sky presentation and its real consumers. Local development boundary; not field visibility, native composition, complete journey or device acceptance.",
  candidate:{bundle:candidate.bundle,sha256:candidate.fingerprint.sha256,files:candidate.fingerprint.fileCount,rawBytes:candidate.fingerprint.totalBytes,rawPackageBytes:candidate.rawPackageBytes,preparedUnopened:true},
  previousCandidateUnchanged:candidate.previousCandidate.sha256,
  evidence:candidate.planetPointChecks,
  inputs:{observer:after.observer,catalogHash:after.catalogHash,logicalCanvas:after.logicalCanvas,backing:after.backing,sourceHashes:after.sourceHashes},
  rows:after.rows.map((row,index)=>({name:row.name,at:row.at,sunAltitudeDeg:row.sunAltitudeDeg,mode:row.mode,fov:row.fov,
    beforePlanetPicks:before.rows[index].planetPicks.map(pick=>pick.reference),planetPicks:row.planetPicks.map(pick=>pick.reference),
    expectedSuppressed:row.expectedSuppressed,committedSuppressionMatches:JSON.stringify(row.actualSuppressed)===JSON.stringify(row.presentedSuppressed),
    beforeLabels:before.rows[index].targetLabels.map(label=>label.targetId),labels:row.targetLabels.map(label=>label.targetId),
    rgbaUnchanged:row.rgbaSha256===before.rows[index].rgbaSha256,lateFrameSuppressed:row.lateFrameSuppressed,oldModeSuppressed:row.oldModeSuppressed,failedCanvasSuppressed:row.failedCanvasSuppressed,error:row.error})),
  consumers:{controls:consumers.controls.length,dayPlanetList:consumers.dayPlanetList,locatedReference:consumers.locatedJupiter.selectedReference,
    componentUnchanged:consumers.componentUnchanged,listExpressionUnchanged:consumers.listExpressionUnchanged,locatedExpressionUnchanged:consumers.locatedExpressionUnchanged},
  reference:{restored:referencePath,png:reference.png,atmosphere:reference.meta.atmosphere,canvas:reference.meta.canvas,
    metadataScope:"DOM sampled before screenshot after reload; time resumed and the collapsed clock is not visible. Not an exact-instant or exact-camera Mini comparison.",
    earlierCaptures:"reference-off and reference-on both captured atmosphere off at CSS390.4x796 and paused 12:07:51. The second filename is an attempted restore, not an on result. Reload restored on/CSS390.4x844; temporary viewport reset and tab marked for continuation.",
    browserScope:"Existing tab only; DOM/AX and ordinary documented input. No hidden engine access, reference-source copying, account/community action or permission prompt."},
  checks:{failingBeforeUnitObserved:true,failingBeforeGpuRetained:true,relevantBehaviorExit:0,relevantBehaviorTests:42,targetCommitFinalExit:0,targetCommitFinalTests:6,locatedConsumersExit:0,locatedConsumerTests:5,miniTypeExit:0,buildExit:0,buildWarnings:3,contextValidationExit:0},
  service:{informationModuleSha256:publication.informationModuleSha256,contextUpstream:publication.contextUpstream,publicationBackendPort:publication.publicationBackendPort,
    contextMode:context.mode,resourceMode:traffic.resourceMode,held:traffic.heldResourceCount,active:traffic.active.length,contextPuts:context.puts},
  costs:"Reuses the existing magnitude/display owner and point program. No added renderer, texture, clock, cache, publication or automatic request loop. Local frame metadata is bounded by seven planetary rows. Raw Sky +585 bytes/main unchanged is not official package size or a phone performance result; actual costs remain with whole-candidate measurement.",
  remaining:"Complete native journey/composition, physical pose/full calibration/background, Android/iOS, current Moon on phone, environment/source quality and lawful coverage/alignment, target resources/performance/official package/costs and independent review remain open. No native RPC/new DevTools window/canceled elevation retry/phone/service replacement/deploy/Git write in this module."};
await fs.writeFile(output,JSON.stringify(record,null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify({candidate:record.candidate,service:record.service,scenes:record.rows.length,referenceAtmosphere:record.reference.atmosphere,checks:record.checks}));
