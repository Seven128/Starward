/** Metadata-only dependency build. Never imports/executes the prepared owner bundle or draft. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {builtinModules} from 'node:module';
import {build} from 'esbuild';
const ROOT=process.cwd();
const draftPath='.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-continuous-camera-resource-journey-2026-10-02.draft.mts';
const draft=await fs.readFile(draftPath,'utf8');
const hash=b=>createHash('sha256').update(b).digest('hex');
const start=draft.indexOf('const nodePreparationEntry=`')+'const nodePreparationEntry=`'.length;
const stop=draft.indexOf('`;\nconst nodePreparation=await build(',start);
if(start<30||stop<=start)throw Error('exact Node preparation entry not found');
const entry=draft.slice(start,stop).replaceAll('${sky}','apps/wechat-miniapp/src/features/sky/');
if(entry.includes('${'))throw Error('unbound preparation interpolation');
const out='output/continuous-camera-node-preparation-binding-1002-r1';
await fs.mkdir(out);
await fs.copyFile(new URL(import.meta.url),path.join(out,'executed-check.mjs.txt'));
await fs.writeFile(path.join(out,'reviewed-draft.mts.txt'),draft,{flag:'wx'});
await fs.writeFile(path.join(out,'entry.ts.txt'),entry,{flag:'wx'});
try{
 const result=await build({absWorkingDir:ROOT,stdin:{contents:entry,resolveDir:ROOT,sourcefile:'task-node-preparation.ts',loader:'ts'},bundle:true,write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
 await fs.writeFile(path.join(out,'unexecuted-bundle.js'),result.outputFiles[0].text,{flag:'wx'});
 await fs.writeFile(path.join(out,'metafile.json'),JSON.stringify(result.metafile,null,2)+'\n',{flag:'wx'});
 const bindings=[];
 for(const key of Object.keys(result.metafile.inputs)){
  if(key==='task-node-preparation.ts')continue;
  const absolute=path.resolve(ROOT,key),relative=path.relative(ROOT,absolute).replaceAll('\\','/');
  const bytes=await fs.readFile(absolute);
  bindings.push({path:relative,bytes:bytes.length,sha256:hash(bytes),metafileInput:key,resolvedAbsolute:absolute});
 }
 const external=[...new Set(Object.values(result.metafile.outputs).flatMap(o=>o.imports.filter(i=>i.external).map(i=>i.path)))];
 const unbound=external.filter(k=>!builtinModules.includes(k)&&!builtinModules.includes(k.replace(/^node:/,'')));
 if(unbound.length)throw Error('unbound external preparation dependencies: '+JSON.stringify(unbound));
 for(const b of bindings)if(hash(await fs.readFile(b.resolvedAbsolute))!==b.sha256)throw Error('preparation dependency changed during metadata check');
 const report={status:'METADATA_ONLY_BOUND_NO_EXECUTION',draft:{path:draftPath,bytes:Buffer.byteLength(draft),sha256:hash(draft)},virtual:{inputKey:'task-node-preparation.ts',bytes:Buffer.byteLength(entry),sha256:hash(entry)},bindings,externalBuiltinImports:external,warnings:result.warnings,
  scope:'Source dependency metadata and unexecuted output only. No Node preparation owner execution, report projection, browser, Hook, filesystem adapter, image decode, GL or product acceptance.'};
 await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({status:report.status,nonVirtualInputs:bindings.length,externalBuiltinImports:external,warnings:result.warnings.length,reportSha256:hash(await fs.readFile(path.join(out,'result.json')))}));
}catch(e){await fs.writeFile(path.join(out,'failed.json'),JSON.stringify({status:'FAILED_METADATA_ONLY_CHECK',message:String(e),draftSha256:hash(draft),noExecution:true},null,2)+'\n',{flag:'wx'});throw e;}
