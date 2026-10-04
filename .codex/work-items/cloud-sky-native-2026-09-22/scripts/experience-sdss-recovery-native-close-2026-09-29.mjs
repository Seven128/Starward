import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {fingerprintBundle} from '../../../../tools/miniapp/release-bundle-artifact.mjs';
const task=path.resolve('.codex/work-items/cloud-sky-native-2026-09-22'),evidence=path.join(task,'evidence');
const output=path.join(evidence,'experience-sdss-recovery-native-validation-2026-09-29.json');
await assert.rejects(fs.access(output),{code:'ENOENT'});
const hash=async file=>createHash('sha256').update(await fs.readFile(file)).digest('hex');
const read=async file=>JSON.parse(await fs.readFile(path.join(evidence,file),'utf8'));
async function trace(file){const bytes=await fs.readFile(path.join(evidence,file));return {file,sha256:createHash('sha256').update(bytes).digest('hex'),events:bytes.toString().trim().split(/\r?\n/).map(JSON.parse)};}
const before=await trace('experience-sdss-recovery-native-2026-09-29.jsonl'),after=await trace('experience-sdss-recovery-v29-native-2026-09-29.jsonl');
function value(trace,stage){const event=trace.events.findLast(event=>event.stage===stage);assert(event,stage);let result=event.value;while(result&&typeof result==='object'&&'result' in result)result=result.result;return result;}
const candidate=await read('experience-combined-clean-v29-candidate-2026-09-29.json');
assert.equal((await fingerprintBundle(path.resolve(candidate.bundle))).sha256,candidate.fingerprint.sha256);
for(const input of [...candidate.sourceInputs,...candidate.testInputs,...candidate.retainedSkyTests])assert.equal(await hash(input.file),input.sha256,input.file);
const oldCandidate=await read('experience-combined-clean-v28-candidate-2026-09-29.json');assert.equal((await fingerprintBundle(path.resolve(oldCandidate.bundle))).sha256,oldCandidate.fingerprint.sha256);
const context=value(after,'sdss-v29-frozen-final-context');
for(const stage of ['sdss-v29-next-day-context','sdss-v29-source-context','sdss-v29-source-back-context'])assert.deepEqual(value(after,stage),context,stage);
assert.equal(context.revision,2);assert.equal(context.publicSpotId,'spot:test-published');assert.equal(context.localDate,'2026-09-29');
assert.equal(Date.parse(context.selectedAtUtc),Date.parse('2026-09-29T21:00:00Z'));
assert.notEqual(context.contextIdSha256,value(before,'sdss-v28-final-context').contextIdSha256,'a new project has a separate durable native Context');
const display=value(after,'sdss-v29-final-display');assert.equal(display.mode,'DAY');assert.equal(display.largeText,false);assert.equal(display.pagePath,'sky/detail/index');
assert.match(value(after,'sdss-v29-frozen-final-frame').presentedCanvasLabel,/0\.05 度.*4208.*2026-09-29T21:00:00\.000Z.*05:00/);
for(const stage of ['sdss-v29-detail-http-failed-status','sdss-v29-public-retry-still-failed-status'])assert.match(value(after,stage).imageStatusWxml,/Sloan Digital Sky Survey.*影像更新失败，保留已载图 · 重试/);
assert.match(value(before,'sdss-public-retry-still-failed-status').imageStatusWxml,/NASA\/IPAC IRSA.*光学影像不可用 · 重试/);
assert.doesNotMatch(value(after,'sdss-v29-public-retry-recovered-status').imageStatusWxml,/不可用|失败/);
assert.match(value(after,'sdss-v29-natural-m82-pick').body,/M 82 · NGC 3034 · Cigar Galaxy/);
assert.match(value(after,'sdss-v29-bound-source'),/M82 · SDSS DR17 历史光学巡天影像/);assert.equal(value(after,'sdss-v29-source-back-selection'),'M 82');
const published={};
for(const level of ['overview','medium','detail']){const bytes=await fs.readFile('workers/miniapp-api/assets/deep-sky/sdss-m82/M-82-'+level+'.jpg');published[level]={bytes:bytes.length,md5:createHash('md5').update(bytes).digest('hex'),sha256:createHash('sha256').update(bytes).digest('hex')};}
const files=(trace,stage)=>value(trace,stage).files;
const has=(rows,asset)=>rows.some(row=>row.bytes===asset.bytes&&row.md5===asset.md5);
assert(has(files(before,'sdss-failure-retained-native-files'),published.medium));assert(!has(files(before,'sdss-still-failed-retry-native-files'),published.medium));
assert.deepEqual(files(after,'sdss-v29-still-failed-retry-native-files'),files(after,'sdss-v29-failed-detail-native-files'),'the shared Canvas and other encoded image owners survive retry');
assert(has(files(after,'sdss-v29-still-failed-retry-native-files'),published.medium));assert(!has(files(after,'sdss-v29-still-failed-retry-native-files'),published.detail));
assert(has(files(after,'sdss-v29-recovered-native-files'),published.detail));assert(has(files(after,'sdss-v29-recovered-native-files'),published.medium));
const traffic=value(after,'sdss-v29-final-traffic');
const rows=traffic.records.filter(row=>!row.agentProbe&&row.resourceKind==='sdss-optical_image');
const afterSequence=value(after,'sdss-v29-normal-traffic').records.at(-1).sequence;
const faults=rows.filter(row=>row.sequence>afterSequence&&row.status===503&&row.controlledFault==='sdss-detail-reject-before-upstream');assert.equal(faults.length,2,'first failure plus one actual public retry, not an automatic loop');
assert(rows.some(row=>row.sequence>faults.at(-1).sequence&&row.status===200&&row.upstreamBodyBytes===published.detail.bytes&&row.imageFieldDegrees===.05688888888888889));
assert.equal(traffic.resourceMode,'pass');assert.equal(traffic.active.length,0);assert.equal(traffic.heldResourceCount,0);
const runtime=value(after,'sdss-v29-final-runtime');assert.equal(runtime.windows.length,1);assert.match(runtime.windows[0].MainWindowTitle,/V29/);assert.equal(runtime.puts,1);assert.deepEqual(runtime.forwardedPutStatuses,[200]);
for(const key of ['contextMode','sourceMode','resourceMode'])assert.equal(runtime[key],'pass');
const captures=[];
for(const [name,trace] of [['v28',before],['v29',after]])for(const event of trace.events.filter(event=>event.value?.path?.endsWith('.png'))){const row=event.value;assert.equal(await hash(row.path),row.sha256);const png=PNG.sync.read(await fs.readFile(row.path));assert.equal(png.width,427);assert.equal(png.height,919);captures.push({candidate:name,stage:event.stage,file:path.relative(process.cwd(),row.path).replaceAll('\\','/'),sha256:row.sha256,width:png.width,height:png.height});}
const crop={left:4,right:423,top:100,bottom:890,scope:'Within each candidate only; no resizing or cross-SDK/candidate pixel equivalence; excludes host system bars/capsule/rounded border'};
async function compare(trace,leftStage,rightStage){const a=PNG.sync.read(await fs.readFile(value(trace,leftStage).path)),b=PNG.sync.read(await fs.readFile(value(trace,rightStage).path));let changedPixels=0,maxChannelDifference=0;for(let y=crop.top;y<crop.bottom;y++)for(let x=crop.left;x<crop.right;x++){const offset=4*(y*a.width+x);let changed=false;for(let c=0;c<4;c++){const d=Math.abs(a.data[offset+c]-b.data[offset+c]);changed||=d>0;maxChannelDifference=Math.max(maxChannelDifference,d);}changedPixels+=Number(changed);}return {leftStage,rightStage,changedPixels,maxChannelDifference,crop};}
const pixels={beforeRetry:await compare(before,'sdss-recovery-m82-detail-http-failed','sdss-recovery-m82-retry-still-failed'),beforeSourceBack:await compare(before,'sdss-recovery-m82-v28-recovered','sdss-recovery-m82-v28-source-back'),afterRetry:await compare(after,'sdss-m82-detail-http-failed','sdss-m82-retry-still-failed'),afterRecovery:await compare(after,'sdss-m82-retry-still-failed','sdss-m82-recovered'),afterSourceBack:await compare(after,'sdss-m82-recovered','sdss-m82-source-back'),afterSecondSourceBack:await compare(after,'sdss-m82-recovered','sdss-m82-second-source-back')};
assert(pixels.beforeRetry.changedPixels>0);assert.equal(pixels.afterRetry.changedPixels,0);assert(pixels.afterRecovery.changedPixels>0);assert.equal(pixels.afterSourceBack.changedPixels,0);assert.equal(pixels.afterSecondSourceBack.changedPixels,0);
assert.equal(await hash('apps/wechat-miniapp/src/pages/map/index.scss'),'81283f7b2849cd55eed4a82d322885e1c76d7f8aa81ab26fc2fc584d198c0e82');
const result={scope:'Native Sky SDSS public HTTP failure/retry/coarse-preservation/source-return development evidence. Actual bytes/native encoded digests and original Canvas pixels; not phone, target memory/frame-time, native decode/GPU fault injection, weak-network cancellation or whole-experience acceptance.',candidate:{bundle:candidate.bundle,fingerprint:candidate.fingerprint.sha256},traces:[before,after].map(trace=>({file:trace.file,sha256:trace.sha256,events:trace.events.length,frozen:true})),captures,published,context,display,runtime,nativeOpticalImageRecords:rows,pixels,toolFailures:after.events.filter(event=>event.stage==='tool-failure').map(event=>event.value),retiredTransport:await read('experience-sdss-proxy-replacement-2026-09-29.json'),stagingTransport:await read('experience-sdss-fault-transport-check-2026-09-29.json'),limitations:['Historical v28 viewport evidence used SDK3.17.3; current v29 readback is SDK3.17.4. This round did not capture v28 SDK. No matched-SDK or cross-candidate pixel claim. The actual page regression fails before the source correction and within-v29 retry equality is independent of that cross-candidate limitation.','Native Sky screenshots remain Canvas-only: read native WXML and executed public SDK actions do not establish ordinary overlay composition. Source page native readability is viewed separately.','Only M82 is the native optical representative here; six admitted targets and actual broader scientific/quality coverage are not reduced to it.','GPU-reset branch has controlled shared-owner/decode/upload/page-consumer evidence; no injected native GPU fault or target acceptance. Final independent review of these changes remains open.']};
await fs.writeFile(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,traces:result.traces,captures:captures.length,pixels,nativeFaultRequests:faults.length,finalContext:context,runtime}));
