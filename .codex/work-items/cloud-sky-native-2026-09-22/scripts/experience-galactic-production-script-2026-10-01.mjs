import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const file=task+'/scripts/experience-galactic-production-gpu-2026-10-01.mts';
await assert.rejects(fs.access(file),{code:'ENOENT'});
let source=await fs.readFile(task+'/scripts/experience-galactic-window-gpu-2026-10-01.mts','utf8');
const replace=(from,to)=>{assert(source.includes(from),from.slice(0,90));source=source.replace(from,to);};
replace("const baselineOnly=process.argv.includes('--baseline');",'const baselineOnly=false;');
replace('cloud-sky-galactic-window-trial-1001-v6','cloud-sky-galactic-window-production-1001');
const start=source.indexOf('if(baselineOnly){await assert.rejects(fs.access(output)'),end=source.indexOf('const sha=',start);
assert(start>=0&&end>start);
source=source.slice(0,start)+`await assert.rejects(fs.access(output),{code:'ENOENT'});await fs.mkdir(output,{recursive:true});
for(const name of ['baseline.js','baseline.json'])await fs.writeFile(path.join(output,name),await fs.readFile('output/playwright/cloud-sky-galactic-window-trial-1001-v6-sequence/'+name),{flag:'wx'});
`+source.slice(end);
const pluginsStart=source.indexOf('const trialSources='),pluginsEnd=source.indexOf('const compiled=await build({plugins:trialPlugins,',pluginsStart);
assert(pluginsStart>=0&&pluginsEnd>pluginsStart);
source=source.slice(0,pluginsStart)+'const compiled=await build({'+source.slice(pluginsEnd+'const compiled=await build({plugins:trialPlugins,'.length);
replace("assert.deepEqual(changed,[],'Trial must not edit real production');", "assert.deepEqual(changed.map(row=>row.path).sort(),['sky-galactic-image-window.ts','sky-gpu-renderer.ts','sky-gpu-textures.ts'].map(name=>'apps/wechat-miniapp/src/features/sky/'+name).sort(),'Only adopted Sky owners may change');");
replace("const selected=sequenceMode?steps:[{...commonCondition,name:'common-current'},{...commonCondition,name:'seam-neighbour',at:m42At,fov:85,basis:seamNeighbourBasis}];", `const selected=sequenceMode?steps:[commonCondition,wideCondition,
 {...commonCondition,name:'common-copy-failure',copyFailure:true},
 {...commonCondition,name:'galactic-seam',basis:basisFor(seam)},
 {...commonCondition,name:'galactic-pole',basis:basisFor(pole)},
 {...commonCondition,name:'seam-neighbour',at:m42At,fov:85,basis:seamNeighbourBasis},
 {...wideCondition,name:'wide-failure',failure:'galactic'},
 ...conditions.filter(row=>!['common-dpr3','wide','common-return'].includes(row.name)),
 {...commonCondition,name:'common-return'}];`);
replace('if(sequenceMode)assert.equal(rows[0].variants[1].rgbaSha256,rows.at(-1).variants[1].rgbaSha256);',"if(sequenceMode||rows.at(-1).condition.name==='common-return')assert.equal(rows[0].variants[1].rgbaSha256,rows.at(-1).variants[1].rgbaSha256);");
replace('trialSources,trialRendererSha256:sha(trialRenderer),','');
replace('Unadopted conservative galactic source-window GPU-copy trial versus frozen current production:', 'Actual adopted production source-window/shared-retention owners versus frozen pre-adoption production:');
await fs.writeFile(file,source,{flag:'wx'});
console.log(JSON.stringify({script:file,scope:'actual production owners; frozen original baseline retained'}));
