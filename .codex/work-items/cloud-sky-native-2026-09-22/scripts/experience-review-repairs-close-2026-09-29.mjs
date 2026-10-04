import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fingerprintBundle } from "../../../../tools/miniapp/release-bundle-artifact.mjs";

const task=".codex/work-items/cloud-sky-native-2026-09-22";
const evidence=path.join(task,"evidence");
const output=path.join(evidence,"experience-review-repairs-validation-2026-09-29.json");
await assert.rejects(fs.access(output),{code:"ENOENT"});
const readJson=async file=>JSON.parse(await fs.readFile(file,"utf8"));
const digest=bytes=>createHash("sha256").update(bytes).digest("hex");
const hashFile=async file=>digest(await fs.readFile(file));
const candidate=await readJson(path.join(evidence,"experience-combined-clean-v25-candidate-2026-09-29.json"));
const previous=await readJson(path.join(evidence,"experience-combined-clean-v24-candidate-2026-09-29.json"));
const bundleInputs=[
 {bundle:candidate.bundle,sha256:candidate.fingerprint.sha256},
 candidate.previousCandidate,
 previous.previousCandidate,
];
const bundles=[];
for(const input of bundleInputs){
 const actual=await fingerprintBundle(path.resolve(input.bundle));
 assert.equal(actual.sha256,input.sha256,input.bundle);
 bundles.push({bundle:input.bundle,sha256:actual.sha256,files:actual.fileCount,rawBytes:actual.totalBytes});
}
assert.equal(candidate.sourceInputs.length,91);
assert.equal(candidate.testInputs.length,9);
assert.equal(candidate.ownerChanges.length,4);
for(const input of [...candidate.sourceInputs,...candidate.testInputs])
 assert.equal(await hashFile(input.file),input.sha256,input.file);
for(const owner of candidate.ownerChanges){
 assert.equal(await hashFile(owner.beforeFile),owner.beforeSha256,owner.beforeFile);
 assert.equal(await hashFile(owner.file),owner.sha256,owner.file);
}
for(const name of ["checks","typecheck","build"]){
 const text=await fs.readFile(candidate.checks[name],"utf8");
 assert.match(text,/exitCode=0\s*$/u,name);
 if(name==="checks"){
  assert(/^[#ℹ] tests 61\r?$/mu.test(text),"final log test total differs");
  assert(/^[#ℹ] pass 61\r?$/mu.test(text),"final log pass total differs");
  assert(/^[#ℹ] fail 0\r?$/mu.test(text),"final log has failures");
 }
}
const contextLog=path.join(evidence,"experience-review-repairs-context-validate-2026-09-29.txt");
assert.match(await fs.readFile(contextLog,"utf8"),/exitCode=0\s*$/u);

const eventPath=path.join(evidence,"experience-combined-clean-v25-native-events-2026-09-29.jsonl");
const events=(await fs.readFile(eventPath,"utf8")).trim().split(/\r?\n/u).map(JSON.parse);
const captures=[];
for(const event of events.filter(item=>item.value?.sha256&&item.value?.path?.endsWith(".png"))){
 const bytes=await fs.readFile(event.value.path);
 assert.equal(digest(bytes),event.value.sha256,event.value.path);
 assert.equal(bytes.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
 assert.equal(width,488);assert.equal(height,1057);
 if(event.value.width!==undefined)assert.equal(width,event.value.width);
 if(event.value.height!==undefined)assert.equal(height,event.value.height);
 captures.push({file:path.relative(process.cwd(),event.value.path).replaceAll("\\","/"),sha256:event.value.sha256,width,height});
}
assert.equal(captures.length,16);
const pixels=await readJson(path.join(evidence,"experience-combined-clean-v25-native-pixels-2026-09-29.json"));
for(const row of pixels.rows){
 assert.equal(await hashFile(row.aFile),row.aSha256);
 assert.equal(await hashFile(row.bFile),row.bSha256);
}
assert.equal(pixels.rows.find(row=>row.name==="source-back").changedPixels,0);
assert(pixels.rows.find(row=>row.name==="horizontal-off").changedPixels>0);
assert(pixels.rows.find(row=>row.name==="equatorial-on").changedPixels>0);
const moonPixels=await readJson(path.join(evidence,"experience-combined-clean-v25-moon-return-pixels-2026-09-29.json"));
assert.equal(moonPixels.changedPixels,0);
for(const file of [moonPixels.aFile,moonPixels.bFile])assert(captures.some(item=>item.file===file));

const runtimeFile=path.join(evidence,"experience-review-repairs-closing-runtime-2026-09-29.json");
const runtime=await readJson(runtimeFile);
assert.equal(runtime.windows.length,1);
assert.equal(runtime.windows[0].Id,25916);
assert.equal(runtime.windows[0].MainWindowTitle,"Starward-Sky-Combined-Clean-V25-0929");
assert.match(runtime.presentedCanvasLabel,/垂直视场 45\.0 度.*3998.*2026-09-29T13:30:00\.000Z.*手动视角/u);
assert.equal(runtime.acceptedContext.locationKind,"FORMAL_SPOT");
assert.equal(runtime.acceptedContext.publicSpotId,"spot:test-published");
assert.equal(runtime.acceptedContext.selectedAtUtc,"2026-09-29T13:30:00Z");
assert.equal(runtime.acceptedContext.revision,2);
assert.equal(runtime.acceptedContext.contextFingerprint,"9065b817f6d2611cee5c80ab32531354e78d7b7f2bb18abadc610fdee25e2bd6");
assert.equal(runtime.acceptedContext.contextIdSha256,"d80f00b39338d14118e91fba8fd4ee7825aa82229c895fcd636bc3dc4338e649");
assert.equal(runtime.localServices.contextMode,"pass");
assert.equal(runtime.localServices.resourceMode,"pass");
assert.equal(runtime.localServices.puts,1);
assert.equal(runtime.localServices.heldResourceCount,0);
assert.equal(runtime.localServices.activeCount,0);
assert.equal(runtime.localServices.publicationBackendPort,54424);
assert.equal(runtime.localServices.informationModuleSha256,"3ae1fcda98d31ec91469e7c2e92aa1d8d314b8e4203dadb24359c5483ce67cd9");

const documentInputs=[];
for(const file of ["PLAN.md","STATE.md","INDEX.md","PROGRESS.md"]){
 const bytes=await fs.readFile(path.join(task,file));
 const text=bytes.toString("utf8");
 if(file!=="PROGRESS.md"){
  const blocks=text.split(/\r?\n\r?\n/u);
  assert(blocks[1].startsWith("**当前：Goal active、无预算、未完成；"),file);
  assert(blocks[1].includes("clean-v25已打开"),file);
  assert(blocks[1].includes(candidate.fingerprint.sha256),file);
 }
 documentInputs.push({file:path.join(task,file).replaceAll("\\","/"),sha256:digest(bytes)});
}
const plan=await fs.readFile(path.join(task,"PLAN.md"),"utf8");
assert.equal((plan.match(/^## 当前阶段与依赖顺序$/gmu)??[]).length,1);
assert.equal((plan.match(/唯一下一依赖：/gu)??[]).length,1);
assert(plan.includes("已批准商业取舍"));
assert(plan.includes("SCOPE-CHANGE-2026-09-23.md"));
assert(plan.includes("REQUIREMENTS.md"));
assert(plan.includes("原始原文、商业决策、原Goal与用户更新仍是约束"));
const ids=[];
for(const [prefix,count]of [["C",10],["I",9],["D",4],["K",2],["V",8]])
 for(let i=1;i<=count;i++)ids.push(`${prefix}${String(i).padStart(2,"0")}`);
const requirements=await fs.readFile(path.join(task,"REQUIREMENTS.md"),"utf8");
assert.deepEqual([...new Set(requirements.match(/\b[CIDKV]\d{2}\b/gu))].sort(),ids.sort());
assert.equal(ids.length,33);
await fs.access(path.join(task,"PLAN-HISTORY-before-v25-2026-09-29.md"));
const branch=execFileSync("git",["branch","--show-current"],{encoding:"utf8"}).trim();
const head=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
assert.equal(branch,"codex/remote-main-20260908");
assert.equal(head,"7898962b80d20df371a758748bc62e8c48db33a7");
const scopedPaths=[...candidate.ownerChanges.map(item=>item.file),...candidate.testInputs.map(item=>item.file),
 "project_context/architecture/runtime-and-domain.md","project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md",task];
const diffOutput=execFileSync("git",["diff","--check","--",...scopedPaths],{encoding:"utf8",maxBuffer:1024*1024});
assert.equal(diffOutput,"");

const record={
 scope:"Closing source/artifact/document integrity and current read-only native/service binding after authorized single-window restoration and one independent review. Existing behavioral, pixel and context validation evidence is checked for consistency; it is not repeated target acceptance.",
 observedUtc:new Date().toISOString(),goalStatus:"active",goalBudget:null,branch,head,bundles,
 bindings:{sourceInputs:91,testFiles:9,beforeOwners:4},checks:{actualTestFiles:9,pass:61,fail:0,typecheckExit:0,buildExit:0,contextStructureExit:0,scopedDiffCheckExit:0},
 captures,documentInputs,requirementIds:ids,runtimeRecord:{file:runtimeFile.replaceAll("\\","/"),sha256:await hashFile(runtimeFile)},
 nextDependency:"Resolve current sky control/name/modal composition evidence, then remaining mode/layer/loading/recovery/readability combinations through existing owners.",
 limitations:["Canvas-only capture does not establish ordinary WXML controls, labels, modal composition or real touch.","Current phone unavailable; no preview/upload, Android/iOS, real pose/calibration or OS-background acceptance.","Local build/raw bytes/file counts do not establish full quality/coverage, target resources/performance/official package size or actual operating cost.","Single review and bounded current journeys preserve their scope; all 33 effective requirements and commercial reasons remain."],
};
await fs.writeFile(output,JSON.stringify(record,null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify({bundles:bundles.map(({bundle,sha256})=>({bundle,sha256})),bindings:record.bindings,actualCaptureCount:captures.length,requirementCount:ids.length,scopedDiffCheckExit:0,output}));
