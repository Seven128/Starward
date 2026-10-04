import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {createHash} from "node:crypto";
import {fingerprintBundle} from "../../../../tools/miniapp/release-bundle-artifact.mjs";

const task=".codex/work-items/cloud-sky-native-2026-09-22",evidence=`${task}/evidence`;
const output=`${evidence}/experience-combined-clean-v26-candidate-2026-09-29.json`;
await assert.rejects(fs.access(output),{code:"ENOENT"});
const read=async file=>JSON.parse(await fs.readFile(file,"utf8"));
const hash=async file=>createHash("sha256").update(await fs.readFile(file)).digest("hex");
const prior=await read(`${evidence}/experience-combined-clean-v25-candidate-2026-09-29.json`);
assert.equal(prior.sourceInputs.length,91);
for(const input of [...prior.sourceInputs,...prior.testInputs])assert.equal(await hash(input.file),input.sha256,input.file);
const sharedFiles=["components/source-attribution.tsx","components/source-attribution.scss","components/soft-button.tsx",
 "components/provenance.tsx","components/provenance.scss","utils/source-presentation.ts","sky/sources/index.tsx",
 "sky/sources/index.scss","app.scss"].map(file=>`apps/wechat-miniapp/src/${file}`);
const sourceMap=new Map(prior.sourceInputs.map(input=>[input.file,input]));
for(const file of sharedFiles)sourceMap.set(file,{file,sha256:await hash(file)});
const ownerChanges=[];
for(const [file,beforeFile]of [[sharedFiles[0],`${evidence}/experience-source-wrap-before-component-2026-09-29.tsx`],
 [sharedFiles[1],`${evidence}/experience-source-wrap-before-style-2026-09-29.scss`]]){
 const beforeSha256=await hash(beforeFile),sha256=await hash(file);assert.notEqual(beforeSha256,sha256);
 ownerChanges.push({file,beforeFile,beforeSha256,sha256});
}
const testFiles=["components/source-attribution.test.ts","sky/sources/source-partial-recovery.test.ts"]
 .map(file=>`apps/wechat-miniapp/src/${file}`);
const testInputs=await Promise.all(testFiles.map(async file=>({file,sha256:await hash(file)})));
const checks={checks:`${evidence}/experience-source-wrap-checks-2026-09-29.txt`,
 typecheck:`${evidence}/experience-source-wrap-typecheck-fixed-2026-09-29.txt`,build:`${evidence}/experience-source-wrap-v26-build-2026-09-29.txt`};
for(const [name,file]of Object.entries(checks))assert.match(await fs.readFile(file,"utf8"),/exitCode=0\s*$/u,name);
assert.match(await fs.readFile(checks.checks,"utf8"),/pass 4/u);
const retainedBundles=[];
for(const input of [{bundle:prior.bundle,sha256:prior.fingerprint.sha256},prior.previousCandidate]){
 const actual=await fingerprintBundle(path.resolve(input.bundle));assert.equal(actual.sha256,input.sha256);
 retainedBundles.push({bundle:input.bundle,sha256:actual.sha256});
}
const bundle="apps/wechat-miniapp/dist/weapp-check-sky-combined-clean-v26-0929";
const config=await read(`${bundle}/project.config.json`),oldConfig=await read(`${prior.bundle}/project.config.json`);
assert.equal(config.appid,oldConfig.appid);config.projectname="Starward-Sky-Combined-Clean-V26-0929";config.setting.urlCheck=false;
await fs.writeFile(`${bundle}/project.config.json`,JSON.stringify(config,null,2)+"\n");
const fingerprint=await fingerprintBundle(path.resolve(bundle));
const code=(await Promise.all(fingerprint.files.filter(file=>file.path.endsWith(".js"))
 .map(file=>fs.readFile(path.join(bundle,file.path),"utf8")))).join("\n");
const diagnostics={};for(const marker of Object.keys(prior.diagnostics)){assert(!code.includes(marker),marker);diagnostics[marker]="absent";}
assert(!fingerprint.files.some(file=>file.path.endsWith(".map")));
assert(code.includes("http://127.0.0.1:8791"));assert(code.includes("source-attribution__link-text"));
const app=await read(`${bundle}/app.json`);assert.equal(app.debug??false,false);
const packages=app.subpackages??app.subPackages??[],rawPackageBytes={main:0};
for(const file of fingerprint.files){const name=packages.find(item=>file.path.startsWith(item.root.replace(/\/$/u,"")+"/"))?.root??"main";
 rawPackageBytes[name]=(rawPackageBytes[name]??0)+file.bytes;}
const record={scope:"Fixed v26 native development candidate, prepared unopened after actual v25 source-page clipping was observed. Two shared attribution presentation owners change; full original requirements and prior sky owners remain. Native evidence follows separately; not phone or target acceptance.",
 bundle,apiOrigin:prior.apiOrigin,appDebug:false,diagnostics,fingerprint,rawPackageBytes,
 previousCandidate:retainedBundles[0],retainedBundles,sourceInputs:[...sourceMap.values()],inheritedSourceInputCount:91,
 ownerChanges,testInputs,checks,retainedSkyTests:prior.testInputs,
 originalChecks:prior.checks,retainedRunningOpticalInputs:prior.retainedRunningOpticalInputs,
 retainedRunningSourceRecovery:prior.retainedRunningSourceRecovery,
 difference:"SourceAttribution gives long name/URL an explicit bounded text node with wrapping and left alignment. Exact notices, original URLs and existing copy semantics remain.",
 runningScope:"No services replaced, no phone/external preview or publication; new native binding is separate."};
await fs.writeFile(output,JSON.stringify(record,null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify({bundle,sha256:fingerprint.sha256,files:fingerprint.fileCount,rawBytes:fingerprint.totalBytes,
 rawPackageBytes,rawDelta:fingerprint.totalBytes-prior.fingerprint.totalBytes,sourceInputCount:sourceMap.size,changedOwners:ownerChanges.length}));
