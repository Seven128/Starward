import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {isDeepStrictEqual} from 'node:util';
import {fingerprintBundle} from '../../../../tools/miniapp/release-bundle-artifact.mjs';
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const sha=value=>createHash('sha256').update(value).digest('hex');
const json=async file=>JSON.parse((await fs.readFile(file,'utf8')).replace(/^\uFEFF/u,''));
const record=async file=>{const bytes=await fs.readFile(file);return {path:file.replaceAll('\\','/'),bytes:bytes.length,sha256:sha(bytes)};};
const previousPath=task+'/evidence/experience-sao-composition-binding-2026-09-30.json';
const previous=await json(previousPath);
const resultPath='output/playwright/cloud-sky-landscape-boundary-0930/result.json',result=await json(resultPath);
const sources=await Promise.all(previous.sourceHashes.map(async source=>{
  const current=await record(source.path);assert.equal(current.sha256,source.sha256,source.path);return current;
}));
assert.equal((await record(previous.addedTest.path)).sha256,previous.addedTest.sha256);
for(const source of result.sources)assert.equal((await record(source.path)).sha256,source.sha256,source.path);
assert.equal((await record(path.posix.dirname(resultPath)+'/production.js')).sha256,result.productionBundleSha256);
assert.equal(result.rows.length,12);assert.equal(result.composition.length,6);
assert.equal(result.sourceFacts.reduce((sum,row)=>sum+row.pngRleDifferences,0),0);
assert(result.rows.every(row=>row.ok&&row.aboveTwo===0&&row.robustWrongOpacity===0&&row.glError===0));
assert(result.sensitivity.robustWrongOpacity>1000&&result.sensitivity.aboveTwo>1000);
assert.deepEqual(result.retired,{resources:{textures:0,buffers:0,programs:0,shaders:0},failures:[],glError:0});
assert.equal(result.errors.length,0);
const captures=await Promise.all([...result.rows,result.sensitivity,...result.composition].map(async row=>{
  const capture=await record(path.posix.dirname(resultPath)+'/'+row.image);assert.equal(capture.sha256,row.imageSha256);return capture;
}));
const candidate=await fingerprintBundle(path.resolve(previous.candidate.path));
assert.equal(candidate.sha256,previous.candidate.treeSha256);assert.equal(candidate.totalBytes,previous.candidate.rawBytes);
assert.equal(candidate.fileCount,previous.candidate.files);
const oldContext=(await json(task+'/tmp/v52-context-readback.json')).data;
async function get(route){const response=await fetch('http://127.0.0.1:60065'+route,{signal:AbortSignal.timeout(15000)});assert.equal(response.status,200);
  const bytes=Buffer.from(await response.arrayBuffer());return {bytes,data:JSON.parse(bytes.toString())};}
const readbacks=await Promise.allSettled([get('/__task/alias-state'),get('/v2/observation-contexts/'+encodeURIComponent(oldContext.contextId))]);
assert(readbacks.every(result=>result.status==='fulfilled'));
const [backend,context]=readbacks.map(result=>result.value);
assert.equal(backend.data.moduleSha256,previous.backend.moduleSha256);assert.equal(backend.data.publicationHash,previous.backend.publicationHash);
assert.equal(backend.data.counts.contextPuts,0);assert(isDeepStrictEqual(context.data.data,oldContext));
await fs.writeFile(task+'/tmp/landscape-boundary-backend-0930.json',backend.bytes,{flag:'wx'});
await fs.writeFile(task+'/tmp/landscape-boundary-context-0930.json',context.bytes,{flag:'wx'});
const branch=execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim();
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
assert.equal(branch,previous.branch);assert.equal(head,previous.head);
const artifactPaths=[resultPath,path.posix.dirname(resultPath)+'/production.js',path.posix.dirname(resultPath)+'/bounded-mutation.js',
  task+'/scripts/experience-landscape-boundary-2026-09-30.mts',task+'/scripts/experience-landscape-boundary-binding-2026-09-30.mjs',
  task+'/tmp/landscape-boundary-0930.log',task+'/tmp/landscape-boundary-backend-0930.json',task+'/tmp/landscape-boundary-context-0930.json',
  task+'/evidence/experience-landscape-boundary-2026-09-30.md'];
const docs=['PLAN.md','STATE.md','INDEX.md'].map(file=>task+'/'+file);
let localLinks=0;
for(const file of [artifactPaths.at(-1),...docs]){
  const contents=await fs.readFile(file,'utf8');
  for(const match of contents.matchAll(/\]\(([^)]+)\)/gu)){
    const target=match[1].replace(/^<|>$/gu,'').split('#')[0];
    if(!target||/^[a-z][a-z\d+.-]*:/iu.test(target))continue;
    // The binding is created below; all other local references must exist now.
    if(target==='experience-landscape-boundary-binding-2026-09-30.json'||target==='evidence/experience-landscape-boundary-binding-2026-09-30.json'){localLinks++;continue;}
    await fs.access(path.resolve(path.dirname(file),target));localLinks++;
  }
}
const binding={recordedAtUtc:new Date().toISOString(),goal:'active/unbudgeted/incomplete',scope:result.scope,
  inherited:await record(previousPath),sourceHashes:sources,changedProductionOrContextSources:[],productionModuleHashes:result.sources,
  addedTestUnchanged:true,branch,head,artifacts:await Promise.all(artifactPaths.map(record)),captures,
  registration:{sourceFacts:result.sourceFacts,rows:result.rows.map(({condition,samples,maxError,meanError,aboveTwo,robustWrongOpacity,seamSamples,seamMaxError,rgbaSha256})=>
    ({condition,samples,maxError,meanError,aboveTwo,robustWrongOpacity,seamSamples,seamMaxError,rgbaSha256})),
    totalCssCentreRays:result.rows.reduce((sum,row)=>sum+row.samples,0),mutationInteriorErrors:result.sensitivity.robustWrongOpacity},
  completedScene:result.composition.map(row=>({condition:row.condition,frameAt:row.frameAt,paintedResource:row.paintedResource,
    objects:row.picks.length,visible:row.picks.filter(pick=>pick.visible).length,masked:row.picks.filter(pick=>!pick.visible).length,
    redDominanceViolations:row.redDominanceViolations,rgbaSha256:row.rgbaSha256})),
  candidate:{...previous.candidate,allFilesUnchanged:true,opened:false,phonePreview:false},
  backend:{...previous.backend,counts:backend.data.counts,restarted:false,contextPuts:0},
  context:{...previous.context,dataUnchanged:true,nativeContext:'unknown'},retired:result.retired,
  currentDocuments:await Promise.all(docs.map(record)),localDocumentLinks:{checked:localLinks,allExist:true,notFactualCertification:true},
  limits:[...result.limits,'Same existing reference tab debugger synchronization failed; no new reference image or page state verified',
    'No product change: current candidate build/type/behavior evidence inherited with exact production files unchanged; not rerun or upgraded',
    'All 33 obligations, legal exclusions/reasons, surface/environment/composition/journey/performance/package/cost/new Moon phone and necessary final review remain open']};
const target=task+'/evidence/experience-landscape-boundary-binding-2026-09-30.json';
await fs.writeFile(target,JSON.stringify(binding,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({sourceFilesUnchanged:sources.length,productionModules:result.sources.length,captures:captures.length,
  localLinks,candidateUnchanged:true,contextUnchanged:true,contextPuts:0,goal:binding.goal}));
