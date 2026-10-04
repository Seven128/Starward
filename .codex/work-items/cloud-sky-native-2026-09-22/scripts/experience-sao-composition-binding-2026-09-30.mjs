import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {isDeepStrictEqual} from 'node:util';
import {fingerprintBundle} from '../../../../tools/miniapp/release-bundle-artifact.mjs';
const task='.codex/work-items/cloud-sky-native-2026-09-22',sha=value=>createHash('sha256').update(value).digest('hex');
const json=async file=>JSON.parse((await fs.readFile(file,'utf8')).replace(/^\uFEFF/u,''));
const record=async file=>{const bytes=await fs.readFile(file);return {path:file.replaceAll('\\','/'),bytes:bytes.length,sha256:sha(bytes)};};
const prior=await json(task+'/evidence/experience-texture-failure-pressure-binding-2026-09-30.json');
const gpuPath='output/playwright/cloud-sky-sao-composition-0930-current/result.json',gpu=await json(gpuPath);
const sources=await Promise.all(prior.sourceHashes.map(async old=>({...await record(old.path),previousSha256:old.sha256})));
const changed=sources.filter(file=>file.sha256!==file.previousSha256).map(file=>file.path);
assert.deepEqual(changed.sort(),['apps/wechat-miniapp/src/features/sky/use-sky-stellar-supplement.ts','project_context/architecture/runtime-and-domain.md'].sort());
const addedTest=await record('apps/wechat-miniapp/src/features/sky/sky-stellar-supplement-owner.test.ts');
for(const source of gpu.sourceHashes)assert.equal(sha(await fs.readFile(source.path)),source.sha256,source.path);
assert.equal(sha(await fs.readFile('output/playwright/cloud-sky-sao-composition-0930-current/production.js')),gpu.productionBundleSha256);
assert.equal(sha(await fs.readFile(task+'/tmp/sao-current-inputs-0930.json')),gpu.inputSha256);
assert.equal(sha(await fs.readFile(task+'/tmp/sao-hook-before-0930.ts')),prior.sourceHashes.find(source=>source.path.endsWith('/use-sky-stellar-supplement.ts')).sha256);
assert.equal(gpu.rows.length,15);assert(gpu.rows.every(row=>row.glError===0&&!row.failures.length&&row.counts.pointDraws===1));
assert(gpu.rows.every(row=>row.picks.every(pick=>pick.first===pick.reference)));
assert.equal(gpu.comparisons[1].changed,0);assert.equal(gpu.comparisons[2].addedWithPositivePixels,31);
assert.equal(gpu.comparisons[3].addedWithPositivePixels,146);assert(gpu.comparisons.every(row=>row.bscCoreEqual));
assert(gpu.identities.every(row=>row.sameFramePosition&&row.reference===row.information&&row.search.includes(row.reference)));
assert.deepEqual(gpu.retired,{textures:0,buffers:0,programs:0});
const captures=await Promise.all(gpu.rows.map(async row=>{
  const capture=await record(path.posix.join(path.posix.dirname(gpuPath),row.image));assert.equal(capture.sha256,row.imageSha256);return capture;
}));
const v51=await fingerprintBundle(path.resolve('apps/wechat-miniapp/dist/weapp-check-sky-scene-v51-final'));
assert.equal(v51.sha256,prior.candidate.treeSha256);assert.equal(v51.totalBytes,prior.candidate.rawBytes);
const v52=await fingerprintBundle(path.resolve('apps/wechat-miniapp/dist/weapp-check-sky-scene-v52-final'));
const oldFiles=new Map(v51.files.map(file=>[file.path,file]));
const changedFiles=v52.files.filter(file=>file.sha256!==oldFiles.get(file.path)?.sha256).map(file=>file.path);
assert.deepEqual(changedFiles,['sky/detail/index.js']);assert.equal(v52.fileCount,v51.fileCount);
assert.equal((await json('apps/wechat-miniapp/project.config.json')).appid,(await json('apps/wechat-miniapp/dist/weapp-check-sky-scene-v52-final/project.config.json')).appid);
const checks={};
for(const [key,file] of Object.entries({failingBefore:'sao-owner-regression-before-0930.log',owners:'sao-owner-complete-0930.log',gpu:'sao-composition-0930-current.log',typecheck:'v52-mini-typecheck.log',contextStructure:'v52-context-validate.log',ordinaryBuild:'weapp-scene-v52-build.log'}))checks[key]=await record(task+'/tmp/'+file);
assert.match(await fs.readFile(task+'/tmp/sao-owner-regression-before-0930.log','utf8'),/fail 2/);
assert.match(await fs.readFile(task+'/tmp/sao-owner-complete-0930.log','utf8'),/pass 16/);
assert.match(await fs.readFile(task+'/tmp/weapp-scene-v52-build.log','utf8'),/exitCode=0/);
const oldContext=(await json(task+'/tmp/v51-context-readback.json')).data;
async function get(route){const response=await fetch('http://127.0.0.1:60065'+route,{signal:AbortSignal.timeout(15000)});assert.equal(response.status,200);const bytes=Buffer.from(await response.arrayBuffer());return {bytes,data:JSON.parse(bytes.toString())};}
const readbacks=await Promise.allSettled([get('/__task/alias-state'),get('/v2/observation-contexts/'+encodeURIComponent(oldContext.contextId))]);
assert(readbacks.every(result=>result.status==='fulfilled'));const [backend,context]=readbacks.map(result=>result.value);
assert.equal(backend.data.moduleSha256,prior.backend.moduleSha256);assert.equal(backend.data.publicationHash,prior.backend.publicationHash);
assert.equal(backend.data.counts.contextPuts,0);assert(isDeepStrictEqual(context.data.data,oldContext));
await fs.writeFile(task+'/tmp/v52-backend-state.json',backend.bytes,{flag:'wx'});
await fs.writeFile(task+'/tmp/v52-context-readback.json',context.bytes,{flag:'wx'});
const artifacts=await Promise.all([gpuPath,task+'/tmp/sao-current-inputs-0930.json',task+'/tmp/sao-composition-loader-0930-current.json',
  task+'/tmp/sao-hook-before-0930.ts',task+'/scripts/experience-sao-current-inputs-2026-09-30.mts',
  task+'/scripts/experience-sao-composition-2026-09-30.mts',task+'/scripts/experience-sao-composition-binding-2026-09-30.mjs',
  task+'/scripts/experience-scene-v52-build-2026-09-30.ps1',task+'/tmp/sao-composition-0930.log'].map(record));
const binding={recordedAtUtc:new Date().toISOString(),goal:'active/unbudgeted/incomplete',
  scope:'Cloud Sky SAO owner retirement and current progressive-star composition; development evidence only',
  inherited:'experience-texture-failure-pressure-binding-2026-09-30.json',sourceHashes:sources.map(({previousSha256,...source})=>source),changedSources:changed,addedTest,
  branch:execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  artifacts,captures,checks,software:{sourceHashes:gpu.sourceHashes,rows:gpu.rows.map(({references,...row})=>({...row,objects:references.length})),
    comparisons:gpu.comparisons,identities:gpu.identities,retired:gpu.retired,publishedWorkingSetMaxBytes:Math.max(...gpu.rows.map(row=>row.wantedBytes)),
    actualSuccessfulTileResponseBytes:gpu.reads.filter(read=>read.route.includes('/tiles/')).reduce((sum,read)=>sum+read.bytes,0)},
  candidate:{path:'apps/wechat-miniapp/dist/weapp-check-sky-scene-v52-final',files:v52.fileCount,rawBytes:v52.totalBytes,treeSha256:v52.sha256,changedFiles,
    appIdMatchesSource:true,opened:false,phonePreview:false,buildFlags:{diagnostics:0,fixture:0,feedback:''}},
  preservedV51:{files:v51.fileCount,rawBytes:v51.totalBytes,treeSha256:v51.sha256,allFilesUnchanged:true},
  backend:{...prior.backend,counts:backend.data.counts},context:{...prior.context,dataUnchanged:true,nativeContext:'unknown'},
  readbacks:await Promise.all([task+'/tmp/v52-backend-state.json',task+'/tmp/v52-context-readback.json'].map(record)),
  limits:['Actual publication/client/loader and discrete FOV inputs in one software renderer; no native gesture or WXML composition claim',
    'Controlled request pacing/failure and Hook lifecycle fixture are not real weak network, phone/OS lifecycle or native heap measurement',
    'Published tile bytes and transferred envelope bytes are not total JS/native/GPU memory, startup time, cost or target performance',
    'No adopted SAO star lies in this 0.3-degree field; current legal data depth is disclosed rather than filled with synthetic stars or excluded Gaia data',
    'First task harness incorrectly matched SAO position against BSC catalog identity; actual page already uses the SAO index. Fixed harness, no production API change',
    'Current sources and candidate have no new native runtime evidence; last native v47/s8 welcome, SDK/Sky/native Context remain unknown',
    'All 33 duties, remaining surface/environment/composition/journey/performance/package/cost/new Moon phone and necessary independent review remain open']};
assert.equal(binding.head,'7898962b80d20df371a758748bc62e8c48db33a7');
await fs.writeFile(task+'/evidence/experience-sao-composition-binding-2026-09-30.json',JSON.stringify(binding,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({candidate:binding.candidate,changedSources:changed,allCurrentGpuInputsBound:true,preservedV51:true,contextUnchanged:true,contextPuts:0,goal:binding.goal}));
