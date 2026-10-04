/** Authored caller regressions + actual Compose parser, offline and no convergence. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {createReleaseEnvironmentFixture} from '../../../../tools/deployment/test-support.mjs';
import {composeExecutor} from '../../../../tools/deployment/compose-runtime.mjs';
import {checkPreviewCompose} from '../../../../tools/deployment/operator-preview-checks.mjs';
import {validateOperatorPreviewEnvironment,validateReleaseEnvironment} from '../../../../tools/deployment/validate-release-environment.mjs';
import {readEnvironmentFile} from '../../../../tools/deployment/env-file.mjs';
const ROOT=fileURLToPath(new URL('../../../../',import.meta.url));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const bind=name=>{const b=fs.readFileSync(path.join(ROOT,name));return {path:name.replaceAll('\\','/'),bytes:b.length,sha256:sha(b)}};
let output='output/sky-static-deployment-integration-1002-r1';for(let n=2;fs.existsSync(path.join(ROOT,output));n++)output=`output/sky-static-deployment-integration-1002-r${n}`;
fs.mkdirSync(path.join(ROOT,output));const out=name=>path.join(ROOT,output,name);
const save=(name,obj)=>fs.writeFileSync(out(name),JSON.stringify(obj,null,2)+'\n',{flag:'wx'});
const files=[...['prepare-release-candidate','validate-release-environment','release','operator-preview','operator-preview-checks','promotion-request','promote-release-candidate',
 'sky-static-release','sky-static-bundle','operator-preview-test-support','sky-static-consumer.test','compose-contract.test'].map(n=>'tools/deployment/'+n+'.mjs'),
 ...['Caddyfile','Caddyfile.operator-preview','compose.yml','compose.operator-preview.yml','sky-resource-logging.caddy','env/deploy.env.example','sky-static-empty.caddy'].map(n=>'infrastructure/deployment/'+n)];
const before=files.map(bind);for(let i=0;i<files.length;i++)fs.copyFileSync(path.join(ROOT,files[i]),out(String(i).padStart(2,'0')+'-'+path.basename(files[i])+'.txt'),fs.constants.COPYFILE_EXCL);
fs.copyFileSync(fileURLToPath(import.meta.url),out('executed-script.mjs.txt'),fs.constants.COPYFILE_EXCL);
const preserved=JSON.parse(fs.readFileSync(path.join(ROOT,'.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json')));
const walk=dir=>fs.readdirSync(path.join(ROOT,dir),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):e.isFile()?[bind(dir+'/'+e.name)]:[]);
const assets=walk('workers/miniapp-api/assets/deep-sky');assert.equal(assets.length,201);for(const x of preserved)assert.equal(bind(x.path).sha256,x.sha256);
function execute(args,name){const r=spawnSync(process.execPath,['tools/run-node.cjs',...args],{cwd:ROOT,encoding:'utf8',timeout:60000,maxBuffer:4*1024*1024});
 fs.writeFileSync(out(name+'.txt'),(r.stdout??'')+(r.stderr??''),{flag:'wx'});return {exitCode:r.status,signal:r.signal,args,log:bind(output+'/'+name+'.txt')};}
const cases=[];
try{
 const tests=['sky-static-consumer','release','operator-preview','promote-release-candidate','promotion-request','prepare-release-candidate','validate-release-environment','compose-contract','compose-runtime','workflow-contract'].map(n=>'tools/deployment/'+n+'.test.mjs');
 const checks=execute(['--test',...tests],'affected-checks');assert.equal(checks.exitCode,0);
 for(const preview of [false,true])for(const configured of [false,true]){
  const f=await createReleaseEnvironmentFixture(preview?{api:{MINIAPP_AUTH_MODE:'LOCAL_TEST',MINIAPP_ACCEPTANCE_MODE:'1',MINIAPP_CORS_ORIGINS:'https://192.0.2.8'},
   deploy:{STARWARD_API_DOMAIN:'192.0.2.8',STARWARD_OPERATOR_PREVIEW_TOKEN:'p'.repeat(43)}}:{});
  try{
   const directory=path.join(ROOT,output,'compose-publication'),overlay=path.join(ROOT,output,'compose.sky-static.yml');
   if(configured){await fsp.appendFile(f.deployPath,`STARWARD_SKY_STATIC_DIRECTORY=${path.join(f.root,'sky-store')}\n`);
    if(!fs.existsSync(overlay))fs.writeFileSync(overlay,`services:\n  caddy:\n    volumes:\n      - type: bind\n        source: ${JSON.stringify(directory)}\n        target: /srv/sky-public\n        read_only: true\n        bind:\n          create_host_path: false\n      - type: bind\n        source: ${JSON.stringify(path.join(directory,'delivery.caddy'))}\n        target: /etc/caddy/sky-static-delivery.caddy\n        read_only: true\n        bind:\n          create_host_path: false\n`,{flag:'wx'});
   }
   const validation=await (preview?validateOperatorPreviewEnvironment:validateReleaseEnvironment)({deployEnvPath:f.deployPath}),deploy=await readEnvironmentFile(f.deployPath);
   const overlays=[...(preview?[path.join(ROOT,'infrastructure/deployment/compose.operator-preview.yml')]:[]),...(configured?[overlay]:[])];
   const calls=[];
   const run=composeExecutor({composePath:path.join(ROOT,'infrastructure/deployment/compose.yml'),overlayPaths:overlays,deployEnvPath:f.deployPath,cwd:ROOT,execute:input=>{
    assert.equal(input.command,'docker');assert.deepEqual(input.args.slice(-3),['config','--format','json']);
    const r=spawnSync(input.command,input.args,{cwd:input.cwd,env:input.env,encoding:'utf8',timeout:15000,maxBuffer:4*1024*1024});
    calls.push({step:input.step,exitCode:r.status,error:r.error?String(r.error):null});if(r.status!==0)throw new Error('compose_config_failed:'+r.stderr);
    return {stdout:Buffer.from(r.stdout),stderr:Buffer.from(r.stderr??'')};
   }});
   const config=JSON.parse(run({args:[...(preview?['--profile','operations']:[]),'config','--format','json'],step:'readonly-compose-config'}).stdout.toString());
   const caddy=config.services.caddy,fragment=caddy.volumes.filter(v=>v.target==='/etc/caddy/sky-static-delivery.caddy'),published=caddy.volumes.filter(v=>v.target==='/srv/sky-public');
   assert.equal(fragment.length,1);assert.equal(fragment[0].read_only,true);
   assert.equal(published.length,configured?1:0);
   assert.equal(path.resolve(fragment[0].source),configured?path.resolve(directory,'delivery.caddy'):path.resolve(ROOT,'infrastructure/deployment/sky-static-empty.caddy'));
   if(configured){assert.equal(published[0].read_only,true);assert.equal(published[0].bind.create_host_path,false);}
   if(preview)checkPreviewCompose(config,validation,deploy,configured?{directory}:null);
   else assert.ok(caddy.ports.some(p=>Number(p.published)===80));
   cases.push({preview,configured,calls,composeProject:config.name,fragment,published,ports:caddy.ports,
    caddyfile:caddy.volumes.find(v=>v.target==='/etc/caddy/Caddyfile'),apiImage:config.services.api.image,overlays});
  }finally{await fsp.rm(f.root,{recursive:true,force:true});}
 }
 assert.deepEqual(files.map(bind),before);assert.deepEqual(walk('workers/miniapp-api/assets/deep-sky'),assets);for(const x of preserved)assert.equal(bind(x.path).sha256,x.sha256);
 save('result.json',{status:'PASS',sourceBindings:before,checks,actualComposeCases:cases,
  failedBefore:bind('output/sky-static-deployment-before-1002-r1/result.json'),preservedUnchanged:preserved,historicalAssetsUnchanged:assets,
  scope:['10 caller states: actual production functions/Promise/file receipt/pointer plus controlled shared preparation/load/verification and process/readiness.',
   'Actual Docker Compose config only for default/configured × ordinary/protected-preview; no pull/build/up/start/stop/image/container mutation or remote calls.',
   'Compose overlay fixture qualifies parser replacement/order/read-only mounts only; it is not an approved source bundle or runtime/static verification claim.',
   'Shared producer actual files/hash/history/HTTPS and independent review are separate parent-owned evidence; no manual identity becomes deployment qualification.']});
}catch(error){save('failure.json',{status:'FAILED',message:String(error),stack:error.stack,sourceBindings:before,cases});process.exitCode=1;}
console.log(JSON.stringify({output,result:bind(output+(fs.existsSync(out('result.json'))?'/result.json':'/failure.json'))},null,2));
