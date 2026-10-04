import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {fingerprintBundle} from '../../../../tools/miniapp/release-bundle-artifact.mjs';

const evidence=path.resolve('.codex/work-items/cloud-sky-native-2026-09-22/evidence');
const output=path.join(evidence,'experience-constellation-local-native-validation-2026-09-29.json');
await assert.rejects(fs.access(output),{code:'ENOENT'});
const hash=async file=>createHash('sha256').update(await fs.readFile(file)).digest('hex');
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const candidate=await read(path.join(evidence,'experience-combined-clean-v31-candidate-2026-09-29.json'));
assert.equal((await fingerprintBundle(path.resolve(candidate.bundle))).sha256,candidate.fingerprint.sha256);
for(const item of [...candidate.sourceInputs,...candidate.testInputs,...candidate.retainedSkyTests])
 assert.equal(await hash(item.file),item.sha256,item.file);
const traceFile='experience-constellation-local-native-2026-09-29.jsonl';
const events=(await fs.readFile(path.join(evidence,traceFile),'utf8')).trim().split(/\r?\n/).map(JSON.parse);
const value=stage=>{const event=events.findLast(row=>row.stage===stage);assert(event,stage);return event.value;};
const frame=stage=>value(stage).presentedCanvasLabel;
const context=value('v31-final-context');
assert.deepEqual(context,value('v31-formal-manual-context'));
assert.equal(context.revision,1);assert.equal(context.publicSpotId,'spot:test-published');
assert.equal(Date.parse(context.selectedAtUtc),Date.parse('2026-09-29T13:00:00Z'));
for(const [stage,fov] of [['v31-local-reference-full','25.0'],['v31-local-fading','15.0'],['v31-local-close','8.9'],['v31-final-frame','25.0']])
 assert(frame(stage).includes(fov+' 度')&&frame(stage).includes('13:00:00.000Z'),stage);
assert.equal(value('retire-v30-project-window').success,true);
assert.equal(value('retire-v30-project-window').winId,'s6');
const native=value('v31-final-native');assert.equal(native.platform,'devtools');
assert.equal(native.enableDebug,false);assert.equal(native.pagePath,'sky/detail/index');
assert.equal(native.mode,'DAY');assert.equal(native.largeText,false);
const runtime=value('v31-final-runtime');
for(const key of ['contextMode','resourceMode','sourceMode'])assert.equal(runtime[key],'pass');
assert.equal(runtime.heldResourceCount,0);assert.equal(runtime.activeCount,0);
const projectProcess=value('v31-project-process');assert.equal(projectProcess.Id,25916);
assert.equal(projectProcess.title,'Starward-Sky-Combined-Clean-V31-0929');
const root=value('v31-final-root-summary');
for(const key of ['hasModal','hasList','hasChoices','hasTimePanel','hasDarkRetry'])assert.equal(root[key],false);
assert.match(root.located,/Altair定位标记/);assert(root.controls.includes('星座：开'));
const captures=[],decoded=new Map();
for(const event of events.filter(row=>row.value?.path?.endsWith('.png'))){
 const item=event.value;assert.equal(await hash(item.path),item.sha256);
 const png=PNG.sync.read(await fs.readFile(item.path));assert.equal(png.width,488);assert.equal(png.height,1057);
 decoded.set(event.stage,png);
 captures.push({stage:event.stage,file:path.relative(process.cwd(),item.path).replaceAll('\\','/'),sha256:item.sha256,width:png.width,height:png.height,viewedBy:'root'});
}
assert.equal(captures.length,8);
const crop={left:4,right:484,top:116,bottom:1030};
function compare(left,right){
 const a=decoded.get(left),b=decoded.get(right);assert(a&&b);
 let changedPixels=0,maxChannelDifference=0,totalChannelDifference=0;
 for(let y=crop.top;y<crop.bottom;y++)for(let x=crop.left;x<crop.right;x++){
  const offset=4*(y*a.width+x);let changed=false;
  for(let channel=0;channel<3;channel++){
   const delta=Math.abs(a.data[offset+channel]-b.data[offset+channel]);
   changed||=delta>0;maxChannelDifference=Math.max(maxChannelDifference,delta);totalChannelDifference+=delta;
  }
  changedPixels+=Number(changed);
 }
 return{left,right,crop,changedPixels,maxChannelDifference,totalChannelDifference};
}
const comparisons={fullOnOff:compare('altair-25-on','altair-25-off'),
 fullOnRestore:compare('altair-25-on','altair-25-restored'),
 fadingOnOff:compare('altair-15-on','altair-15-off'),
 closeOnOff:compare('altair-9-on','altair-9-off'),
 fullCloseFullReturn:compare('altair-25-on','altair-25-return')};
assert(comparisons.fullOnOff.changedPixels>0);assert(comparisons.fadingOnOff.changedPixels>0);
assert.equal(comparisons.fullOnRestore.changedPixels,0);assert.equal(comparisons.closeOnOff.changedPixels,0);
const mapFile='apps/wechat-miniapp/src/pages/map/index.scss';const mapSha=await hash(mapFile);
assert.equal(mapSha,candidate.mapSourceSha256);
const record={scope:'v31 native constellation close-field fade and widening recovery development evidence; Goal active and incomplete.',
 candidate:{file:'experience-combined-clean-v31-candidate-2026-09-29.json',sha256:candidate.fingerprint.sha256,sourceInputsVerified:candidate.sourceInputs.length},
 trace:{file:traceFile,sha256:await hash(path.join(evidence,traceFile)),events:events.length},context,native,finalFrame:frame('v31-final-frame'),root,
 runtime:{...runtime,windows:undefined,process:projectProcess,windowEvidence:'Official new project s7 and explicit prior s6 closure; process title alone does not inventory all windows.'},
 captures,comparisons,scopeGuard:{file:mapFile,sha256:mapSha},
 corrections:['Initial startup RPC errors and unsupported page/dom/nth-child selectors are automation diagnostics, not product defects.',
  'The first runtime process-name filter returned an empty array; direct PID25916 read confirms the Chinese-named DevTools process, not zero windows.',
  'Fresh SDK read is3.17.3; old v30 SDK3.17.4, Context revision3 and427x919 PNGs do not certify this native run.'],
 limits:['FOV is the native rounded vertical FOV;10–25 degrees is initial Miniapp presentation tuning, not a universal Stellarium threshold.',
  'Canvas-only screenshots lack normal DOM label/dock/modal composition; DOM reads do not replace visual acceptance.',
  'On/off and return comparisons use the unmodified original pixel crop excluding changing system clock/capsule/home bar; no image editing or rescaling.',
  'Constellation helper fade does not remove real galaxy/nebula texture or certify deep-sky helper fade, continuous time, selection, star glow or full registration.',
  'Phone/new Moon, pose/background, target performance, actual cloud costs and final independent review remain open.']};
await fs.writeFile(output,JSON.stringify(record,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,events:events.length,captures:captures.length,sha256:record.trace.sha256,comparisons,native,contextSha256:context.contextIdSha256,totalObserved:runtime.totalObserved}));
