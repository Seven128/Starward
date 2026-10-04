import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { fingerprintBundle } from "../../../../tools/miniapp/release-bundle-artifact.mjs";

const root=process.cwd(),item=path.join(root,".codex/work-items/cloud-sky-native-2026-09-22"),evidence=path.join(item,"evidence");
const read=async file=>JSON.parse(await fs.readFile(path.join(root,file),"utf8"));
const field=await read("output/playwright/cloud-sky-star-field-0929/result.json");
const point=await read("output/playwright/cloud-sky-star-profile-0929-after/result.json");
const candidate=await read(".codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-combined-clean-v22-candidate-2026-09-29.json");
const old=await read(".codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-combined-clean-v21-candidate-2026-09-29.json");
assert.equal((await fingerprintBundle(path.join(root,candidate.bundle))).sha256,candidate.fingerprint.sha256);
assert.equal((await fingerprintBundle(path.join(root,old.bundle))).sha256,old.fingerprint.sha256);
for(const input of candidate.starProfileInputs)assert.equal(createHash("sha256").update(await fs.readFile(path.join(root,input.file))).digest("hex"),input.sha256);
const get=async route=>{const response=await fetch("http://127.0.0.1:8791"+route,{signal:AbortSignal.timeout(5000)});assert.equal(response.status,200);return response.json();};
const publication=await get("/__sky_test/publication-status");
const traffic=await get("/__sky_test/traffic-status");
const context=await get("/__sky_test/context-status");
assert.equal(publication.informationModuleSha256,old.runningSourceRecovery.informationModuleSha256);
assert.equal(traffic.resourceMode,"pass");assert.equal(context.mode,"pass");assert.equal(traffic.heldResourceCount,0);assert.equal(traffic.active.length,0);assert.equal(context.puts,0);
const total=(submissions,key)=>submissions.reduce((sum,item)=>sum+item[key],0);
const rows=field.rows.map(row=>({name:row.name,at:row.at,fov:row.fov,mode:row.mode,counts:row.paintedCounts,
  samePaintedIdentity:row.paired.before.paintedObjectsSha256===row.paired.after.paintedObjectsSha256,
  pickSamples:row.paired.after.picks.length,samePicks:JSON.stringify(row.paired.before.picks)===JSON.stringify(row.paired.after.picks),
  pointCount:total(row.paired.after.pointSubmissions,"count"),luminous:total(row.paired.after.pointSubmissions,"luminous"),
  pointBytes:{before:total(row.paired.before.pointSubmissions,"bytes"),after:total(row.paired.after.pointSubmissions,"bytes")},
  rasterAreaBound:{before:total(row.paired.before.pointSubmissions,"rasterAreaBound"),after:total(row.paired.after.pointSubmissions,"rasterAreaBound")},
  submissionMedianMs:{before:row.paired.before.submissionWall.medianMs,after:row.paired.after.submissionWall.medianMs},
  submissionP95Ms:{before:row.paired.before.submissionWall.p95Ms,after:row.paired.after.submissionWall.p95Ms},
  pixelsChanged:row.paired.before.rgbaSha256!==row.paired.after.rgbaSha256,error:row.error}));
assert(rows.every(row=>row.samePaintedIdentity&&row.samePicks&&row.error===0));
const record={scope:"B1/B3 local development boundary; original requirements remain open beyond this display change. No native RPC/phone/new window/service replacement/deployment/Git write.",
  candidate:{bundle:candidate.bundle,sha256:candidate.fingerprint.sha256,files:candidate.fingerprint.fileCount,rawBytes:candidate.fingerprint.totalBytes,
    rawPackageBytes:candidate.rawPackageBytes,preparedUnopened:true},oldCandidateUnchanged:old.fingerprint.sha256,
  reference:"experience-star-field-reference-2026-09-29.json",actualSceneInputs:{observer:field.observer,logicalCanvas:field.logicalCanvas,backing:field.backing,
    catalogHash:field.catalogHash,saoPublicationHash:field.saoPublicationHash,saoTileCount:field.saoTileCount},
  metadataCorrections:{originalResultPreserved:true,fixedLocalView:"Vega for ordinary local rows, zenith for dome rows, M42 only for the two named M42 rows; each original row retains its actual basis/time",
    referenceScope:"Current Browser appearance capture, same observer and converted FOV with CSS390.4x844; 14s clock offset, engine revision unknown and catalogue differs; no pixel registration/native/quality acceptance",
    performanceScope:"12 alternating warmup pairs and 30 alternating measured pairs in same software GL; point upload instrumentation only after timing. No additional grid-only timings; submission can include synchronous driver waits, not target FPS."},
  checks:{miniTypeExit:0,relevantBehaviorExit:0,relevantBehaviorTests:33,isolatedShaderExit:0,wholeSceneExit:0,buildExit:0,buildWarnings:3,
    radialProfile:point.rows.map(row=>({version:row.version,pixelRatio:row.pixelRatio,haloFraction:row.samples[0].haloFraction,sum:row.samples[0].sum})),
    symbolsUnchanged:point.unchangedControls,nightReturnPixelsEqual:candidate.starProfileChecks.nightReturnPixelsEqual,textures:candidate.starProfileChecks.retirement},
  service:{informationModuleSha256:publication.informationModuleSha256,contextMode:context.mode,resourceMode:traffic.resourceMode,held:traffic.heldResourceCount,active:traffic.active.length,
    contextPuts:context.puts,contextUpstream:publication.contextUpstream},rows,
  remaining:"Native combined journey/UI/labels, pose/full calibration/background, Android/iOS, current Moon on phone, environmental/source quality and broader alignment/coverage, target resources/performance/official package/costs and independent review remain unverified."};
await fs.writeFile(path.join(evidence,"experience-star-field-close-2026-09-29.json"),JSON.stringify(record,null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify({candidate:record.candidate,service:record.service,rows:rows.length,textures:record.checks.textures,nightReturnPixelsEqual:record.checks.nightReturnPixelsEqual}));
