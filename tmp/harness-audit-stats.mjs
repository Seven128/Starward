import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const root=process.cwd();
const tracked=new Set(execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean));
const roots=['project_context','.codex','.agents','.long-task','docs','tools','tests','artifacts','output','tmp'];
const data=[];
function walk(base){
  const out=[];
  if(!fs.existsSync(base)) return out;
  for(const item of fs.readdirSync(base,{withFileTypes:true})){
    if(item.isSymbolicLink()||item.name==='node_modules'||item.name==='.git'||item.name==='.venv'||item.name==='venvs')continue;
    const p=path.join(base,item.name);
    if(item.isDirectory())out.push(...walk(p));
    else if(item.isFile())out.push({path:path.relative(root,p).replaceAll('\\','/'),bytes:fs.statSync(p).size});
  }
  return out;
}
for(const selected of roots){
  const files=walk(selected);
  const kept=files.filter(x=>tracked.has(x.path));
  data.push({root:selected,files:files.length,bytes:files.reduce((s,x)=>s+x.bytes,0),trackedFiles:kept.length,trackedBytes:kept.reduce((s,x)=>s+x.bytes,0),top:files.sort((a,b)=>b.bytes-a.bytes).slice(0,5)});
}
const textStats=['AGENTS.md','DESIGN.md','project_context/global.md','project_context/context.toml','docs/source-plan.md'].filter(fs.existsSync).map(p=>{const s=fs.readFileSync(p,'utf8');return {path:p,bytes:Buffer.byteLength(s),chars:s.length,lines:s.split('\n').length};});
const contextFiles=walk('project_context').filter(x=>x.path.endsWith('.md'));
const output={data,textStats,contextBodyFiles:contextFiles.length,contextBodyBytes:contextFiles.reduce((s,x)=>s+x.bytes,0)};
fs.writeFileSync('tmp/harness-audit-stats.json',JSON.stringify(output,null,2));
console.log(JSON.stringify(output,null,2));
