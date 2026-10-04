import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { fingerprintBundle } from "../../../../tools/miniapp/release-bundle-artifact.mjs";

const root=process.cwd(),task=".codex/work-items/cloud-sky-native-2026-09-22";
const read=async file=>JSON.parse(await fs.readFile(path.join(root,file),"utf8"));
const digest=bytes=>createHash("sha256").update(bytes).digest("hex");
const output=path.join(root,task,"evidence/experience-combined-clean-v24-candidate-2026-09-29.json");
await assert.rejects(fs.access(output),{code:"ENOENT"});
const old=await read(`${task}/evidence/experience-combined-clean-v23-candidate-2026-09-29.json`);
assert.equal((await fingerprintBundle(path.join(root,old.bundle))).sha256,old.fingerprint.sha256);
const before=await read("output/playwright/cloud-sky-planet-points-0929-before/result.json");
const after=await read("output/playwright/cloud-sky-planet-points-0929-after/result.json");
const consumers=await read("output/playwright/cloud-sky-planet-point-consumers-0929/result.json");
assert(!before.useful&&after.useful);assert.equal(after.rows.length,8);
for(const key of ["observer","catalogHash","logicalCanvas","backing","unchangedUnopenedCandidate"])
  assert.deepEqual(before[key],after[key],`planet-point inputs ${key}`);
assert.equal(after.unchangedUnopenedCandidate,old.fingerprint.sha256);
for(const [index,row]of after.rows.entries()){
  const previous=before.rows[index];
  for(const key of ["name","at","sunAltitudeDeg","mode","fov","basis","expectedSuppressed"])
    assert.deepEqual(row[key],previous[key],`same scene ${key}`);
  assert.equal(row.error,0);
  assert(row.noSuppressedPick&&row.noSuppressedLabel&&row.lateFrameSuppressed&&row.oldModeSuppressed&&row.failedCanvasSuppressed);
  assert.deepEqual(row.actualSuppressed,row.expectedSuppressed);assert.deepEqual(row.presentedSuppressed,row.expectedSuppressed);
  for(const pick of row.planetPicks)assert.deepEqual(pick,previous.planetPicks.find(item=>item.reference===pick.reference),"surviving natural point identity/overlap");
  if(["red-day-dome","resolved-day-jupiter","unavailable-geometry"].includes(row.name)){
    assert.equal(row.rgbaSha256,previous.rgbaSha256);assert.deepEqual(row.paintedObjects,previous.paintedObjects);
    assert.deepEqual(row.planetPicks,previous.planetPicks);assert.deepEqual(row.targetLabels,previous.targetLabels);
  }
}
const scene=name=>after.rows.find(row=>row.name===name);
assert(scene("day-dome").planetPicks.some(pick=>pick.reference==="PLANET:VENUS"));
assert.deepEqual(scene("day-jupiter").planetPicks,[]);assert.deepEqual(scene("day-jupiter").targetLabels,[]);
assert.notEqual(scene("day-dome").rgbaSha256,before.rows.find(row=>row.name==="day-dome").rgbaSha256);
for(const result of [before,after])assert.equal(result.rows[0].rgbaSha256,result.rows.at(-1).rgbaSha256,"night return without stale drawing");
assert(consumers.componentUnchanged&&consumers.listExpressionUnchanged&&consumers.locatedExpressionUnchanged);
assert.equal(consumers.controls.length,6);assert.equal(consumers.locatedJupiter.selectedReference,"PLANET:JUPITER");
for(const reference of ["PLANET:MERCURY","PLANET:VENUS","PLANET:MARS","PLANET:JUPITER"])assert(consumers.dayPlanetList.includes(reference));
assert.equal(consumers.pageSha256,after.sourceHashes.find(input=>input.file.endsWith("spot-sky-page.tsx")).sha256);
const changed=after.sourceHashes.map(input=>input.file);
const priorLabels=await read("output/playwright/cloud-sky-independent-labels-0929-after/result.json");
const priorInputs=[...old.independentLabelInputs,...old.retainedSourceRecoveryInputs,...old.retainedOpticalInputs,...old.retainedPointInputs,...priorLabels.gpuSourceHashes];
const baselineBindings=before.sourceHashes.map(input=>{
  const prior=priorInputs.find(item=>item.file===input.file);
  if(prior)assert.equal(input.sha256,prior.sha256,"planet-point baseline differs from retained v23 source");
  return {...input,binding:prior?"retained-v23-source":"immutable-before-owner-snapshot; no prior source fingerprint"};
});
for(const input of priorInputs){
  if(changed.includes(input.file))continue;
  assert.equal(digest(await fs.readFile(path.join(root,input.file))),input.sha256,"independent v23 owner changed");
}
for(const input of [...after.sourceHashes,...after.gpuSourceHashes])
  assert.equal(digest(await fs.readFile(path.join(root,input.file))),input.sha256,"checked planet-point input changed");
const bundle="apps/wechat-miniapp/dist/weapp-check-sky-combined-clean-v24-0929";
const config=await read(`${bundle}/project.config.json`),oldConfig=await read(`${old.bundle}/project.config.json`);
assert.equal(config.appid,oldConfig.appid);config.projectname="Starward-Sky-Combined-Clean-V24-0929";config.setting.urlCheck=false;
await fs.writeFile(path.join(root,bundle,"project.config.json"),JSON.stringify(config,null,2)+"\n");
const fingerprint=await fingerprintBundle(path.join(root,bundle));
const code=(await Promise.all(fingerprint.files.filter(file=>file.path.endsWith(".js")).map(file=>fs.readFile(path.join(root,bundle,file.path),"utf8")))).join("\n");
const diagnostics={};for(const marker of Object.keys(old.diagnostics)){assert(!code.includes(marker));diagnostics[marker]="absent";}
assert(!fingerprint.files.some(file=>file.path.endsWith(".map")));assert(code.includes("http://127.0.0.1:8791"));
for(const marker of ["suppressedBodyReferences","sky_image_file_cleanup_incomplete","attribute vec3 a_shape","exp(-q * q)","source-finite-v3","imagePublicationHash","optical-cutout","coordinateGrids","sdss_optical_publication_unavailable","bff_observation_context_update_invalid"])assert(code.includes(marker),marker);
for(const publication of old.runningOpticalInputs.publications)assert(code.includes(publication.publicationHash));
const app=await read(`${bundle}/app.json`);assert.equal(app.debug??false,false);
const rawPackageBytes={main:0},subpackages=app.subpackages??app.subPackages??[];
for(const file of fingerprint.files){const name=subpackages.find(item=>file.path.startsWith(item.root.replace(/\/$/,"")+"/"))?.root??"main";rawPackageBytes[name]=(rawPackageBytes[name]??0)+file.bytes;}
const record={scope:"Immutable native development candidate, prepared unopened. Planet points reuse the existing solar/low-sky display owner and committed-frame pick/automatic-label threshold. Actual software GPU and Node consumers do not certify native composition, phone, full journey, official package, photometry, quality or performance.",
  bundle,apiOrigin:"http://127.0.0.1:8791",diagnostics,appDebug:false,fingerprint,rawPackageBytes,
  previousCandidate:{bundle:old.bundle,sha256:old.fingerprint.sha256,rawPackageBytes:old.rawPackageBytes},planetPointInputs:after.sourceHashes,baselineBindings,
  planetPointChecks:{before:"output/playwright/cloud-sky-planet-points-0929-before/result.json",after:"output/playwright/cloud-sky-planet-points-0929-after/result.json",consumers:"output/playwright/cloud-sky-planet-point-consumers-0929/result.json",scenarios:8,daytimeNaturalPointsCorrected:true,suppressionCommitsWithFrame:true,positiveVenusRetained:true,redResolvedAndUnavailableGeometryUnchanged:true,sameVersionNightReturnExact:true,listAndExplicitLocateRetained:true},
  retainedSourceRecoveryInputs:old.retainedSourceRecoveryInputs.filter(input=>!changed.includes(input.file)),retainedOpticalInputs:old.retainedOpticalInputs.filter(input=>!changed.includes(input.file)),
  retainedPointInputs:old.retainedPointInputs.filter(input=>!changed.includes(input.file)),retainedIndependentLabelInputs:old.independentLabelInputs.filter(input=>!changed.includes(input.file)),
  retainedComponentHashes:old.retainedComponentHashes,runningOpticalInputs:old.runningOpticalInputs,runningSourceRecovery:old.runningSourceRecovery,
  runningScope:"Publication and source-recovery evidence inherited; no backend change/restart in this renderer/presentation repair. Close record separately reads safe current service status, not whole-domain/native state."};
await fs.writeFile(output,JSON.stringify(record,null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify({sha256:fingerprint.sha256,files:fingerprint.fileCount,rawBytes:fingerprint.totalBytes,rawPackageBytes,
  rawDelta:fingerprint.totalBytes-old.fingerprint.totalBytes,mainDelta:rawPackageBytes.main-old.rawPackageBytes.main,baselineBindings,checks:record.planetPointChecks}));
