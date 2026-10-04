import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
const ROOT=fileURLToPath(new URL('../../../../',import.meta.url));
const out='output/public-image-demand-type-boundary-fix-1003-r1';
const sha=b=>createHash('sha256').update(b).digest('hex');
const load=async p=>JSON.parse(await fs.readFile(path.resolve(ROOT,p),'utf8'));
const bind=async p=>{const b=await fs.readFile(path.resolve(ROOT,p));return {path:p,bytes:b.length,sha256:sha(b)};};
const before=await load(out+'/inputs-before.json');
const after=await Promise.all(before.map(x=>bind(x.path)));
assert.deepEqual(before,after);
await fs.writeFile(path.join(ROOT,out,'inputs-after.json'),JSON.stringify(after,null,2),{flag:'wx'});
const receipts=await load(out+'/original-tool-check-receipts.json');
assert.equal(receipts.checks.length,3);
const checks=[];
for(const x of receipts.checks){
 assert.equal(x.status,'fulfilled');const {id,cmd,workdir,receipt,completion}=x.value;
 const final=completion??receipt;assert.equal(final.exit_code,0,id);
 checks.push({id,cmd,workdir,exitCode:final.exit_code,toolChunk:final.chunk_id,log:await bind(out+'/'+id+'.log')});
}
const behavior=await fs.readFile(path.join(ROOT,out,'shared-cache-consumers.log'),'utf8');
assert(behavior.includes('ℹ pass 18')&&behavior.includes('ℹ fail 0'));
const require=createRequire(path.join(ROOT,'workers/miniapp-api/package.json')),ts=require('typescript');
const original=await load('output/public-image-demand-type-boundary-probe-1003-r1/result.json');
const emitted=[];
for(const x of original.emittedJavaScript){
 const s=await fs.readFile(path.join(ROOT,x.path),'utf8');
 const js=ts.transpileModule(s,{fileName:x.path,compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,removeComments:true}}).outputText;
 assert.equal(sha(js),x.originalJsSha256,x.path);
 emitted.push({path:x.path,current:await bind(x.path),identicalToOriginalJavaScript:true,javaScriptSha256:sha(js)});
}
const adoption=await load(out+'/adoption.json');
for(const x of adoption.files)assert.equal((await bind(x.source)).sha256,x.candidateSha256);
const baseline=await load('.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json');
const retained=await Promise.all(baseline.map(async x=>{const current=await bind(x.path);assert.equal(current.sha256,x.sha256);return current;}));
const head=execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim();
const branch=execFileSync('git',['branch','--show-current'],{cwd:ROOT,encoding:'utf8'}).trim();
assert.equal(head,'72e65cf309d700cb7d40c5b7afd53660fd39fa35');assert.equal(branch,'codex/remote-main-20260908');
const result={status:'PASS_TYPE_BOUNDARY_SOURCE_AND_CHANGED_CHECKS',date:'2026-10-03',head,branch,beforeAfterEqual:true,inputs:before.length,checks,emitted,retained,probe:await bind('output/public-image-demand-type-boundary-probe-1003-r1/result.json'),independentReview:await bind('output/public-image-demand-type-boundary-independent-1003-r1/result.json'),receipts:await bind(out+'/original-tool-check-receipts.json'),limits:['Actual full worker and App TypeScript 5.9.3 commands passed after adoption; original seven-error receipt remains historical failure','Three changed files generate byte-identical declared JavaScript; no cache/lease/cancellation/budget/runtime policy change','Pre-check inventory is the original diagnostic compiler graph plus explicit inputs, not the entire App vendor graph','No new GPU, WeChat/native, full experience, image quality, server capacity or final acceptance']};
await fs.writeFile(path.join(ROOT,out,'result.json'),JSON.stringify(result,null,2),{flag:'wx'});
console.log(JSON.stringify({status:result.status,inputs:result.inputs,checks:checks.map(x=>({id:x.id,exit:x.exitCode})),retained:retained.length,result:await bind(out+'/result.json')}));
