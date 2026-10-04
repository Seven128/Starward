import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {createHash} from "node:crypto";
import {PNG} from "pngjs";
import {fingerprintBundle} from "../../../../tools/miniapp/release-bundle-artifact.mjs";

const task=path.resolve(".codex/work-items/cloud-sky-native-2026-09-22");
const evidence=path.join(task,"evidence");
const output=path.join(evidence,"experience-m42-validation-2026-09-29.json");
await assert.rejects(fs.access(output),{code:"ENOENT"});
const digest=(bytes,algorithm="sha256")=>createHash(algorithm).update(bytes).digest("hex");
const hash=async file=>digest(await fs.readFile(file));
const trace=path.join(evidence,"experience-m42-native-2026-09-29.jsonl");
const events=(await fs.readFile(trace,"utf8")).trim().split(/\r?\n/u).map(JSON.parse);
const event=stage=>{const item=events.findLast(item=>item.stage===stage);assert(item,stage);return item.value;};
const candidate=JSON.parse(await fs.readFile(path.join(evidence,"experience-combined-clean-v26-candidate-2026-09-29.json"),"utf8"));
const fingerprint=await fingerprintBundle(path.resolve(candidate.bundle));
assert.equal(fingerprint.sha256,candidate.fingerprint.sha256);
for(const input of [...candidate.sourceInputs,...candidate.testInputs,...candidate.retainedSkyTests])
  assert.equal(await hash(path.resolve(input.file)),input.sha256,input.file);

const baseline=event("baseline-context"),current=event("time-0500-context");
assert.equal(baseline.revision,1);assert.equal(current.revision,2);
assert.equal(baseline.selectedAtUtc,"2026-09-29T13:00:00Z");
assert.equal(current.selectedAtUtc,"2026-09-29T21:00:00Z");
assert.equal(current.localDate,"2026-09-29");assert.equal(current.timezone,"Asia/Shanghai");
assert.deepEqual({...baseline,revision:2,selectedAtUtc:current.selectedAtUtc},current);
assert.match(event("time-0500-public-date").label,/09月30日.*05:00.*UTC\+8/u);
const contextStages=["m42-current-source-context","m42-source-back-context","m42-partial-back-context","m42-allsky-context","m42-final-context"];
for(const stage of contextStages)assert.deepEqual(event(stage),current,stage);
const runtime=event("m42-final-runtime");
assert.equal(runtime.display.mode,"DAY");assert.equal(runtime.display.largeText,false);
assert.equal(runtime.display.pagePath,"sky/detail/index");assert.equal(runtime.display.pageDepth,2);
assert.equal(runtime.puts,2);assert.deepEqual(runtime.forwardedPutStatuses,[200,200]);
assert.equal(runtime.contextMode,"pass");assert.equal(runtime.resourceMode,"pass");
assert.equal(runtime.held,0);assert.equal(runtime.active,0);
assert.equal(runtime.contextUpstream,8789);assert.equal(runtime.publicationBackendPort,54424);
assert.equal(runtime.windows.length,1);assert.equal(runtime.windows[0].Id,25916);
assert.equal(runtime.windows[0].MainWindowTitle,"Starward-Sky-Combined-Clean-V26-0929");
assert.equal(runtime.informationModuleSha256,event("baseline-runtime").informationModuleSha256);
assert.match(event("m42-final-frame").presentedCanvasLabel,/43\.3 度.*4208.*2026-09-29T21:00:00\.000Z.*手动视角/u);
for(const label of Object.values(event("m42-final-layer-intentions")))assert.match(label,/^关闭/u);
assert.deepEqual(event("m42-natural-pick-identity"),{title:"M 42",kind:"星云 · M 42"});
for(const stage of ["m42-source-back-selected-title","m42-partial-back-selected-title"])
  assert.equal(event(stage).title,"M 42");

const publicationRoot=path.resolve("workers/miniapp-api/assets/deep-sky");
const manifestPath=path.join(publicationRoot,"manifest.json");
const manifest=JSON.parse(await fs.readFile(manifestPath,"utf8"));
const publicationHash=digest(JSON.stringify(manifest));
assert.equal(publicationHash,runtime.publicationHash);
const m42=manifest.entries.find(entry=>entry.objectRef==="M:42");assert(m42);
const levels=[];
for(const [level,stage]of [["OVERVIEW","m42-coarse-owned-file-digests"],["MEDIUM","m42-medium-owned-file-digests"],["DETAIL","m42-detail-owned-file-digests"]]){
  const input=m42.levels[level],file=path.join(publicationRoot,input.file),bytes=await fs.readFile(file);
  assert.equal(digest(bytes),input.sha256);assert.equal(bytes.length,input.bytes);
  const png=PNG.sync.read(bytes);assert.equal(png.width,input.pixels);assert.equal(png.height,input.pixels);
  let missingPixels=0,finitePixels=0;
  for(let i=3;i<png.data.length;i+=4){assert([0,255].includes(png.data[i]));if(png.data[i]===0)missingPixels++;else finitePixels++;}
  assert.equal(missingPixels,input.sourceFiniteMask.missingPixels);assert.equal(finitePixels,input.sourceFiniteMask.finitePixels);
  assert.equal(input.validFraction,null);assert.equal(input.coverageState,"NOT_MEASURED");
  const observed=event(stage).files,files=Array.isArray(observed)?observed:[observed];
  const native=files.find(item=>item.level===level);assert(native,stage);
  assert.equal(native.bytes,bytes.length);assert.equal(native.md5,digest(bytes,"md5"));
  levels.push({level,file,sha256:input.sha256,md5:native.md5,bytes:bytes.length,pixels:input.pixels,fieldDegrees:input.fieldDegrees,
    missingPixels,finitePixels,scientificCoverageState:input.coverageState});
}
for(const stage of ["m42-current-source-route","m42-correct-bound-source-reopened-route"]){
  const route=event(stage);assert.equal(route.path,"sky/sources/index");assert.equal(decodeURIComponent(route.reference),"M:42");
  assert.equal(route.imagePublicationHash,publicationHash);
}
const unknown=event("m42-unknown-bound-source-route");assert.equal(unknown.imagePublicationHash,"0".repeat(64));
const partialText=event("m42-unknown-bound-source-content").text;
assert(partialText.includes("所选红外影像版本的来源暂不可用"));assert(partialText.includes("OpenNGC"));assert(!partialText.includes("NASA/IPAC"));
const retry=event("m42-unknown-bound-source-public-retry");
assert.equal(retry.catalogueRetained,true);assert.equal(retry.partialRetained,true);assert.equal(retry.infraredNotBorrowed,true);
assert.equal(retry.actualRequests.length,1);assert.equal(retry.actualRequests[0].conditional,true);
assert.equal(retry.actualRequests[0].status,304);assert.equal(retry.actualRequests[0].downstreamFinished,true);
const recovered=event("m42-correct-bound-source-reopened-content");
for(const key of ["cataloguePresent","infraredPresent","sourceFiniteDetailPresent","partialAbsent"])assert.equal(recovered[key],true);
assert.equal(recovered.textSha256,digest(event("m42-current-source-content").text));
assert.equal(event("m42-source-copy-versioned-download").matchesExpected,true);

const captures=[];
for(const item of events){
  const value=item.value;
  if(!value?.path||!value.width||!value.height||!value.sha256)continue;
  assert.equal(path.resolve(value.project),path.resolve(candidate.bundle));
  const bytes=await fs.readFile(value.path);assert.equal(digest(bytes),value.sha256);
  const png=PNG.sync.read(bytes);assert.equal(png.width,value.width);assert.equal(png.height,value.height);
  captures.push({stage:item.stage,...value});
}
const pixels=[];
for(const [name,beforeStage,afterStage]of [
  ["coarse-constellation","m42-coarse-current","m42-coarse-constellation-off"],
  ["detail-source-partial-roundtrip","m42-detail-constellation-off","m42-source-recovery-back-clean"],
  ["allsky-landscape","m42-allsky-environment-on","m42-allsky-landscape-off"],
  ["allsky-landscape-restored","m42-allsky-environment-on","m42-allsky-landscape-restored"],
  ["wide-w3-versus-galactic","m42-wide-w3-on","m42-wide-w3-off"],
]){
  const before=PNG.sync.read(await fs.readFile(event(beforeStage).path)),after=PNG.sync.read(await fs.readFile(event(afterStage).path));
  assert.equal(after.width,before.width);assert.equal(after.height,before.height);
  const crop={left:4,top:Math.ceil(runtime.display.capsule.bottom*before.height/runtime.display.screenHeight)+4,right:before.width-4,bottom:before.height-20};
  let changed=0,maxDelta=0;
  for(let y=crop.top;y<crop.bottom;y++)for(let x=crop.left;x<crop.right;x++){
    const offset=4*(y*before.width+x);let delta=0;
    for(let c=0;c<4;c++)delta=Math.max(delta,Math.abs(before.data[offset+c]-after.data[offset+c]));
    if(delta)changed++;maxDelta=Math.max(maxDelta,delta);
  }
  pixels.push({name,before:beforeStage,after:afterStage,width:before.width,height:before.height,crop,changed,maxDelta});
}
for(const name of ["coarse-constellation","allsky-landscape","wide-w3-versus-galactic"])
  assert(pixels.find(item=>item.name===name).changed>0,name+" actual effect");
const traffic=event("m42-final-scoped-traffic");
assert.equal(traffic.baselineSequence,event("baseline-runtime").sequence);
const images=levels.map(level=>{
  const rows=traffic.records.filter(row=>row.resourceKind==="object_image"&&row.upstreamBodyBytes===level.bytes&&row.imageFieldDegrees===level.fieldDegrees);
  assert.equal(rows.length,1,level.level+" image transaction");assert.equal(rows[0].status,200);assert.equal(rows[0].downstreamFinished,true);
  return {level:level.level,...rows[0]};
});
const w3Input=path.join(publicationRoot,"wide-field-w3/Norder0/Dir0/Npix5.jpg");
const result={scope:"Unchanged fixed v26 native DevTools development: public cross-midnight time, three M42 PNG levels, natural coordinate selection, bound sources, unknown-version PARTIAL/revalidation/reopening, all-sky environment/layer effects. Unknown-version input is not a provider outage; SDK coordinates are not physical touch acceptance.",
  candidate:{bundle:candidate.bundle,sha256:fingerprint.sha256,files:fingerprint.fileCount,rawBytes:fingerprint.totalBytes,sourceBindings:candidate.sourceInputs.length},
  trace:{file:trace,sha256:await hash(trace),events:events.length},
  context:{before:baseline,after:current,preservedStages:contextStages},runtime,
  source:{publicationHash,manifestFileSha256:await hash(manifestPath),levels,images,partialRetry:retry.actualRequests[0],recovered,downloadCopy:true},
  captures,pixels,
  quality:{w3Input:{file:w3Input,sha256:await hash(w3Input)},observed:"Native wide W3 and the retained original Norder0 Npix5 JPEG both contain visible block/band patterns. Source-finite M42 holes and finite source bands/saturation remain. No overall quality acceptance or new mask inference."},
  toolFailures:events.filter(item=>item.stage==="tool-failure"),
  remaining:["Actual Sky WXML/Canvas composition, names, modal visibility and physical touch","Real provider/HTTP/decode/GPU faults and restoration combinations","B3/C whole-scene quality, registration and scientific coverage","Other modes, large text and attribution consumers","Android/iOS, real orientation/calibration/OS lifecycle and new Moon device acceptance","Target cold start, resources, performance, official package sizes, operational cost and required final review"]};
await fs.writeFile(output,JSON.stringify(result,null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify({output,candidate:result.candidate,events:events.length,captures:captures.length,sourceLevels:levels,pixels,finalContext:current}));
