import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import ts from "typescript";
import { fingerprintBundle } from "../../../../tools/miniapp/release-bundle-artifact.mjs";

const root=process.cwd(),evidence=path.join(root,".codex/work-items/cloud-sky-native-2026-09-22/evidence");
const read=async file=>JSON.parse(await fs.readFile(path.join(root,file),"utf8"));
const digest=bytes=>createHash("sha256").update(bytes).digest("hex");
const output=path.join(evidence,"experience-combined-clean-v23-candidate-2026-09-29.json");
await assert.rejects(fs.access(output),{code:"ENOENT"});
const old=await read(".codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-combined-clean-v22-candidate-2026-09-29.json");
assert.equal((await fingerprintBundle(path.join(root,old.bundle))).sha256,old.fingerprint.sha256);
const before=await read("output/playwright/cloud-sky-independent-labels-0929-before-verified/result.json");
const after=await read("output/playwright/cloud-sky-independent-labels-0929-after/result.json");
assert(!before.useful&&after.useful);assert.equal(after.rows.length,5);
for(const key of ["catalogHash","deepCatalogHash","observer","at","fov","basis","logicalCanvas","backing","componentFunctionSha256","selectionFunctionSha256","commitSha256"])
  assert.deepEqual(before[key],after[key],`same independent-label ${key}`);
assert.equal(before.unchangedUnopenedCandidate,old.fingerprint.sha256);assert.equal(after.unchangedUnopenedCandidate,old.fingerprint.sha256);
for(const [index,row]of after.rows.entries()){
  assert.equal(row.error,0);assert(row.lateFrameSuppressed&&row.oldModeSuppressed&&row.failedCanvasSuppressed);
  assert.equal(row.rgbaSha256,before.rows[index].rgbaSha256,"drawing/identity geometry changed during label repair");
  assert.deepEqual(row.paintedObjects,before.rows[index].paintedObjects);assert.deepEqual(row.m42Picks,before.rows[index].m42Picks);
  if(!row.name.startsWith("bright-"))assert.deepEqual(row.controls,before.rows[index].controls);
  else {assert.equal(before.rows[index].controls.length,0);assert(row.controls.some(control=>control.reference==="M:42"&&control.selectedReference==="M:42"));}
}
const changed=after.sourceHashes.map(input=>input.file),priorField=await read("output/playwright/cloud-sky-star-field-0929/result.json");
for(const input of before.sourceHashes){
  const oldInput=[...old.sourceRecoveryInputs,...old.starProfileInputs,...priorField.sourceHashes].find(row=>row.file===input.file);
  assert(oldInput,input.file);assert.equal(input.sha256,oldInput.sha256,"independent-label baseline did not inherit v22 owner");
}
for(const input of [...old.sourceRecoveryInputs,...old.retainedOpticalInputs,...old.starProfileInputs,...priorField.sourceHashes]){
  if(changed.includes(input.file))continue;
  assert.equal(digest(await fs.readFile(path.join(root,input.file))),input.sha256,"independent v22 owner changed");
}
for(const input of [...after.sourceHashes,...after.gpuSourceHashes])assert.equal(digest(await fs.readFile(path.join(root,input.file))),input.sha256,"checked independent-label input changed");
const parse=text=>ts.createSourceFile("page.tsx",text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const oldPage=parse(await fs.readFile(path.join(root,"output/playwright/cloud-sky-independent-labels-0929-before-verified/owner-2.tsx"),"utf8"));
const page=parse(await fs.readFile(path.join(root,"apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx"),"utf8"));
const functions=source=>Object.fromEntries(source.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name).map(node=>[node.name.text,node.getText(source)]));
const oldFunctions=functions(oldPage),currentFunctions=functions(page);
const retainedComponents=["SkyCatalogInformation","SkyTargetInformation","SkyOrientationCatalogLabel","SkyOrientationTargetLabel"];
const retainedComponentHashes=[];
for(const name of retainedComponents){assert(oldFunctions[name],name);assert.equal(oldFunctions[name],currentFunctions[name]);retainedComponentHashes.push({name,sha256:digest(currentFunctions[name])});}
const bundle="apps/wechat-miniapp/dist/weapp-check-sky-combined-clean-v23-0929",configPath=path.join(root,bundle,"project.config.json");
const config=await read(path.join(bundle,"project.config.json")),oldConfig=await read(path.join(old.bundle,"project.config.json"));
assert.equal(config.appid,oldConfig.appid);config.projectname="Starward-Sky-Combined-Clean-V23-0929";config.setting.urlCheck=false;
await fs.writeFile(configPath,JSON.stringify(config,null,2)+"\n");
const fingerprint=await fingerprintBundle(path.join(root,bundle));
const code=(await Promise.all(fingerprint.files.filter(file=>file.path.endsWith(".js")).map(file=>fs.readFile(path.join(root,bundle,file.path),"utf8")))).join("\n");
const diagnostics={};for(const marker of Object.keys(old.diagnostics)){assert(!code.includes(marker));diagnostics[marker]="absent";}
assert(!fingerprint.files.some(file=>file.path.endsWith(".map")));assert(code.includes("http://127.0.0.1:8791"));
for(const marker of ["sky_image_file_cleanup_incomplete","attribute vec3 a_shape","exp(-q * q)","source-finite-v3","imagePublicationHash","optical-cutout","coordinateGrids","sdss_optical_publication_unavailable","bff_observation_context_update_invalid"])assert(code.includes(marker),marker);
for(const publication of old.runningOpticalInputs.publications)assert(code.includes(publication.publicationHash));
const app=await read(path.join(bundle,"app.json"));assert.equal(app.debug??false,false);
const rawPackageBytes={main:0},subpackages=app.subpackages??app.subPackages??[];
for(const file of fingerprint.files){const name=subpackages.find(item=>file.path.startsWith(item.root.replace(/\/$/,"")+"/"))?.root??"main";rawPackageBytes[name]=(rawPackageBytes[name]??0)+file.bytes;}
const record={scope:"Immutable clean native development candidate, prepared unopened. Current independent layer names/selection plus retained v22 image/source/point consumers. Actual software GPU and Node component functions do not certify native composition, phone, full journey, official package, quality or performance.",
  bundle,apiOrigin:"http://127.0.0.1:8791",diagnostics,appDebug:false,fingerprint,rawPackageBytes,
  previousCandidate:{bundle:old.bundle,sha256:old.fingerprint.sha256,rawPackageBytes:old.rawPackageBytes},independentLabelInputs:after.sourceHashes,retainedComponentHashes,
  independentLabelChecks:{before:"output/playwright/cloud-sky-independent-labels-0929-before-verified/result.json",after:"output/playwright/cloud-sky-independent-labels-0929-after/result.json",scenarios:5,pixelsAndPicksUnchanged:true,brightFailureNamesRecovered:true},
  retainedSourceRecoveryInputs:old.sourceRecoveryInputs.filter(input=>!changed.includes(input.file)),retainedOpticalInputs:old.retainedOpticalInputs.filter(input=>!changed.includes(input.file)),
  retainedPointInputs:old.starProfileInputs.filter(input=>!changed.includes(input.file)),runningOpticalInputs:old.runningOpticalInputs,runningSourceRecovery:old.runningSourceRecovery,
  runningScope:"Last observed BFF publication evidence inherited; no backend change/restart in this UI/model repair. Not a fresh whole-domain/native readback."};
await fs.writeFile(output,JSON.stringify(record,null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify({sha256:fingerprint.sha256,files:fingerprint.fileCount,rawBytes:fingerprint.totalBytes,rawPackageBytes,
  rawDelta:fingerprint.totalBytes-old.fingerprint.totalBytes,mainDelta:rawPackageBytes.main-old.rawPackageBytes.main,checks:record.independentLabelChecks}));
