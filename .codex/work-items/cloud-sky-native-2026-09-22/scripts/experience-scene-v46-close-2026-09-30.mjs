import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fingerprintBundle } from '../../../../tools/miniapp/release-bundle-artifact.mjs';

const root=process.cwd(),task=path.resolve('.codex/work-items/cloud-sky-native-2026-09-22');
const destination=path.join(task,'evidence/experience-scene-v46-binding-2026-09-30.json');
await assert.rejects(fs.access(destination),{code:'ENOENT'});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=async file=>JSON.parse(await fs.readFile(path.join(task,file),'utf8'));
const previous=await read('evidence/experience-scene-v45-binding-2026-09-30.json');
const previousBuild=await fingerprintBundle(path.join(root,previous.build.path));
assert.equal(previousBuild.sha256,previous.build.treeSha256);
assert.equal(sha(await fs.readFile(path.join(task,'evidence',previous.nativeTrace.path))),previous.nativeTrace.sha256);
const build=await fingerprintBundle(path.join(root,'apps/wechat-miniapp/dist/weapp-check-sky-scene-v46'));
const prepared=await read('tmp/v46-candidate-fingerprint.json');assert.equal(build.sha256,prepared.after.sha256);
assert.deepEqual(prepared.changedFiles,['sky/detail/index.js']);assert.deepEqual(prepared.removedFiles,[]);
const gpuRoot=path.join(root,'output/playwright');
const gpuPaths={before:'cloud-sky-scene-v46-pressure-0930',after:'cloud-sky-scene-v46-cache-after-0930',
  lifecycle:'cloud-sky-scene-v46-cache-lifecycle-0930',coexistence:'cloud-sky-scene-v46-coexistence-0930'};
const gpu={};
for(const [name,folder] of Object.entries(gpuPaths)){
  const resultPath=path.join(gpuRoot,folder,'result.json'),bytes=await fs.readFile(resultPath);
  gpu[name]={path:path.relative(root,resultPath).replaceAll('\\','/'),sha256:sha(bytes),result:JSON.parse(bytes.toString())};
}
const previousGpu=JSON.parse(await fs.readFile(path.join(gpuRoot,'cloud-sky-scene-v45-0930/result.json'),'utf8'));
const changedGpuOwners=[];
for(const owner of previousGpu.sourceHashes){
  if(sha(await fs.readFile(owner.path))!==owner.sha256)changedGpuOwners.push(owner.path);
}
assert.deepEqual(changedGpuOwners,['apps/wechat-miniapp/src/features/sky/sky-gpu-textures.ts']);
const paths=new Set([...previous.sourceHashes.map(owner=>owner.path),...gpu.after.result.currentSourceHashes.map(owner=>owner.path),
  'apps/wechat-miniapp/src/features/sky/sky-native-image-chain.test.ts',
  'apps/wechat-miniapp/src/features/sky/sky-landscape-resources.ts',
  'apps/wechat-miniapp/src/features/sky/sky-hips-tile-selection.ts']);
const sourceHashes=await Promise.all([...paths].map(async file=>({path:file,sha256:sha(await fs.readFile(file))})));
for(const owner of previous.sourceHashes)assert.equal(sourceHashes.find(row=>row.path===owner.path).sha256,owner.sha256);
const sourceConfig=JSON.parse(await fs.readFile('apps/wechat-miniapp/project.config.json','utf8'));
const config=JSON.parse(await fs.readFile('apps/wechat-miniapp/dist/weapp-check-sky-scene-v46/project.config.json','utf8'));
assert.equal(config.appid,sourceConfig.appid);
const contextBytes=await fs.readFile(path.join(task,'tmp/v46-context-readback.json'));
const context=JSON.parse(contextBytes.toString()).data;
assert.equal(context.contextFingerprint,previous.context.fingerprint);assert.equal(context.revision,previous.context.revision);
assert.equal(context.selectedAtUtc,previous.context.selectedAtUtc);
const backend=await read('tmp/v46-backend-state.json');assert.equal(backend.moduleSha256,previous.backend.moduleSha256);
const tracePath='evidence/experience-scene-v46-native-events-2026-09-30.jsonl';
const traceBytes=await fs.readFile(path.join(task,tracePath));
const trace=traceBytes.toString().trim().split(/\r?\n/).map(line=>JSON.parse(line));
assert(trace.some(row=>row.stage==='targeted-close-failed'));
const captures=[];
for(const folder of Object.values(gpuPaths))for(const file of (await fs.readdir(path.join(gpuRoot,folder))).filter(file=>file.endsWith('.png'))){
  const absolute=path.join(gpuRoot,folder,file),bytes=await fs.readFile(absolute);
  captures.push({path:path.relative(root,absolute).replaceAll('\\','/'),bytes:bytes.length,sha256:sha(bytes)});
}
const files=['tmp/v46-cache-before.log','tmp/v46-cache-after.log','tmp/v46-mini-typecheck.log',
  'tmp/weapp-scene-v46-build.log','tmp/v46-pressure.log','tmp/v46-cache-gpu.log','tmp/v46-cache-lifecycle.log',
  'tmp/v46-coexistence.log','tmp/v46-candidate-fingerprint.json','tmp/v46-context-readback.json','tmp/v46-backend-state.json',
  'tmp/v45-current-public-report.json','tmp/v45-public-constellations.json','tmp/v45-public-altair-position.json',
  'scripts/experience-scene-v46-pressure-2026-09-30.mts','scripts/experience-scene-v46-cache-gpu-2026-09-30.mts',
  'scripts/experience-scene-v46-cache-lifecycle-2026-09-30.mts','scripts/experience-scene-v46-coexistence-2026-09-30.mts',
  'scripts/experience-scene-v46-build-2026-09-30.ps1','scripts/experience-scene-v46-native-helpers-2026-09-30.ps1'];
const inputs=await Promise.all(files.map(async file=>({path:file,sha256:sha(await fs.readFile(path.join(task,file)))})));
const assetBytes=new Map(gpu.coexistence.result.assets.map(asset=>[asset.id,asset.width*asset.height*4]));
const coexistence=gpu.coexistence.result.rows.map(({scenario,variants})=>({field:scenario.field,
  background:scenario.background,resourceId:scenario.resourceId,reservedLogicalBytes:scenario.reservedLogicalBytes,
  pixelsEqual:variants[0].rgbaSha256===variants[1].rgbaSha256,
  beforeWarmUploads:variants[0].passes[1].uploads.length,afterWarmUploads:variants[1].passes[1].uploads.length,
  afterWarmUploadBytes:variants[1].passes[1].uploads.reduce((sum,id)=>sum+(assetBytes.get(id)??0),0),
  retainedBytes:variants[1].passes[1].liveBytes,frameLogicalPeak:variants[1].passes[1].peakLogicalBytes}));
assert(coexistence.every(row=>row.pixelsEqual&&row.afterWarmUploads<row.beforeWarmUploads));
const binding={recordedAtUtc:new Date().toISOString(),
  scope:'云观星共享GPU缓存循环上传修复与实际资源共存开发证据；不是原生新版、整体质量、性能或设备验收',
  build:{path:'apps/wechat-miniapp/dist/weapp-check-sky-scene-v46',treeSha256:build.sha256,rawBytes:build.totalBytes,
    files:build.fileCount,changedFilesFromV45:prepared.changedFiles,appIdMatchesSource:true,
    intent:'plain isolated check: no diagnostics/feedback/fixture/token; same task-local API'},
  sourceHashes,changedProductionGpuOwners:changedGpuOwners,
  cache:{retentionBytes:16*1024*1024,policy:'protect previous submitted frame identities until current submission finishes; release unused and trim retention at finish',
    tradeoff:'temporary texture ownership can exceed retention; this is not a driver/upload/native/GC peak bound'},
  runtime:{lastConfirmedOpened:'v46/s6',currentWindowState:'unconfirmed after official transport close failure; no new window opened',
    retired:'v45/s5 close acknowledged by official CLI; v44/s4 historical',sdk:null,currentPage:null,nativePixels:null,
    publicPort:60065,internalPort:54455,pid:33832,exec:69033,serviceEpoch:'unchanged',
    fixture:'real compiled Sky/current publications with MEMORY_TEST formal spot/weather'},
  context:{idSha256:sha(context.contextId),revision:context.revision,fingerprint:context.contextFingerprint,
    selectedAtUtc:context.selectedAtUtc,localDate:context.localDate,timezone:context.timezone,readbackSha256:sha(contextBytes),
    limit:'backend readback only; current native page state not obtained'},
  nativeTrace:{path:tracePath,records:trace.length,sha256:sha(traceBytes),acceptance:'unverified'},
  checks:{before:'new stable over-retention regression fails 3 !== 1 with previous source',
    after:'18/18 related image/decode/GPU/retry/cancellation checks; Mini typecheck; isolated build passed',
    warnings:'same CSS ordering, asset size and no async chunk build warnings',
    software:'same field pixels and painted identities before/after; camera change/hidden overview/restore/disposal; eight image-layer combinations',
    native:'currentPage timeout, screenshot failure, open-page request without completion, CLI transport/targeted-close failure; none is a product-black-screen conclusion'},
  gpuBindings:Object.fromEntries(Object.entries(gpu).map(([key,{path,sha256}])=>[key,{path,sha256}])),
  coexistence,captures,inputs,backend,
  visualInspection:{owner:'root self-check',paths:[
    'output/playwright/cloud-sky-scene-v46-cache-after-0930/identification.png',
    'output/playwright/cloud-sky-scene-v46-cache-after-0930/fading-pressure.png',
    'output/playwright/cloud-sky-scene-v46-cache-lifecycle-0930/changed-view.png',
    'output/playwright/cloud-sky-scene-v46-coexistence-0930/horizon-galactic.png',
    'output/playwright/cloud-sky-scene-v46-coexistence-0930/identification-w3.png'],
    limit:'actual software-rendered images viewed; self-check is not independent review or native composition'},
  remaining:['still-wanted decoded/source resolution and repeated uploads in combined views; do not claim resource closure',
    'official native initialization/readback and Canvas plus WXML composition/breathing/full journey',
    'reference local illustration versus retained line semantics and whole-scene quality',
    'target frame/peak/GC/startup/official package/actual costs and final necessary independent review',
    'new Moon/Android/iOS/pose/calibration/OS lifecycle; phone unavailable, large font paused'],
  actions:'only Sky source and owning task/Context; no phone/preview/service restart/cloud deploy/commit/push/new branch/worktree/other-module edit'};
await fs.writeFile(destination,JSON.stringify(binding,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({build:binding.build,changedProductionGpuOwners:changedGpuOwners,native:binding.runtime,coexistence}));
