import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {createHash} from "node:crypto";
import {PNG} from "pngjs";
import {fingerprintBundle} from "../../../../tools/miniapp/release-bundle-artifact.mjs";

const task=path.resolve(".codex/work-items/cloud-sky-native-2026-09-22");
const evidence=path.join(task,"evidence");
const output=path.join(evidence,"experience-mode-layer-validation-2026-09-29.json");
await assert.rejects(fs.access(output),{code:"ENOENT"});
const digest=bytes=>createHash("sha256").update(bytes).digest("hex");
const hash=async file=>digest(await fs.readFile(file));
const trace=path.join(evidence,"experience-mode-layer-native-2026-09-29.jsonl");
const events=(await fs.readFile(trace,"utf8")).trim().split(/\r?\n/u).map(JSON.parse);
const event=stage=>{const item=events.findLast(item=>item.stage===stage);assert(item,stage);return item.value;};
const candidate=JSON.parse(await fs.readFile(path.join(evidence,"experience-combined-clean-v26-candidate-2026-09-29.json"),"utf8"));
const fingerprint=await fingerprintBundle(path.resolve(candidate.bundle));
assert.equal(fingerprint.sha256,candidate.fingerprint.sha256);
for(const input of [...candidate.sourceInputs,...candidate.testInputs,...candidate.retainedSkyTests])
 assert.equal(await hash(path.resolve(input.file)),input.sha256,input.file);
const contexts=["observation-manual-context","observation-source-back-context","ordinary-mode-return-context","m31-normal-recovered-context","final-context"];
for(const stage of contexts)assert.deepEqual(event(stage),event("baseline-context"),stage);
assert.equal(event("baseline-context").revision,1);
assert.equal(event("baseline-context").selectedAtUtc,"2026-09-29T13:00:00Z");
const runtime=event("final-runtime");
assert.equal(runtime.mode,"DAY");assert.equal(runtime.largeText,false);
assert.equal(runtime.contextMode,"pass");assert.equal(runtime.resourceMode,"pass");
assert.equal(runtime.held,0);assert.equal(runtime.active,0);assert.equal(runtime.puts,1);
assert.equal(runtime.contextUpstream,8789);assert.equal(runtime.publicationBackendPort,54424);
assert.equal(runtime.windows.length,1);assert.equal(runtime.windows[0].Id,25916);
assert.equal(runtime.windows[0].MainWindowTitle,"Starward-Sky-Combined-Clean-V26-0929");
assert.match(event("final-frame").presentedCanvasLabel,/12\.1 度.*4039.*2026-09-29T13:00:00\.000Z.*手动视角/u);
for(const label of Object.values(event("final-layer-intentions")))assert.match(label,/^关闭/u);
let copy=event("observation-source-copy-result");while(copy?.result)copy=copy.result;
assert.equal(copy.matchesExpectedPublicMoonUrl,true);
const held=event("m31-detail-held-traffic");assert.equal(held.held,1);
const canceled=event("detail-delay-restored").records.filter(item=>item.controlledResourceDelayMs);
assert.equal(canceled.length,1);assert.equal(canceled[0].status,200);
assert.equal(canceled[0].controlledResourceOutcome,"downstream-cancel");
assert.equal(canceled[0].downstreamFinished,false);
assert.equal(event("m31-observation-after-cancel-status").text,"红光模式已隐藏巡天影像");
const recovered=event("normal-detail-recovery-traffic").records.filter(item=>item.resourceKind==="object_image");
assert.equal(recovered.length,1);assert.equal(recovered[0].status,200);
assert.equal(recovered[0].downstreamFinished,true);assert(recovered[0].upstreamBodyBytes>0);
const captures=[];
for(const item of events){
 const value=item.value;
 if(!value?.path||!value.width||!value.height||!value.sha256)continue;
 assert.equal(path.resolve(value.project),path.resolve(candidate.bundle));
 const bytes=await fs.readFile(value.path);assert.equal(digest(bytes),value.sha256);
 const png=PNG.sync.read(bytes);assert.equal(png.width,value.width);assert.equal(png.height,value.height);
 captures.push({stage:item.stage,...value});
}
const bounds=event("current-capture-bounds");
const pixels=[];
for(const [name,beforeStage,afterStage] of [
 ["red-w3-intent","mode-observation-wide-before-w3","mode-observation-wide-after-w3"],
 ["red-second-grid","mode-observation-wide-after-w3","mode-observation-wide-both-grids"],
 ["red-source-back","mode-observation-wide-both-grids","mode-observation-source-back-sky"],
 ["ordinary-mode","mode-observation-source-back-sky","mode-ordinary-wide-w3-return"],
 ["m31-landscape-diagnostic","mode-m31-coarse-after-roundtrip-landscape-on","mode-m31-coarse-landscape-off"],
 ["m31-wide-field-diagnostic","mode-m31-coarse-landscape-off","mode-m31-coarse-no-wide-field-no-landscape"],
 ["m31-constellation-diagnostic","mode-m31-coarse-no-wide-field-no-landscape","mode-m31-coarse-without-constellations"],
 ["m31-mode-roundtrip","mode-m31-coarse-before-delay","mode-layer-final-sky"],
]){
 const before=PNG.sync.read(await fs.readFile(event(beforeStage).path));
 const after=PNG.sync.read(await fs.readFile(event(afterStage).path));
 assert.equal(after.width,before.width);assert.equal(after.height,before.height);
 const crop={left:4,top:Math.ceil(bounds.capsule.bottom*before.height/bounds.screenHeight)+4,right:before.width-4,bottom:before.height-20};
 let changed=0,maxDelta=0;
 for(let y=crop.top;y<crop.bottom;y++)for(let x=crop.left;x<crop.right;x++){
  const offset=4*(y*before.width+x);let delta=0;
  for(let c=0;c<4;c++)delta=Math.max(delta,Math.abs(before.data[offset+c]-after.data[offset+c]));
  if(delta)changed++;maxDelta=Math.max(maxDelta,delta);
 }
 pixels.push({name,before:beforeStage,after:afterStage,width:before.width,height:before.height,crop,changed,maxDelta});
}
assert.equal(pixels.find(item=>item.name==="red-w3-intent").changed,0);
assert(pixels.find(item=>item.name==="red-second-grid").changed>0);
assert(pixels.find(item=>item.name==="ordinary-mode").changed>0);
assert(pixels.find(item=>item.name==="m31-constellation-diagnostic").changed>0);
const result={scope:"Fixed unchanged v26 native DevTools development observations. Public Settings buttons and Back; retained-Sky mode combinations entered Settings via official SDK navigateTo. One real HTTP body delay/cancel/recovery, not 503, phone, OS background, full UI composition or overall acceptance.",
 candidate:{bundle:candidate.bundle,sha256:fingerprint.sha256,files:fingerprint.fileCount,rawBytes:fingerprint.totalBytes,sourceBindings:candidate.sourceInputs.length},
 trace:{file:trace,sha256:await hash(trace),events:events.length},contexts:contexts.map(stage=>({stage,...event(stage)})),runtime,
 source:{copyVerified:true,redLink:event("observation-source-link")},fault:{heldCount:held.held,canceled:canceled[0],recovered:recovered[0]},
 captureBounds:bounds,captures,pixels,
 remaining:["Actual Sky WXML/Canvas composition and touch visibility","Android/iOS, real orientation/calibration/OS lifecycle and new Moon device acceptance","Large text and all attribution consumers","Separate native HTTP/decode/GPU faults and source-partial recovery combinations","B3/C full-scene quality/registration/coverage","Target resources, performance, official package sizes, operational cost and required final review"]};
await fs.writeFile(output,JSON.stringify(result,null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify({output,candidate:result.candidate,events:events.length,captures:captures.length,canceledAfterMs:canceled[0].observedDurationMs,recoveredBytes:recovered[0].upstreamBodyBytes,pixels}));
