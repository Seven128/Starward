import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fingerprintBundle } from "../../../../tools/miniapp/release-bundle-artifact.mjs";

const root=process.cwd(),task=".codex/work-items/cloud-sky-native-2026-09-22";
const read=async file=>JSON.parse(await fs.readFile(path.join(root,file),"utf8"));
const digest=bytes=>createHash("sha256").update(bytes).digest("hex");
const output=path.join(root,task,"evidence/experience-planet-points-validation-2026-09-29.json");
await assert.rejects(fs.access(output),{code:"ENOENT"});
const candidate=await read(`${task}/evidence/experience-combined-clean-v24-candidate-2026-09-29.json`);
const gpu=await read("output/playwright/cloud-sky-planet-points-0929-after/result.json");
const oldGpu=await read("output/playwright/cloud-sky-independent-labels-0929-after/result.json");
const changed=new Set(candidate.planetPointInputs.map(input=>input.file));
const inputs=new Map([...candidate.planetPointInputs,...candidate.retainedIndependentLabelInputs,...candidate.retainedSourceRecoveryInputs,
  ...candidate.retainedOpticalInputs,...candidate.retainedPointInputs,...gpu.gpuSourceHashes,...oldGpu.gpuSourceHashes.filter(input=>!changed.has(input.file))].map(input=>[input.file,input]));
for(const input of inputs.values())assert.equal(digest(await fs.readFile(path.join(root,input.file))),input.sha256,`verified source changed: ${input.file}`);
assert.equal((await fingerprintBundle(path.join(root,candidate.bundle))).sha256,candidate.fingerprint.sha256);
assert.equal((await fingerprintBundle(path.join(root,candidate.previousCandidate.bundle))).sha256,candidate.previousCandidate.sha256);
const source="apps/wechat-miniapp/src/features/sky/";
const files=[...candidate.planetPointInputs.map(input=>input.file),...[
  "sky-planet-disc.test.ts","sky-body-label-presentation.test.ts","sky-target-page-labels.test.ts"].map(file=>source+file),
  "project_context/architecture/runtime-and-domain.md","project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md",
  ...["PLAN.md","STATE.md","INDEX.md","PROGRESS.md"].map(file=>`${task}/${file}`)];
const diff=spawnSync("git",["--no-pager","diff","--check","--",...files],{cwd:root,encoding:"utf8"});
assert.equal(diff.status,0,diff.stderr+diff.stdout);
const documents=[];
for(const name of ["PLAN.md","STATE.md","INDEX.md"]){
  const file=`${task}/${name}`,text=await fs.readFile(path.join(root,file),"utf8");
  const first=text.slice(text.indexOf("**当前"),text.indexOf("\n\n",text.indexOf("**当前")));
  assert(first.includes("clean-v24")&&first.includes(candidate.fingerprint.sha256)&&first.includes("Goal active"));
  documents.push({file,sha256:digest(text)});
}
const plan=await fs.readFile(path.join(root,task,"PLAN.md"),"utf8");
assert(plan.includes("再只开一个v24")&&plan.includes("不重复已闭合行星点显隐/软轮廓"));
const record={scope:"Final scope/source/immutable-candidate checks after module documentation; no new runtime/device acceptance.",
  sourceInputsChecked:inputs.size,sourceAndGpuInputsUnchanged:true,candidateSha256:candidate.fingerprint.sha256,previousCandidateUnchanged:candidate.previousCandidate.sha256,
  scopedDiffCheckExit:diff.status,documents,contextValidationExit:0,contextValidationScope:"Observed after the two Context owner updates; declarations/manifest paths only, not facts or experience certification.",
  goal:"active, unbudgeted, incomplete",nativeCandidate:"v24 prepared unopened; native v12 Frame/Context/4B unknown; no RPC retry or new window",
  remaining:"Complete original journey, target composition/resources/performance, real pose/calibration/background, Android/iOS/current Moon, environment/source quality/coverage, costs and independent review remain open."};
await fs.writeFile(output,JSON.stringify(record,null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify(record));
