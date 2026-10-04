import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fingerprintBundle } from '../../../../tools/miniapp/release-bundle-artifact.mjs';

const root=process.cwd(),task=path.resolve('.codex/work-items/cloud-sky-native-2026-09-22');
const destination=path.join(task,'evidence/experience-scene-v47-binding-2026-09-30.json');
await assert.rejects(fs.access(destination),{code:'ENOENT'});
const sha=value=>createHash('sha256').update(value).digest('hex');
const read=async file=>JSON.parse(await fs.readFile(path.join(task,file),'utf8'));
const previous=await read('evidence/experience-scene-v46-binding-2026-09-30.json');
const previousBuild=await fingerprintBundle(path.resolve(previous.build.path));assert.equal(previousBuild.sha256,previous.build.treeSha256);
assert.equal(sha(await fs.readFile(path.join(task,previous.nativeTrace.path))),previous.nativeTrace.sha256);
const prepared=await read('tmp/v47-candidate-fingerprint.json');
const build=await fingerprintBundle(path.resolve('apps/wechat-miniapp/dist/weapp-check-sky-scene-v47'));
assert.equal(build.sha256,prepared.after.sha256);assert.deepEqual(prepared.changedFiles,['sky/detail/index.js']);assert.deepEqual(prepared.removedFiles,[]);
const sourceConfig=JSON.parse(await fs.readFile('apps/wechat-miniapp/project.config.json','utf8'));
const config=JSON.parse(await fs.readFile('apps/wechat-miniapp/dist/weapp-check-sky-scene-v47/project.config.json','utf8'));
assert.equal(config.appid,sourceConfig.appid);
const gpuPath='output/playwright/cloud-sky-scene-v47-lines-checked-0930/result.json';
const gpuBytes=await fs.readFile(path.join(root,gpuPath)),gpu=JSON.parse(gpuBytes.toString());
for(const owner of gpu.sourceHashes)assert.equal(sha(await fs.readFile(owner.path)),owner.sha256);
const productionPath='output/playwright/cloud-sky-scene-v47-lines-checked-0930/production.js';
assert.equal(sha(await fs.readFile(path.join(root,productionPath))),gpu.productionBundleSha256);
assert.equal(gpu.previousProductionBundleSha256,'1bacee40dc0292bc6ff20642503a80e446533898f72891d675e13f5e37338bf6');
const changed=[];
for(const owner of previous.sourceHashes)if(!owner.path.endsWith('.test.ts')&&sha(await fs.readFile(owner.path))!==owner.sha256)changed.push(owner.path);
assert.deepEqual(changed.sort(),['apps/wechat-miniapp/src/features/sky/sky-constellation-render.ts','apps/wechat-miniapp/src/features/sky/sky-constellation-visibility.ts']);
const paths=new Set([...previous.sourceHashes.map(row=>row.path),...gpu.sourceHashes.map(row=>row.path),
  'apps/wechat-miniapp/src/features/sky/sky-constellation-render.test.ts','apps/wechat-miniapp/src/features/sky/sky-constellation-visibility.test.ts']);
const sourceHashes=await Promise.all([...paths].map(async file=>({path:file,sha256:sha(await fs.readFile(file))})));
const contextBytes=await fs.readFile(path.join(task,'tmp/v47-context-readback.json'));
const context=JSON.parse(contextBytes.toString()).data;
assert.equal(context.contextFingerprint,previous.context.fingerprint);assert.equal(context.revision,previous.context.revision);
assert.equal(context.selectedAtUtc,previous.context.selectedAtUtc);
const backend=await read('tmp/v47-backend-state.json');assert.equal(backend.moduleSha256,previous.backend.moduleSha256);
const samplingPath='evidence/experience-scene-v47-sampling-2026-09-30.json',sampling=await read(samplingPath);
const tracePath='evidence/experience-scene-v47-native-events-2026-09-30.jsonl',traceBytes=await fs.readFile(path.join(task,tracePath));
const trace=traceBytes.toString().trim().split(/\r?\n/).map(line=>JSON.parse(line));
assert(trace.some(row=>row.stage==='v46-close-ack'&&row.value.success===true&&row.value.winId==='s6'));
assert(trace.some(row=>row.stage==='v47-open-ack'&&row.value.success===true&&row.value.winId==='s8'));
assert(trace.some(row=>row.stage==='v47-compile-ack'&&row.value.success===true));
const runtime=await read('tmp/v47-native-summary.json');
const captures=[];
for(const file of (await fs.readdir(path.join(root,path.dirname(gpuPath)))).filter(file=>file.endsWith('.png'))){
  const filePath=path.join(path.dirname(gpuPath),file).replaceAll('\\','/'),bytes=await fs.readFile(path.join(root,filePath));
  captures.push({path:filePath,bytes:bytes.length,sha256:sha(bytes),kind:'production software GPU'});
}
for(const file of (await fs.readdir(path.join(task,'evidence'))).filter(file=>/experience-scene-v47-.*\.png$/.test(file)||file==='experience-scene-v46-recovery-2026-09-30.png')){
  const filePath='evidence/'+file,bytes=await fs.readFile(path.join(task,filePath));
  captures.push({path:'.codex/work-items/cloud-sky-native-2026-09-22/'+filePath,bytes:bytes.length,sha256:sha(bytes),
    width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),kind:'official DevTools capture; interpret only observed content'});
}
const files=['tmp/v47-local-lines-before.log','tmp/v47-local-lines-after.log','tmp/v47-mini-typecheck.log',
  'tmp/weapp-scene-v47-build.log','tmp/v47-lines-gpu.log','tmp/v47-lines-gpu-direct.log','tmp/v47-lines-gpu-checked.log',
  'tmp/v47-candidate-fingerprint.json','tmp/v47-context-readback.json','tmp/v47-backend-state.json','tmp/v47-native-summary.json','tmp/v47-output-metadata.json',
  'tmp/v47-sampling.log','tmp/v47-context-validate.log',
  'tmp/v45-current-public-report.json','tmp/v45-public-constellations.json','tmp/v45-public-altair-position.json',
  'evidence/experience-scene-v45-reference-conditions-2026-09-30.json','evidence/experience-scene-v45-reference-local-2026-09-30.jpg',
  'evidence/experience-scene-v47-render-before-2026-09-30.ts','evidence/experience-scene-v47-visibility-before-2026-09-30.ts',
  'scripts/experience-scene-v47-sampling-2026-09-30.mts','scripts/experience-scene-v47-lines-gpu-2026-09-30.mts',
  'scripts/experience-scene-v47-build-2026-09-30.ps1','scripts/experience-scene-v47-candidate-2026-09-30.mjs',
  'scripts/experience-scene-v47-readback-2026-09-30.mjs'];
const inputs=await Promise.all(files.map(async file=>({path:file,sha256:sha(await fs.readFile(path.join(task,file)))})));
const row=(edition,name)=>gpu.results.find(value=>value.edition===edition&&value.name===name);
assert.equal(row('before','local-on').rgbaSha256,row('before','local-off').rgbaSha256);
assert.notEqual(row('current','local-on').rgbaSha256,row('current','local-off').rgbaSha256);
assert.equal(row('current','wide-on').rgbaSha256,row('current','wide-restored').rgbaSha256);
assert(gpu.results.filter(row=>row.edition==='current'&&['local-on','local-off','local-red-on','local-red-off','deep-on'].includes(row.name))
  .every(row=>row.passes.every(pass=>pass.uploads.length===0&&pass.liveBytes===0)));
assert(gpu.retirement.every(row=>row.textures===0&&row.liveBytes===0&&row.glError===0));
const binding={recordedAtUtc:new Date().toISOString(),goal:'active/unbudgeted/incomplete',
  scope:'云观星局部星座识别修复、源采样决策与官方原生补证；开发结果不等于整体或手机验收',
  build:{path:'apps/wechat-miniapp/dist/weapp-check-sky-scene-v47',treeSha256:build.sha256,rawBytes:build.totalBytes,
    files:build.fileCount,changedFilesFromV46:prepared.changedFiles,appIdMatchesSource:true,intent:'plain isolated check; same 60065 API, no diagnostics/feedback/fixture/token'},
  sourceHashes,changedProductionOwners:changed,
  display:'one constellation intent and overview transition; local artwork/name/bitmap eligibility fades, real clipped spherical arcs retain identification',
  context:{idSha256:sha(context.contextId),revision:context.revision,fingerprint:context.contextFingerprint,
    selectedAtUtc:context.selectedAtUtc,localDate:context.localDate,timezone:context.timezone,readbackSha256:sha(contextBytes),
    limit:'backend readback; native observations have their own explicitly bound scope'},
  backend,runtime,nativeTrace:{path:tracePath,records:trace.length,sha256:sha(traceBytes),limit:'actual tool acknowledgements/captures/read failures; no imagined native state'},
  software:{path:gpuPath,sha256:sha(gpuBytes),productionPath,productionBundleSha256:gpu.productionBundleSha256,
    previousProductionBundleSha256:gpu.previousProductionBundleSha256,actualLocalPixelsChanged:true,
    unchangedWidePixels:true,wideRestorePixelsEqual:true,paintedIdentityAndActualPickingPreserved:true,
    fineArtworkUploadsAndRetention:0,retirement:gpu.retirement,lineCosts:gpu.lineCosts,
    limit:'software GL and host CPU checks, without full SAO/background/globe/WXML composition or target performance acceptance'},
  sampling:{path:samplingPath,sha256:sha(await fs.readFile(path.join(task,samplingPath))),decision:'do not adopt a blanket reduced source-resolution publication',
    reason:'common DPR3 field has no observed half-resolution margin; sampled reductions also do not close the combined texture demand',
    limits:'grid estimates do not certify every fragment/alpha or actual native DPR; no production LoD/data/publication change'},
  checks:{before:'real local identification regression fails with previous source',after:'16/16 relevant rendering/visibility/label/image-eligibility checks, Mini typecheck and isolated build passed',
    warnings:'existing CSS order, asset size and chunking warnings retained',context:'owning Context validate passed',
    harness:'initial strict clipped-coordinate assertion exposed floating-point residual, recorded up to 3.55e-15 logical px; numerical tolerance 1e-7 without production geometry change',
    runner:'pnpm dependency-status entry stopped at ignored builds; existing Node launcher used for the actual software check, no business dependency adoption'},
  captures,inputs,visualInspection:{owner:'root self-check',reference:'evidence/experience-scene-v45-reference-local-2026-09-30.jpg',
    actual:['output/playwright/cloud-sky-scene-v47-lines-checked-0930/current-local-on.png',
      'output/playwright/cloud-sky-scene-v47-lines-checked-0930/current-local-fading.png',
      'output/playwright/cloud-sky-scene-v47-lines-checked-0930/current-wide-on.png'],
    limit:'self-check is not independent review or target composition/whole-scene quality acceptance'},
  remaining:['native Canvas plus WXML/selection breathing/modal/dock and complete journey',
    'active source/decoded image demand and combined repeated upload/native GPU GC peak/frame/startup/official package/cost',
    'area imagery fading/reference composition, gray backgrounds/source artifacts/registration and full environment combinations',
    'full SAO progressive depth/stability, orientation/calibration/OS recovery, new Moon and Android/iOS phone acceptance',
    'final necessary independent review; previous v24 review retains only its historical scope'],
  actions:'only Sky source/owning task and Context; no phone/preview/backend restart/cloud deployment/branch/worktree/commit/push/other-module edit'};
await fs.writeFile(destination,JSON.stringify(binding,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({build:binding.build,changedProductionOwners:changed,runtime,context:binding.context,nativeTrace:binding.nativeTrace,
  software:binding.software,sampling:binding.sampling}));
