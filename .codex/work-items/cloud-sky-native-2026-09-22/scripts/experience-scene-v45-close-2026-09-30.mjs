import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fingerprintBundle } from '../../../../tools/miniapp/release-bundle-artifact.mjs';

const root=process.cwd(),task=path.resolve('.codex/work-items/cloud-sky-native-2026-09-22');
const evidence=path.join(task,'evidence');
const destination=path.join(evidence,'experience-scene-v45-binding-2026-09-30.json');
await assert.rejects(fs.access(destination),{code:'ENOENT'});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=async relative=>JSON.parse(await fs.readFile(path.join(task,relative),'utf8'));
const previous=await read('evidence/experience-alias-v44-binding-2026-09-30.json');
const candidate=path.join(root,'apps/wechat-miniapp/dist/weapp-check-sky-scene-v45');
const build=await fingerprintBundle(candidate);
const previousBuild=await fingerprintBundle(path.join(root,previous.build.path));
assert.equal(previousBuild.sha256,previous.build.treeSha256,'retain the frozen previous candidate');
const previousFiles=new Map(previousBuild.files.map(file=>[file.path,file.sha256]));
const changedFiles=build.files.filter(file=>previousFiles.get(file.path)!==file.sha256).map(file=>file.path);
const sourceHashes=await Promise.all(previous.sourceHashes.map(async owner=>({
  path:owner.path,sha256:sha(await fs.readFile(path.join(root,owner.path)))})));
const changedOwners=sourceHashes.filter(owner=>owner.sha256!==previous.sourceHashes.find(old=>old.path===owner.path).sha256);
assert.deepEqual(changedOwners.map(owner=>owner.path),['apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx']);
for(const file of ['sky-constellation-visibility.ts','sky-constellation-render.test.ts',
  'sky-constellation-visibility.test.ts','sky-constellation-labels.test.ts','sky-constellation-page-labels.test.ts']){
  const relative='apps/wechat-miniapp/src/features/sky/'+file;
  sourceHashes.push({path:relative,sha256:sha(await fs.readFile(path.join(root,relative)))});
}
const config=JSON.parse(await fs.readFile(path.join(candidate,'project.config.json'),'utf8'));
const sourceConfig=JSON.parse(await fs.readFile(path.join(root,'apps/wechat-miniapp/project.config.json'),'utf8'));
assert.equal(config.appid,sourceConfig.appid);
const contextBytes=await fs.readFile(path.join(task,'tmp/v45-context-resolved.json'));
const context=JSON.parse(contextBytes.toString()).data;
const reportBytes=await fs.readFile(path.join(task,'tmp/v45-current-public-report.json'));
const report=JSON.parse(reportBytes.toString()).data;
assert.equal(report.context.contextId,context.contextId);
assert.equal(report.context.contextFingerprint,context.contextFingerprint);
assert.equal(context.selectedAtUtc,'2026-09-30T13:50:33.000Z');
const traceName='experience-scene-v45-native-events-2026-09-30.jsonl';
const traceBytes=await fs.readFile(path.join(evidence,traceName));
const trace=traceBytes.toString().trim().split(/\r?\n/).map(line=>JSON.parse(line));
// A native read and its capture intentionally share the stage name; bind the
// readback rather than accidentally treating the later PNG metadata as UI.
const observation=stage=>trace.findLast(row=>row.stage===stage&&row.value?.shadowUi).value;
const current=observation('native-stable-current');
const ui=current.shadowUi;
assert.equal(ui.route,'sky/detail/index');assert.equal(ui.sdk,'3.17.3');
assert.equal(ui.context.contextId,context.contextId);assert.equal(ui.context.revision,context.revision);
assert.equal(ui.context.contextFingerprint,context.contextFingerprint);
assert.equal(Date.parse(ui.context.selectedAtUtc),Date.parse(context.selectedAtUtc));
assert.equal(ui.modal.length,0);assert.equal(ui.search.length,0);
assert(ui.selection.some(row=>row.label==='Altair已选中，查看资料'));
assert(current.nativeCanvas.includes('垂直视场 84.6 度'));
assert.equal(observation('native-local').shadowUi.layers.length,0);
assert.equal(observation('native-overview-180').shadowUi.layers.length,0);
assert(observation('native-overview-restored').shadowUi.layers.length>0);
const sourceBack=observation('native-source-back').shadowUi;
assert(sourceBack.modal.some(row=>row.text.includes('HR 7557')));
assert.equal(sourceBack.context.contextFingerprint,context.contextFingerprint);
assert.equal(sourceBack.context.selectedAtUtc,ui.context.selectedAtUtc);
assert.equal(sourceBack.canvas,ui.canvas);
const gpuPath=path.join(root,'output/playwright/cloud-sky-scene-v45-0930/result.json');
const gpuBytes=await fs.readFile(gpuPath),gpu=JSON.parse(gpuBytes.toString());
assert.equal(gpu.reportRawSha256,sha(reportBytes));
const demand=await read('evidence/experience-scene-v45-image-demand-2026-09-30.json');
assert.equal(demand.reportRawSha256,sha(reportBytes));
const captures=await Promise.all((await fs.readdir(evidence)).filter(file=>
  /^experience-scene-v45-.+-2026-09-30\.(png|jpg)$/.test(file)).sort().map(async file=>{
  const bytes=await fs.readFile(path.join(evidence,file));return {file,bytes:bytes.length,sha256:sha(bytes)};
}));
const inputBindings=await Promise.all(['tmp/v45-public-constellations.json','tmp/v45-public-altair-position.json',
  'evidence/experience-scene-v45-reference-conditions-2026-09-30.json',
  'evidence/experience-scene-v45-image-demand-2026-09-30.json',
  'tmp/v45-constellation-before.log','tmp/v45-constellation-after.log','tmp/v45-mini-typecheck.log',
  'tmp/weapp-scene-v45-build.log','tmp/v45-scene-gpu.log'].map(async file=>({file,sha256:sha(await fs.readFile(path.join(task,file)))})));
const binding={recordedAtUtc:new Date().toISOString(),
  scope:'云观星星座识别视场修复与可比参考／组合开发证据；不是整体或目标设备验收',
  build:{path:path.relative(root,candidate).replaceAll('\\','/'),treeSha256:build.sha256,rawBytes:build.totalBytes,
    files:build.fileCount,changedFilesFromV44:changedFiles,appIdMatchesSource:true,
    intent:'plain isolated check: diagnostics/feedback/fixture/token disabled; task-local API'},
  sourceHashes,changedPreviouslyBoundOwners:changedOwners.map(owner=>owner.path),
  runtime:{windowId:'s5',sdk:ui.sdk,publicPort:60065,internalPort:54455,pid:33832,exec:69033,
    fixture:'same real compiled Sky/publications with MEMORY_TEST formal spot/weather; a newly resolved context, no old-ID migration',
    retired:'v44/s4 is closed; earlier evidence retains its original service/candidate epoch'},
  context:{idSha256:sha(context.contextId),revision:context.revision,fingerprint:context.contextFingerprint,
    selectedAtUtc:context.selectedAtUtc,localDate:context.localDate,timezone:context.timezone,resolvedBytesSha256:sha(contextBytes)},
  report:{rawSha256:sha(reportBytes),dataRevision:report.context.dataRevision,catalogVersion:report.skyScene.catalog.catalogVersion},
  current,nativeTrace:{path:traceName,sha256:sha(traceBytes),records:trace.length},captures,inputBindings,
  reference:await read('evidence/experience-scene-v45-reference-conditions-2026-09-30.json'),
  gpu:{resultPath:path.relative(root,gpuPath).replaceAll('\\','/'),sha256:sha(gpuBytes),
    currentVsOldWindow:'old enabled/off actual RGBA equal; current enabled changes real pixels; unchanged stars/picking; widened same RGBA restored',
    workingSets:gpu.workingSets,comparison:gpu.comparison,limits:gpu.limits},
  resourceFinding:{samples:demand.samples,largestSample:demand.perFov.map(row=>row.largest).sort((a,b)=>b.bytes-a.bytes)[0],
    retentionAllowance:demand.currentLoaderRetentionBudget,status:'open: still-wanted demand can exceed the retention allowance; no target/global-maximum/coexistence claim'},
  backend:await read('tmp/v45-backend-state.json'),
  checks:{realFailBefore:'wide figure/line draw-owner regression failed with old source',
    after:'related behavior checks 15/15; Mini typecheck and isolated build passed',
    existingBuildWarnings:'CSS ordering, asset size, no async chunk',native:'public SDK pinch/local/overview/restore; source/Back identity/time/view retained',
    console:'get_simulator_console grep -n -i error returned empty; buffer only'},
  investigationLimits:[
    'Actual v44 before shot shows Canvas only; v45 shots show WXML controls/marker/modal but Canvas absent. Different capture planes do not establish a native pixel before/after comparison or a platform root cause.',
    'Native rendered-frame attributes are metadata, not proof of composed Canvas pixels. Software production GPU output does not certify WEAPP composition.',
    'First new-window reLaunch timed out, later actual route success; not a product-defect conclusion.',
    'One overview pinch reached 139.4, not a hidden-140 claim; later observed 180 confirms native name gate only.',
    'One console call used nonexistent get_simulator_console_logs; kept tool failure, then the documented get_simulator_console returned the actual buffer.',
    'Reference local field retains real lines after illustration disappears; current shared local gate still retires all three. This difference remains open rather than certified as complete.',
    '15/15 post-fix checks include updating a stale page test harness to the actual current time owner; no production clock change.',
    'No phone/preview/cloud deployment/commit/push or other-module source edits'],
  remaining:['shared image demand/coexistence and resources','local area/line semantics and whole-scene quality',
    'ordinary Canvas plus WXML composition/breathing and full interaction journey',
    'official package/cost/final necessary independent review','new Moon/pose/calibration/OS lifecycle and target devices; phone unavailable, large font paused']};
await fs.writeFile(destination,JSON.stringify(binding,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({build:binding.build,changedOwners:binding.changedPreviouslyBoundOwners,
  trace:binding.nativeTrace,context:binding.context,resourceFinding:binding.resourceFinding}));
