import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const paths=['use-sky-moon-texture.ts','use-sky-mars-texture.ts','use-sky-mercury-texture.ts','use-sky-opal-bands.ts','use-sky-galactic-image.ts','sky-native-image-owner.test.ts','use-sky-moon-texture.test.ts','use-sky-opal-bands.test.ts'].map(name=>'apps/wechat-miniapp/src/features/sky/'+name);
paths.push('project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md');
const previous=JSON.parse(await fs.readFile(task+'/evidence/experience-twilight-gradient-binding-2026-10-01.json','utf8'));
const prefix=await fs.readFile(previous.trace.path),raw=await fs.readFile(task+'/evidence/experience-current-native-events-2026-10-01.jsonl');
assert(raw.subarray(0,prefix.length).equals(prefix));
const rows=[];
for(const file of paths){const bytes=await fs.readFile(file),beforePath=task+'/tmp/fixed-image-cold-before-'+file.split('/').at(-1);await fs.writeFile(beforePath,bytes,{flag:'wx'});rows.push({path:file,beforePath,bytes:bytes.length,sha256:sha(bytes)});}
await fs.writeFile(task+'/evidence/experience-fixed-image-cold-before-source-2026-10-01.json',JSON.stringify({at:new Date().toISOString(),sources:rows,traceBefore:{bytes:raw.length,sha256:sha(raw),eventCount:raw.toString().trim().split(/\r?\n/).length},previous1113PrefixUnchanged:true},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({frozenSources:rows.length,eventCount:raw.toString().trim().split(/\r?\n/).length}));
