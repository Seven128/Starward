import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {fingerprintBundle} from '../../../../tools/miniapp/release-bundle-artifact.mjs';

const task=path.resolve('.codex/work-items/cloud-sky-native-2026-09-22');
const evidence=path.join(task,'evidence');
const output=path.join(evidence,'experience-optical-boundary-v30-native-validation-2026-09-29.json');
await assert.rejects(fs.access(output),{code:'ENOENT'});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const hash=async file=>sha(await fs.readFile(file));
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const traceFile='experience-optical-boundary-v30-native-2026-09-29.jsonl';
const traceBytes=await fs.readFile(path.join(evidence,traceFile));
const events=traceBytes.toString().trim().split(/\r?\n/).map(JSON.parse);
function value(stage){
 const event=events.findLast(event=>event.stage===stage);assert(event,stage);
 let result=event.value;
 while(result&&typeof result==='object'&&'result' in result)result=result.result;
 return result;
}
const candidateFile='experience-combined-clean-v30-candidate-2026-09-29.json';
const candidate=await read(path.join(evidence,candidateFile));
assert.equal((await fingerprintBundle(path.resolve(candidate.bundle))).sha256,candidate.fingerprint.sha256);
assert.equal(candidate.sourceInputs.length,106);assert.equal(candidate.ownerChanges.length,3);
for(const input of [...candidate.sourceInputs,...candidate.testInputs,...candidate.retainedSkyTests])
 assert.equal(await hash(input.file),input.sha256,input.file);
const baselineFile='experience-optical-boundary-baseline-2026-09-29.json';
const baseline=await read(path.join(evidence,baselineFile));
assert.equal(await hash(path.join(evidence,baseline.trace.file)),baseline.trace.sha256);
for(const copy of baseline.sourceCopies)assert.equal(await hash(path.join(evidence,copy.copy)),copy.sha256);
assert.equal((await fingerprintBundle(path.resolve(baseline.candidate.bundle))).sha256,baseline.candidate.sha256);
const assetRoot=path.resolve('workers/miniapp-api/assets/deep-sky/sdss-m63');
const manifest=await read(path.join(assetRoot,'manifest.json'));
const published={objectRef:manifest.objectRef,publicationId:manifest.publicationId,center:manifest.center,orientation:manifest.orientation,levels:{}};
for(const [level,asset] of Object.entries(manifest.levels)){
 const bytes=await fs.readFile(path.join(assetRoot,asset.file));
 assert.equal(bytes.length,asset.bytes);assert.equal(sha(bytes),asset.sha256);
 published.levels[level]={bytes:bytes.length,sha256:sha(bytes),md5:createHash('md5').update(bytes).digest('hex'),fieldDegrees:asset.fieldDegrees,scaleArcsecPerPixel:asset.scaleArcsecPerPixel};
}
const context=value('v30-frozen-final-context');
assert.equal(context.publicSpotId,'spot:test-published');assert.equal(context.localDate,'2026-09-29');
assert.equal(Date.parse(context.selectedAtUtc),Date.parse('2026-09-29T11:00:00Z'));
assert.equal(context.revision,2);assert.equal(context.timezone,'Asia/Shanghai');
assert.notEqual(context.contextIdSha256,baseline.native.contextIdSha256);
assert.notEqual(context.contextFingerprint,baseline.native.contextFingerprint);
for(const stage of ['v30-public-19-context','v30-m63-source-context','v30-source-back-context'])assert.deepEqual(value(stage),context,stage);
for(const stage of ['v30-m63-medium-frame','v30-m63-medium-return-frame','v30-source-back-presented-frame','v30-frozen-final-frame'])
 assert.match(value(stage).presentedCanvasLabel,/0\.15 度.*4082.*2026-09-29T11:00:00\.000Z.*19:00/);
assert.match(value('v30-m63-overview-frame').presentedCanvasLabel,/0\.28 度/);
assert.match(value('v30-m63-refine-step-5').presentedCanvasLabel,/0\.05 度/);
assert.match(value('v30-m63-natural-pick').body,/M 63 · NGC 5055 · Sunflower Galaxy/);
assert.match(value('v30-m63-natural-pick').body,/高度 15\.8°/);
assert.equal(value('v30-source-back-selected-title').title,'M 63');
const source=value('v30-m63-bound-source');
assert.match(source,/M63 · SDSS DR17 历史光学巡天影像/);assert.match(source,/CC BY 4\.0/);
assert.match(source,/fine cutouts show a limited central field/);assert.match(source,/per-pixel and per-band coverage were not measured/);
assert.match(value('v30-m63-medium-credit').imageStatusWxml,/Sloan Digital Sky Survey.*CC BY 4\.0/);
const display=value('v30-frozen-final-display');assert.equal(display.mode,'DAY');assert.equal(display.largeText,false);
assert.equal(display.pagePath,'sky/detail/index');assert.equal(display.pageDepth,2);
const sdk=value('v30-frozen-final-sdk');assert.equal(sdk.SDKVersion,'3.17.4');assert.equal(sdk.platform,'devtools');assert.equal(sdk.enableDebug,false);
const files=stage=>value(stage).files;
const has=(rows,asset)=>rows.some(row=>row.bytes===asset.bytes&&row.md5===asset.md5);
assert(has(files('v30-m63-detail-files'),published.levels.DETAIL));assert(has(files('v30-m63-detail-files'),published.levels.MEDIUM));
assert(!has(files('v30-m63-detail-files'),published.levels.OVERVIEW));
for(const stage of ['v30-m63-medium-files','v30-m63-overview-files','v30-source-back-encoded-files']){
 assert(has(files(stage),published.levels.MEDIUM));assert(has(files(stage),published.levels.OVERVIEW));
 assert(!has(files(stage),published.levels.DETAIL));
}
const traffic=value('v30-frozen-final-optical-traffic');assert.equal(traffic.records.length,3);
for(const record of traffic.records){
 assert.equal(record.agentProbe,false);assert.equal(record.status,200);assert.equal(record.downstreamFinished,true);
 assert.equal(record.upstreamEnded,true);assert.equal(record.immutable,true);
 assert(Object.values(published.levels).some(asset=>asset.bytes===record.upstreamBodyBytes&&asset.fieldDegrees===record.imageFieldDegrees));
}
const captures=[];
for(const event of events.filter(event=>event.value?.path?.endsWith('.png'))){
 const row=event.value;assert.equal(await hash(row.path),row.sha256);
 const png=PNG.sync.read(await fs.readFile(row.path));assert.equal(png.width,427);assert.equal(png.height,919);
 captures.push({stage:event.stage,file:path.relative(process.cwd(),row.path).replaceAll('\\','/'),sha256:row.sha256,width:png.width,height:png.height,viewedBy:'root'});
}
assert.equal(captures.length,6);
for(const row of baseline.captures)assert.equal(await hash(row.path),row.sha256);
const crop={left:4,right:423,top:100,bottom:890,scope:'Original 427x919 captures, no resizing; exclude host status bar/capsule/rounded border/home. Cross-version comparisons use separately bound Contexts and public place/time/SDK/rounded FOV, not certified identical exact camera.'};
async function compare(leftPath,rightPath){
 const a=PNG.sync.read(await fs.readFile(leftPath)),b=PNG.sync.read(await fs.readFile(rightPath));
 assert.equal(a.width,b.width);assert.equal(a.height,b.height);
 let changedPixels=0,maxChannelDifference=0;
 for(let y=crop.top;y<crop.bottom;y++)for(let x=crop.left;x<crop.right;x++){
  const offset=4*(y*a.width+x);let changed=false;
  for(let c=0;c<4;c++){const difference=Math.abs(a.data[offset+c]-b.data[offset+c]);changed ||= difference>0;maxChannelDifference=Math.max(maxChannelDifference,difference);}
  changedPixels+=Number(changed);
 }
 return {left:path.basename(leftPath),right:path.basename(rightPath),changedPixels,maxChannelDifference,crop};
}
const pixels={
 mediumBeforeAfter:await compare(baseline.captures.find(row=>row.stage==='optical-boundary-m63-medium-before').path,value('optical-boundary-m63-medium-after').path),
 overviewBeforeAfter:await compare(baseline.captures.find(row=>row.stage==='optical-boundary-m63-overview-before').path,value('optical-boundary-m63-overview-after').path),
 widerFieldReturn:await compare(value('optical-boundary-m63-medium-after').path,value('optical-boundary-m63-medium-before-source').path),
 sourceReturn:await compare(value('optical-boundary-m63-medium-before-source').path,value('optical-boundary-m63-source-back').path),
};
assert(pixels.mediumBeforeAfter.changedPixels>0);assert.equal(pixels.widerFieldReturn.changedPixels,0);assert.equal(pixels.sourceReturn.changedPixels,0);
const runtime=value('v30-frozen-final-runtime');assert.equal(runtime.windows.length,1);assert.equal(runtime.windows[0].Id,25916);
assert.match(runtime.windows[0].MainWindowTitle,/V30-0929$/);assert.equal(runtime.puts,3);assert.deepEqual(runtime.forwardedPutStatuses,[200,200,200]);
assert.equal(runtime.phase,'settled');assert.equal(runtime.heldResourceCount,0);assert.equal(runtime.activeCount,0);
for(const key of ['contextMode','sourceMode','resourceMode'])assert.equal(runtime[key],'pass');
const beforeGpuFile='output/playwright/cloud-sky-optical-boundary-0929/before/result.json';
const afterGpuFile='output/playwright/cloud-sky-optical-boundary-0929/after-r2/result.json';
const beforeGpu=await read(beforeGpuFile),afterGpu=await read(afterGpuFile);
assert.equal(beforeGpu.inputSha256,afterGpu.inputSha256);assert.equal(beforeGpu.rows.length,10);assert.equal(afterGpu.rows.length,10);
assert.equal(beforeGpu.resources.created,beforeGpu.resources.deleted);assert.equal(afterGpu.resources.created,afterGpu.resources.deleted);
for(const row of afterGpu.rows)assert.equal(row.glError,0);
for(const row of afterGpu.comparisons)assert.equal(row.changedCore,0);
const softwareGpu={before:{file:beforeGpuFile,sha256:await hash(beforeGpuFile),cases:beforeGpu.rows.length,resources:beforeGpu.resources},after:{file:afterGpuFile,sha256:await hash(afterGpuFile),cases:afterGpu.rows.length,resources:afterGpu.resources,comparisons:afterGpu.comparisons},scope:afterGpu.scope};
const mapSourceSha256=await hash('apps/wechat-miniapp/src/pages/map/index.scss');assert.equal(mapSourceSha256,candidate.mapSourceSha256);
const result={
 scope:'Sky-only v30 finite optical-field progression through existing two-image native loading and shared registered drawing; public entry/time/search/zoom/natural picking/source return development evidence. Not overall reference/device/performance/final-review acceptance.',
 candidate:{file:candidateFile,recordSha256:await hash(path.join(evidence,candidateFile)),bundle:candidate.bundle,sha256:candidate.fingerprint.sha256,sourceInputsVerified:candidate.sourceInputs.length,changedSkyOwners:candidate.ownerChanges,checks:candidate.checks},
 baseline:{file:baselineFile,sha256:await hash(path.join(evidence,baselineFile)),candidate:baseline.candidate,native:baseline.native},
 trace:{file:traceFile,sha256:sha(traceBytes),events:events.length,frozen:true},captures,published,context,display,sdk,runtime,nativeEncodedFiles:files('v30-source-back-encoded-files'),nativeSdssImageRecords:traffic.records,pixels,softwareGpu,mapSourceSha256,
 reference:baseline.reference,
 toolFailures:events.filter(event=>event.stage==='tool-failure').map(event=>event.value),
 limitations:[
  'All six v30 original captures were viewed by the root agent. Sources-page screenshot shows its initial standard-font content; full SDSS terms are bound by the actual public source-page text readback, not claimed visible in that initial raster.',
  'V30 uses a newly created formal-spot Context, revision 2; it is not V29 revision 3. Public place/time/SDK and rounded FOV agree. Exact native pose/unrounded FOV registration equivalence is not asserted. Source/zoom return comparisons remain within V30 and its identical Context.',
  'Native files prove encoded original asset bytes. Four additional PNG files belong to independent Sky image owners. No decoded/native/GPU memory peak is inferred from these encoded sizes.',
  'Normal real HTTP 200 and parent composition do not repeat or upgrade V29 HTTP failure/cancellation cases, or establish injected native decode/GPU recovery. The scene rejection cases use real software GPU output but are explicitly not native GPU faults.',
  'Native Sky captures remain Canvas-only; public WXML/actions do not establish normal controls/modal overlay composition. Whole-scene quality, source registration/coverage/stripe limits, reference alignment, real orientation/calibration/OS background, Android/iOS/new Moon, official package/cost and final necessary independent review remain open.',
  'Different reference dataset/display and 8-second clock difference, plus an unexpected label, prevent treating the saved reference raster as exactly registered comparison. No DSS adoption, new imagery, pixel editing, inferred missing-data mask or source validity claim.',
  'Software timings are single-trial SwiftShader development observations, not target performance or an improvement claim. Original native/phone and historical evidence retain their original version and conditions.',
 ],
};
await fs.writeFile(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,trace:result.trace,captures:captures.length,pixels,softwareGpu,context,runtime,mapSourceSha256}));
