import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../../../',import.meta.url)),APP=path.join(ROOT,'apps/wechat-miniapp');
const prior='output/local-object-region-development-1002-r1',OUT='output/local-object-region-development-1002-r2';
assert(!fs.existsSync(path.join(ROOT,OUT)));fs.mkdirSync(path.join(ROOT,OUT));
const read=p=>fs.readFileSync(path.join(ROOT,p)),sha=b=>createHash('sha256').update(b).digest('hex');
const json=p=>JSON.parse(read(p)),save=(p,value)=>fs.writeFileSync(path.join(ROOT,OUT,p),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const bind=p=>{const b=read(p);return{path:p,bytes:b.length,sha256:sha(b)};};
const original=json(prior+'/inputs-before.json');assert.deepEqual(json(prior+'/inputs-after.json'),original);
const test='apps/wechat-miniapp/src/features/sky/sky-deep-sky-region.test.ts';
const before=original.map(b=>bind(b.path));
const differences=before.filter((b,i)=>b.sha256!==original[i].sha256);assert.deepEqual(differences.map(b=>b.path),[test]);
before.push(bind(path.relative(ROOT,fileURLToPath(import.meta.url)).replaceAll('\\','/')));
save('inputs-before.json',before);
fs.writeFileSync(path.join(ROOT,OUT,'sky-deep-sky-region.test.ts.txt'),read(test),{flag:'wx'});
const run=(name,args)=>new Promise(resolve=>{
 const log=fs.createWriteStream(path.join(ROOT,OUT,name+'.log'),{flags:'wx'}),started=new Date().toISOString();
 const child=spawn(process.execPath,[path.join(ROOT,'tools/run-node.cjs'),...args],{cwd:APP,
  env:{...process.env,CLOUD_SKY_SCIENCE_PUBLICATION_PATH:path.join(ROOT,'output/sdss-science-optical-writer-1002-r1/publication')}});
 child.stdout.on('data',chunk=>log.write(chunk));child.stderr.on('data',chunk=>log.write(chunk));
 child.on('close',(exit,signal)=>log.end(()=>resolve({name,args,cwd:'apps/wechat-miniapp',started,ended:new Date().toISOString(),exit,signal})));
});
const results=await Promise.all([
 run('region-checks',['--import','tsx','--test','src/features/sky/sky-deep-sky-region.test.ts']),
 run('typecheck',['./node_modules/typescript/lib/tsc.js','--noEmit','-p','tsconfig.json']),
]);
const after=before.map(b=>bind(b.path));assert.deepEqual(before,after);save('inputs-after.json',after);
const priorResult=json(prior+'/check-results.json');assert.equal(priorResult.results.find(r=>r.name==='checks').exit,0);
assert.equal(priorResult.results.find(r=>r.name==='production-replay').exit,0);
const result={status:results.every(r=>r.exit===0)?'PASS_BOUNDED_REGION_DEVELOPMENT':'FAIL',at:new Date().toISOString(),
 node:process.version,typescriptApp:json('apps/wechat-miniapp/node_modules/typescript/package.json').version,
 results,changedFromPrior:differences,unchanged:true,
 repair:'only typed missing-center test input now omits its optional field; no production/contracts change',
 inheritedActualChecks:{result:bind(prior+'/check-results.json'),checks:bind(prior+'/checks.log'),
  graph:bind(prior+'/import-graph.json'),sources:bind(prior+'/inputs-before.json'),scope:'75 current production/consumer checks already passed before this sole typed-fixture repair; original app TS failure retained'},
 actualProductionReplay:{result:bind('output/local-object-region-production-1002-r1/result.json'),
  sources:bind('output/local-object-region-production-1002-r1/inputs-before.json'),
  scope:'actual production region + inverse + cached PNG alpha CPU replay; all source/data inputs unchanged; not rerun for a test typing repair'},
 excluded:['local readability or thresholds','band segmentation','GPU/native/default/quality/final acceptance']};
save('check-results.json',result);console.log(JSON.stringify({status:result.status,results,
 checkResults:bind(OUT+'/check-results.json'),bindings:bind(OUT+'/inputs-before.json'),test:bind(test)}));
assert(results.every(r=>r.exit===0),'repair checks failed; raw logs preserved');
