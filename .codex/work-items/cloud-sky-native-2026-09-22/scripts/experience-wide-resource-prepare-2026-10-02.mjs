import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const record=async path=>{const bytes=await fs.readFile(path);return{path,bytes:bytes.length,sha256:sha(bytes)};};
const previous=JSON.parse(await fs.readFile(task+'/evidence/experience-artwork-window-binding-2026-10-01.json','utf8'));
const guarded=new Map();
for(const row of [...previous.preservedRenderingInputs,...previous.productionAndConsumerSources,previous.additionalContext,...previous.newSources]){
  assert.equal((await record(row.path)).sha256,row.sha256,row.path);guarded.set(row.path,row);
}
for(const file of ['use-sky-wide-field-w3.ts','sky-hips-tile-mesh.ts','sky-hips-tile-mesh.test.ts','sky-scene-render.ts','sky-native-image-owner.test.ts']){
  const path='apps/wechat-miniapp/src/features/sky/'+file,bytes=await fs.readFile(path);
  await fs.writeFile('output/playwright/cloud-sky-wide-resource-composition-1002/before-'+file,bytes,{flag:'wx'});
  guarded.set(path,await record(path));
}
for(const row of [...previous.preservedOtherEdits,...previous.byteExactConfigurations])assert.equal((await record(row.path)).sha256,row.sha256,row.path);
await fs.writeFile(task+'/evidence/experience-wide-resource-before-2026-10-02.json',JSON.stringify({at:new Date().toISOString(),
  head:previous.head,branch:previous.branch,productionAndConsumerSources:[...guarded.values()],
  preservedOtherEdits:previous.preservedOtherEdits,byteExactConfigurations:previous.byteExactConfigurations,
  preservedCandidates:previous.preservedCandidates,previousBinding:await record(task+'/evidence/experience-artwork-window-binding-2026-10-01.json'),
  baseline:await record('output/playwright/cloud-sky-wide-resource-composition-1002/result.json')},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({guardedSources:guarded.size,preservedOtherEdits:previous.preservedOtherEdits.length}));
