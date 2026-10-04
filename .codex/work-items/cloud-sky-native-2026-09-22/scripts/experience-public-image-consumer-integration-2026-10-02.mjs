/** Bounded authored consumer integration evidence; offline and no native runtime. */
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';import {spawnSync} from 'node:child_process';
const ROOT=fileURLToPath(new URL('../../../../',import.meta.url)),script=fileURLToPath(import.meta.url);
const affected=process.argv.includes('--affected-clear');
const read=name=>fs.readFileSync(path.join(ROOT,name));
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const bind=name=>{const body=read(name);return{path:name.replaceAll('\\','/'),bytes:body.length,sha256:hash(body)}};
let output='output/sky-public-image-consumer-integration-1002-r1';
for(let n=2;fs.existsSync(path.join(ROOT,output));n++)output=`output/sky-public-image-consumer-integration-1002-r${n}`;
fs.mkdirSync(path.join(ROOT,output));const out=name=>path.join(ROOT,output,name);
const save=(name,value)=>fs.writeFileSync(out(name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const files=[
  'apps/wechat-miniapp/src/features/sky/use-sky-artwork.ts',
  'apps/wechat-miniapp/src/features/sky/use-sky-optical-hips.ts',
  'apps/wechat-miniapp/src/features/sky/sky-artwork-request.ts',
  'apps/wechat-miniapp/src/features/sky/sky-artwork-loader.ts',
  'apps/wechat-miniapp/src/features/sky/deep-sky-image-request.ts',
  'apps/wechat-miniapp/src/features/sky/sky-public-native-consumer.test.ts',
  'apps/wechat-miniapp/src/features/sky/sky-native-image-owner.test.ts',
  'apps/wechat-miniapp/src/features/sky/sky-native-image-chain.test.ts',
  'apps/wechat-miniapp/src/features/sky/sky-artwork-persistent-file.test.ts',
  'apps/wechat-miniapp/src/app.tsx',
  'apps/wechat-miniapp/src/services/api-client.ts',
  'apps/wechat-miniapp/src/services/api-request-test-support.ts',
  'apps/wechat-miniapp/src/services/api-cache-clear.test.ts',
  'apps/wechat-miniapp/src/services/sky-image-file-session.test.ts',
  'apps/wechat-miniapp/src/services/sky-public-image-cache.ts',
  'apps/wechat-miniapp/src/services/sky-public-image-runtime.ts',
  'apps/wechat-miniapp/src/services/sky-image-bytes.ts',
  'apps/wechat-miniapp/src/services/sky-image-file-session.ts',
  'packages/miniapp-contracts/src/sky-image-display-support.ts',
  'packages/miniapp-contracts/src/sdss-optical-publication.ts',
  'workers/miniapp-api/assets/deep-sky/sdss-m51/manifest.json',
  'workers/miniapp-api/assets/deep-sky/sdss-m51/M-51-overview.jpg',
  'workers/miniapp-api/assets/deep-sky/sdss-m51/M-51-detail.jpg',
];
const before=files.map(bind);
for(let i=0;i<files.length;i++)fs.copyFileSync(path.join(ROOT,files[i]),out(`${String(i).padStart(2,'0')}-${path.basename(files[i])}.txt`),fs.constants.COPYFILE_EXCL);
fs.copyFileSync(script,out('script.mjs.txt'),fs.constants.COPYFILE_EXCL);
const preserved=JSON.parse(read('.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json'));
for(const item of preserved)assert.equal(bind(item.path).sha256,item.sha256);
const assets=[];function walk(dir){for(const e of fs.readdirSync(path.join(ROOT,dir),{withFileTypes:true})){
  const name=dir+'/'+e.name;if(e.isDirectory())walk(name);else if(e.isFile())assets.push(bind(name));}}
walk('workers/miniapp-api/assets/deep-sky');assert.equal(assets.length,201);
const tests=[
  'features/sky/sky-native-image-owner.test.ts','features/sky/sky-public-native-consumer.test.ts',
  'features/sky/sky-artwork-request.test.ts','features/sky/sky-artwork-file-retention.test.ts',
  'features/sky/sky-artwork-persistent-file.test.ts','features/sky/sky-native-image-chain.test.ts',
  'services/sky-public-image-cache.test.ts','services/sky-image-file-session.test.ts',
  'services/api-cache-clear.test.ts','services/response-cache.test.ts','services/request-lifecycle.test.ts','services/delete-transport.test.ts',
].map(name=>'apps/wechat-miniapp/src/'+name);
const env={...process.env,CLOUD_SKY_CACHE_EVIDENCE_OUTPUT:out('.')};delete env.CLOUD_SKY_CACHE_HOOK_MUTATION_SOURCE;
const execute=(args,name,envOverride=env)=>{
  const result=spawnSync(process.execPath,args,{cwd:ROOT,env:envOverride,encoding:'utf8',timeout:60000,maxBuffer:4*1024*1024});
  fs.writeFileSync(out(name+'.txt'),(result.stdout??'')+(result.stderr??''),{flag:'wx'});
  return{args,exitCode:result.status,signal:result.signal,error:result.error?String(result.error):null,log:bind(output+'/'+name+'.txt')};
};
try{
  const selected=affected?['--test-name-pattern','cancel exceptions|native abort throw',tests[1]]:tests;
  const baseline=execute(['tools/run-node.cjs','--import','tsx','--test',...selected],'affected-checks');assert.equal(baseline.exitCode,0);
  const typecheck=execute(['tools/run-node.cjs','apps/wechat-miniapp/node_modules/typescript/lib/tsc.js','--noEmit','-p','apps/wechat-miniapp/tsconfig.json'],'typecheck');assert.equal(typecheck.exitCode,0);
  let mutant=null,mutantSource=null;
  if(!affected){
  const hook=read(files[0]).toString('utf8');
  const branch='        if(resolved.storage!=="session")return startSkyArtworkRequest({asset,canvas,url:resolved.url,\n'+
    '          acquire:()=>acquirePublishedSkyImage({...asset,format:resolved.format},resolved.url,hash),ready,fail});';
  assert.equal(hook.split(branch).length-1,1);
  const mutation=hook.replace(branch,'        /* task-only old mechanism: approved normal hook still writes a session file */');
  fs.writeFileSync(out('hook-session-only-mutant.ts.txt'),mutation,{flag:'wx'});
  const mutantEnv={...process.env,CLOUD_SKY_CACHE_HOOK_MUTATION_SOURCE:out('hook-session-only-mutant.ts.txt')};delete mutantEnv.CLOUD_SKY_CACHE_EVIDENCE_OUTPUT;
  mutant=execute(['tools/run-node.cjs','--import','tsx','--test','--test-name-pattern','full public hook preserves',tests[1]],'hook-old-path-counterexample',mutantEnv);
  assert.notEqual(mutant.exitCode,0);assert.match(read(output+'/hook-old-path-counterexample.txt').toString(),/sky-public-images-v1/);
  mutantSource=bind(output+'/hook-session-only-mutant.ts.txt');
  }
  const after=files.map(bind);assert.deepEqual(after,before);
  for(const item of assets)assert.equal(bind(item.path).sha256,item.sha256);
  for(const item of preserved)assert.equal(bind(item.path).sha256,item.sha256);
  const traces=JSON.parse(read(output+'/consumer-traces.json'));assert.equal(traces.length,affected?3:8);
  const result={status:'PASS',sourceBindings:before,afterBindings:after,script:bind(path.relative(ROOT,script)),baseline,typecheck,
    actualConsumerTraces:bind(output+'/consumer-traces.json'),counterexample:mutant,mutantSource,
    counterexampleMeaning:'Task-only remove approved acquire branch: full normal hook writes legacy session path and does not instantiate public owner; actual namespace/persistence qualification fails.',
    affectedClearSupplement:affected,priorNormalGeneration:affected?bind('output/sky-public-image-consumer-integration-1002-r1/result.json'):null,
    actualBeforeCancelFailures:affected?bind('output/sky-public-consumer-cancel-before-1002-r1/result.json'):null,
    fixtures:before.slice(-3),historicalAssetsUnchanged:assets,preservedUnchanged:preserved,
    scopes:['Full production hook/runtime/App module compiled, actual cache/request/loader and service clear functions executed.',
      'React scheduling/native image callbacks/Taro FS/transport controlled; actual Promise/cache/durable in-memory readback and real published encoded bytes.',
      'Native decode quality, GPU, WEAPP FS across real launches, physical quota and native/frame performance remain unverified.',
      'LOCAL optical fixture explicitly remains session-only; selected W3 discovery/request remains unmodified.']};
  save('result.json',result);
}catch(error){save('failed.json',{status:'FAILED',error:String(error),stack:error.stack,sourceBindings:before});process.exitCode=1;}
console.log(JSON.stringify({output,result:bind(output+(fs.existsSync(out('result.json'))?'/result.json':'/failed.json'))},null,2));
