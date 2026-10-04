import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fingerprintBundle} from '../../../../tools/miniapp/release-bundle-artifact.mjs';
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const sha=value=>createHash('sha256').update(value).digest('hex');
const json=async file=>JSON.parse((await fs.readFile(file,'utf8')).replace(/^\uFEFF/u,''));
const record=async file=>{const bytes=await fs.readFile(file);return {path:file.replaceAll('\\','/'),bytes:bytes.length,sha256:sha(bytes)};};
const priorPath=task+'/evidence/experience-sao-composition-binding-2026-09-30.json',prior=await json(priorPath);
const gpuPath='output/playwright/cloud-sky-environment-composition-0930-r3/result.json',gpu=await json(gpuPath),gpuRoot=path.posix.dirname(gpuPath);
const sources=await Promise.all(prior.sourceHashes.map(async previous=>({...await record(previous.path),previousSha256:previous.sha256})));
const changed=sources.filter(source=>source.sha256!==source.previousSha256);
assert.deepEqual(changed.map(source=>source.path).sort(),[
  'apps/wechat-miniapp/src/features/sky/sky-gpu-renderer.ts','apps/wechat-miniapp/src/features/sky/sky-landscape.ts',
  'project_context/architecture/runtime-and-domain.md'].sort());
for(const name of ['sky-gpu-renderer','sky-landscape'])
  assert.equal((await record(task+'/tmp/v53-'+name+'-before.ts')).sha256,prior.sourceHashes.find(source=>source.path.endsWith('/'+name+'.ts')).sha256);
assert.equal((await record(prior.addedTest.path)).sha256,prior.addedTest.sha256);
const contextChanges=await json(task+'/tmp/v53-context-source-changes.json');
for(const source of contextChanges)assert.equal((await record(source.path)).sha256,source.afterSha256);
assert.equal(gpu.versions.length,2);
const captures=[];
for(const version of gpu.versions){
  assert.equal(version.rows.length,24);assert.equal(version.errors.length,0);
  assert(Object.values(version.retired.resources).every(value=>value===0));assert.equal(version.retired.glError,0);
  assert.equal(version.retired.fileCounts.writes,version.retired.fileCounts.removes);assert.equal(version.retired.fileCounts.failed,0);assert.equal(version.retired.failures.length,0);
  assert.equal((await record(gpuRoot+'/'+version.name+'.js')).sha256,version.productionBundleSha256);
  for(const row of version.rows){
    assert.equal(row.glError,0);assert.equal(row.failed,0);assert.equal(row.frameAt,row.condition.at);
    const capture=await record(gpuRoot+'/'+row.image);assert.equal(capture.sha256,row.imageSha256);captures.push(capture);
  }
}
for(const source of gpu.versions[1].sourceHashes)assert.equal((await record(source.path)).sha256,source.sha256,source.path);
assert.equal(gpu.regression.oldVisibleTwilightWarmth,false);assert.equal(gpu.regression.currentVisibleTwilightWarmth,true);
assert(gpu.regression.daylightDifferences.every(row=>row.aboveOne===0&&row.maxChannelDelta<=1));
const preserved=await fingerprintBundle(path.resolve(prior.candidate.path));
assert.equal(preserved.sha256,prior.candidate.treeSha256);assert.equal(preserved.totalBytes,prior.candidate.rawBytes);assert.equal(preserved.fileCount,prior.candidate.files);
const candidatePath='apps/wechat-miniapp/dist/weapp-check-sky-scene-v53-final',candidate=await fingerprintBundle(path.resolve(candidatePath));
const oldFiles=new Map(preserved.files.map(file=>[file.path,file]));
const changedFiles=candidate.files.filter(file=>file.sha256!==oldFiles.get(file.path)?.sha256).map(file=>file.path);
assert.deepEqual(changedFiles,['sky/detail/index.js']);assert.equal(candidate.fileCount,preserved.fileCount);
assert.equal((await json('apps/wechat-miniapp/project.config.json')).appid,(await json(candidatePath+'/project.config.json')).appid);
const checks={};
for(const [name,file] of Object.entries({typecheck:'environment-v53-typecheck-0930.log',behavior:'environment-v53-tests-0930.log',
  contextStructure:'environment-v53-context-validate-0930.log',ordinaryBuild:'weapp-scene-v53-build.log',softwareGpu:'environment-composition-0930-r3.log'}))
  checks[name]=await record(task+'/tmp/'+file);
assert.match(await fs.readFile(checks.behavior.path,'utf8'),/pass 46/);assert.match(await fs.readFile(checks.behavior.path,'utf8'),/fail 0/);
assert.match(await fs.readFile(checks.ordinaryBuild.path,'utf8'),/exitCode=0/);
const context=(await json(task+'/tmp/v53-context-readback.json')).data;
async function get(route){const response=await fetch('http://127.0.0.1:60065'+route,{signal:AbortSignal.timeout(15000)});assert.equal(response.status,200);
  const bytes=Buffer.from(await response.arrayBuffer());return {bytes,data:JSON.parse(bytes.toString())};}
const readbacks=await Promise.allSettled([get('/__task/alias-state'),get('/v2/observation-contexts/'+encodeURIComponent(context.contextId))]);
assert(readbacks.every(row=>row.status==='fulfilled'));const [backend,freshContext]=readbacks.map(row=>row.value);
assert.deepEqual(freshContext.data.data,context);assert.equal(backend.data.counts.contextPuts,0);
assert.equal(backend.data.moduleSha256,prior.backend.moduleSha256);assert.equal(backend.data.publicationHash,prior.backend.publicationHash);
assert.equal(backend.data.localPort,55803);
await fs.writeFile(task+'/tmp/v53-final-backend-state.json',backend.bytes,{flag:'wx'});
await fs.writeFile(task+'/tmp/v53-final-context-readback.json',freshContext.bytes,{flag:'wx'});
const branch=execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim();
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();assert.equal(branch,prior.branch);assert.equal(head,prior.head);
const artifacts=[gpuPath,gpuRoot+'/before.js',gpuRoot+'/current.js',
  task+'/evidence/experience-environment-composition-2026-09-30.md',task+'/evidence/experience-twilight-reference-conditions-2026-09-30.json',
  task+'/evidence/experience-twilight-paused-reference-2026-09-30.jpg',
  task+'/scripts/experience-environment-composition-2026-09-30.mts',task+'/scripts/experience-environment-composition-binding-2026-09-30.mjs',
  task+'/scripts/experience-environment-v53-readback-2026-09-30.mjs',task+'/scripts/experience-environment-context-2026-09-30.mjs',task+'/scripts/experience-environment-plan-2026-09-30.mjs',
  task+'/scripts/experience-scene-v53-build-2026-09-30.ps1',
  task+'/tmp/v53-sky-gpu-renderer-before.ts',task+'/tmp/v53-sky-landscape-before.ts',task+'/tmp/v53-context-source-changes.json',
  task+'/tmp/v53-runtime-binding.json',task+'/tmp/v53-current-public-report.json',task+'/tmp/v53-final-backend-state.json',task+'/tmp/v53-final-context-readback.json',
  task+'/tmp/environment-v53-readback-0930.log',task+'/tmp/environment-composition-0930.log',task+'/tmp/environment-composition-0930-r2.log',
  task+'/tmp/twilight-transfer-trial-0930.log',task+'/tmp/twilight-transfer-trial-0930-r2.log'];
const docs=['PLAN.md','STATE.md','INDEX.md'].map(file=>task+'/'+file);let localLinks=0;
for(const file of [artifacts[3],...docs])for(const match of (await fs.readFile(file,'utf8')).matchAll(/\]\(([^)]+)\)/gu)){
  const target=match[1].replace(/^<|>$/gu,'').split('#')[0];if(!target||/^[a-z][a-z\d+.-]*:/iu.test(target))continue;
  if(!target.endsWith('experience-environment-composition-binding-2026-09-30.json'))await fs.access(path.resolve(path.dirname(file),target));localLinks++;
}
const binding={recordedAtUtc:new Date().toISOString(),goal:'active/unbudgeted/incomplete',scope:gpu.scope,
  inherited:await record(priorPath),preservedGroundBoundary:await record(task+'/evidence/experience-landscape-boundary-binding-2026-09-30.json'),
  sourceHashes:sources.map(({previousSha256,...source})=>source),changedProductionSources:changed.filter(source=>source.path.startsWith('apps/')),
  changedContextSources:contextChanges,addedSaoTestUnchanged:true,branch,head,checks,artifacts:await Promise.all(artifacts.map(record)),captures,
  currentGpuModuleHashes:gpu.versions[1].sourceHashes,regression:gpu.regression,software:gpu.versions.map(({sourceHashes,rows,...version})=>({...version,
    rows:rows.map(({references,picks,...row})=>({...row,objects:references.length,visible:picks.filter(pick=>pick.visible).length}))})),
  candidate:{path:candidatePath,files:candidate.fileCount,rawBytes:candidate.totalBytes,treeSha256:candidate.sha256,changedFiles,
    appIdMatchesSource:true,opened:false,phonePreview:false,buildFlags:{diagnostics:0,fixture:0,feedback:''},settled:false},
  preservedV52:{...prior.candidate,allFilesUnchanged:true},backend:{publicPort:60065,localPort:55803,pid:5304,execSession:46700,
    moduleSha256:backend.data.moduleSha256,publicationHash:backend.data.publicationHash,counts:backend.data.counts,
    restartedBecauseVerifiedAbsent:true,contextPuts:0},context:{contextIdSha256:sha(context.contextId),revision:context.revision,
    fingerprint:context.contextFingerprint,selectedAtUtc:context.selectedAtUtc,dataReadbackEqual:true,nativeContext:'unknown'},
  currentDocuments:await Promise.all(docs.map(record)),localDocumentLinks:{checked:localLinks,allExist:true,notFactualCertification:true},
  limits:[...gpu.limits,'Last native v47/s8 welcome is historical; current native/SDK/Context/Canvas+WXML unknown',
    'New source/model change lacks current independent review; old v25 review is not extended',
    'Source/assets, public scope and previous candidate preserved; no phone, IDE operation, commit, deploy or publication',
    'Full native journey, new Moon phone, actual performance/heap/GPU peak/package/cash and all 33 duties remain open']};
await fs.writeFile(task+'/evidence/experience-environment-composition-binding-2026-09-30.json',JSON.stringify(binding,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({goal:binding.goal,candidate:binding.candidate,changedProductionSources:binding.changedProductionSources.map(source=>source.path),
  contextPuts:0,currentEpoch:binding.backend.localPort,preservedV52:true,allCurrentGpuInputsBound:true,captures:captures.length,localLinks}));
