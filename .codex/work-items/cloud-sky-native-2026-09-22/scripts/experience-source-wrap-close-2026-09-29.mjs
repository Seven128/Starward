import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {fingerprintBundle} from "../../../../tools/miniapp/release-bundle-artifact.mjs";

const task=".codex/work-items/cloud-sky-native-2026-09-22",evidence=path.join(task,"evidence");
const output=path.join(evidence,"experience-source-wrap-validation-2026-09-29.json");
await assert.rejects(fs.access(output),{code:"ENOENT"});
const read=async file=>JSON.parse(await fs.readFile(file,"utf8"));
const hash=async file=>createHash("sha256").update(await fs.readFile(file)).digest("hex");
const candidate=await read(path.join(evidence,"experience-combined-clean-v26-candidate-2026-09-29.json"));
const bundleResults=[];
for(const input of [{bundle:candidate.bundle,sha256:candidate.fingerprint.sha256},...candidate.retainedBundles]){
 const actual=await fingerprintBundle(path.resolve(input.bundle));assert.equal(actual.sha256,input.sha256);
 bundleResults.push({bundle:input.bundle,sha256:actual.sha256,files:actual.fileCount,rawBytes:actual.totalBytes});
}
assert.equal(candidate.sourceInputs.length,99);
for(const input of [...candidate.sourceInputs,...candidate.testInputs,...candidate.retainedSkyTests])
 assert.equal(await hash(input.file),input.sha256,input.file);
for(const owner of candidate.ownerChanges){
 assert.equal(await hash(owner.beforeFile),owner.beforeSha256);assert.equal(await hash(owner.file),owner.sha256);
}
for(const [name,file]of Object.entries(candidate.checks)){
 const text=await fs.readFile(file,"utf8");assert(/exitCode=0\s*$/u.test(text),name);
 if(name==="checks")assert(/^[#ℹ] pass 4\r?$/mu.test(text)&&/^[#ℹ] fail 0\r?$/mu.test(text),"four source behavior checks");
}
const contextLog=path.join(evidence,"experience-source-wrap-context-validate-2026-09-29.txt");
assert(/exitCode=0\s*$/u.test(await fs.readFile(contextLog,"utf8")),"Context structure");
const eventPath=path.join(evidence,"experience-composition-sources-native-2026-09-29.jsonl");
const events=(await fs.readFile(eventPath,"utf8")).trim().split(/\r?\n/u).map(JSON.parse);
const event=stage=>{const item=events.find(value=>value.stage===stage);assert(item,stage);return item.value;};
const before=event("source-credit-layout-before"),after=event("source-credit-layout-after");
assert.equal(after.publicCreditText,before.publicCreditText,"complete original name and URL");
assert.equal(after.buttonSize.width,before.buttonSize.width);
assert(after.buttonSize.height>before.buttonSize.height);
assert(after.textSize.width<after.buttonSize.width);
assert.equal(after.fontSize,"14px");
assert.equal(event("source-copy-after").matchesExpectedPublicUrl,true);
assert.match(event("source-copy-visible-status").text,/来源链接已复制/u);
assert.equal(event("source-back-selected-identity").title,"月球");
const entryContext=event("v26-entry-accepted-context"),backContext=event("v26-source-back-context");
assert.deepEqual(backContext,entryContext);
assert.deepEqual(event("v26-final-accepted-context"),entryContext);
assert.equal(entryContext.revision,1);
assert.equal(entryContext.selectedAtUtc,"2026-09-29T13:00:00Z");
assert.equal(entryContext.publicSpotId,"spot:test-published");
const runtime=event("v26-final-runtime");
assert.equal(runtime.windows.length,1);
assert.equal(runtime.windows[0].MainWindowTitle,"Starward-Sky-Combined-Clean-V26-0929");
assert.equal(runtime.windows[0].Id,25916);
assert.match(runtime.presentedCanvasLabel,/45\.0 度.*4039.*2026-09-29T13:00:00\.000Z.*手动视角/u);
assert.equal(runtime.contextMode,"pass");assert.equal(runtime.resourceMode,"pass");
assert.equal(runtime.puts,1);assert.equal(runtime.activeCount,0);assert.equal(runtime.heldResourceCount,0);
assert.equal(runtime.publicationBackendPort,54424);
assert.equal(runtime.informationModuleSha256,"3ae1fcda98d31ec91469e7c2e92aa1d8d314b8e4203dadb24359c5483ce67cd9");
const screenshots=[];
for(const item of events.filter(value=>value.value?.sha256&&value.value?.path?.endsWith(".png"))){
 const value=item.value,bytes=await fs.readFile(value.path);assert.equal(await hash(value.path),value.sha256);
 assert.equal(bytes.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
 assert.equal(bytes.readUInt32BE(16),value.width);assert.equal(bytes.readUInt32BE(20),value.height);
 screenshots.push({stage:item.stage,file:path.relative(process.cwd(),value.path).replaceAll("\\","/"),
  sha256:value.sha256,width:value.width,height:value.height});
}
assert.equal(screenshots.length,4);
const documents=[];
for(const name of ["PLAN.md","STATE.md","INDEX.md","PROGRESS.md"]){
 const file=path.join(task,name),text=await fs.readFile(file,"utf8");
 if(name!=="PROGRESS.md"){
  const blocks=text.split(/\r?\n\r?\n/u);assert(blocks[1].startsWith("**当前：Goal active、无预算、未完成；"));
  assert(blocks[1].includes("clean-v26已打开")&&blocks[1].includes(candidate.fingerprint.sha256));
 }
 documents.push({file:file.replaceAll("\\","/"),sha256:await hash(file)});
}
const plan=await fs.readFile(path.join(task,"PLAN.md"),"utf8");
assert.equal((plan.match(/唯一下一依赖：/gu)??[]).length,1);
assert(plan.includes("REQUIREMENTS.md")&&plan.includes("SCOPE-CHANGE-2026-09-23.md")&&plan.includes("原始原文、商业决策、原Goal与用户更新仍是约束"));
const requirementIds=[...new Set((await fs.readFile(path.join(task,"REQUIREMENTS.md"),"utf8")).match(/\b[CIDKV]\d{2}\b/gu))].sort();
assert.equal(requirementIds.length,33);
const head=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
assert.equal(head,"7898962b80d20df371a758748bc62e8c48db33a7");
const branch=execFileSync("git",["branch","--show-current"],{encoding:"utf8"}).trim();assert.equal(branch,"codex/remote-main-20260908");
const changedFiles=[...candidate.ownerChanges.map(value=>value.file),
 "project_context/areas/main/screen-contracts/wechat-miniapp/shared-state-and-recovery.md",task];
assert.equal(execFileSync("git",["diff","--check","--",...changedFiles],{encoding:"utf8",maxBuffer:1024*1024}),"");
const result={scope:"Source-readability repair with actual before/after native output, copy readback and selected-context return. Bundle/source/log/document integrity retained. Does not close Canvas-only composition, all consumers/themes, phone or full goal acceptance.",
 observedUtc:new Date().toISOString(),goalStatus:"active",goalBudget:null,branch,head,bundles:bundleResults,
 sourceInputs:99,inheritedSkySources:91,unchangedRetainedSkyTests:9,changedOwners:2,
 checks:{sourceBehaviorPass:4,fail:0,typecheckExit:0,buildExit:0,contextStructureExit:0,scopedDiffCheckExit:0},
 native:{before:{buttonSize:before.buttonSize},after:{buttonSize:after.buttonSize,textSize:after.textSize,fontSize:after.fontSize},
  completeCreditTextPreserved:true,correctPublicClipboard:true,sourceBackContextPreserved:true,sourceBackMoonSelection:true,currentContext:entryContext,currentRuntime:runtime},
 screenshots,documents,requirementIds,eventRecord:{file:eventPath.replaceAll("\\","/"),sha256:await hash(eventPath)},
 limitations:["Current native capture still lacks ordinary sky controls/labels/modal composition; no proven cause.",
  "No phone, real pose/calibration/background or Android/iOS acceptance.",
  "Normal source page proves its recorded result; all modes/large text/consumers and final quality/coverage/performance/package/cost obligations remain.",
  "v25 journey/independent review retains its original scope, and v26 new public context is 21:00/revision1."]};
await fs.writeFile(output,JSON.stringify(result,null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify({sha256:candidate.fingerprint.sha256,sourceInputs:99,actualCaptures:4,sourceCopy:true,sourceReturn:true,requirements:33,scopedDiffCheck:0,output}));
