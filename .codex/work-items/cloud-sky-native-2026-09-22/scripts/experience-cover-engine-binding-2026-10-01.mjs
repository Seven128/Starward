import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fingerprintBundle} from '../../../../tools/miniapp/release-bundle-artifact.mjs';

const task='.codex/work-items/cloud-sky-native-2026-09-22';
const output=task+'/evidence/experience-cover-engine-binding-2026-10-01.json';
const frozen=task+'/evidence/experience-cover-engine-events-frozen-2026-10-01.jsonl';
for(const file of [output,frozen])await assert.rejects(fs.access(file),{code:'ENOENT'});
const record=async file=>{const bytes=await fs.readFile(file);return{path:file.replaceAll('\\','/'),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};};
const previousPath=task+'/evidence/experience-native-composition-boundary-binding-2026-10-01.json';
const previous=JSON.parse(await fs.readFile(previousPath,'utf8'));
for(const row of [...previous.sourceHashes,...previous.preservedOtherEdits])assert.equal((await record(row.path)).sha256,row.sha256,row.path);
const configs=JSON.parse(await fs.readFile(task+'/tmp/cover-engine-configs-2026-10-01.json','utf8'));
for(const row of configs){
  assert.equal((await record(row.path)).sha256,row.beforeSha256);
  assert((await fs.readFile(row.path)).equals(await fs.readFile(row.backup)));
  assert.equal(Object.hasOwn(JSON.parse(await fs.readFile(row.path,'utf8')).setting,'coverView'),false);
  await assert.rejects(fs.access(path.join(path.dirname(row.path),'project.private.config.json')),{code:'ENOENT'});
}
const bundle=await fingerprintBundle(path.resolve(previous.ordinaryWatch.path));assert.equal(bundle.sha256,previous.ordinaryWatch.sha256);
const raw=await fs.readFile(task+'/evidence/experience-current-native-events-2026-10-01.jsonl');
const prefix=await fs.readFile(previous.trace.path);assert(raw.subarray(0,prefix.length).equals(prefix));
assert(!/\?[^"\r\n]*(?:contextId=|spotId=)/.test(raw.toString()));
const events=raw.toString().trim().split(/\r?\n/).map(JSON.parse);
const stage=(name,predicate=()=>true)=>{const row=events.findLast(row=>row.stage===name&&predicate(row.value));assert(row,name);return row.value;};
const geometry=JSON.parse(await fs.readFile(task+'/evidence/experience-native-composition-geometry-2026-10-01.json','utf8'));
const dock=geometry.rows.find(row=>row.selector==='.sky-control-dock');assert.equal(dock.styles.visibility,'visible');assert.equal(dock.styles.opacity,1);assert.equal(dock.styles['z-index'],12);assert.equal(dock.size.width,88);
for(const name of ['composition-canvas-child','cover-engine-true-child']){
  const layout=stage(name+'-layout');assert.equal(layout.size.width,160);assert.equal(layout.size.height,44);assert.equal(layout.offset.left,20);assert.equal(layout.offset.top,400);
  assert.equal(stage(name+'-restored',value=>Boolean(value.canvas)).canvas.children.length,0);
}
const appStart=events.findLastIndex(row=>row.stage==='cover-engine-true-app-running');
const dispatchRestore=events.findLastIndex(row=>row.stage==='cover-engine-restored-compiler-requested');assert(dispatchRestore>appStart);
const start=events.findLastIndex(row=>row.stage==='cover-engine-true-declared');assert(start>previous.trace.eventCount);
assert.equal(events.slice(start).filter(row=>row.stage==='tool-failure').length,0);
const current=stage('cover-engine-restored-native-ready',value=>Boolean(value.canvas));assert.equal(current.canvas.scene,'READY');assert.equal(current.canvas.count,4051);assert.equal(current.canvas.frameAt,'2026-09-30T13:50:33.000Z');
assert.equal(current.selection.length,0);assert.equal(current.modal.length,0);assert.equal(current.time.length,0);
const files=stage('cover-engine-restored-native-files');assert.equal(files.count,10);assert.equal(files.encodedBytes,1789615);
const readback=stage('cold-image-durable-context-readback');assert(readback.revisionUnchanged&&readback.instantUnchanged&&readback.fingerprintUnchanged);assert.equal(readback.revision,1);assert.equal(readback.contextPuts,0);assert.equal(readback.moduleSha256,previous.current.readback.moduleSha256);
const captures=await Promise.all(['user-drag-demonstration-before','user-drag-demonstration-after','composition-canvas-child-diagnostic','composition-canvas-child-restored','cover-engine-true-dispatched','cover-engine-true-observed','cover-engine-true-native-ready','cover-engine-true-child-diagnostic','cover-engine-true-child-restored','cover-engine-restored-dispatched','cover-engine-restored-observed','cover-engine-restored-native-ready'].map(name=>record(task+'/evidence/experience-current-native-'+name+'-2026-10-01.png')));
await fs.writeFile(frozen,raw,{flag:'wx'});
await fs.writeFile(output,JSON.stringify({at:new Date().toISOString(),scope:'Real SDK viewport drag; actual computed geometry; bounded direct Canvas-child diagnostic in original and explicitly true cover-renderer configurations; original configuration and Context restored. No product change or physical-device acceptance.',previous:await record(previousPath),trace:{...await record(frozen),eventCount:events.length,previous414EventPrefixUnchanged:true},sourceHashes:previous.sourceHashes,preservedOtherEdits:previous.preservedOtherEdits,ordinaryWatch:{...previous.ordinaryWatch,unchanged:true},installedPrimarySource:await record(task+'/evidence/experience-cover-engine-installed-source-2026-10-01.json'),geometry:await record(task+'/evidence/experience-native-composition-geometry-2026-10-01.json'),drag:{before:stage('user-drag-demonstration-before',value=>Boolean(value.canvas)),after:stage('user-drag-demonstration-after',value=>Boolean(value.canvas)),inputs:['touchstart','touchmove','touchend'].map(name=>stage('user-drag-demonstration-'+name)),actualImagesVisiblyChanged:true,limits:'Official SDK simulated input, not physical mouse/phone; later configuration compilation re-entered the original North45 view'},canvasChildTrials:{original:{layout:stage('composition-canvas-child-layout'),visible:false,restored:stage('composition-canvas-child-restored',value=>Boolean(value.canvas))},declaredTrue:{layout:stage('cover-engine-true-child-layout'),visible:false,restored:stage('cover-engine-true-child-restored',value=>Boolean(value.canvas))},scope:'One raw native-data diagnostic child, not a migrated or verified React/Taro control'},configuration:{declared:stage('cover-engine-true-declared'),actualTrialApplicationObserved:stage('cover-engine-true-app-running'),actualRestoredApplicationObserved:stage('cover-engine-restored-app-running'),effectiveLiveEngineValue:'UNVERIFIED',ordinarySkyControls:'FAILED_DEVTOOLS',status:'COMPLETED_DECLARATION_COMPILE_LIVE_APPLICATION_PROBE_UNADOPTED',byteExactRestored:configs.map(row=>({name:row.name,path:row.path,sha256:row.beforeSha256,privateOverrideFileExists:false}))},current:{route:current.route,canvas:current.canvas,files,readback,composition:'FAILED_DEVTOOLS',phone:'UNVERIFIED'},captures,scripts:await Promise.all(['experience-native-user-drag-2026-10-01.ps1','experience-native-composition-geometry-2026-10-01.ps1','experience-native-composition-canvas-child-2026-10-01.ps1','experience-native-cover-engine-2026-10-01.ps1'].map(name=>record(task+'/scripts/'+name))),originalChildScript:await record(task+'/tmp/composition-canvas-child-before-engine-stage-2026-10-01.ps1'),references:[{url:'https://docs.taro.zone/docs/components/viewContainer/cover-view',claim:'Taro supports CoverView over native canvas and illustrates native-parent nesting; not proof of this runtime composition'},{url:'https://developers.weixin.qq.com/miniprogram/dev/component/canvas.html',readStatus:'NON_RETRYABLE_OPEN_FAILURE'},{url:'https://developers.weixin.qq.com/miniprogram/dev/component/cover-view.html',readStatus:'NON_RETRYABLE_OPEN_FAILURE'},{url:'https://developers.weixin.qq.com/miniprogram/dev/component/native-component.html',readStatus:'NON_RETRYABLE_OPEN_FAILURE'}],limits:['The installed parser default and schema are primary source, but the live effective engine setting was not exposed','Both tiny diagnostic nodes had real SDK geometry and were absent from the actual images; no root cause or rendering repair is asserted','No IDE/watch/BFF restart, new SDK version, repeated source downloads, phone action, commit/push or adoption','Full visible controls, labels/selection/gesture composition and scientific quality/coverage remain required','No new physical decoded/GPU/OS memory, target performance/cost/package or independent final review evidence; Goal active/unbudgeted/incomplete']},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,eventCount:events.length,sourceHashes:previous.sourceHashes.length,preservedEdits:previous.preservedOtherEdits.length,byteExactConfigurations:configs.length,trial:'COMPLETED_UNADOPTED',current:'North45 READY / 10 files',contextPuts:0,composition:'FAILED_DEVTOOLS'}));
