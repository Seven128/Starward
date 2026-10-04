import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {fingerprintBundle} from "../../../../tools/miniapp/release-bundle-artifact.mjs";
const root=process.cwd(),item=path.join(root,".codex/work-items/cloud-sky-native-2026-09-22");
const output=path.join(item,"evidence/experience-hips-source-close-2026-09-29.json");
await assert.rejects(fs.access(output),{code:"ENOENT"});
const digest=b=>createHash("sha256").update(b).digest("hex");
const assets=path.join(root,"workers/miniapp-api/assets/deep-sky");
const rawManifest=await fs.readFile(path.join(assets,"manifest.json"));
assert.equal(digest(rawManifest),"46c520ab6160784c766b057cae5aed4bec1bfd0d7c4f65fc136a30716e7a1462");
const publication=JSON.parse(rawManifest);let originalImages=0;
for(const entry of publication.entries)for(const asset of Object.values(entry.levels)){
 const raw=await fs.readFile(path.join(assets,asset.file));
 assert.equal(digest(raw),asset.sha256);assert.equal(raw.length,asset.bytes);
 assert.equal(asset.validFraction,null);assert.equal(asset.coverageState,"NOT_MEASURED");originalImages++;
}
assert.equal(originalImages,153);
const wideRoot=path.join(assets,"wide-field-w3"),wide=JSON.parse(await fs.readFile(path.join(wideRoot,"manifest.json"),"utf8"));
for(const tile of wide.tiles){const raw=await fs.readFile(path.join(wideRoot,tile.file));assert.equal(digest(raw),tile.sha256);assert.equal(raw.length,tile.bytes);}
const trialRoot=path.join(root,"output/allwise-w3-hips-0929/candidate-axes-corrected");
const trial=JSON.parse(await fs.readFile(path.join(trialRoot,"candidate-result.json"),"utf8"));
let checkedSourceBytes=0;
for(const source of trial.sourceFiles){const raw=await fs.readFile(path.join(trialRoot,"sources",source.path));assert.equal(digest(raw),source.sha256);assert.equal(raw.length,source.bytes);assert(source.receipt.completeArrayReceived);checkedSourceBytes+=raw.length;}
assert.equal(checkedSourceBytes,trial.sourceBytes);assert.equal(trial.sourceFiles.length,20);
for(const level of trial.levels){const raw=await fs.readFile(path.join(trialRoot,level.file));assert.equal(digest(raw),level.sha256);assert(level.missingPixels>0&&level.finiteButBlackPixels>0);}
const candidates=[];
for(const generation of ["v16","v17"]){
 const candidate=JSON.parse(await fs.readFile(path.join(item,`evidence/experience-combined-clean-${generation}-candidate-2026-09-29.json`),"utf8"));
 assert.equal((await fingerprintBundle(path.join(root,candidate.bundle))).sha256,candidate.fingerprint.sha256);
 candidates.push({generation,sha256:candidate.fingerprint.sha256,rawBytes:candidate.fingerprint.totalBytes,opened:false,m42NewPngIncluded:false});
}
let localLinksChecked=0;
for(const doc of ["PLAN.md","STATE.md","INDEX.md","PROGRESS.md","evidence/experience-hips-source-binding-2026-09-29.md"]){
 const filename=path.join(item,doc),text=await fs.readFile(filename,"utf8");
 if(doc==="PLAN.md"){
  assert.equal(text.match(/\*\*当前可执行依赖：/g)?.length,1);
  assert(text.includes("最新无诊断clean-v17已构建、尚未打开"));
  assert(text.includes("DSS营利使用需书面许可")&&text.includes("当前Gaia DR3/EDR3")&&text.includes("ESA银河"));
  assert(text.includes("不强加全153科学mask普遍完成门槛"));
 }
 for(const match of text.matchAll(/\]\(([^\s)]+)\)/g)){
  const url=match[1];if(/^(?:https?:|thread:|codex:|app:|#)/.test(url))continue;
  const target=url.split("#")[0];if(!target)continue;
  await fs.access(path.resolve(path.dirname(filename),target));localLinksChecked++;
 }
}
const boundSources=[];
for(const file of ["apps/wechat-miniapp/src/features/sky/sky-hips-tile-mesh.ts","apps/wechat-miniapp/src/features/sky/sky-hips-tile-mesh.test.ts"])
 boundSources.push({file,sha256:digest(await fs.readFile(path.join(root,file)))});
const result={at:new Date().toISOString(),currentSources:boundSources,originalManifestSha256:digest(rawManifest),originalImages,
 originalWideTiles:wide.tiles.length,sourceTileCount:trial.sourceFiles.length,checkedSourceBytes,candidatePngs:trial.levels.map(l=>({level:l.level,sha256:l.sha256})),
 candidates,localLinksChecked,uniqueCurrentPlanDependency:true,newNativeWindows:0,newResidentServices:0,phoneTouched:false,
 nativeCurrentFrameOrContextVerified:false,m42PngPublished:false,newMoonPhoneVerified:false,independentReviewObtained:false,
 scope:"Input/artifact/document binding; shared axis implementation and software checks are development evidence, not whole journey/native/phone/quality/performance/cost or Goal completion"};
await fs.writeFile(output,JSON.stringify(result,null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify({originalImages,originalWideTiles:wide.tiles.length,sourceTileCount:trial.sourceFiles.length,checkedSourceBytes,candidates,localLinksChecked,uniqueCurrentPlanDependency:true}));
