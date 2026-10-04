import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {createHash} from "node:crypto";
import {spawnSync} from "node:child_process";

const task=path.resolve(".codex/work-items/cloud-sky-native-2026-09-22"),evidence=path.join(task,"evidence");
const output=path.join(evidence,"experience-bound-source-document-checks-2026-09-29.json");
await assert.rejects(fs.access(output),{code:"ENOENT"});
const digest=bytes=>createHash("sha256").update(bytes).digest("hex");
const validation=JSON.parse(await fs.readFile(path.join(evidence,"experience-bound-source-validation-2026-09-29.json"),"utf8"));
assert.equal(digest(await fs.readFile(validation.trace.file)),validation.trace.sha256);
const files=["PLAN.md","STATE.md","INDEX.md","PROGRESS.md","evidence/experience-bound-source-native-2026-09-29.md"];
const documents=[];let links=0;const headings=[];
for(const name of files){
  const file=path.join(task,name),bytes=await fs.readFile(file),text=bytes.toString("utf8");
  if(["PLAN.md","STATE.md","INDEX.md"].includes(name)){
    const heading=text.match(/^\*\*当前：[^\r\n]+/mu)?.[0];assert(heading);headings.push(heading);
    for(const required of ["Goal active","33项义务","Android/iOS","新版月面手机","目标性能","费用","最终审查","PID1144","M82中心2.3°"])
      assert(heading.includes(required),name+" "+required);
  }
  for(const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/gu)){
    let target=match[1].trim();if(target.startsWith("<")&&target.endsWith(">"))target=target.slice(1,-1);
    if(/^(?:https?:|codex:|thread:|app:|plugin:|#)/u.test(target))continue;
    target=target.split("#",1)[0];if(!target)continue;
    await fs.access(path.resolve(path.dirname(file),decodeURIComponent(target)));links++;
  }
  documents.push({file:name,sha256:digest(bytes)});
}
assert.equal(new Set(headings).size,1);
const plan=await fs.readFile(path.join(task,"PLAN.md"),"utf8");
assert.equal((plan.match(/^4\. \*\*唯一下一依赖：/gmu)??[]).length,1);
assert.match(plan,/^4\. \*\*唯一下一依赖：B3\/C整场质量与组合体验。/mu);
assert(plan.includes("旧代理PID19616/exec15154、内部54424、staging8792/PID17008已退休"));
const syntax=[];
for(const name of ["experience-context-http-fault-2026-09-28.mjs","experience-bound-source-preflight-2026-09-29.mjs",
  "experience-bound-source-close-2026-09-29.mjs","experience-bound-source-docs-2026-09-29.mjs"]){
  const check=spawnSync(process.execPath,["--check",path.join(task,"scripts",name)],{encoding:"utf8",windowsHide:true});
  assert.equal(check.status,0,name);syntax.push({file:name,exitCode:check.status});
}
const branch=spawnSync("git",["branch","--show-current"],{encoding:"utf8",windowsHide:true});
const head=spawnSync("git",["rev-parse","HEAD"],{encoding:"utf8",windowsHide:true});
assert.equal(branch.status,0);assert.equal(head.status,0);assert.equal(branch.stdout.trim(),"codex/remote-main-20260908");
assert.equal(head.stdout.trim(),"7898962b80d20df371a758748bc62e8c48db33a7");
const result={scope:"Task documentation/navigation and script syntax only; not product/UI/device/quality certification",documents,linksChecked:links,
  currentHeadingsEqual:true,uniquePlan:true,traceSha256:validation.trace.sha256,
  syntax,nativeHelperPowerShellParseErrors:0,gitDiffCheckExit:0,
  gitCheckScope:"git diff --check and PowerShell helper parse performed in preceding tool command; only documentation character normalization afterward",
  branch:branch.stdout.trim(),head:head.stdout.trim(),contextChanged:false,goalStatus:"active",budget:null};
await fs.writeFile(output,JSON.stringify(result,null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify({output,linksChecked:links,currentHeadingsEqual:true,uniquePlan:true,traceSha256:result.traceSha256,syntax,contextChanged:false}));
