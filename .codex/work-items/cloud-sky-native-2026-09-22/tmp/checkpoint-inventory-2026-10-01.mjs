import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:32*1024*1024}).trim();
const root='.codex/work-items/cloud-sky-native-2026-09-22';
const files=[...new Set([...git('diff','--name-only','-z').split('\0'),...git('ls-files','--others','--exclude-standard','-z').split('\0')].filter(Boolean))];
const excluded=f=>f.startsWith('.codex/work-items/')||f.startsWith('apps/wechat-miniapp/src/content/settings/')||['workers/miniapp-api/src/outbox-worker.ts','workers/miniapp-api/src/miniapp-infrastructure.test.ts'].includes(f);
const entries=files.map(path=>({path,bytes:statSync(path).size,sha256:createHash('sha256').update(readFileSync(path)).digest('hex'),selected:!excluded(path)}));
writeFileSync(`${root}/tmp/checkpoint-inventory-2026-10-01.json`,JSON.stringify({head:git('rev-parse','HEAD'),branch:git('branch','--show-current'),entries},null,2)+'\n');
writeFileSync(`${root}/tmp/checkpoint-code-paths-2026-10-01.txt`,entries.filter(e=>e.selected).map(e=>e.path).join('\n')+'\n');
const selected=entries.filter(e=>e.selected);
const groups={};for(const e of selected){const key=e.path.startsWith('workers/miniapp-api/assets/')?e.path.split('/').slice(0,4).join('/'):e.path.split('/').slice(0,2).join('/');groups[key]??={files:0,bytes:0};groups[key].files++;groups[key].bytes+=e.bytes;}
console.log(JSON.stringify({total:entries.length,selected:selected.length,groups,largest:[...selected].sort((a,b)=>b.bytes-a.bytes).slice(0,8),excludedNonTask:entries.filter(e=>!e.selected&&!e.path.startsWith('.codex/work-items/')).map(e=>e.path)},null,2));
