import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fingerprintBundle} from '../../../../tools/miniapp/release-bundle-artifact.mjs';
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const gpu='output/playwright/cloud-sky-galactic-window-production-1001';
const destination=task+'/evidence/experience-galactic-production-binding-2026-10-01.json';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const record=async p=>{const b=await fs.readFile(p);return {path:p,bytes:b.length,sha256:sha(b)};};
await assert.rejects(fs.access(destination),{code:'ENOENT'});
const result=await read(gpu+'/result.json'),sequence=await read(gpu+'-sequence/result.json');
assert.equal(result.rows.length,17);assert.equal(sequence.rows[0].stepComparisons.length,11);
assert.equal((await record(gpu+'/production.js')).sha256,result.productionBundleSha256);
assert.equal((await record(gpu+'/baseline.js')).sha256,result.beforeBundleSha256);
assert.equal(sequence.productionBundleSha256,result.productionBundleSha256);
for(const row of result.sourceHashes)assert.equal((await record(row.path)).sha256,row.sha256,row.path);
assert(result.errors.length===0&&sequence.errors.length===0);
for(const row of [...result.rows,...sequence.rows]){
 assert(row.pixelDifference.maxDelta<=1,row.condition.name);
 assert.deepEqual(row.variants[0].references,row.variants[1].references);
 assert.equal(row.variants[0].frameAt,row.variants[1].frameAt);
 assert.equal(row.variants[0].landscape,row.variants[1].landscape);
 assert.equal(row.variants[0].paintedDeepSky,row.variants[1].paintedDeepSky);
 for(const variant of row.variants){assert.equal(variant.glError,0);assert.equal(variant.retiredLogicalBytes,0);assert.equal(variant.retiredAllocations,0);}
}
assert(sequence.rows[0].stepComparisons.every(row=>row.maxDelta<=1));
assert(sequence.rows[0].variants[1].uploadPasses.slice(7).every(row=>!row.uploads.some(v=>v.id==='galactic')));
const summarize=(row)=>({name:row.condition.name,pixels:row.pixelDifference,variants:row.variants.map(v=>({variant:v.variant,copyAttempts:v.copyAttempts,failedAttempts:v.failedAttempts,failures:v.failures,glError:v.glError,retiredLogicalBytes:v.retiredLogicalBytes,
 cold:v.uploadPasses[0],warm:v.uploadPasses.at(-1),maximumLogicalAllocation:Math.max(...v.uploadPasses.map(p=>p.peakBytes)),
 recovery:v.recovered?{uploads:v.recovered.uploads,frameAt:v.recovered.frameAt,failures:v.recovered.failures}:null}))});
const metrics=result.rows.map(summarize);
const pathMetrics=sequence.rows[0].variants.map(v=>({variant:v.variant,retiredLogicalBytes:v.retiredLogicalBytes,maximumLogicalAllocation:Math.max(...v.uploadPasses.map(p=>p.peakBytes)),passes:v.uploadPasses}));
const preserved=await read(task+'/tmp/resume-preserved-hashes-2026-10-01.json');
for(const row of preserved)assert.equal((await record(row.path)).sha256,row.sha256);
const candidates=[];
for(const version of ['v53','v52','v51']){
 const root=`apps/wechat-miniapp/dist/weapp-check-sky-scene-${version}-final`;
 const fingerprint=await fingerprintBundle(path.resolve(root));
 const expected={v53:'80bc564b6d32d47a342ceb06a3c38e384fdbb091056a8ce49fc1f34a412d48d7',v52:'e8773df042c5c4de062e26f53071103103c05a12a50d70c463d8082045f52dba',v51:'8ebb849ed6ca986fe323520d580db798a257558dae73598569f4a91dfa87179e'}[version];
 assert.equal(fingerprint.sha256,expected);candidates.push({path:root,...fingerprint,scope:'Historical frozen candidate preserved; not opened or phone delivered'});
}
const nativeCapabilities=await Promise.all(['experience-galactic-native-copy-2026-10-01.json','experience-galactic-native-image-copy-2026-10-01.json'].map(p=>record(task+'/evidence/'+p)));
const imageCopy=await read(nativeCapabilities[1].path);assert(imageCopy.result.pixelsEqual&&imageCopy.result.resourcesReleased&&imageCopy.result.nonzeroColourChannels>0);
const trace=task+'/evidence/experience-galactic-production-events-frozen-2026-10-01.jsonl';
const watch=task+'/evidence/experience-galactic-production-watch-frozen-2026-10-01.log';
await fs.writeFile(trace,await fs.readFile(task+'/evidence/experience-current-native-events-2026-10-01.jsonl'),{flag:'wx'});
await fs.writeFile(watch,await fs.readFile(task+'/tmp/weapp-sky-watch-2026-10-01.log'),{flag:'wx'});
const events=(await fs.readFile(trace,'utf8')).trim().split(/\r?\n/).map(JSON.parse);
const lastStage=p=>events.filter(e=>e.stage===p&&e.value.canvas).at(-1)?.value;
assert(lastStage('galactic-production-ready').canvas.label.includes('45.0')||lastStage('galactic-production-ready').canvas.label.includes('45 度'));
assert(lastStage('galactic-production-dome').canvas.label.includes('274.9'));
assert(lastStage('galactic-production-returned').canvas.label.includes('43.6'));
const pixelComparison=await record(task+'/evidence/experience-galactic-native-pixel-comparison-2026-10-01.json');
const shaderAttempts=events.filter(e=>e.stage==='galactic-native-shader-tool-failure').map(e=>({at:e.at,value:e.value}));
const lastAttempt=shaderAttempts.at(-1);assert(lastAttempt?.value.message==='timeout waiting for automator response');
const response=await fetch('http://127.0.0.1:60065/__task/alias-state',{signal:AbortSignal.timeout(10000)});assert.equal(response.status,200);const service=await response.json();
const ordinary=await fingerprintBundle(path.resolve('apps/wechat-miniapp/dist/weapp'));
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();assert.equal(head,'72e65cf309d700cb7d40c5b7afd53660fd39fa35');
const branch=execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim();assert.equal(branch,'codex/remote-main-20260908');
await fs.writeFile(destination,JSON.stringify({at:new Date().toISOString(),goal:'active/unbudgeted/incomplete',head,branch,scope:'Adopted original-texel GPU windows in existing Sky owner; software scene and native API capability development proof, not complete native/phone quality or performance acceptance',
 sourceHashes:result.sourceHashes,changedProductionSources:result.changed,software:{result:await record(gpu+'/result.json'),sequence:await record(gpu+'-sequence/result.json'),productionBundle:await record(gpu+'/production.js'),baselineBundle:await record(gpu+'/baseline.js'),metrics,pathMetrics,encodedFiles:result.retired,errors:result.errors},
 regression:{before:await record(task+'/evidence/experience-galactic-window-coverage-before-2026-10-01.json'),fixed:await record(task+'/evidence/experience-galactic-window-coverage-fixed-2026-10-01.json')},
 native:{capabilities:nativeCapabilities,trace:{...await record(trace),events:events.length},watch:await record(watch),lastSuccessfulFlow:{ready:lastStage('galactic-production-ready').canvas,dome:lastStage('galactic-production-dome').canvas,returned:lastStage('galactic-production-returned').canvas},captures:await Promise.all(['ready','dome','returned'].map(p=>record(task+'/evidence/experience-current-native-galactic-production-'+p+'-2026-10-01.png'))),originalScreenshotComparison:pixelComparison,screenshotDifference:'max delta 128; full auxiliary-layer/camera/backing state not bound in old capture, causal conclusion unresolved',sameInputShader:{status:'UNVERIFIED',attempts:shaderAttempts,probe:await record(task+'/tmp/galactic-native-production-shader-probe-v2.js'),binding:await record(task+'/tmp/galactic-native-production-shader-binding-v2.json'),cleanup:'UNVERIFIED after automator timeout; timeout is not cancellation'},currentUi:'UNKNOWN after follow-up readonly SDK timeout; do not reuse old screenshot as current',composition:'FAILED_DEVTOOLS, phone UNVERIFIED'},
 ordinaryOutput:{path:'apps/wechat-miniapp/dist/weapp',...ordinary,containsPreservedOtherEdits:true},service:{port:service.port,internalPort:service.internalPort,pid:service.pid,moduleSha256:service.moduleSha256,scope:'Existing task service response; no new service or external deployment'},preservedOtherEdits:preserved,preservedCandidates:candidates,
 limitations:['Original decoded image remains whole; logical GL allocation is not native bitmap/driver/OS/GC peak','Cold uploads and expanded-window transition can have a larger per-step temporary copy allocation; retention is not a hard peak cap','Native full-page pixel difference remains unattributed and same-input shader probe/cleanup is unverified','Current DevTools ordinary WXML composition failed; physical Android/iOS/new Moon and necessary final independent review remain open']},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({binding:destination,sourceCount:result.sourceHashes.length,conditions:result.rows.length,sequenceSteps:sequence.rows[0].stepComparisons.length,metrics:metrics.filter(r=>['common-dpr3','wide'].includes(r.name)).map(r=>({name:r.name,pixels:r.pixels,variants:r.variants.map(v=>({variant:v.variant,warmBytes:v.warm.uploads.reduce((s,x)=>s+x.bytes,0),warmLogicalPeak:v.warm.peakBytes,coldLogicalPeak:v.cold.peakBytes,maximumLogicalAllocation:v.maximumLogicalAllocation}))})),pathMaximum:pathMetrics.map(v=>({variant:v.variant,bytes:v.maximumLogicalAllocation})),events:events.length,preserved:preserved.length,candidates:candidates.length,native:'UNVERIFIED_PIXEL_CAUSE_AND_SHADER_TIMEOUT',goal:'active incomplete'}));
