import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const task='.codex/work-items/cloud-sky-native-2026-09-22',dir='output/playwright/cloud-sky-galactic-window-trial-1001-v3';
const result=JSON.parse(await fs.readFile(dir+'/result.json','utf8'));
const addedPre=`        // A partial resident needs its complete source upload to reconstruct.
        // Prefer ordinary textures with equal upload/resident cost under the
        // same budget, then release partial residents if still necessary.
        for (const [key, entry] of entries) {
          if (bytes + size <= byteBudget) break;
          if (entry.texture && !previousFrame.has(key) && entry.bytes >= (skyImageRgbaBytes(key) ?? entry.bytes)) remove(key);
        }
`;
const addedFinish=`      for (const [key, entry] of entries) {
        if (bytes <= byteBudget) break;
        if (entry.texture && entry.bytes >= (skyImageRgbaBytes(key) ?? entry.bytes)) remove(key);
      }
`;
const records=[];
for(const source of result.trialSources){let bytes=await fs.readFile(source.path);if(source.path.endsWith('galactic-textures-trial.ts')){const text=bytes.toString();assert(text.includes(addedPre)&&text.includes(addedFinish));bytes=Buffer.from(text.replace(addedPre,'').replace(addedFinish,''));}
 const sha256=createHash('sha256').update(bytes).digest('hex');assert.equal(sha256,source.sha256);const file=dir+'/'+source.path.split('/').at(-1);await fs.writeFile(file,bytes,{flag:'wx'});records.push({original:source.path,path:file,sha256});}
await fs.writeFile(dir+'/gpu-trial-script-frozen.mts',await fs.readFile(task+'/scripts/experience-galactic-window-gpu-2026-10-01.mts'),{flag:'wx'});
await fs.writeFile(dir+'/candidate-snapshots-binding.json',JSON.stringify({scope:'Exact candidate-source snapshots matching already captured v3 hashes; result.json and bundles unchanged.',records},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({snapshots:records.length,hashes:'equal recorded v3 trial source hashes'}));
