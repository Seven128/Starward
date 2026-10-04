/** Bounded actual-caller receipt mutation; controlled producer/process/readiness, no Docker or HTTP. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const ROOT=fileURLToPath(new URL('../../../../',import.meta.url));
const digest=b=>createHash('sha256').update(b).digest('hex');
const bind=name=>{const b=fs.readFileSync(path.join(ROOT,name));return {path:name,bytes:b.length,sha256:digest(b)}};
let output='output/sky-static-qualification-compose-step-1002-r1';for(let n=2;fs.existsSync(path.join(ROOT,output));n++)output=`output/sky-static-qualification-compose-step-1002-r${n}`;
const dir=path.join(ROOT,output);fs.mkdirSync(dir);
const names=['tools/deployment/validate-release-environment.mjs','tools/deployment/release.mjs','tools/deployment/sky-static-consumer.test.mjs','tools/deployment/sky-static-release.mjs'];
const bindings=names.map(bind);names.forEach((n,i)=>fs.copyFileSync(path.join(ROOT,n),path.join(dir,`${i}-${path.basename(n)}.txt`),fs.constants.COPYFILE_EXCL));
fs.copyFileSync(fileURLToPath(import.meta.url),path.join(dir,'executed-script.mjs.txt'),fs.constants.COPYFILE_EXCL);
const result=spawnSync(process.execPath,['tools/run-node.cjs','--test','--test-name-pattern=actual static release receipt loses staging qualification','tools/deployment/sky-static-consumer.test.mjs'],{cwd:ROOT,encoding:'utf8',timeout:20000,maxBuffer:1024*1024});
fs.writeFileSync(path.join(dir,'actual-check.txt'),(result.stdout??'')+(result.stderr??''),{flag:'wx'});
assert.deepEqual(names.map(bind),bindings);
const before=process.argv.includes('--expect-before');assert.equal(result.status,before?1:0);
if(before)assert.match(result.stdout,/Missing expected rejection/);
const value={status:before?'EXPECTED_BEFORE_FAILURE':'PASS',sourceBindings:bindings,exitCode:result.status,check:bind(output+'/actual-check.txt'),
 scope:'Actual executeRelease success receipt, with controlled shared producer/process/readiness. Full receipt qualifies; deleting actual sky-static-compose-config must reject. No network/Docker/deployment/manual publisher adoption.'};
fs.writeFileSync(path.join(dir,'result.json'),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,result:bind(output+'/result.json')},null,2));
