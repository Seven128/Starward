import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {fingerprintBundle} from '../../../../tools/miniapp/release-bundle-artifact.mjs';

// Read-only closure of the existing epoch and already completed v50 checks.
// This does not resolve a new Context, submit time, start an IDE or run tests.
const root=path.resolve('.'), task=path.join(root,'.codex/work-items/cloud-sky-native-2026-09-22');
const relative=file=>path.relative(root,file).replaceAll('\\','/');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const bytes=file=>fs.readFile(path.resolve(root,file));
const json=async file=>JSON.parse((await bytes(file)).toString().replace(/^\uFEFF/,''));
const taskFile=name=>path.join(task,name);
const record=async file=>{const data=await bytes(file);return {path:relative(path.resolve(root,file)),bytes:data.length,sha256:sha(data)};};
const previous=await json(taskFile('evidence/experience-area-display-support-binding-2026-09-30.json'));
const sourceHashes=await Promise.all(previous.sourceHashes.map(async row=>({...row,sha256:sha(await bytes(row.path))})));
const changedSources=sourceHashes.filter((row,index)=>row.sha256!==previous.sourceHashes[index].sha256).map(row=>row.path).sort();
assert.deepEqual(changedSources,['apps/wechat-miniapp/src/features/sky/sky-gpu-renderer.ts','project_context/architecture/runtime-and-domain.md'].sort());
for(const file of ['apps/wechat-miniapp/src/features/sky/sky-artwork-raster-bounds.ts','apps/wechat-miniapp/src/features/sky/sky-artwork-raster-bounds.test.ts'])
  sourceHashes.push({path:file,sha256:sha(await bytes(file))});

const gpuPath='output/playwright/cloud-sky-artwork-raster-0930/result.json';
const statePath='output/playwright/cloud-sky-artwork-raster-state-0930/result.json';
const [gpu,state]=await Promise.all([json(gpuPath),json(statePath)]);
for(const result of [gpu,state]) for(const source of result.sourceHashes)
  assert.equal(sha(await bytes(source.path)),source.sha256,source.path);
assert.equal(gpu.rows.length,12); assert.deepEqual(gpu.errors,[]);
assert.deepEqual(gpu.retired,{writes:2,removes:2,failed:0});
const areas=[];
for(const row of gpu.rows){
  const [before,after]=row.variants;
  assert.equal(after.rgbaSha256,before.rgbaSha256,row.condition.name);
  assert.deepEqual(after.references,before.references); assert.equal(after.landscape,before.landscape);
  assert.equal(after.paintedDeepSky,before.paintedDeepSky);
  for(const variant of row.variants){assert.equal(variant.glError,0);assert.equal(variant.scissorEnabled,false);assert.equal(variant.liveTextures,0);assert.deepEqual(variant.failures,[]);}
  assert.equal(sha(await bytes(path.join(path.dirname(gpuPath),row.image))),row.imageSha256);
  areas.push({scene:row.condition.name,draws:after.calls.length,
    beforePixels:before.calls.reduce((sum,call)=>sum+call.area,0),afterPixels:after.calls.reduce((sum,call)=>sum+call.area,0),rgbaEqual:true});
}
for(const scene of ['common-dpr3','wide']){const row=areas.find(row=>row.scene===scene);assert(row);assert(row.afterPixels<row.beforePixels/2);}
assert.equal(gpu.rows[0].variants[1].rgbaSha256,gpu.rows.at(-1).variants[1].rgbaSha256);
assert.equal(state.rows.length,4);assert.match(state.failure,/controlled_bounded_draw_failure/);
assert.equal(state.boundedDraws,1);assert.equal(state.restored.scissor,false);assert.equal(state.error,0);
assert.equal(state.restored.src,state.expectedBlend.src);assert.equal(state.restored.dst,state.expectedBlend.dst);
assert.deepEqual(state.marker,[255,0,255,255]);
for(const row of state.rows){assert.equal(row.variants[0].rgbaSha256,row.variants[1].rgbaSha256);
  for(const variant of row.variants){assert.equal(variant.painted,true);assert.equal(variant.scissorAfterArtwork,false);assert.equal(variant.glError,0);}}
assert.equal(sha(await bytes('output/playwright/cloud-sky-artwork-raster-0930/production.js')),gpu.productionBundleSha256);
assert.equal(state.productionBundleSha256,gpu.productionBundleSha256);
assert.equal(sha(await bytes('output/playwright/cloud-sky-current-composition-0930/production.js')),gpu.beforeBundleSha256);

const fingerprints=await json(taskFile('tmp/v50-candidate-fingerprint.json'));
const [oldBundle,newBundle]=await Promise.all([
  fingerprintBundle(path.join(root,'apps/wechat-miniapp/dist/weapp-check-sky-scene-v49-final')),
  fingerprintBundle(path.join(root,'apps/wechat-miniapp/dist/weapp-check-sky-scene-v50-final'))]);
assert.deepEqual(oldBundle,fingerprints.before);assert.deepEqual(newBundle,fingerprints.after);
assert.equal(oldBundle.sha256,'fd45bd4e3ff89df5f141f48ecc1ae08e70dc931d20b9875857284aea53332020');
assert.equal(newBundle.sha256,'8325f7c9e8de9e755896c730eea86ba853a0cfbfdcfabb08460dd1cf7f6700c4');
const oldFiles=new Map(oldBundle.files.map(file=>[file.path,file]));
const changedFiles=newBundle.files.filter(file=>file.sha256!==oldFiles.get(file.path)?.sha256).map(file=>file.path);
assert.deepEqual(changedFiles,['sky/detail/index.js']);assert.deepEqual(fingerprints.changedFiles,changedFiles);
assert.deepEqual(fingerprints.removed,[]);assert.equal(fingerprints.appIdMatchesSource,true);

const priorState=await json(taskFile('tmp/v49-backend-state.json'));
const priorContext=await json(taskFile('tmp/v49-context-readback.json'));
const priorReport=await json(taskFile('tmp/v49-current-public-report.json'));
const context=priorContext.data, base='http://127.0.0.1:60065';
async function request(route){const response=await fetch(base+route,{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(15000)});
  const data=Buffer.from(await response.arrayBuffer());assert.equal(response.status,200,route.replaceAll(context.contextId,'[public-context]'));
  return {status:response.status,data,parsed:JSON.parse(data.toString())};}
const reads=await Promise.allSettled([
  request('/__task/alias-state'),request('/v2/observation-contexts/'+encodeURIComponent(context.contextId)),
  request('/v2/spots/spot%3Atest-published/sky?contextId='+encodeURIComponent(context.contextId))]);
for(const result of reads)assert.equal(result.status,'fulfilled',result.reason?.message);
const [freshState,freshContext,freshReport]=reads.map(result=>result.value);
assert.equal(freshState.parsed.publicPort,60065);assert.equal(freshState.parsed.localPort,55700);
for(const key of ['moduleSha256','catalogVersion','publicationHash'])assert.equal(freshState.parsed[key],priorState[key],key);
assert.equal(freshState.parsed.counts.contextPuts,0);
// A fresh request has a new requestId/generatedAt. Preserve and compare all
// other envelope fields, including data, validAt, revision, state and sources.
const stableEnvelope=({generatedAt,requestId,...envelope})=>envelope;
assert(isDeepStrictEqual(stableEnvelope(freshContext.parsed),stableEnvelope(priorContext)),'Public Context stable envelope changed');
function differencePaths(before,after,prefix=''){
  if(isDeepStrictEqual(before,after))return [];
  if(!before || !after || typeof before!=='object' || typeof after!=='object')return [prefix];
  return [...new Set([...Object.keys(before),...Object.keys(after)])].flatMap(key=>differencePaths(before[key],after[key],prefix+'/'+key));
}
const reportDifferencePaths=differencePaths(stableEnvelope(priorReport),stableEnvelope(freshReport.parsed));
// Existing astronomy-service separately excludes acquisition clocks from its
// report identity. Do not erase arbitrary metadata: admit only these actual
// source/model read clocks, retain the differences and compare every other field.
const acquisitionPath=/^(?:\/sources\/\d+\/retrievedAt|\/data\/(?:targets\/\d+\/source\/retrievedAt|lunarFacts\/source\/retrievedAt|weatherEvidence\/modelRuns\/\d+\/fetchedAt|sources\/\d+\/retrievedAt|targetFrames\/\d+\/targets\/\d+\/source\/retrievedAt))$/;
assert(reportDifferencePaths.every(field=>field==='/etag'||acquisitionPath.test(field)),
  'Public report content changed at '+reportDifferencePaths.filter(field=>field!=='/etag'&&!acquisitionPath.test(field)).slice(0,30).join(', '));
// ETag fingerprints the actual data, including its retrieval clocks. Check it
// against the existing envelope owner instead of claiming raw-byte identity.
for(const envelope of [priorReport,freshReport.parsed]){
  const attributions=envelope.sources.flatMap(source=>source.attribution?[{
    name:source.attribution.name,url:source.attribution.url,statements:source.attribution.statements}]:[]);
  const expected='W/"'+sha(JSON.stringify({data:envelope.data,state:envelope.dataState,
    ...(attributions.length?{attributions}:{})})).slice(0,24)+'"';
  assert.equal(envelope.etag,expected,'Report ETag does not match existing envelope owner');
}
const fieldValue=(value,field)=>field.slice(1).split('/').reduce((current,key)=>current[key],value);
for(const field of reportDifferencePaths.filter(field=>acquisitionPath.test(field))){
  assert(Number.isFinite(Date.parse(fieldValue(priorReport,field))),'Old acquisition clock invalid');
  assert(Number.isFinite(Date.parse(fieldValue(freshReport.parsed,field))),'Current acquisition clock invalid');
}
assert.equal(gpu.reportSha256,sha(await bytes(taskFile('tmp/v49-current-public-report.json'))));
const readbackFiles=[];
for(const [name,result] of [['tmp/v50-backend-state.json',freshState],['tmp/v50-context-readback.json',freshContext],['tmp/v50-current-public-report.json',freshReport]]){
  const file=taskFile(name);await fs.writeFile(file,result.data,{flag:'wx'});readbackFiles.push(await record(file));
}

const checks={};
for(const [key,name] of Object.entries({ownerChecks:'tmp/v50-image-owner-checks.log',miniTypecheck:'tmp/v50-mini-typecheck.log',contextStructure:'tmp/v50-context-validate.log',ordinaryBuild:'tmp/weapp-scene-v50-build.log',baseline:'tmp/artwork-raster-baseline-0930.json',gpuRun:'tmp/artwork-raster-gpu-0930.log',stateRun:'tmp/artwork-raster-state-0930.log',boundedMutation:'tmp/artwork-raster-mutation-0930.log'}))checks[key]=await record(taskFile(name));
const ownerLog=(await bytes(taskFile('tmp/v50-image-owner-checks.log'))).toString();assert.match(ownerLog,/pass 16/);assert.match(ownerLog,/fail 0/);
const mutation=(await bytes(taskFile('tmp/artwork-raster-mutation-0930.log'))).toString();assert.match(mutation,/ERR_ASSERTION/);assert.match(mutation,/actual: false/);assert.match(mutation,/expected: true/);
const artifacts=await Promise.all([gpuPath,statePath,
  '.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-artwork-raster-baseline-2026-09-30.mts',
  '.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-artwork-raster-gpu-2026-09-30.mts',
  '.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-artwork-raster-state-2026-09-30.mts',
  '.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-artwork-raster-binding-2026-09-30.mjs',
  '.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-scene-v50-build-2026-09-30.ps1',
  '.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-artwork-raster-2026-09-30.md'].map(record));
const captures=await Promise.all(gpu.rows.map(row=>record(path.join(path.dirname(gpuPath),row.image))));
const result={recordedAtUtc:new Date().toISOString(),goal:'active/unbudgeted/incomplete',scope:'Cloud Sky shared registered-image raster bounds; software development evidence only',
  inheritedBinding:'experience-area-display-support-binding-2026-09-30.json',sourceHashes,changedSources,
  newSources:['apps/wechat-miniapp/src/features/sky/sky-artwork-raster-bounds.ts','apps/wechat-miniapp/src/features/sky/sky-artwork-raster-bounds.test.ts'],
  artifacts,captures,areas,metric:'Sum of actual allowed GL scissor rectangle pixels at image submissions; not actual fragment invocations, FPS or memory reduction',
  checks,boundedMutation:'Frozen renderer as controlled after variant; exact pixels still equal, required area reduction assertion fails; no product source mutated',
  candidate:{path:'apps/wechat-miniapp/dist/weapp-check-sky-scene-v50-final',files:newBundle.fileCount,rawBytes:newBundle.totalBytes,treeSha256:newBundle.sha256,
    changedFiles,appIdMatchesSource:true,opened:false,phonePreview:false,diagnostics:false,fixture:false,feedback:false},
  preservedCandidate:{path:'apps/wechat-miniapp/dist/weapp-check-sky-scene-v49-final',files:oldBundle.fileCount,rawBytes:oldBundle.totalBytes,treeSha256:oldBundle.sha256,allFilesUnchanged:true},
  backend:{publicPort:60065,localPort:55700,moduleSha256:freshState.parsed.moduleSha256,catalogVersion:freshState.parsed.catalogVersion,
    publicationHash:freshState.parsed.publicationHash,counts:freshState.parsed.counts,restarted:false,contextPuts:0,
    scope:freshState.parsed.scope},
  context:{idSha256:sha(context.contextId),revision:context.revision,fingerprint:context.contextFingerprint,selectedAtUtc:context.selectedAtUtc,
    currentReadbackStableEnvelopeEqualsV49:true,reportExceptAcquisitionClocksAndDerivedEtagEqualsV49:true,
    changedReportMetadataPaths:reportDifferencePaths,derivedEtagValidated:true,ignoredRequestEnvelopeFields:['generatedAt','requestId'],
    reportSha256:sha(freshReport.data),frozenDrawReportSha256:gpu.reportSha256,nativeContext:'unknown'},readbackFiles,
  native:{lastConfirmed:'v47/s8 welcome page; not re-read for v50',currentSdk:'unknown',currentSky:'unknown',canvasWxmlComposition:'unverified',newMoonPhone:'unverified'},
  limits:['Same logical scene and unchanged source pixels/UV/registration/identity do not prove target FPS or memory peaks',
    'Controlled predecoded software GPU checks exclude native image scheduling, SAO combination and physical device lifecycle',
    '8MiB repeated warm upload and measured old 22.81MB/34.93MB logical texture combinations remain open',
    'Whole environment and surface quality, complete journey, ordinary composition/breathing, SAO, target performance and official package/cost remain open',
    'Self review is not independent review; final necessary independent review and Android/iOS acceptance remain open',
    'No other module, new source publication, cloud deployment, commit/push, branch switch, IDE or phone operation']};
await fs.writeFile(taskFile('evidence/experience-artwork-raster-binding-2026-09-30.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({changedSources,newSources:result.newSources,scenes:areas.length,pixelsEqual:true,stateFailureRestored:true,
  candidate:result.candidate,preservedCandidateUnchanged:true,sameBackend:true,contextRevision:context.revision,contextPuts:0,
  goal:result.goal,binding:'evidence/experience-artwork-raster-binding-2026-09-30.json'}));
