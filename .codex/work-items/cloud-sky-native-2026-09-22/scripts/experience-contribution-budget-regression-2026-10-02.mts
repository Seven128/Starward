// A bounded actual-before contract regression. No GPU execution/source mutation.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const root=process.cwd(),task='.codex/work-items/cloud-sky-native-2026-09-22',script=path.relative(root,fileURLToPath(import.meta.url)).replaceAll('\\','/');
const out=path.resolve('output/contribution-budget-regression-1002-r1');await assert.rejects(fs.access(out),{code:'ENOENT'});await fs.mkdir(out,{recursive:true});
const owner='apps/wechat-miniapp/src/features/sky/sky-gpu-artwork-contributions.ts',test='apps/wechat-miniapp/src/features/sky/sky-gpu-artwork-contributions.test.ts',snapshot=task+'/tmp/contribution-receipt-before-attribute-repair-2026-10-02.ts';
const sha=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex'),bind=async(p:string)=>{const b=await fs.readFile(p);return {path:p.replaceAll('\\','/'),bytes:b.length,sha256:sha(b)};};
const original=await fs.readFile(snapshot,'utf8');assert.equal(sha(original),'87b33c8dd466488cbaf958c3c0eb5f93aa44c3708daf86a476af97bf24637caf');
const rows:any[]=[],inputs=[script,owner,test,snapshot];
for(const variant of ['before','current']){
  const b=await build({entryPoints:[path.resolve(test)],bundle:true,write:false,metafile:true,platform:'node',format:'cjs',target:'node22',tsconfig:'apps/wechat-miniapp/tsconfig.json',plugins:variant==='current'?[]:[{name:'actual-before-owner',setup(p){p.onLoad({filter:/sky-gpu-artwork-contributions\.ts$/},()=>({contents:original,loader:'ts',resolveDir:path.dirname(path.resolve(owner))}));}}]});
  inputs.push(...Object.keys(b.metafile!.inputs).filter(p=>!p.startsWith('<')));const file=path.join(out,variant+'.cjs');await fs.writeFile(file,b.outputFiles[0]!.contents,{flag:'wx'});
  const r=spawnSync(process.execPath,['--test','--test-reporter=spec','--test-name-pattern=odd-size',file],{cwd:root,encoding:'utf8',timeout:10000});
  await fs.writeFile(path.join(out,variant+'.stdout.log'),r.stdout??'',{flag:'wx'});await fs.writeFile(path.join(out,variant+'.stderr.log'),r.stderr??'',{flag:'wx'});
  rows.push({variant,status:r.status,error:r.error?String(r.error):null,bundle:await bind(file),metafile:b.metafile,stdout:await bind(path.join(out,variant+'.stdout.log')),stderr:await bind(path.join(out,variant+'.stderr.log'))});
}
const result={inputs:await Promise.all([...new Set(inputs)].map(bind)),rows,actualBeforeFailed:rows[0].status===1,currentPassed:rows[1].status===0,scope:'Exact captured production before owner vs current, same strengthened contract test, odd-size budget guard only. Test observes setup entry before swallowed auxiliary failure; no mock GPU/shader proof.'};
await fs.writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({actualBeforeFailed:result.actualBeforeFailed,currentPassed:result.currentPassed,result:await bind(path.join(out,'result.json'))}));assert(result.actualBeforeFailed&&result.currentPassed);
