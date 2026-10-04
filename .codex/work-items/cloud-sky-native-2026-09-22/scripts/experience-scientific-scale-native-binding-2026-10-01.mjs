import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const record=async path=>{const b=await fs.readFile(path);return {path,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')};};
const output=task+'/evidence/experience-scientific-scale-native-binding-2026-10-01.json';
await assert.rejects(fs.access(output),{code:'ENOENT'});
const previous=JSON.parse(await fs.readFile(task+'/evidence/experience-composition-bounded-trials-binding-2026-10-01.json','utf8'));
for(const source of previous.sourceHashes)assert.equal((await record(source.path)).sha256,source.sha256);
for(const retained of previous.preservedOtherEdits)assert.equal((await record(retained.path)).sha256,retained.sha256);
const raw=await fs.readFile(task+'/evidence/experience-current-native-events-2026-10-01.jsonl');
const prefix=await fs.readFile(previous.trace.path);assert(raw.subarray(0,prefix.length).equals(prefix));
assert(!/\?[^"\r\n]*(?:contextId=|spotId=)/.test(raw.toString()));
const events=raw.toString().trim().split(/\r?\n/).map(JSON.parse);
const stage=(name,predicate=()=>true)=>events.filter(e=>e.stage===name&&predicate(e.value)).at(-1)?.value;
for(const name of ['science-scale-m42-time-preview','science-scale-m42-near-one','science-scale-m42-deep','science-scale-m42-return-repaired']){
 const scene=stage(name,v=>v.canvas);
 assert.equal(scene.canvas.scene,'READY');assert.equal(Date.parse(scene.canvas.frameAt),Date.parse('2026-09-30T21:00:00Z'));
 assert(scene.canvas.label.includes('跟踪M 42'));assert(scene.time.some(t=>t.text.includes('预览')));
}
const readback=stage('science-scale-durable-context-string-readback');
assert(readback.revisionUnchanged&&readback.instantUnchanged&&readback.fingerprintUnchanged);
assert.equal(readback.contextPuts,0);assert.equal(readback.revision,1);
assert.equal(stage('science-scale-public-exit-files').count,0);
const current=stage('science-scale-final-restored-ready');assert.equal(current.canvas.scene,'READY');
assert(current.canvas.label.includes('45.0'));assert.equal(Date.parse(current.canvas.frameAt),Date.parse('2026-09-30T13:50:33Z'));
const files=stage('science-scale-final-restored-files');assert.equal(files.count,10);assert.equal(files.encodedBytes,1789615);
const frozen=task+'/evidence/experience-scientific-scale-native-events-frozen-2026-10-01.jsonl';
await fs.writeFile(frozen,raw,{flag:'wx'});
const captures=await Promise.all([
 'science-scale-m42-located','science-scale-m42-first-local','science-scale-m42-above-first-local',
 'science-scale-m42-near-one','science-scale-m42-deep','science-scale-m42-local-return',
 'science-scale-m42-time-cancelled','science-scale-m42-return-repaired','science-scale-final-restored',
].map(name=>record(task+'/evidence/experience-current-native-'+name+'-2026-10-01.png')));
await fs.writeFile(output,JSON.stringify({at:new Date().toISOString(),scope:'Current ordinary native scientific-image scale and held public time preview/cancellation. Real captures and durable Context readback; development only, no physical input or whole acceptance.',previous:await record(task+'/evidence/experience-composition-bounded-trials-binding-2026-10-01.json'),trace:{...await record(frozen),eventCount:events.length},sourceHashes:previous.sourceHashes,preservedOtherEdits:previous.preservedOtherEdits,inputHelper:await record(task+'/scripts/experience-current-native-helpers-2026-10-01.ps1'),captures,readback,current:{route:current.route,canvas:current.canvas,files},encodedHeaders:stage('science-scale-cached-encoded-image-headers'),limits:['Native WXML composition still failed; nodes do not certify visible reticle/name or controls','Held SDK scroll preview and canvas touch streams are not physical combined gestures','Min-FOV clamp and rounded FOV prevent an exact camera/pixel return claim','Scientific origin/coverage and missing versus valid dark data need their publication owners; raw cache namespace is not a source ID','Encoded headers and files do not measure live decoded/native/GPU/OS resources','Phone, whole quality/performance/package/cost and final independent review remain open']},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({binding:output,events:events.length,sources:previous.sourceHashes.length,preserved:previous.preservedOtherEdits.length,durableContextUnchanged:true,contextPuts:0,current:'North45 READY',devtoolsComposition:'FAILED',phone:'UNVERIFIED'}));
