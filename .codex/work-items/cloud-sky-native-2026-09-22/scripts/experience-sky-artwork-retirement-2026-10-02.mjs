/** Actual core/request/loader and approved source bytes; controlled FS/native decode callbacks. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const ROOT=fileURLToPath(new URL('../../../../',import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
const bind=name=>{const b=fs.readFileSync(path.join(ROOT,name));return {path:name,bytes:b.length,sha256:hash(b)}};
let output='output/sky-artwork-public-retirement-1002-r1';for(let n=2;fs.existsSync(path.join(ROOT,output));n++)output=`output/sky-artwork-public-retirement-1002-r${n}`;
const dir=path.join(ROOT,output);fs.mkdirSync(dir);
const files=['apps/wechat-miniapp/src/features/sky/sky-artwork-request.ts','apps/wechat-miniapp/src/features/sky/sky-artwork-loader.ts',
 'apps/wechat-miniapp/src/features/sky/sky-artwork-public-retirement.test.ts','apps/wechat-miniapp/src/services/sky-public-image-cache.ts',
 'workers/miniapp-api/assets/constellations/lyra.png','apps/wechat-miniapp/src/services/sky-public-image-runtime.ts',
 'apps/wechat-miniapp/src/features/sky/use-sky-artwork.ts','apps/wechat-miniapp/src/features/sky/sky-public-native-consumer.test.ts'];
const before=files.map(bind);files.forEach((n,i)=>{if(!n.endsWith('.png'))fs.copyFileSync(path.join(ROOT,n),path.join(dir,`${i}-${path.basename(n)}.txt`),fs.constants.COPYFILE_EXCL)});
const walk=name=>fs.readdirSync(path.join(ROOT,name),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(name+'/'+e.name):e.isFile()?[bind(name+'/'+e.name)]:[]);
const assets=walk('workers/miniapp-api/assets/deep-sky');assert.equal(assets.length,201);
const preserved=JSON.parse(fs.readFileSync(path.join(ROOT,'.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json'),'utf8'));
for(const item of preserved)assert.equal(bind(item.path).sha256,item.sha256);
fs.copyFileSync(fileURLToPath(import.meta.url),path.join(dir,'executed-script.mjs.txt'),fs.constants.COPYFILE_EXCL);
const isBefore=process.argv.includes('--expect-before');
const tests=isBefore?['src/features/sky/sky-artwork-public-retirement.test.ts']:['src/features/sky/sky-artwork-public-retirement.test.ts','src/features/sky/sky-artwork-request.test.ts','src/features/sky/sky-artwork-loader.test.ts','src/features/sky/sky-artwork-file-retention.test.ts','src/features/sky/sky-native-image-chain.test.ts','src/features/sky/sky-artwork-persistent-file.test.ts','src/features/sky/sky-native-image-owner.test.ts','src/features/sky/sky-public-native-consumer.test.ts','src/features/sky/use-sky-sdss-optical.test.ts'];
const check=spawnSync(process.execPath,[path.join(ROOT,'tools/run-node.cjs'),'--import','tsx','--test',...(isBefore?['--test-name-pattern=actual public ready clear|actual public cold file']:[]),...tests],{cwd:path.join(ROOT,'apps/wechat-miniapp'),encoding:'utf8',timeout:60000,maxBuffer:2*1024*1024});
fs.writeFileSync(path.join(dir,'actual-checks.txt'),(check.stdout??'')+(check.stderr??''),{flag:'wx'});
assert.deepEqual(files.map(bind),before);assert.equal(check.status,isBefore?1:0);
assert.deepEqual(walk('workers/miniapp-api/assets/deep-sky'),assets);for(const item of preserved)assert.equal(bind(item.path).sha256,item.sha256);
if(isBefore){assert.match(check.stdout,/retirement must synchronously withdraw/);assert.match(check.stdout,/cold owner retirement must release/);}
const result={status:isBefore?'EXPECTED_BEFORE_FAILURE':'PASS',sourceBindings:before,exitCode:check.status,check:bind(output+'/actual-checks.txt'),
 oldAssetsUnchanged:assets,preservedFilesUnchanged:preserved,
 scope:'Actual shared core/request/loader with real approved Lyra PNG, controlled FS/native callbacks; ready/cold clear, late callback and explicit retry. Not native memory/quota/GPU or deployment.'};
fs.writeFileSync(path.join(dir,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,result:bind(output+'/result.json')},null,2));
