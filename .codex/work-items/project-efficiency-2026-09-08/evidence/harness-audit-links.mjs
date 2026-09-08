import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fromMarkdown} from 'mdast-util-from-markdown';
const tracked=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const markdown=tracked.filter(p=>p.endsWith('.md')&&(p.startsWith('project_context/')||p.startsWith('.codex/skills/')||p.startsWith('.agents/skills/')||['AGENTS.md','DESIGN.md','docs/source-plan.md','docs/wechat-miniapp-v2-1-1-source.md'].includes(p)));
const broken=[]; let links=0;
for(const file of markdown){
 const ast=fromMarkdown(fs.readFileSync(file,'utf8'));
 function visit(node){
  if(['link','image','definition'].includes(node.type)&&node.url){
   const target=node.url.split('#')[0].split('?')[0];
   if(target&&!/^[a-z][a-z0-9+.-]*:/i.test(target)){
    links++;
    const resolved=path.resolve(path.dirname(file),decodeURIComponent(target));
    if(!fs.existsSync(resolved))broken.push({file,line:node.position?.start.line,target});
   }
  }
  for(const child of node.children??[])visit(child);
 }
 visit(ast);
}
const bySize=new Map(); const dirs={};
for(const file of tracked.filter(p=>p.startsWith('docs/design-resources/'))){
 const size=fs.statSync(file).size; const dir=file.split('/').slice(0,3).join('/');
 dirs[dir]=(dirs[dir]??0)+size;
 if(size>=100_000){const list=bySize.get(size)??[];list.push(file);bySize.set(size,list);}
}
const duplicates=[];
for(const [size,files] of bySize){
 if(files.length<2)continue;
 const hashes=new Map();
 for(const file of files){const hash=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');const list=hashes.get(hash)??[];list.push(file);hashes.set(hash,list);}
 for(const files of hashes.values())if(files.length>1)duplicates.push({size,copies:files.length,redundantBytes:size*(files.length-1),files});
}
const result={markdownFiles:markdown.length,links,broken,largestDesignDirs:Object.entries(dirs).sort((a,b)=>b[1]-a[1]).slice(0,12),duplicateGroups:duplicates.length,duplicateBytes:duplicates.reduce((s,x)=>s+x.redundantBytes,0),largestDuplicates:duplicates.sort((a,b)=>b.redundantBytes-a.redundantBytes).slice(0,6)};
fs.writeFileSync('tmp/harness-audit-links.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({...result,broken:broken.slice(0,24)},null,2));
