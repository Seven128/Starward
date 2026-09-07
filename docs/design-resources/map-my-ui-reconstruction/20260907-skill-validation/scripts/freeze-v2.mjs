import fs from 'node:fs/promises';
import path from 'node:path';
import {hash} from '../../../../../.agents/skills/starward-design-resource/scripts/resource-utils.mjs';
const task=path.resolve(import.meta.dirname,'..'),root=process.cwd(),output=path.join(task,'retests/v2/frozen-inputs.json');
try{await fs.access(output);throw Error('frozen-inputs already exists; do not overwrite');}catch(e){if(e.code!=='ENOENT')throw e;}
const run=JSON.parse(await fs.readFile(path.join(task,'run.json'),'utf8')),files=[...run.sourceFiles];
for(const folder of ['retests/v2/frozen','assets/icons'])for(const entry of await fs.readdir(path.join(task,folder),{recursive:true,withFileTypes:true}))if(entry.isFile()){const f=path.join(entry.parentPath,entry.name);files.push({path:path.relative(root,f).replaceAll('\\','/'),sha256:hash(await fs.readFile(f))});}
for(const relative of ['assets/osm-reference.png','assets/icon-sources.json','retests/v2/font-probe/fonts-available.json','requirements.json']){const f=path.join(task,relative);files.push({path:path.relative(root,f).replaceAll('\\','/'),sha256:hash(await fs.readFile(f))});}
await fs.writeFile(output,JSON.stringify({schema:1,version:'design-method-v2',frozenAt:new Date().toISOString(),repository:root,model:run.model,modelPolicy:'inherit calling task model and effort; same in each paired trial',files},null,2)+'\n');console.log(`Frozen v2: ${files.length} exact input files`);
