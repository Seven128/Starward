import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fingerprintBundle } from "../../../../tools/miniapp/release-bundle-artifact.mjs";

const root = process.cwd(), evidence = path.join(root, ".codex/work-items/cloud-sky-native-2026-09-22/evidence");
const read = async file => JSON.parse(await fs.readFile(path.join(root,file),"utf8"));
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const output = path.join(evidence,"experience-combined-clean-v22-candidate-2026-09-29.json");
await assert.rejects(fs.access(output),{code:"ENOENT"});
const previous = await read(".codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-combined-clean-v21-candidate-2026-09-29.json");
assert.equal((await fingerprintBundle(path.join(root,previous.bundle))).sha256,previous.fingerprint.sha256,"v21 changed");
const before = await read("output/playwright/cloud-sky-star-profile-0929-before/result.json");
const point = await read("output/playwright/cloud-sky-star-profile-0929-after/result.json");
const field = await read("output/playwright/cloud-sky-star-field-0929/result.json");
const retirement = await read("output/playwright/cloud-sky-star-field-0929/retirement.json");
assert(!before.diffuse && point.diffuse && point.unchangedControls);
assert.equal(point.rows.length,6); assert.equal(field.rows.length,15);
assert.equal(retirement.created,retirement.deleted);
assert.equal(field.unchangedUnopenedCandidateHash,previous.fingerprint.sha256);
assert(field.rows.some(row => row.paintedCounts["SAO:"] > 0 && row.paired.after.picks.some(pick => pick.reference.startsWith("SAO:") && pick.candidates.includes(pick.reference))),"actual SAO consumer effect missing");
for (const row of field.rows) {
  assert.equal(row.error,0); assert.deepEqual(row.failures,[]);
  for (const key of ["paintedObjectsSha256","paintedDeepSource","paintedLandscape","successfulSceneFrame","picks"])
    assert.deepEqual(row.paired.before[key],row.paired.after[key]);
  assert.deepEqual(row.uploadsBefore,row.uploadsAfter);
}
const initial = field.rows.find(row=>row.name==="night" && row.fov===85);
const returned = field.rows.find(row=>row.name==="night-return");
for (const version of ["before","after"]) assert.equal(initial.paired[version].rgbaSha256,returned.paired[version].rgbaSha256,"night return changed");
const changed = ["apps/wechat-miniapp/src/features/sky/sky-gpu-renderer.ts","apps/wechat-miniapp/src/features/sky/sky-scene-render.ts"];
for (const input of [...previous.opticalInputs,...previous.sourceRecoveryInputs]) {
  if (changed.includes(input.file)) {
    assert.equal(before.sourceHashes.find(row=>row.file===input.file).sha256,input.sha256,"star baseline did not inherit v21 owner");
  } else assert.equal(digest(await fs.readFile(path.join(root,input.file))),input.sha256,"independent v21 consumer changed");
}
for (const input of [...field.sourceHashes,...point.sourceHashes]) assert.equal(digest(await fs.readFile(path.join(root,input.file))),input.sha256,"checked production input changed");
const starProfileInputs = await Promise.all([...changed,"apps/wechat-miniapp/src/features/sky/sky-render-surface.ts"].map(async file=>({file,sha256:digest(await fs.readFile(path.join(root,file)))})));
const bundle = "apps/wechat-miniapp/dist/weapp-check-sky-combined-clean-v22-0929";
const configPath = path.join(root,bundle,"project.config.json");
const config = await read(path.join(bundle,"project.config.json"));
const oldConfig = await read(path.join(previous.bundle,"project.config.json"));
assert.equal(config.appid,oldConfig.appid);
config.projectname="Starward-Sky-Combined-Clean-V22-0929";config.setting.urlCheck=false;
await fs.writeFile(configPath,JSON.stringify(config,null,2)+"\n");
const fingerprint = await fingerprintBundle(path.join(root,bundle));
const code = (await Promise.all(fingerprint.files.filter(file=>file.path.endsWith(".js")).map(file=>fs.readFile(path.join(root,bundle,file.path),"utf8")))).join("\n");
const diagnostics={};
for (const marker of Object.keys(previous.diagnostics)) { assert(!code.includes(marker),"temporary diagnostic present");diagnostics[marker]="absent"; }
assert(!fingerprint.files.some(file=>file.path.endsWith(".map")));
assert(code.includes("http://127.0.0.1:8791") && code.includes("sky_image_file_cleanup_incomplete"));
assert(code.includes("attribute vec3 a_shape") && code.includes("exp(-q * q)"),"soft point shader absent");
assert(code.includes("source-finite-v3") && code.includes("imagePublicationHash") && code.includes("optical-cutout") && code.includes("coordinateGrids") && code.includes("bff_observation_context_update_invalid"));
for (const publication of previous.runningOpticalInputs.publications) assert(code.includes(publication.publicationHash),"admitted optical publication absent");
assert(code.includes("sdss_optical_publication_unavailable"),"source recovery absent");
const app = await read(path.join(bundle,"app.json")); assert.equal(app.debug??false,false);
const packages={main:0}, subpackages=app.subpackages??app.subPackages??[];
for (const file of fingerprint.files) {
  const item=subpackages.find(item=>file.path.startsWith(item.root.replace(/\/$/,"")+"/"));
  const name=item?.root??"main";packages[name]=(packages[name]??0)+file.bytes;
}
assert.equal(packages.main,previous.rawPackageBytes.main,"shared point change expanded main package");
const record={scope:"Immutable native development candidate, prepared unopened. Current shared point display plus retained v21 image/source/recovery consumers. Actual software GPU checks do not certify native composition, phone, quality, official package or target performance.",
  bundle,apiOrigin:"http://127.0.0.1:8791",diagnostics,appDebug:false,fingerprint,rawPackageBytes:packages,
  previousCandidate:{bundle:previous.bundle,sha256:previous.fingerprint.sha256,rawPackageBytes:previous.rawPackageBytes},
  starProfileInputs,starProfileScope:"BSC/SAO/unresolved planets share one existing point program/buffer. Symbols remain solid; physical globes remain independent. No catalog/photometry/position/picking changes.",
  starProfileChecks:{probe:"output/playwright/cloud-sky-star-profile-0929-after/result.json",field:"output/playwright/cloud-sky-star-field-0929/result.json",scenarios:15,retirement,nightReturnPixelsEqual:true},
  retainedOpticalInputs:previous.opticalInputs.filter(input=>!changed.includes(input.file)),sourceRecoveryInputs:previous.sourceRecoveryInputs,
  runningOpticalInputs:previous.runningOpticalInputs,runningSourceRecovery:previous.runningSourceRecovery,
  runningScope:"Inherited last observed v21 running BFF evidence; this renderer-only change does not replace/restart the API. Not a fresh full-domain or native readback."};
await fs.writeFile(output,JSON.stringify(record,null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify({sha256:fingerprint.sha256,fileCount:fingerprint.fileCount,rawBytes:fingerprint.totalBytes,rawPackageBytes:packages,
  rawDelta:fingerprint.totalBytes-previous.fingerprint.totalBytes,starProfileChecks:record.starProfileChecks}));
