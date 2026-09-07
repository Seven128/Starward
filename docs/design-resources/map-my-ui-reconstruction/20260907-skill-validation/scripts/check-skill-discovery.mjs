import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
const executable='C:/Users/777/AppData/Local/Programs/OpenAI/Codex/bin/codex.exe';
const child=spawn(executable,['app-server','--stdio'],{cwd:process.cwd(),windowsHide:true,stdio:['pipe','pipe','pipe']});
const send=(method,params,id)=>child.stdin.write(JSON.stringify({jsonrpc:'2.0',method,params,...(id ? {id} : {})})+'\n');
let buffer='',finished=false;
const timer=setTimeout(()=>{child.kill(); if(!finished) {console.error('skills/list timed out');process.exitCode=1;}},30000);
child.stderr.on('data',()=>{});
child.stdout.on('data',async chunk=>{
  buffer+=chunk;
  while(buffer.includes('\n')) {
    const index=buffer.indexOf('\n'),line=buffer.slice(0,index);buffer=buffer.slice(index+1);
    let value;try{value=JSON.parse(line);}catch{continue;}
    if(value.id===1) {send('initialized',{});send('skills/list',{cwds:[process.cwd()],forceReload:true},2);}
    if(value.id===2) {
      finished=true;clearTimeout(timer);
      const matches=(value.result?.data ?? []).flatMap(entry=>(entry.skills ?? []).filter(skill=>skill.name==='starward-design-resource'));
      const result={checkedAt:new Date().toISOString(),source:'codex-cli 0.144.5 app-server skills/list',matches,error:value.error ?? null};
      await fs.writeFile(path.resolve(import.meta.dirname,'../skill-discovery.json'),JSON.stringify(result,null,2)+'\n');
      console.log(JSON.stringify(result,null,2));child.kill();
      if(matches.length!==1)process.exitCode=1;
    }
  }
});
send('initialize',{clientInfo:{name:'starward-skill-discovery',version:'1.0.0'},capabilities:{experimentalApi:true}},1);
