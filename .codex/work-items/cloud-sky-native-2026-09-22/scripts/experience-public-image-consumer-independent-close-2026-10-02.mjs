/** Readback/freeze only; no HTTP, production writes or runtime certification. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const ROOT=fileURLToPath(new URL('../../../../',import.meta.url));
const file=name=>path.join(ROOT,name);
const bound=name=>{const raw=fs.readFileSync(file(name));return{path:name,bytes:raw.length,sha256:createHash('sha256').update(raw).digest('hex')}};
const read=name=>JSON.parse(fs.readFileSync(file(name),'utf8'));
const expected={6:'d31551bd611bfdc15e949c1d8cd7873df4602cefec3d2cb4b494415cc585a60d',
  7:'7477ea7cd343d125aae9516925a3199e7c6d870d65946676606fca5107fcee96',
  8:'b702ee2d32c26db318a1a78331378231ea107616a1a645316783b0df821aab81',
  9:'ece9b5134c8917ebde1190d3a34c921df1fc6decceac132fd2b431200719d1be',
  10:'bb921f1cc6db1c97ea962e888426368c859ce7310e328c4e1de0f284a1102c87',
  11:'17aedc17845868814bfb8c3166e1d8307a0659d40f5e50264b2d848581c86784'};
const prefix='output/sky-public-image-launch-clear-independent-1002-r';
const reviewed=Object.keys(expected).map(n=>{const p=prefix+n+'/review.json';assert.equal(bound(p).sha256,expected[n]);return{generation:Number(n),review:bound(p),status:read(p).status}});
const current=read(prefix+'11/review.json'),binding=read(prefix+'11/binding.json');
assert.equal(bound(prefix+'11/binding.json').sha256,'dabd805d046fa1090c225ccfdf02c70c9b8e442639f4f9116c96000edab95026');
assert.equal(current.status,'INDEPENDENT_APP_CLEAR_HOOK_CONTROLLED_INTEGRATION_PASS');
assert.equal(current.cases.length,11);assert.ok(current.cases.every(c=>c.status==='PASS'));
assert.deepEqual(binding.inputsBefore,binding.inputsAfter);assert.equal(binding.inputsBefore.length,228);assert.equal(binding.unchanged,true);
for(const input of binding.inputsAfter)assert.deepEqual(bound(input.path),input);
const actual6=read(prefix+'6/review.json'),actual8=read(prefix+'8/review.json');
assert.equal(actual6.status,'FAILED_ACTUAL_CLEAR_FENCE');assert.equal(actual8.status,'FAILED_ACTUAL_INTEGRATION');
assert.ok(actual6.cases.some(c=>c.bugDetected));assert.ok(actual8.cases.some(c=>c.bugDetected));
const protectedPaths=new Set(binding.inputsAfter.map(i=>i.path));
function inventory(name){for(const entry of fs.readdirSync(file(name),{withFileTypes:true})){
  const p=name+'/'+entry.name;if(entry.isDirectory())inventory(p);else if(entry.isFile())protectedPaths.add(p);
}}
for(let n=1;n<=11;n++)inventory(prefix+n);
for(const name of ['output/sky-public-consumer-cancel-before-1002-r1','output/sky-public-image-consumer-integration-1002-r1','output/sky-public-image-consumer-integration-1002-r2'])inventory(name);
const task='.codex/work-items/cloud-sky-native-2026-09-22/';
for(const p of ['evidence/experience-public-image-consumer-independent-review-2026-10-02.md',
  'evidence/experience-public-image-consumer-integration-2026-10-02.md',
  'evidence/experience-public-image-launch-clear-integration-2026-10-02.md',
  'evidence/experience-public-image-cache-independent-review-2026-10-02.md',
  'scripts/experience-public-image-launch-clear-independent-2026-10-02.mts',
  'scripts/experience-public-image-consumer-independent-close-2026-10-02.mjs'])protectedPaths.add(task+p);
for(const p of ['apps/wechat-miniapp/src/services/sky-public-image-cache.test.ts',
  'apps/wechat-miniapp/src/services/sky-image-file-session.test.ts','apps/wechat-miniapp/src/services/api-cache-clear.test.ts',
  'apps/wechat-miniapp/src/features/sky/sky-artwork-request.test.ts','apps/wechat-miniapp/src/features/sky/sky-native-image-owner.test.ts',
  'apps/wechat-miniapp/src/features/sky/sky-native-image-chain.test.ts','apps/wechat-miniapp/src/features/sky/sky-public-native-consumer.test.ts'])protectedPaths.add(p);
const before=[...protectedPaths].sort().map(bound);
const git=args=>{const r=spawnSync('git',args,{cwd:ROOT,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim()};
const branch=git(['branch','--show-current']),head=git(['rev-parse','HEAD']);
assert.equal(branch,'codex/remote-main-20260908');assert.equal(head,'72e65cf309d700cb7d40c5b7afd53660fd39fa35');
const output=process.argv[2];assert.ok(output?.startsWith('output/'));assert.ok(!fs.existsSync(file(output)));fs.mkdirSync(file(output));
fs.copyFileSync(fileURLToPath(import.meta.url),file(output+'/executed-script.mjs.txt'),fs.constants.COPYFILE_EXCL);
const save=(name,value)=>fs.writeFileSync(file(output+'/'+name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const status={status:'INDEPENDENT_CONSUMER_REVIEW_FROZEN',scope:'Actual output readback and before/after freeze only; not native/device/GPU/quality/performance acceptance',
  branch,head,reviewed,currentReview:bound(prefix+'11/review.json'),currentBinding:bound(prefix+'11/binding.json'),
  note:bound(task+'evidence/experience-public-image-consumer-independent-review-2026-10-02.md'),
  oldProductionFailuresPreserved:true,currentControlledMechanisms:current.cases.map(c=>({name:c.name,status:c.status})),
  currentBoundInputs:228,selectedW3NotMigrated:true,sixPreservedAnd201DeepSkyUnchanged:true};
save('review.json',status);
const after=[...protectedPaths].sort().map(bound);assert.deepEqual(after,before);
save('binding.json',{script:bound(output+'/executed-script.mjs.txt'),review:bound(output+'/review.json'),inputsBefore:before,inputsAfter:after,unchanged:true});
console.log(JSON.stringify({review:bound(output+'/review.json'),binding:bound(output+'/binding.json'),note:status.note,protectedFiles:before.length,unchanged:true}));
