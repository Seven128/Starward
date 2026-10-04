import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import {createHash} from 'node:crypto';
import {fingerprintBundle} from '../../../../tools/miniapp/release-bundle-artifact.mjs';
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const sha=value=>createHash('sha256').update(value).digest('hex');
const read=file=>fs.readFile(file);
const json=async file=>JSON.parse((await read(file)).toString().replace(/^\uFEFF/,''));
const record=async file=>{const bytes=await read(file);return {path:file.replaceAll('\\','/'),bytes:bytes.length,sha256:sha(bytes)};};
const prior=await json(task+'/evidence/experience-artwork-raster-binding-2026-09-30.json');
const sourceHashes=await Promise.all(prior.sourceHashes.map(async source=>({...source,sha256:sha(await read(source.path))})));
const changed=sourceHashes.filter((source,index)=>source.sha256!==prior.sourceHashes[index].sha256).map(source=>source.path).sort();
assert.deepEqual(changed,['apps/wechat-miniapp/src/features/sky/sky-gpu-textures.ts','apps/wechat-miniapp/src/features/sky/sky-native-image-chain.test.ts','project_context/architecture/runtime-and-domain.md'].sort());
const owner=(await read('apps/wechat-miniapp/src/features/sky/sky-gpu-textures.ts')).toString();
assert(!owner.includes('fittedBytes'));assert(!owner.includes('sort('));
const resultFile='output/playwright/cloud-sky-texture-failure-pressure-0930/result.json';
const gpu=await json(resultFile);assert.equal(gpu.rows.length,4);assert.deepEqual(gpu.errors,[]);assert.deepEqual(gpu.retired,{writes:2,removes:2,failed:0});
for(const source of gpu.sourceHashes)assert.equal(sha(await read(source.path)),source.sha256,source.path);
const rowSummary=[],captures=[];
for(const row of gpu.rows){
  const [before,after]=row.variants;
  assert.equal(before.rgbaSha256,after.rgbaSha256,row.condition.name);assert.deepEqual(before.references,after.references);
  assert.equal(before.landscape,after.landscape);assert.equal(before.paintedDeepSky,after.paintedDeepSky);
  assert(after.references.length>0);
  for(const variant of row.variants){assert.equal(variant.glError,0);assert.equal(variant.liveTextures,0);assert.equal(variant.retiredLogicalBytes,0);assert.equal(variant.retiredAllocations,0);assert.equal(variant.scissorEnabled,false);
    assert(variant.uploadPasses.every(pass=>pass.liveBytes<=16*1024*1024));
    if(variant.failedCapture){const capture=await record(path.posix.join(path.posix.dirname(resultFile),variant.failedCapture.file));assert.equal(capture.sha256,variant.failedCapture.sha256);captures.push(capture);}}
  const capture=await record(path.posix.join(path.posix.dirname(resultFile),row.image));assert.equal(capture.sha256,row.imageSha256);captures.push(capture);
  if(row.condition.failure){assert.equal(before.failedAttempts,9);assert.equal(after.failedAttempts,1);
    for(const variant of row.variants){assert.equal(variant.recovered.glError,0);assert(variant.recovered.uploads.some(upload=>upload.id==='galactic:retry'));}}
  else {assert.deepEqual(before.uploadPasses.map(pass=>pass.uploads),after.uploadPasses.map(pass=>pass.uploads));assert.deepEqual(after.failures,[]);}
  rowSummary.push({scene:row.condition.name,objects:after.references.length,pixelsEqual:true,
    beforeFailureAttempts:before.failedAttempts,afterFailureAttempts:after.failedAttempts,
    beforeWarmBytes:before.uploadPasses[1].uploads.reduce((sum,upload)=>sum+upload.bytes,0),
    afterWarmBytes:after.uploadPasses[1].uploads.reduce((sum,upload)=>sum+upload.bytes,0),
    beforeLogicalPeak:Math.max(...before.uploadPasses.map(pass=>pass.peakBytes)),afterLogicalPeak:Math.max(...after.uploadPasses.map(pass=>pass.peakBytes))});
}
const normal=gpu.rows.find(row=>row.condition.name==='wide'),failed=gpu.rows.find(row=>row.condition.failure);
assert.notEqual(failed.variants[1].rgbaSha256,normal.variants[1].rgbaSha256,'Failure control has an actual visible effect');
for(const variant of failed.variants){assert.equal(variant.recovered.rgbaSha256,normal.variants[1].rgbaSha256);assert.deepEqual(variant.recovered.references,normal.variants[1].references);}
assert.equal(gpu.rows[0].variants[1].rgbaSha256,gpu.rows.at(-1).variants[1].rgbaSha256);
assert.equal(sha(await read('output/playwright/cloud-sky-texture-failure-pressure-0930/production.js')),gpu.productionBundleSha256);
assert.equal(sha(await read('output/playwright/cloud-sky-artwork-raster-0930/production.js')),gpu.beforeBundleSha256);

// Preserve the failed optimization trial as rejected evidence. Its required
// improvement assertion failed after all 12 normal pixel comparisons passed.
const trialLog=(await read(task+'/tmp/texture-retention-trial-gpu-0930.log')).toString();
const trialRows=trialLog.split(/\r?\n/).filter(line=>line.startsWith('{"name":')).map(line=>JSON.parse(line));
assert.equal(trialRows.length,12);assert(trialRows.every(row=>row.pixelsEqual&&row.beforeWarmBytes===row.afterWarmBytes));
assert.match(trialLog,/ERR_ASSERTION/);
const trialCaptures=await Promise.all(trialRows.map(row=>record('output/playwright/cloud-sky-texture-retention-trial-0930/'+row.name+'.png')));
const checks={};
for(const [key,file] of Object.entries({failingBefore:'tmp/texture-failure-pressure-before-0930.log',owners:'tmp/texture-failure-pressure-owner-checks-0930.log',gpu:'tmp/texture-failure-pressure-gpu-0930.log',mutation:'tmp/texture-failure-pressure-mutation-0930.log',typecheck:'tmp/v51-mini-typecheck.log',contextStructure:'tmp/v51-context-validate.log',ordinaryBuild:'tmp/weapp-scene-v51-build.log'}))checks[key]=await record(task+'/'+file);
assert.match((await read(task+'/tmp/texture-failure-pressure-before-0930.log')).toString(),/4 !== 1/);
assert.match((await read(task+'/tmp/texture-failure-pressure-owner-checks-0930.log')).toString(),/pass 35/);
assert.match((await read(task+'/tmp/texture-failure-pressure-mutation-0930.log')).toString(),/expected: \[ 'GPU:galactic' \]/);
assert.match((await read(task+'/tmp/weapp-scene-v51-build.log')).toString(),/exitCode=0/);

const v50=await fingerprintBundle(path.resolve('apps/wechat-miniapp/dist/weapp-check-sky-scene-v50-final'));
assert.equal(v50.sha256,prior.candidate.treeSha256);assert.equal(v50.totalBytes,prior.candidate.rawBytes);
const v51=await fingerprintBundle(path.resolve('apps/wechat-miniapp/dist/weapp-check-sky-scene-v51-final'));
const oldFiles=new Map(v50.files.map(file=>[file.path,file]));
const changedFiles=v51.files.filter(file=>file.sha256!==oldFiles.get(file.path)?.sha256).map(file=>file.path);
assert.deepEqual(changedFiles,['sky/detail/index.js']);assert.equal(v51.fileCount,v50.fileCount);
const sourceConfig=await json('apps/wechat-miniapp/project.config.json'),bundleConfig=await json('apps/wechat-miniapp/dist/weapp-check-sky-scene-v51-final/project.config.json');
assert.equal(bundleConfig.appid,sourceConfig.appid);

const oldContext=(await json(task+'/tmp/v50-context-readback.json')).data;
async function get(route){const response=await fetch('http://127.0.0.1:60065'+route,{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(15000)});
  const bytes=Buffer.from(await response.arrayBuffer());assert.equal(response.status,200,'Current public readback unavailable');return {bytes,data:JSON.parse(bytes.toString())};}
const reads=await Promise.allSettled([get('/__task/alias-state'),get('/v2/observation-contexts/'+encodeURIComponent(oldContext.contextId))]);
for(const result of reads)assert.equal(result.status,'fulfilled','Current readback failed');
const [state,context]=reads.map(result=>result.value);
assert.equal(state.data.moduleSha256,prior.backend.moduleSha256);assert.equal(state.data.publicationHash,prior.backend.publicationHash);
assert.equal(state.data.counts.contextPuts,0);assert.equal(state.data.publicPort,60065);assert.equal(state.data.localPort,55700);
assert(isDeepStrictEqual(context.data.data,oldContext),'Public Context data changed');
await fs.writeFile(task+'/tmp/v51-backend-state.json',state.bytes,{flag:'wx'});
await fs.writeFile(task+'/tmp/v51-context-readback.json',context.bytes,{flag:'wx'});
const artifacts=await Promise.all([resultFile,
  task+'/scripts/experience-texture-failure-pressure-gpu-2026-09-30.mts',task+'/scripts/experience-texture-failure-pressure-binding-2026-09-30.mjs',
  task+'/scripts/experience-scene-v51-build-2026-09-30.ps1',task+'/tmp/texture-retention-before-0930.ts',
  task+'/tmp/texture-retention-candidate-0930.ts',task+'/scripts/experience-texture-retention-trial-gpu-2026-09-30.mts',
  task+'/tmp/texture-retention-trial-gpu-0930.log'].map(record));
const binding={recordedAtUtc:new Date().toISOString(),goal:'active/unbudgeted/incomplete',scope:'Cloud Sky shared GPU upload failure latching under actual wide-field retention pressure; software development evidence only',
  inherited:'experience-artwork-raster-binding-2026-09-30.json',sourceHashes,changedSources:changed,artifacts,captures,rowSummary,checks,
  rejectedTrial:{adopted:false,reason:'12 actual current scenes preserve pixels but show no warm-upload improvement; required improvement assertion fails',rows:trialRows,captures:trialCaptures},
  candidate:{path:'apps/wechat-miniapp/dist/weapp-check-sky-scene-v51-final',files:v51.fileCount,rawBytes:v51.totalBytes,treeSha256:v51.sha256,changedFiles,
    appIdMatchesSource:true,opened:false,phonePreview:false,diagnostics:false,fixture:false,feedback:false},
  preservedV50:{files:v50.fileCount,rawBytes:v50.totalBytes,treeSha256:v50.sha256,allFilesUnchanged:true},
  backend:{...prior.backend,counts:state.data.counts},context:{idSha256:sha(oldContext.contextId),revision:oldContext.revision,fingerprint:oldContext.contextFingerprint,
    selectedAtUtc:oldContext.selectedAtUtc,dataUnchanged:true,drawReportSha256:gpu.reportSha256,nativeContext:'unknown'},
  readbacks:await Promise.all([task+'/tmp/v51-backend-state.json',task+'/tmp/v51-context-readback.json'].map(record)),
  limits:['Controlled GL upload exception and new decoded identity are not target hardware loss or native public retry interaction',
    'Warm upload volume, draw order and logical retention/peak in normal scenes are unchanged; total driver/native/GC memory and target timing remain unverified',
    'Normal common peak 22806528 B and this 139-degree sample 31260672 B retain their actual scope; older 34930688 B sample has its original conditions',
    'Predecoded software composition excludes SAO integration, ordinary WXML composition, breathing and target gesture/pose/lifecycle',
    'All 33 duties, environmental/surface quality, complete journey, official package/cost, new Moon phone and final necessary independent review remain open',
    'Last native evidence remains v47/s8 welcome; current SDK/Sky/native Context unknown; no new IDE, phone, deployment, commit/push or other-module action']};
await fs.writeFile(task+'/evidence/experience-texture-failure-pressure-binding-2026-09-30.json',JSON.stringify(binding,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({candidate:binding.candidate,changedSources:changed,normalPixelsEqual:true,pressureFailureAttempts:{before:9,after:1},recoveryPixelsEqual:true,
  rejectedRetentionTrial:true,publicContextRevision:oldContext.revision,contextPuts:0,preservedV50Unchanged:true,goal:binding.goal}));
