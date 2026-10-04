import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fingerprintBundle} from '../../../../tools/miniapp/release-bundle-artifact.mjs';
const evidence='.codex/work-items/cloud-sky-native-2026-09-22/evidence';
const output=evidence+'/experience-combined-clean-v32-candidate-2026-09-29.json';
await assert.rejects(fs.access(output),{code:'ENOENT'});
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const hash=async file=>createHash('sha256').update(await fs.readFile(file)).digest('hex');
const prior=await read(evidence+'/experience-combined-clean-v31-candidate-2026-09-29.json');
assert.equal((await fingerprintBundle(path.resolve(prior.bundle))).sha256,prior.fingerprint.sha256);
const sky='apps/wechat-miniapp/src/features/sky/';
const changedOwners=['spot-sky-page.tsx','spot-sky-page.scss','sky-object-picking.ts'].map(file=>sky+file);
const addedOwners=['sky-object-selection.ts','sky-selection-marker.ts','sky-selected-object.tsx'].map(file=>sky+file);
const changedTests=['sky-manual-gesture.test.ts','sky-location-preview.test.ts','sky-located-page-marker.test.ts'].map(file=>sky+file);
const addedTests=['sky-object-selection.test.ts','sky-selected-object.test.ts'].map(file=>sky+file);
const sourceInputs=[],ownerChanges=[];
for(const input of prior.sourceInputs){const sha256=await hash(input.file);
 if(changedOwners.includes(input.file)){assert.notEqual(sha256,input.sha256);ownerChanges.push({...input,beforeSha256:input.sha256,sha256});}
 else assert.equal(sha256,input.sha256,'unaffected production input '+input.file);
 sourceInputs.push({file:input.file,sha256});}
const firstBoundOwners=changedOwners.filter(file=>!sourceInputs.some(input=>input.file===file));
assert.deepEqual(firstBoundOwners,[sky+'spot-sky-page.scss']);
assert.equal(ownerChanges.length,changedOwners.length-firstBoundOwners.length);
for(const file of firstBoundOwners)sourceInputs.push({file,sha256:await hash(file)});
for(const file of addedOwners){assert(!sourceInputs.some(input=>input.file===file));sourceInputs.push({file,sha256:await hash(file)});}
const testChanges=[];
async function bindTests(inputs){return Promise.all(inputs.map(async input=>{const sha256=await hash(input.file);
 if(changedTests.includes(input.file))testChanges.push({file:input.file,beforeSha256:input.sha256,sha256});
 else assert.equal(sha256,input.sha256,'unaffected check '+input.file);
 return{file:input.file,sha256};}));}
const testInputs=await bindTests(prior.testInputs),retainedSkyTests=await bindTests(prior.retainedSkyTests);
for(const file of [...changedTests,...addedTests])if(![...testInputs,...retainedSkyTests].some(input=>input.file===file))testInputs.push({file,sha256:await hash(file)});
const buildLog=evidence+'/experience-selection-v32-build-2026-09-29.txt';const log=await fs.readFile(buildLog,'utf8');assert.match(log,/exitCode=0\s*$/);
const bundle='apps/wechat-miniapp/dist/weapp-check-sky-combined-clean-v32-0929';
const config=await read(bundle+'/project.config.json');assert.equal(config.appid,(await read(prior.bundle+'/project.config.json')).appid);
config.projectname='Starward-Sky-Combined-Clean-V32-0929';config.setting.urlCheck=false;
await fs.writeFile(bundle+'/project.config.json',JSON.stringify(config,null,2)+'\n');
const fingerprint=await fingerprintBundle(path.resolve(bundle));
const code=(await Promise.all(fingerprint.files.filter(file=>file.path.endsWith('.js')).map(file=>fs.readFile(path.join(bundle,file.path),'utf8')))).join('\n');
assert(code.includes('http://127.0.0.1:8791'));assert(!code.includes('http://127.0.0.1:8787'));
const diagnostics={};for(const marker of Object.keys(prior.diagnostics)){assert(!code.includes(marker),marker);diagnostics[marker]='absent';}
assert(!fingerprint.files.some(file=>file.path.endsWith('.map')));const app=await read(bundle+'/app.json');assert.equal(app.debug??false,false);
const changedBundleFiles=fingerprint.files.filter(file=>prior.fingerprint.files.find(old=>old.path===file.path)?.sha256!==file.sha256).map(file=>file.path);
for(const file of changedBundleFiles)assert(['project.config.json','sky/detail/index.js','sky/detail/index.wxss','sky/common.wxss','common.wxss','common.js'].includes(file),'unplanned emitted change '+file);
assert.equal(fingerprint.fileCount,prior.fingerprint.fileCount);
const packages=app.subpackages??app.subPackages??[],rawPackageBytes={main:0};
for(const file of fingerprint.files){const name=packages.find(item=>file.path.startsWith(item.root.replace(/\/$/,'')+'/'))?.root??'main';rawPackageBytes[name]=(rawPackageBytes[name]??0)+file.bytes;}
const mapFile='apps/wechat-miniapp/src/pages/map/index.scss';const mapSourceSha256=await hash(mapFile);assert.equal(mapSourceSha256,prior.mapSourceSha256);
const record={scope:'Sky-only persistent object selection, point/area marker and name detail. Prepared clean v32; native verification pending, not phone/final acceptance.',
 bundle,apiOrigin:prior.apiOrigin,appDebug:false,diagnostics,fingerprint,rawPackageBytes,sourceInputs,ownerChanges,
 addedOwners,firstBoundOwners,priorSourceBindingGap:'v31 did not include the Sky SCSS source in its106 production-input list. It is bound here for the first time; no fabricated prior source hash. Compiled v31 CSS remains fingerprinted.',testInputs,retainedSkyTests,testChanges,addedTests,changedBundleFiles,mapSourceSha256,
 previousCandidate:{bundle:prior.bundle,sha256:prior.fingerprint.sha256},
 retainedRunningOpticalInputs:prior.retainedRunningOpticalInputs,retainedRunningSourceRecovery:prior.retainedRunningSourceRecovery,
 checks:{affected:{files:11,cases:38,passed:38,exec:'9d46d8'},
  finalGestureAfterLineEndingFixture:{cases:12,passed:12,exec:'e724f3'},
  mutation:{exec:'e724f3',failed:1,mechanism:'Remove actual blank-tap clear branch in memory; the retained Altair assertion then fails. No production file mutation.'},
  diagnostics:'Earlier VM fixtures lacked new dependencies/context, root invocation missed app tsconfig aliases, and first mutation did not reach CRLF source. These were repaired; none certify product failure/recovery.',
  typecheck:{exitCode:0,exec:'f35cd8'},buildLog,buildExitCode:0},
 difference:'Page selection intent now has one owner, independent of modal and camera tracking. Current-frame blank deselects, stale no-result does not. All selected celestial identities reuse the existing bound cancellable position query and shared projection; point cross/area circle/name opacity and reduced motion share one component. Legacy stored located-position/markup/style path retired.',
 limitations:'Native reticle/name/pulse/ordinary overlays are pending; area circle uses available catalogue major axis, absent size is only a semantic circle. Resolved body marker replacement retains its prior explicit safety variant. Continuous time, bright-star spikes/unresolved glow, deep-sky helper fade, SAO delayed/fault, phone/quality/performance/fees and final review remain open.'};
await fs.writeFile(output,JSON.stringify(record,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({bundle,sha256:fingerprint.sha256,fileCount:fingerprint.fileCount,bytes:fingerprint.totalBytes,
 rawPackageBytes,changedBundleFiles,sourceInputs:sourceInputs.length,ownerChanges:ownerChanges.map(item=>item.file),addedOwners,mapSourceSha256}));
