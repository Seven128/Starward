import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const task='.codex/work-items/cloud-sky-native-2026-09-22/';
const independent='output/optical-completion-consumer-independent-1002-r5/';
const current='output/science-optical-completion-consumer-1002-r2/';
const supplement='output/optical-completion-consumer-independent-closure-1002-r1/';
const note=task+'evidence/experience-optical-completion-consumer-independent-review-2026-10-02.md';
const sha=async path=>createHash('sha256').update(await fs.readFile(path)).digest('hex');
const read=async path=>JSON.parse(await fs.readFile(path,'utf8'));
const result=await read(independent+'result.json');
assert.equal(result.status,'passed');assert.equal(result.controls.length,10);assert.equal(result.mutants.length,3);
assert.equal(await sha(independent+'result.json'),'87c323f8d8e8ab5e340064c7c22a054da8bc2049d93baaf2ae32c3accd6ead0d');
const before=await read(independent+'binding-before.json'),after=await read(independent+'binding-after.json');
assert.deepEqual(before,after);
for(const entry of before)assert.equal(await sha(entry.path),entry.sha256,entry.path);
const supplemented=await read(supplement+'result.json');
assert.equal(supplemented.status,'passed');assert.equal(supplemented.correctedDefaultOracle.actualPluralConfigured,false);
assert.equal(supplemented.correctedDefaultOracle.inMemoryCorrectPluralDetected,true);
const extraBefore=await read(supplement+'binding-before.json'),extraAfter=await read(supplement+'binding-after.json');
assert.deepEqual(extraBefore,extraAfter);
for(const entry of extraBefore)assert.equal(await sha(entry.path),entry.sha256,entry.path);
assert.equal(await sha(note),'b2c32a7d949a5e8d4e0cafccbce607aa9a3d01584c30353206f7774397fafc9f');
const bindings=await read(current+'bindings.json');
for(const entry of bindings.bindings)assert.equal(await sha(entry.file),entry.sha256,entry.file);
for(const entry of await read(task+'tmp/resume-preserved-hashes-2026-10-01.json'))
  assert.equal(await sha(entry.path),entry.sha256,entry.path);
const output='output/science-optical-completion-consumer-root-join-1002-r2';
await fs.mkdir(output,{recursive:true});
const target=output+'/result.json';
await fs.writeFile(target,JSON.stringify({scope:'Read-only root join of independent controls and current source identities. No controls, GPU or historical tests rerun.',
  independentResult:{path:independent+'result.json',sha256:await sha(independent+'result.json')},
  independentBindings:{path:independent+'binding-before.json',sha256:await sha(independent+'binding-before.json'),count:before.length,beforeAfterExact:true,currentExact:true},
  currentBindings:{path:current+'bindings.json',sha256:await sha(current+'bindings.json'),count:bindings.bindings.length,currentExact:true},
  supplement:{path:supplement+'result.json',sha256:await sha(supplement+'result.json'),bindingSha256:await sha(supplement+'binding-before.json'),count:extraBefore.length,beforeAfterExact:true,currentExact:true},
  note:{path:note,sha256:await sha(note)},
  preserved:6,
  gapClosed:'Historical r5 singular budget-option detector and three direct-import prebindings remain limited. The separate additive current independent closure checks the correct plural option with a useful mutation and the three actual owner functions; old r5 is unchanged.'},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({target,sha256:await sha(target),independentCurrent:before.length,currentSources:bindings.bindings.length,preserved:6}));
