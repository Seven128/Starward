// Bind the bounded software repair and ordinary native development journey.
// Never print or publish raw Context IDs, fingerprints, headers or storage.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fingerprintBundle} from '../../../../tools/miniapp/release-bundle-artifact.mjs';

const task='.codex/work-items/cloud-sky-native-2026-09-22';
const output='output/playwright/cloud-sky-image-demand-1001';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const file=async name=>{const bytes=await fs.readFile(name);return {path:name.replaceAll('\\','/'),bytes:bytes.length,sha256:sha(bytes)}};
const read=async name=>JSON.parse(await fs.readFile(name,'utf8'));
const dest=[`${task}/evidence/experience-image-demand-binding-2026-10-01.json`,`${task}/evidence/experience-current-native-binding-2026-10-01.json`];
const frozenTrace=`${task}/evidence/experience-current-native-events-frozen-2026-10-01.jsonl`;
const frozenWatchLog=`${task}/evidence/experience-current-watch-log-frozen-2026-10-01.log`;
for(const name of [...dest,frozenTrace,frozenWatchLog]) await assert.rejects(fs.access(name),{code:'ENOENT'});
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const branch=execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim();
assert.equal(head,'72e65cf309d700cb7d40c5b7afd53660fd39fa35');
assert.equal(branch,'codex/remote-main-20260908');
const baseline=await read(`${output}/baseline.json`),result=await read(`${output}/result.json`);
assert.equal((await file(`${output}/baseline.js`)).sha256,baseline.productionBundleSha256);
assert.equal((await file(`${output}/production.js`)).sha256,result.productionBundleSha256);
for(const source of result.sourceHashes) assert.equal((await file(source.path)).sha256,source.sha256,source.path);
assert.equal(result.rows.length,13);
const regression=await read(`${output}/regression.json`);
assert(regression.results.every(row=>row.before===true&&row.after===false));
// Get the existing result schema from the measured owner; retain its complete
// immutable JSON rather than duplicating hundreds of calls or object IDs.
const metrics=result.rows.map(row=>({name:row.condition.name,beforeWanted:row.beforeWanted.length,
 afterWanted:row.afterWanted.length,excluded:row.beforeWanted.filter(id=>!row.afterWanted.includes(id)),
 variants:row.variants.map(v=>({variant:v.variant,warmUploads:v.uploadPasses[1].uploads.length,
   warmBytes:v.uploadPasses[1].uploads.reduce((sum,item)=>sum+item.bytes,0),
   warmImages:v.uploadPasses[1].uploads.map(item=>item.id),
   peakBytes:Math.max(...v.uploadPasses.map(pass=>pass.peakBytes)),
   retainedBytes:v.uploadPasses.at(-1).liveBytes,rgbaSha256:v.rgbaSha256,paintedDeepSky:v.paintedDeepSky,
   landscape:v.landscape,liveTextures:v.liveTextures,retiredLogicalBytes:v.retiredLogicalBytes,
   retiredAllocations:v.retiredAllocations,failedAttempts:v.failedAttempts,glError:v.glError}))}));
for(const row of result.rows) assert.equal(row.variants[0].rgbaSha256,row.variants[1].rgbaSha256,row.condition.name);
const preserved=await read(`${task}/tmp/resume-preserved-hashes-2026-10-01.json`);
const retained=[];
for(const row of preserved){const observed=await file(row.path);assert.equal(observed.sha256,row.sha256.toLowerCase(),row.path);retained.push(observed)}
const candidates=[];
for(const [version,expected] of [['v53','80bc564b6d32d47a342ceb06a3c38e384fdbb091056a8ce49fc1f34a412d48d7'],
 ['v52','e8773df042c5c4de062e26f53071103103c05a12a50d70c463d8082045f52dba'],
 ['v51','8ebb849ed6ca986fe323520d580db798a257558dae73598569f4a91dfa87179e']]){
 const root=`apps/wechat-miniapp/dist/weapp-check-sky-scene-${version}-final`,fingerprint=await fingerprintBundle(path.resolve(root));
 assert.equal(fingerprint.sha256,expected,version);
 candidates.push({path:root,sha256:fingerprint.sha256,fileCount:fingerprint.fileCount,totalBytes:fingerprint.totalBytes,
   scope:'Preserved frozen historical candidate; not opened or sent to a phone this turn'});
}
const software={recordedAtUtc:new Date().toISOString(),scope:result.scope,branch,head,
 inherited:await file(`${task}/evidence/experience-environment-composition-binding-2026-09-30.json`),
 baseline:await file(`${output}/baseline.json`),baselineBundle:await file(`${output}/baseline.js`),
 productionBundle:await file(`${output}/production.js`),result:await file(`${output}/result.json`),
 failingBeforeRegression:await file(`${output}/regression.json`),sourceHashes:result.sourceHashes,metrics,
 encodedFileLifecycle:result.retired,errors:result.errors,
 scripts:await Promise.all(['experience-image-demand-gpu-2026-10-01.mts','experience-image-demand-regression-2026-10-01.mts']
   .map(name=>file(`${task}/scripts/${name}`))),
 inspectedImages:await Promise.all(['common-dpr3','wide','dome','m42-detail'].map(name=>file(`${output}/${name}.png`))),
 checks:{affectedDemandAndLoader:'20/20 pass',constellationAndCanvasAlignment:'10/10 pass',miniappTypes:'exit 0',contextValidation:'exit 0'},
 limits:['SwiftShader development pixels and logical allocation, not native/physical GPU/total memory/timing acceptance',
   'Common warm galaxy upload remains 8,388,608 B; retained 16 MiB is not a peak cap',
   'Source coverage and quality gaps remain; no arbitrary downsampling, source change or budget increase'],
 preservedOtherEdits:retained,preservedCandidates:candidates};

const tracePath=`${task}/evidence/experience-current-native-events-2026-10-01.jsonl`;
const traceBytes=await fs.readFile(tracePath);
const events=traceBytes.toString('utf8').trim().split(/\r?\n/).map(line=>JSON.parse(line));
const stage=name=>{const rows=events.filter(event=>event.stage===name);assert(rows.length>0,name);return rows.at(-1).value};
const context=(await read(`${task}/tmp/current-native-context-2026-10-01.json`)).data;
const confirmed=stage('current-native-context-confirmed');assert.equal(confirmed.matchesCurrentOwnedContext,true);
const countsBefore=stage('before-playback-http-counts'),countsAfter=stage('after-playback-http-counts');
assert.equal(countsAfter.report-countsBefore.report,0);assert.equal(countsAfter.targets-countsBefore.targets,1);
assert.equal(countsAfter.contextPuts-countsBefore.contextPuts,0);
assert.equal(stage('files-after-exit').count,0);assert(stage('files-before-exit').count>0);
assert(stage('files-after-reentry').count>0);
assert.equal(stage('sky-public-return-entry').route,'pages/map/index');
const liveResponse=await fetch('http://127.0.0.1:60065/__task/alias-state',{signal:AbortSignal.timeout(15000)});
assert.equal(liveResponse.status,200);const service=await liveResponse.json();
const ordinary=await fingerprintBundle(path.resolve('apps/wechat-miniapp/dist/weapp'));
await fs.writeFile(frozenTrace,traceBytes,{flag:'wx'});
await fs.writeFile(frozenWatchLog,await fs.readFile(`${task}/tmp/weapp-sky-watch-2026-10-01.log`),{flag:'wx'});
const captures=[];
for(const name of await fs.readdir(`${task}/evidence`)) if(/^experience-current-native-.*-2026-10-01\.png$/.test(name))
 captures.push(await file(`${task}/evidence/${name}`));
const native={recordedAtUtc:new Date().toISOString(),goal:'active/unbudgeted/incomplete',branch,head,
 scope:'Current ordinary WEAPP watch, official DevTools SDK native canvas and public control/route development journey; not clean release or target whole-experience acceptance',
 project:'E:/dev/worktrees/Starward/remote-main-20260908/apps/wechat-miniapp',
 ordinaryWatch:{path:'apps/wechat-miniapp/dist/weapp',sha256:ordinary.sha256,fileCount:ordinary.fileCount,totalBytes:ordinary.totalBytes,
   watchLog:await file(frozenWatchLog),containsPreservedUnrelatedEdits:true},
 context:{record:await file(`${task}/tmp/current-native-context-2026-10-01.json`),
   report:await file(`${task}/tmp/current-native-report-2026-10-01.json`),contextIdSha256:sha(context.contextId),
   fingerprintSha256:sha(context.contextFingerprint),revision:context.revision,localDate:context.localDate,
   selectedAtUtc:context.selectedAtUtc,timezone:context.timezone,privacyClass:context.privacyClass,
   actualDurableNativeMatches:confirmed,afterJourneyReadback:stage('current-context-after-native-journey-http-readback'),
   networkRouting:stage('current-native-network-context-routing')},
 simulator:{SDKVersion:'3.17.3',platform:'devtools',virtualWeChatVersion:'8.0.5',DPR:3,screen:'390x844',
   scope:'Simulator metadata, not physical iOS or Android device evidence'},
 service:{scope:service.scope,publicPort:service.publicPort,internalPort:service.localPort,
   moduleSha256:service.moduleSha256,publicationHash:service.publicationHash,currentCounts:service.counts,
   script:await file(`${task}/scripts/experience-alias-public-resources-2026-09-30.mts`)},
 trace:await file(frozenTrace),eventCount:events.length,captures,
 playbackHttpDelta:{report:countsAfter.report-countsBefore.report,targets:countsAfter.targets-countsBefore.targets,
   contextPuts:countsAfter.contextPuts-countsBefore.contextPuts},
 encodedFileLifecycle:{beforeExit:stage('files-before-exit'),afterExit:stage('files-after-exit'),reentry:stage('files-after-reentry')},
 scripts:await Promise.all(['experience-current-native-context-2026-10-01.ps1','experience-current-native-helpers-2026-10-01.ps1']
   .map(name=>file(`${task}/scripts/${name}`))),
 sourceHashes:await Promise.all(['spot-sky-page.tsx','sky-artwork-visibility.ts','sky-artwork-raster-bounds.ts','sky-scene-render.ts',
  'sky-gpu-renderer.ts','sky-gpu-textures.ts','sky-object-tracking.ts','sky-object-selection.ts','sky-time-presentation.ts','sky-context-session.ts']
   .map(name=>file(`apps/wechat-miniapp/src/features/sky/${name}`))),
 limits:['SDK touch stream does not establish physical touch/hit testing or continuous gesture quality',
   'Canvas-enabled official screenshots still lack ordinary WXML overlays; composition and breathing remain unverified',
   'Readonly persistent/network receipts bind current development Context, not whole journey or restart/OS lifecycle acceptance',
   'Encoded file bytes/count are not decoded/GPU/OS memory',
   'Phone temporarily unavailable, new Moon has not been delivered to phone; Android/iOS, first frame/timing/total resources/official package/cost and final independent review remain'],
 preservedOtherEdits:retained,preservedCandidates:candidates};
for(const [index,value] of [software,native].entries()) await fs.writeFile(dest[index],JSON.stringify(value,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({bindings:dest,eventCount:events.length,captures:captures.length,metrics,
 preservedOtherEdits:retained.length,preservedCandidates:candidates.map(({path,sha256})=>({path,sha256}))}));
