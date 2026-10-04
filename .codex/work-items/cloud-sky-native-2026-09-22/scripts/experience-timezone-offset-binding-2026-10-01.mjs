import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fingerprintBundle} from '../../../../tools/miniapp/release-bundle-artifact.mjs';

const task='.codex/work-items/cloud-sky-native-2026-09-22';
const base=task+'/evidence/experience-timezone-offset';
const output=base+'-binding-2026-10-01.json';
const frozen=base+'-events-frozen-2026-10-01.jsonl';
const watch=base+'-watch-frozen-2026-10-01.log';
for(const file of [output,frozen,watch])await assert.rejects(fs.access(file),{code:'ENOENT'});
const record=async file=>{const bytes=await fs.readFile(file);return{path:file.replaceAll('\\','/'),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};};
const json=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const previousPath=task+'/evidence/experience-galactic-cold-binding-2026-10-01.json';
const previous=await json(previousPath);
assert.equal(previous.trace.eventCount,875);
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const branch=execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim();
assert.equal(head,previous.head);assert.equal(branch,previous.branch);
const pagePath='apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx';
const testPath='apps/wechat-miniapp/src/features/sky/sky-timezone-label.test.ts';
const changes=new Map();
for(const row of [...previous.preservedRenderingInputs,...previous.productionAndConsumerSources]){
  const current=await record(row.path);
  if(current.sha256!==row.sha256){assert.equal(row.path,pagePath);changes.set(row.path,{path:row.path,beforeSha256:row.sha256,afterSha256:current.sha256});}
}
assert.equal(changes.size,1);
const beforeSource=await json(base+'-before-source-2026-10-01.json');
assert.equal(beforeSource.path,pagePath);
assert.equal((await record(beforeSource.beforePath)).sha256,beforeSource.sha256);
assert.equal(beforeSource.sha256,changes.get(pagePath).beforeSha256);
for(const row of [...previous.preservedOtherEdits,...previous.byteExactConfigurations])assert.equal((await record(row.path)).sha256,row.sha256,row.path);
const preservedCandidates=[];
for(const row of previous.preservedCandidates){const current=await fingerprintBundle(path.resolve(row.path));assert.equal(current.sha256,row.sha256);preservedCandidates.push({path:row.path,sha256:current.sha256,fileCount:current.fileCount});}
const sourcePaths=new Set(previous.productionAndConsumerSources.map(row=>row.path));
for(const file of [testPath,'packages/miniapp-contracts/src/local-time.ts','packages/miniapp-contracts/src/index.ts',
  'apps/wechat-miniapp/src/utils/zoned-date.ts','apps/wechat-miniapp/src/utils/zoned-date.test.ts',
  'apps/wechat-miniapp/src/components/observation-date.test.ts',
  ...['sky-observation-time.test.ts','sky-time-frame.test.ts','sky-route-date-recovery.test.ts'].map(name=>'apps/wechat-miniapp/src/features/sky/'+name)])sourcePaths.add(file);
const productionAndConsumerSources=await Promise.all([...sourcePaths].map(record));
const raw=await fs.readFile(task+'/evidence/experience-current-native-events-2026-10-01.jsonl');
const prefix=await fs.readFile(previous.trace.path);assert(raw.subarray(0,prefix.length).equals(prefix));
assert(!/\?[^"\r\n]*(?:contextId=|spotId=)/.test(raw.toString()));
const events=raw.toString().trim().split(/\r?\n/).map(JSON.parse);
assert.equal(events.length,895);assert.equal(events.slice(875).filter(row=>row.stage==='tool-failure').length,0);
const index=name=>events.findLastIndex(row=>row.stage===name);
const stage=name=>{const row=events[index(name)];assert(row,name);return row.value;};
assert.equal(stage('timezone-offset-compiler-dispatched').success,true);
assert(index('timezone-offset-dispatched')<index('timezone-offset-application-seen'));
assert(index('timezone-offset-application-seen')<index('timezone-offset-entry-reentered-owned-context'));
const instant='2026-09-30T13:50:33.000Z';
const label=stage('timezone-offset-label-verified');assert.equal(label.text,'示例观星点  ·  UTC+8');assert.equal(label.frameAt,instant);
const current=stage('timezone-offset-final-state');assert.equal(current.route,'sky/detail/index');
assert.deepEqual(current.canvas.labelFacts,{presented:true,frameAt:instant,starCount:4051,starState:'AVAILABLE',verticalFovDeg:45});
assert.equal(current.selection.length,0);assert.equal(current.modal.length,0);assert.equal(current.time.length,0);
assert(current.canvas.label.includes('2 个真实目标'));assert(current.canvas.label.includes('手动视角'));
const files=stage('timezone-offset-final-files-encoded-digests');assert.equal(files.failed,0);assert.equal(files.files.length,9);
const encodedBytes=files.files.reduce((sum,row)=>sum+row.encodedBytes,0);assert.equal(encodedBytes,934831);
assert.equal(files.files.find(row=>row.sha1==='fed3e44d011044225ed286bdd359ff5b1bcd044e').requestSequence,1);
const readback=stage('cold-image-durable-context-readback');
assert(readback.revisionUnchanged&&readback.instantUnchanged&&readback.fingerprintUnchanged);
assert.equal(readback.revision,1);assert.equal(readback.contextPuts,0);assert.equal(readback.moduleSha256,previous.native.readback.moduleSha256);
const captures=[];
for(const name of ['dispatched','final']){const row=await record(task+'/evidence/experience-current-native-timezone-offset-'+name+'-2026-10-01.png');assert.equal(row.sha256,stage('timezone-offset-'+name).sha256);captures.push(row);}
const checkNames=['before','before-final','affected','affected-final','affected-final2','typecheck','typecheck-final'];
const checks=await Promise.all(checkNames.map(name=>record(base+'-'+name+'-2026-10-01.log')));
const before=await fs.readFile(base+'-before-final-2026-10-01.log','utf8');assert(before.includes('UTC+7:59'));assert(before.includes('fail 3'));
const affected=await fs.readFile(base+'-affected-final2-2026-10-01.log','utf8');assert(affected.includes('pass 19')&&affected.includes('fail 0'));
execFileSync('git',['diff','--check'],{stdio:'pipe'});
const ordinaryWatch=await fingerprintBundle(path.resolve(previous.ordinaryWatch.path));
assert.notEqual(ordinaryWatch.sha256,previous.ordinaryWatch.sha256);
const watchBytes=await fs.readFile(task+'/tmp/weapp-sky-watch-2026-10-01.log');assert(watchBytes.toString().includes('19:03:42'));
await fs.writeFile(frozen,raw,{flag:'wx'});await fs.writeFile(watch,watchBytes,{flag:'wx'});
await fs.writeFile(output,JSON.stringify({at:new Date().toISOString(),scope:'Sky timezone offset presentation uses existing complete local-time fields; seconds/fractions no longer alter offset. Exact instant, Context, GPU and other resources preserved.',head,branch,previous:await record(previousPath),
  trace:{...await record(frozen),eventCount:895,previous875EventPrefixUnchanged:true},
  preservedRenderingInputs:await Promise.all(previous.preservedRenderingInputs.map(row=>record(row.path))),productionAndConsumerSources,sourceChanges:[...changes.values()],beforeSources:[beforeSource],newConsumerTest:await record(testPath),
  preservedOtherEdits:previous.preservedOtherEdits,byteExactConfigurations:previous.byteExactConfigurations,preservedCandidates,
  ordinaryWatch:{path:previous.ordinaryWatch.path,sha256:ordinaryWatch.sha256,fileCount:ordinaryWatch.fileCount,totalBytes:ordinaryWatch.totalBytes,files:ordinaryWatch.files,log:await record(watch),sourceCompileAtLocal:'2026-10-01 19:03:42',scope:'Reused ordinary watch includes six preserved unrelated edits; not a clean candidate or official package.'},
  native:{label,current,files:{...files,count:9,encodedBytes},readback,composition:'FAILED_DEVTOOLS',scope:'Official SDK public render tree shows UTC+8; screenshots were viewed and ordinary WXML still absent. No visible-label or phone acceptance claim.'},
  captures,inspectedCaptureStages:['timezone-offset-dispatched','timezone-offset-final'],checks,
  verifiedExecution:{before:{exitCode:1,pass:1,fail:3,actual:'UTC+7:59 at the original 13:50:33Z and other seconds-sensitive offsets'},affected:{exitCode:0,pass:19,fail:0,scope:'Production helper, exact observation/time-frame/route dates, date component and zoned-date consumers; actual fallback/DST/midnight/invalid inputs.'},miniTypecheck:{exitCode:0},whitespace:{exitCode:0},retainedEarlierFailures:['Initial guessed import harness failure','First implementation invalid-date UTC−NaN corrected by Sky input guard','Root working-directory alias failures corrected by running actual Mini Program consumers from their own workspace'],review:'Primary-agent only; independent shared and final review GAP'},
  scripts:[await record(task+'/scripts/experience-timezone-offset-binding-2026-10-01.mjs')],
  inheritedStrictLocalPixelFailure:{binding:previousPath,pixels:previous.native.pixels,result:'FAILED_UNRESOLVED:209 pixels/maxDelta8; no full camera equivalence established. No new pixel comparison or threshold change.'},
  limits:['Shared local-time owner and its bounded phone fallback were reused without changes; offset caption changes no selected clock, ephemeris, Context or committed intent.',
    'Ordinary Sky WXML composition remains FAILED_DEVTOOLS. The SDK render-tree label is not visible UI evidence.',
    'Whole reference quality/coverage, calibration/journey, Android+iOS/new Moon, firstscreen/frames/total resources/weak network/official package/cost and independent review remain open.',
    'No new download, phone operation, watch/window, candidate replacement, commit/push or deployment. Goal active,unbudgeted,incomplete.']},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,eventCount:895,sourceChanges:[...changes.keys()],offset:'UTC+8',preservedOtherEdits:previous.preservedOtherEdits.length,composition:'FAILED_DEVTOOLS',strictLocalPixels:'FAILED_UNRESOLVED',review:'GAP'}));
