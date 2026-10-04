import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import path from 'node:path';
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const record=async p=>{const b=await fs.readFile(p);return {path:p,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')};};
const output=task+'/evidence/experience-composition-bounded-trials-binding-2026-10-01.json';
await assert.rejects(fs.access(output),{code:'ENOENT'});
const previous=await read(task+'/evidence/experience-galactic-production-binding-2026-10-01.json');
for(const source of previous.sourceHashes)assert.equal((await record(source.path)).sha256,source.sha256);
for(const retained of previous.preservedOtherEdits)assert.equal((await record(retained.path)).sha256,retained.sha256);
const listFiles=async root=>{const out=[];for(const entry of await fs.readdir(root,{withFileTypes:true})){const full=path.join(root,entry.name);if(entry.isDirectory())out.push(...await listFiles(full));else if(entry.isFile())out.push(full);}return out;};
for(const candidate of previous.preservedCandidates){
 const actual=await listFiles(candidate.path);
 assert.equal(actual.length,candidate.fileCount);
 assert.deepEqual(actual.map(p=>path.relative(candidate.path,p).replaceAll('\\','/')).sort(),candidate.files.map(f=>f.path).sort());
 for(const file of candidate.files){const current=await record(path.join(candidate.path,file.path));assert.equal(current.bytes,file.bytes);assert.equal(current.sha256,file.sha256);}
}
const original='c7e354a4b84ee84c986810c8682e7d51c18bd2608865b0eec110750823d8fea2';
assert.equal((await record('apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx')).sha256,original);
assert.equal((await record(task+'/tmp/composition-cover-trial-original-2026-10-01.bin')).sha256,original);
const trialFiles=await Promise.all([
  'tmp/composition-cover-trial-source-2026-10-01.tsx',
  'tmp/composition-presenter-trial-source-2026-10-01.tsx',
  'evidence/experience-composition-cover-trial-2026-10-01.patch',
  'evidence/experience-composition-presenter-trial-2026-10-01.patch',
].map(p=>record(task+'/'+p)));
assert.equal(trialFiles[0].sha256,'46dde1b5947e48c544505553e1c36fc962e2573faea77f1d560afc2f7415661d');
assert.equal(trialFiles[1].sha256,'7f1a72e2f08f19ab50e1e5bf081c1770acd520d1d93354112088f163c504d5d9');
const raw=await fs.readFile(task+'/evidence/experience-current-native-events-2026-10-01.jsonl');
assert(!/\?[^"\r\n]*(?:contextId=|spotId=)/.test(raw.toString()),'Do not freeze private route query');
const events=raw.toString().trim().split(/\r?\n/).map(JSON.parse);
const stage=name=>events.filter(e=>e.stage===name).at(-1)?.value;
assert(events.some(e=>e.stage==='composition-known-frame-picker-selected'&&e.value.modal&&JSON.stringify(e.value.modal).includes('Alderamin')));
const current=stage('composition-presenter-trial-restored-ready');
assert.equal(current.canvas.scene,'READY');
assert.equal(Date.parse(current.canvas.frameAt),Date.parse('2026-09-30T13:50:33Z'));
const restored=stage('composition-presenter-trial-restored-properties');
assert.deepEqual(restored.probeIds,[]);assert.equal(restored.temporaryDispatcherActive,false);assert.equal(restored.presentationTrialActive,false);
const canvas=stage('composition-presenter-trial-restored-native-canvas');
const native=Array.isArray(canvas)?canvas[0]:canvas;
assert.equal(native.nn,'16');assert.equal(native.p2,'webgl');assert.equal(native.publicUid,'spot-night-sky-scene');
const copy=await read(task+'/evidence/experience-native-presentation-copy-2026-10-01.json');
assert(copy.copied&&copy.mismatchedChannels===0&&copy.glError===0&&copy.cleanup.sourceReset&&copy.cleanup.targetReset);
const frozen=task+'/evidence/experience-composition-bounded-trials-events-frozen-2026-10-01.jsonl';
await fs.writeFile(frozen,raw,{flag:'wx'});
const images=await Promise.all([
 'experience-current-native-composition-known-frame-picker-selected-2026-10-01.png',
 'experience-current-native-composition-canvas-hidden-2026-10-01.png',
 'experience-current-native-composition-canvas-restored-2026-10-01.png',
 'experience-current-native-composition-cover-trial-2026-10-01.png',
 'experience-current-native-composition-cover-trial-restored-2026-10-01.png',
 'experience-current-native-composition-presenter-trial-ready-2026-10-01.png',
 'experience-composition-presenter-window-watchdog-2026-10-01.jpg',
 'experience-composition-presenter-window-closed-2026-10-01.jpg',
 'experience-current-native-composition-presenter-trial-restored-2026-10-01.png',
].map(name=>record(task+'/evidence/'+name)));
assert.equal(images[1].sha256,images[2].sha256);
const references=await Promise.all([
 'experience-reference-m42-science-fov-10p8-2026-10-01.png',
 'experience-reference-m42-science-fov-3p24-2026-10-01.png',
 'experience-reference-m42-science-fov-3p24-stable-2026-10-01.png',
 'experience-reference-m42-science-near-one-2026-10-01.png',
 'experience-reference-m42-science-deep-2026-10-01.png',
 'experience-reference-m42-science-return-2026-10-01.png',
].map(name=>record(task+'/evidence/'+name)));
await fs.writeFile(output,JSON.stringify({at:new Date().toISOString(),scope:'Bounded development composition trials rejected and byte-exact original page restored. Valid viewport input corrects an earlier harness no-hit. Live reference distinguishes scientific imagery from constellation/identity aids. No phone or whole acceptance.',previous:await record(task+'/evidence/experience-galactic-production-binding-2026-10-01.json'),sourceHashes:previous.sourceHashes,preservedOtherEdits:previous.preservedOtherEdits,preservedCandidates:previous.preservedCandidates,trace:{...await record(frozen),eventCount:events.length},trialFiles,images,copy:await record(task+'/evidence/experience-native-presentation-copy-2026-10-01.json'),references,referenceConditions:{url:'https://stellarium-web.org/',locationUi:'NEAR SINGAPORE',clockUi:'2026-10-01 19:47:50',clockPaused:true,timezone:'UNCONFIRMED',fovDefinition:'UNCONFIRMED',object:'M42',returnFovUi:2.36,returnIsIdenticalCamera:false,mismatchedCaptureIndex:1},current:{route:current.route,canvas:current.canvas,nativeCanvas:native,restoredPageSha256:original,temporaryRuntimeFlags:restored},limitations:['DevTools WXML composition failed in official captures and actual window; root cause unproved','Offscreen full-page trial showed a watchdog warning; low JS submission time does not prove presentation health or GPU timing','Scientific reference is qualitative, not a matched camera/pixel/coverage/license acceptance','Physical input, phone composition, source quality, total resources/performance and final independent review remain open']},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({binding:output,events:events.length,sourceCount:previous.sourceHashes.length,preserved:previous.preservedOtherEdits.length,restored:true,devtoolsComposition:'FAILED',phone:'UNVERIFIED',referenceReturnFov:2.36}));
