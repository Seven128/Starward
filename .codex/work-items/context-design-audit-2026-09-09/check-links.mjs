import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const files=execFileSync('git',['diff','HEAD','--name-only'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(f=>f.endsWith('.md'));
const broken=[]; let count=0;
for(const file of files){
 const s=fs.readFileSync(file,'utf8');
 for(const m of s.matchAll(/\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)){
  const href=m[1].replace(/^<|>$/g,'');
  if(/^(https?:|mailto:|app:|codex:)/.test(href))continue;
  const [p,hash]=href.split('#');
  const target=p?path.resolve(path.dirname(file),decodeURIComponent(p)):path.resolve(file);
  count++;
  if(!fs.existsSync(target)){broken.push({file,href,reason:'missing path'});continue;}
  if(hash&&target.endsWith('.md')){
   const body=fs.readFileSync(target,'utf8');
   const ids=[...body.matchAll(/^#{1,6}\s+(.+)$/gm)].map(x=>x[1].toLowerCase().replace(/[`*_]/g,'').replace(/[^\p{L}\p{N}\s_-]/gu,'').trim().replace(/ /g,'-'));
   if(!ids.includes(decodeURIComponent(hash))&&!body.includes(`id="${hash}"`))broken.push({file,href,reason:'anchor needs review'});
  }
 }
}
console.log(JSON.stringify({files:files.length,localLinks:count,issues:broken},null,2));
