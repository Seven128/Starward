import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {fingerprintBundle} from '../../../../tools/miniapp/release-bundle-artifact.mjs';
const evidence='.codex/work-items/cloud-sky-native-2026-09-22/evidence';
const output=evidence+'/experience-stellar-glare-native-validation-2026-09-29.json';
await assert.rejects(fs.access(output),{code:'ENOENT'});
const digest=data=>createHash('sha256').update(data).digest('hex');
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const candidateFile=evidence+'/experience-combined-clean-v33-candidate-2026-09-29.json';
const candidate=await read(candidateFile);
assert.equal((await fingerprintBundle(path.resolve(candidate.bundle))).sha256,candidate.fingerprint.sha256);
for(const input of [...candidate.sourceInputs,...candidate.testInputs,...candidate.retainedSkyTests])assert.equal(digest(await fs.readFile(input.file)),input.sha256,input.file);
assert.equal(digest(await fs.readFile('apps/wechat-miniapp/src/pages/map/index.scss')),candidate.mapSourceSha256);
const traceFile=evidence+'/experience-stellar-glare-native-2026-09-29.jsonl';
const trace=await fs.readFile(traceFile,'utf8');const events=trace.trim().split(/\r?\n/).map(line=>JSON.parse(line));
const last=stage=>{const event=events.findLast(row=>row.stage===stage);assert(event,'missing native observation '+stage);return event.value;};
assert.equal(last('v32-retired').success,true);
assert.equal(last('v33-full-opened-after-close-completion').type,'newopen');
const context=last('v33-final-context');assert.equal(context.locationKind,'FORMAL_SPOT');assert.equal(context.publicSpotId,'spot:test-published');
assert.equal(context.revision,1);assert.equal(Date.parse(context.selectedAtUtc),Date.parse('2026-09-29T13:00:00Z'));
assert.equal(context.contextIdSha256,'1746aa900d82214c32e47f82da8ebaaed098805083f5a8db9203634ee5a50965');
assert.deepEqual(context,last('v33-full-formal-context'));
for(const stage of ['v33-full-altair-fine','v33-full-altair-fine-restored'])assert.match(last(stage).presentedCanvasLabel,/2\.7 度.*2026-09-29T13:00:00.000Z/);
assert.match(last('v33-full-altair-wide-return').presentedCanvasLabel,/45\.0 度/);
assert.equal(last('v33-fine-actual-blank-cleared').marker,'');assert.equal(last('v33-fine-actual-blank-cleared').hasModal,false);
const picked=last('v33-fine-natural-altair-picked');assert.equal(picked.title,'Altair');assert.equal(picked.hasModal,true);assert.match(picked.marker,/Altair已选中/);
const finalUi=last('v33-full-altair-fine-restored-ui');assert.match(finalUi.marker,/--cross/);assert.match(finalUi.name,/opacity: 1;/);
assert.equal(finalUi.hasModal,false);assert.equal(finalUi.hasList,false);assert.equal(finalUi.hasChoices,false);assert.equal(finalUi.hasTimePanel,false);assert.equal(finalUi.status,'');
const runtime=last('v33-final-native-runtime');assert.equal(runtime.platform,'devtools');assert.equal(runtime.SDKVersion,'3.17.3');assert.equal(runtime.enableDebug,false);
assert.deepEqual(last('v33-final-standard-display-settings'),{displayMode:'DAY',largeText:false});
const services=last('v33-final-owned-services');assert.equal(services.epoch,'2026-09-29T09:14:20.175Z');assert.equal(services.phase,'settled');
for(const key of ['contextMode','resourceMode','sourceMode'])assert.equal(services[key],'pass');assert.equal(services.heldCount,0);assert.equal(services.activeCount,0);
assert.equal(services.contextPuts,4);assert.deepEqual(services.putStatuses,[200,200,200,200]);
const images=[];
async function nativeImage(stage){const record=last(stage);const bytes=await fs.readFile(record.path);assert.equal(digest(bytes),record.sha256);
 const png=PNG.sync.read(bytes);assert.equal(png.width,record.width);assert.equal(png.height,record.height);images.push({stage,...record});return png;}
const lite=await nativeImage('altair-wide');assert.equal(lite.width,192);assert.equal(lite.height,413);
const fine=await nativeImage('altair-fine'),wide=await nativeImage('altair-wide-full'),again=await nativeImage('altair-fine-return');
for(const png of [fine,wide,again]){assert.equal(png.width,427);assert.equal(png.height,919);}
const rect={x:2,y:112,width:423,height:769};let changedPixels=0,maxDifference=0;
for(let y=rect.y;y<rect.y+rect.height;y++)for(let x=rect.x;x<rect.x+rect.width;x++){
 let changed=false;for(let channel=0;channel<4;channel++){const offset=(y*fine.width+x)*4+channel;
  const difference=Math.abs(fine.data[offset]-again.data[offset]);changed||=difference!==0;maxDifference=Math.max(maxDifference,difference);}
 if(changed)changedPixels++;}
const canvasInput=last('v33-fine-natural-canvas-input');const scaleX=fine.width/canvasInput.canvasSize.width,scaleY=fine.height/canvasInput.canvasSize.height;
const center={x:(canvasInput.x-canvasInput.canvasOffset.left)*scaleX,y:(canvasInput.y-canvasInput.canvasOffset.top)*scaleY};
let axes=0,diagonals=0,axisPixels=0,diagonalPixels=0;const crop={x:Math.floor(center.x)-20,y:Math.floor(center.y)-20,width:40,height:40};
// Existing production core radius for Altair/2.67°, read from bound software inputs.
const gpu=await read('output/playwright/cloud-sky-stellar-glare-0929-after/result.json');
const radius=gpu.glyphs.find(glyph=>glyph.reference==='HR:7557').appearance.radiusPx*(scaleX+scaleY)/2;
for(let y=crop.y;y<crop.y+crop.height;y++)for(let x=crop.x;x<crop.x+crop.width;x++){
 const dx=Math.abs(x+.5-center.x),dy=Math.abs(y+.5-center.y),distance=Math.hypot(dx,dy);
 if(distance<3.5*radius||distance>5*radius)continue;
 const offset=(y*fine.width+x)*4;
 const energy=Math.max(0,fine.data[offset]-8)+Math.max(0,fine.data[offset+1]-13)+Math.max(0,fine.data[offset+2]-23);
 if(Math.min(dx,dy)<.8*(scaleX+scaleY)/2){axes+=energy;axisPixels++;}
 if(Math.abs(dx-dy)<.8*(scaleX+scaleY)/2){diagonals+=energy;diagonalPixels++;}
}
const pointPixels={center,crop,radius,axes:axes/Math.max(1,axisPixels),diagonals:diagonals/Math.max(1,diagonalPixels),axisPixels,diagonalPixels};
const record={scope:'Clean v33 official DevTools native Canvas and SDK interaction evidence; ordinary UI composition, phone and final acceptance unverified.',
 candidateFile,candidateSha256:digest(await fs.readFile(candidateFile)),bundleSha256:candidate.fingerprint.sha256,productionInputs:candidate.sourceInputs.length,
 trace:{file:traceFile,sha256:digest(trace),events:events.length},context,runtime,finalUi,canvasInput,images,
 croppedFineReturn:{rect,changedPixels,maxDifference,scope:'Excludes native top/bottom chrome. Same fixed selected time, not continuous motion evidence.'},pointPixels,services,
 actualDevelopmentResults:['Formal public entry, manual view, actual Altair list/position, 45→8.9→2.67→45→2.67 bounded SDK pinch, actual blank deselection and marker-free star picking preserve identity.',
 'Four original captures viewed. Full-window 427×919 native output shows shared bright-star glare; first lite192×413 capture retained only for its own diagnostic scope.'],
 diagnostics:['Initial host cold SDK timeout, raw-tag text matching and wrong task path are tool/fixture diagnostics, not product failures.',
 'Immediate close/open returned reuse while the runtime was subsequently gone; after close completion, newopen restored public navigation. Same persisted Context was actually re-read.',
 'Readonly GPU node introspection through SDK failed, including after correct selector/current page. Exact native point-size range remains unverified; successful production rendering exercises its bound range query.',
 'First pinch calculation assumed25° after locate, but the actual owner retains45° here. Only the later real45→8.9→2.67 sequence is used.'],
 limits:['Ordinary overlay, name/cross/modal/dock and breathing are absent from official captures even when actual nodes are present; cause remains unresolved, no visual-pass claim.',
 'Point-axis statistics are descriptive of the captured crop, not calibrated PSF/photometry, no native matched before-candidate or comparable Stellarium quality pass.',
 'Canvas accessible4039 is the report base-frame count, not4039 native-visible stars or a supplemental coverage count.',
 'SDK touch is not physical finger/device pointing. DevTools simulated iPhone is not iOS-device acceptance.',
 'No true GPU fault/native total memory/performance/official package bytes/usage fees/phone-newMoon/final review acceptance. All prior scope remains.']};
await fs.writeFile(output,JSON.stringify(record,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,sha256:digest(await fs.readFile(output)),events:events.length,images:images.length,contextSha256:context.contextIdSha256,
 croppedFineReturn:record.croppedFineReturn,pointPixels,services}));
