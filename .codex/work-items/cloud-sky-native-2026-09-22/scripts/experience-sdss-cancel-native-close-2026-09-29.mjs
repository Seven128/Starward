import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {fingerprintBundle} from '../../../../tools/miniapp/release-bundle-artifact.mjs';

const task=path.resolve('.codex/work-items/cloud-sky-native-2026-09-22');
const evidence=path.join(task,'evidence');
const output=path.join(evidence,'experience-sdss-cancel-native-validation-2026-09-29.json');
await assert.rejects(fs.access(output),{code:'ENOENT'});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const hash=async file=>sha(await fs.readFile(file));
const traceFile='experience-sdss-cancel-native-2026-09-29.jsonl';
const traceBytes=await fs.readFile(path.join(evidence,traceFile));
const events=traceBytes.toString().trim().split(/\r?\n/).map(JSON.parse);
function value(stage){
 const event=events.findLast(event=>event.stage===stage);assert(event,stage);
 let result=event.value;
 while(result&&typeof result==='object'&&'result' in result)result=result.result;
 return result;
}
const candidate=JSON.parse(await fs.readFile(path.join(evidence,'experience-combined-clean-v29-candidate-2026-09-29.json'),'utf8'));
assert.equal((await fingerprintBundle(path.resolve(candidate.bundle))).sha256,candidate.fingerprint.sha256);
for(const input of [...candidate.sourceInputs,...candidate.testInputs,...candidate.retainedSkyTests])
 assert.equal(await hash(input.file),input.sha256,input.file);

const published={};
for(const object of ['m81','m63']){
 const root=path.resolve('workers/miniapp-api/assets/deep-sky/sdss-'+object);
 const manifest=JSON.parse(await fs.readFile(path.join(root,'manifest.json'),'utf8'));
 published[object]={objectRef:manifest.objectRef,publicationId:manifest.publicationId,center:manifest.center,orientation:manifest.orientation,levels:{}};
 for(const [level,asset] of Object.entries(manifest.levels)){
  const bytes=await fs.readFile(path.join(root,asset.file));
  assert.equal(bytes.length,asset.bytes);assert.equal(sha(bytes),asset.sha256);
  published[object].levels[level]={bytes:bytes.length,md5:createHash('md5').update(bytes).digest('hex'),sha256:sha(bytes),fieldDegrees:asset.fieldDegrees,scaleArcsecPerPixel:asset.scaleArcsecPerPixel};
 }
}
const context=value('cancel-frozen-final-context');
const initialContext=value('cancel-baseline-context');
assert.equal(initialContext.revision,2);assert.equal(context.revision,3);
assert.equal(context.contextIdSha256,initialContext.contextIdSha256);
assert.equal(context.contextFingerprint,initialContext.contextFingerprint);
assert.equal(context.publicSpotId,'spot:test-published');assert.equal(context.localDate,'2026-09-29');
assert.equal(Date.parse(context.selectedAtUtc),Date.parse('2026-09-29T11:00:00Z'));
for(const stage of ['cancel-m63-public-time-context','cancel-m63-recovered-context','cancel-m63-source-context','cancel-m63-source-back-context'])
 assert.deepEqual(value(stage),context,stage);
assert.match(value('cancel-m81-search-information').body,/M 81 · NGC 3031.*高度 27\.6°|高度 27\.6°.*M 81 · NGC 3031/);
assert.match(value('cancel-m63-natural-pick').body,/M 63 · NGC 5055 · Sunflower Galaxy/);
assert.match(value('cancel-m63-natural-pick').body,/高度 15\.8°/);
assert.equal(value('cancel-m63-source-back-selection'),'M 63');
assert.match(value('cancel-m63-bound-source'),/M63 · SDSS DR17 历史光学巡天影像/);
assert.match(value('cancel-m63-bound-source'),/CC BY 4\.0/);
assert.match(value('cancel-m63-bound-source'),/fine cutouts show a limited central field/);
const display=value('cancel-frozen-final-display');
assert.equal(display.mode,'DAY');assert.equal(display.largeText,false);
assert.equal(display.pagePath,'sky/detail/index');assert.equal(display.pageDepth,2);
const sdk=value('cancel-baseline-runtime');assert.equal(sdk.SDKVersion,'3.17.4');
assert.match(value('cancel-frozen-final-frame').presentedCanvasLabel,/0\.05 度.*4082.*2026-09-29T11:00:00\.000Z.*19:00/);

const files=stage=>value(stage).files;
const has=(rows,asset)=>rows.some(row=>row.bytes===asset.bytes&&row.md5===asset.md5);
assert(has(files('cancel-m81-initial-detail-files'),published.m81.levels.DETAIL));
assert(has(files('cancel-m81-overview-files'),published.m81.levels.OVERVIEW));
assert(has(files('cancel-m81-overview-files'),published.m81.levels.MEDIUM));
assert(!has(files('cancel-m81-layer-exit-files'),published.m81.levels.DETAIL));
assert(!has(files('cancel-m81-layer-exit-files'),published.m81.levels.OVERVIEW));
assert.equal(value('cancel-m81-medium-baseline-traffic').records.length,0,'M81 reentry hit runtime HTTP cache; it is not body-cancel evidence');
for(const stage of ['cancel-m63-located-medium-files','cancel-m63-held-detail-files','cancel-m63-public-zoomout-files']){
 assert(has(files(stage),published.m63.levels.MEDIUM));assert(!has(files(stage),published.m63.levels.DETAIL));
}
assert.deepEqual(files('cancel-m63-public-zoomout-files'),files('cancel-m63-held-detail-files'));
assert(has(files('cancel-m63-recovered-detail-files'),published.m63.levels.DETAIL));
assert(has(files('cancel-m63-source-back-files'),published.m63.levels.DETAIL));
const held=value('cancel-m63-held-detail-traffic');
assert.equal(held.heldResourceCount,1);assert.equal(held.active.length,1);
assert.equal(held.active[0].status,200);assert.equal(held.active[0].downstreamFinished,false);
assert.equal(held.active[0].upstreamBodyBytes,0);assert.equal(held.active[0].declaredContentLength,published.m63.levels.DETAIL.bytes);
const caseRows=value('cancel-m63-recovered-detail-traffic').records;
assert.equal(caseRows.length,2,'one public delay/cancel and one fresh public zoom-in recovery, not an automatic loop');
const canceled=caseRows.find(row=>row.controlledResourceOutcome==='downstream-cancel');assert(canceled);
assert.equal(canceled.agentProbe,false);assert.equal(canceled.downstreamFinished,false);
assert.equal(canceled.downstreamClosedBeforeFinish,true);assert.equal(canceled.upstreamBodyBytes,0);
assert(canceled.observedDurationMs>0&&canceled.observedDurationMs<30000);
const recovered=caseRows.find(row=>row.sequence>canceled.sequence);assert(recovered);
assert.equal(recovered.agentProbe,false);assert.equal(recovered.status,200);
assert.equal(recovered.downstreamFinished,true);assert.equal(recovered.upstreamBodyBytes,published.m63.levels.DETAIL.bytes);
assert.equal(recovered.imageFieldDegrees,published.m63.levels.DETAIL.fieldDegrees);
for(const stage of ['cancel-m63-held-detail-status','cancel-m63-public-zoomout-status','cancel-m63-recovered-detail-status']){
 assert.match(value(stage).imageStatusWxml,/Sloan Digital Sky Survey.*CC BY 4\.0/);
 assert.doesNotMatch(value(stage).imageStatusWxml,/失败|不可用/);
}

const captures=[];
for(const event of events.filter(event=>event.value?.path?.endsWith('.png'))){
 const row=event.value;assert.equal(await hash(row.path),row.sha256);
 const png=PNG.sync.read(await fs.readFile(row.path));assert.equal(png.width,427);assert.equal(png.height,919);
 captures.push({stage:event.stage,file:path.relative(process.cwd(),row.path).replaceAll('\\','/'),sha256:row.sha256,width:png.width,height:png.height});
}
assert.equal(captures.length,8);
const crop={left:4,right:423,top:100,bottom:890,scope:'Same v29 and SDK only; no resizing; exclude host system bars/capsule/rounded border'};
async function compare(leftStage,rightStage){
 const a=PNG.sync.read(await fs.readFile(value(leftStage).path)),b=PNG.sync.read(await fs.readFile(value(rightStage).path));
 let changedPixels=0,maxChannelDifference=0;
 for(let y=crop.top;y<crop.bottom;y++)for(let x=crop.left;x<crop.right;x++){
  const offset=4*(y*a.width+x);let changed=false;
  for(let c=0;c<4;c++){const d=Math.abs(a.data[offset+c]-b.data[offset+c]);changed ||= d>0;maxChannelDifference=Math.max(maxChannelDifference,d);}
  changedPixels+=Number(changed);
 }
 return {leftStage,rightStage,changedPixels,maxChannelDifference,crop};
}
const pixels={
 cancelReturn:await compare('sdss-cancel-m63-medium-before','sdss-cancel-m63-medium-after'),
 recovery:await compare('sdss-cancel-m63-held-detail','sdss-cancel-m63-recovered-detail'),
 sourceReturn:await compare('sdss-cancel-m63-recovered-detail','sdss-cancel-m63-source-back'),
};
assert.equal(pixels.cancelReturn.changedPixels,0);assert(pixels.recovery.changedPixels>0);assert.equal(pixels.sourceReturn.changedPixels,0);
const runtime=value('cancel-frozen-final-runtime');
assert.equal(runtime.windows.length,1);assert.equal(runtime.windows[0].Id,25916);
assert.equal(runtime.puts,2);assert.deepEqual(runtime.forwardedPutStatuses,[200,200]);
assert.equal(runtime.phase,'settled');assert.equal(runtime.heldResourceCount,0);assert.equal(runtime.activeCount,0);
for(const key of ['contextMode','sourceMode','resourceMode'])assert.equal(runtime[key],'pass');
assert.equal(await hash('apps/wechat-miniapp/src/pages/map/index.scss'),'81283f7b2849cd55eed4a82d322885e1c76d7f8aa81ab26fc2fc584d198c0e82');
const result={
 scope:'Sky-only native SDSS delayed response body, public zoom cancellation, coarse-preservation, fresh recovery, natural picking and bound source return development evidence; no production source change or device acceptance.',
 candidate:{bundle:candidate.bundle,fingerprint:candidate.fingerprint.sha256,sourceInputs:candidate.sourceInputs.length},
 trace:{file:traceFile,sha256:sha(traceBytes),events:events.length,frozen:true},captures,published,initialContext,context,display,sdk,runtime,
 nativeSdssImageRecords:value('cancel-m63-final-traffic').records,delay:{held:held.active[0],canceled,recovered},pixels,
 toolFailures:events.filter(event=>event.stage==='tool-failure').map(event=>event.value),
 limitations:[
  'M81 public locate inherited the current 0.05 degree view and initially downloaded detail. All three real level responses and ordinary release were observed; subsequent immutable HTTP cache hits were not counted as new network requests or cancellation evidence.',
  'M63 at public 19:00 and 15.8 degrees altitude supplies the actual delay/cancel case. M81 at 05:00 and M63 at 19:00 are not matched-camera or cross-object quality comparisons.',
  'Eight original captures were viewed by the root agent only. M63 medium still has a visible finite-image boundary; M63 overview source stripe and unknown scientific coverage remain open. Transport correctness is not a quality pass.',
  'Native Sky captures remain Canvas-only; public WXML/actions do not establish ordinary overlay composition. The independent sources-page capture is readable at standard font size.',
  'No true device, orientation/rotation calibration, OS background, native decode/GPU injected failure, full-frame resource/performance, official package/cost or final independent review acceptance.',
 ],
};
await fs.writeFile(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,trace:result.trace,captures:captures.length,pixels,cancelMs:canceled.observedDurationMs,finalContext:context,runtime}));
