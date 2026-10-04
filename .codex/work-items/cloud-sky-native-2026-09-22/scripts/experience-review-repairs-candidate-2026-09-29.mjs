import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fingerprintBundle } from "../../../../tools/miniapp/release-bundle-artifact.mjs";

const root=process.cwd(),task=".codex/work-items/cloud-sky-native-2026-09-22";
const read=async file=>JSON.parse(await fs.readFile(path.join(root,file),"utf8"));
const digest=bytes=>createHash("sha256").update(bytes).digest("hex");
const output=path.join(root,task,"evidence/experience-combined-clean-v25-candidate-2026-09-29.json");
await assert.rejects(fs.access(output),{code:"ENOENT"});
const previous=await read(`${task}/evidence/experience-combined-clean-v24-candidate-2026-09-29.json`);
const point=await read("output/playwright/cloud-sky-planet-points-0929-after/result.json");
const labels=await read("output/playwright/cloud-sky-independent-labels-0929-after/result.json");
const previousChanged=new Set(previous.planetPointInputs.map(input=>input.file));
const baseline=new Map([...previous.planetPointInputs,...previous.retainedIndependentLabelInputs,
  ...previous.retainedSourceRecoveryInputs,...previous.retainedOpticalInputs,...previous.retainedPointInputs,
  ...point.gpuSourceHashes,...labels.gpuSourceHashes.filter(input=>!previousChanged.has(input.file))]
  .map(input=>[input.file,input]));
const prefix="apps/wechat-miniapp/src/features/sky/";
const changedOwners=["sky-scene-render.ts","sky-object-picking.ts","sky-stellar-scene.ts","spot-sky-page.tsx"].map(file=>prefix+file);
const beforeFiles=["experience-resolved-limb-before-sky-scene-render-2026-09-29.ts",
  "experience-resolved-limb-before-sky-object-picking-2026-09-29.ts",
  "experience-independent-solar-before-scene-2026-09-29.ts",
  "experience-independent-solar-before-page-2026-09-29.tsx"];
const ownerChanges=[];
for(const [index,file]of changedOwners.entries()){
  assert(baseline.has(file),`missing current v24 baseline: ${file}`);
  const beforeFile=`${task}/evidence/${beforeFiles[index]}`;
  const beforeSha256=digest(await fs.readFile(path.join(root,beforeFile)));
  assert.equal(beforeSha256,baseline.get(file).sha256,`repair baseline differs from current v24: ${file}`);
  const sha256=digest(await fs.readFile(path.join(root,file)));
  assert.notEqual(sha256,beforeSha256);
  ownerChanges.push({file,beforeFile,beforeSha256,sha256});
}
const sourceInputs=[];
for(const [file,input]of baseline){
  const sha256=digest(await fs.readFile(path.join(root,file)));
  if(!changedOwners.includes(file))assert.equal(sha256,input.sha256,`retained v24 owner changed: ${file}`);
  sourceInputs.push({file,sha256});
}
const tests=["sky-planet-disc.test.ts","sky-object-picking.test.ts","sky-moon-disc.test.ts","sky-sun-disc.test.ts",
  "sky-body-label-presentation.test.ts","sky-target-page-labels.test.ts","stellar-page-recovery.test.ts",
  "sky-canvas-time.test.ts","sky-observation-frame.test.ts"].map(file=>prefix+file);
const testInputs=await Promise.all(tests.map(async file=>({file,sha256:digest(await fs.readFile(path.join(root,file)))})));
const checks={checks:`${task}/evidence/experience-review-repairs-final-checks-2026-09-29.txt`,
  typecheck:`${task}/evidence/experience-review-repairs-typecheck-2026-09-29.txt`,
  build:`${task}/evidence/experience-combined-clean-v25-build-2026-09-29.txt`,
  beforeLimb:`${task}/evidence/experience-resolved-limb-before-2026-09-29.txt`,
  beforeIndependentSolar:`${task}/evidence/experience-independent-solar-before-2026-09-29.txt`};
for(const name of ["checks","typecheck","build"])assert.match(await fs.readFile(path.join(root,checks[name]),"utf8"),/exitCode=0\s*$/u,name);
assert.match(await fs.readFile(path.join(root,checks.checks),"utf8"),/pass 61/u);
for(const name of ["beforeLimb","beforeIndependentSolar"])assert.match(await fs.readFile(path.join(root,checks[name]),"utf8"),/fail [1-9][0-9]*/u,name);
assert.equal((await fingerprintBundle(path.join(root,previous.bundle))).sha256,previous.fingerprint.sha256);
assert.equal((await fingerprintBundle(path.join(root,previous.previousCandidate.bundle))).sha256,previous.previousCandidate.sha256);
const bundle="apps/wechat-miniapp/dist/weapp-check-sky-combined-clean-v25-0929";
const config=await read(`${bundle}/project.config.json`),priorConfig=await read(`${previous.bundle}/project.config.json`);
assert.equal(config.appid,priorConfig.appid);
config.projectname="Starward-Sky-Combined-Clean-V25-0929";
config.setting.urlCheck=false;
await fs.writeFile(path.join(root,bundle,"project.config.json"),JSON.stringify(config,null,2)+"\n");
const fingerprint=await fingerprintBundle(path.join(root,bundle));
const code=(await Promise.all(fingerprint.files.filter(file=>file.path.endsWith(".js"))
  .map(file=>fs.readFile(path.join(root,bundle,file.path),"utf8")))).join("\n");
const diagnostics={};
for(const marker of Object.keys(previous.diagnostics)){assert(!code.includes(marker),marker);diagnostics[marker]="absent";}
assert(!fingerprint.files.some(file=>file.path.endsWith(".map")));
assert(code.includes("http://127.0.0.1:8791"));
for(const marker of ["suppressedBodyReferences","sky_image_file_cleanup_incomplete","source-finite-v3","imagePublicationHash",
  "optical-cutout","coordinateGrids","sdss_optical_publication_unavailable","bff_observation_context_update_invalid"])
  assert(code.includes(marker),marker);
const app=await read(`${bundle}/app.json`);assert.equal(app.debug??false,false);
const rawPackageBytes={main:0},subpackages=app.subpackages??app.subPackages??[];
for(const file of fingerprint.files){
  const name=subpackages.find(item=>file.path.startsWith(item.root.replace(/\/$/u,"")+"/"))?.root??"main";
  rawPackageBytes[name]=(rawPackageBytes[name]??0)+file.bytes;
}
const record={scope:"Fixed clean native development candidate, initially prepared unopened. Two independently found v24 defects are repaired in shared picking and independent-layer readiness. Development regressions and type/build checks do not certify target composition, real touch, phone, full journey, quality or performance.",
  bundle,apiOrigin:"http://127.0.0.1:8791",appDebug:false,diagnostics,fingerprint,rawPackageBytes,
  previousCandidate:{bundle:previous.bundle,sha256:previous.fingerprint.sha256,rawPackageBytes:previous.rawPackageBytes},
  sourceInputs,sourceInputCount:sourceInputs.length,ownerChanges,testInputs,checks,
  fixes:["Partly risen/set resolved Sun/Moon/planet limbs retain their successfully painted identity; hidden centres cannot use the generous point tolerance to select nearby empty sky.",
    "Catalog or legacy-target failure cannot disable independent exact solar/observation layers; draw and gesture consumers share report readiness and keep whole-report/pose invalidation."],
  retainedRunningOpticalInputs:previous.runningOpticalInputs,retainedRunningSourceRecovery:previous.runningSourceRecovery,
  runningScope:"Previous publication/source-recovery evidence retained. No backend replacement, phone preview or external publication in this repair. Fresh native/service readback is a separate record."};
await fs.writeFile(output,JSON.stringify(record,null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify({bundle,sha256:fingerprint.sha256,files:fingerprint.fileCount,rawBytes:fingerprint.totalBytes,
  rawPackageBytes,rawDelta:fingerprint.totalBytes-previous.fingerprint.totalBytes,
  baselineInputs:sourceInputs.length,changedOwners:ownerChanges.length,testFiles:testInputs.length}));
