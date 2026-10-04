import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fingerprintBundle} from '../../../../tools/miniapp/release-bundle-artifact.mjs';
const evidence='.codex/work-items/cloud-sky-native-2026-09-22/evidence';
const output=evidence+'/experience-combined-clean-v30-candidate-2026-09-29.json';
await assert.rejects(fs.access(output),{code:'ENOENT'});
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const hash=async file=>createHash('sha256').update(await fs.readFile(file)).digest('hex');
const prior=await read(evidence+'/experience-combined-clean-v29-candidate-2026-09-29.json');
assert.equal((await fingerprintBundle(path.resolve(prior.bundle))).sha256,prior.fingerprint.sha256);
const changedOwners=['spot-sky-page.tsx','use-sky-sdss-optical.ts','sky-scene-render.ts'].map(file=>'apps/wechat-miniapp/src/features/sky/'+file);
const changedTests=['use-sky-sdss-optical.test.ts','sky-sdss-optical-scene.test.ts','sky-canvas-time.test.ts','sky-sdss-optical-page.test.ts'].map(file=>'apps/wechat-miniapp/src/features/sky/'+file);
const sourceInputs=[],ownerChanges=[];
for(const input of prior.sourceInputs){const sha256=await hash(input.file);if(changedOwners.includes(input.file)){assert.notEqual(sha256,input.sha256);ownerChanges.push({file:input.file,beforeSha256:input.sha256,sha256});}else assert.equal(sha256,input.sha256,'unaffected owner '+input.file);sourceInputs.push({file:input.file,sha256});}
assert.equal(ownerChanges.length,3);assert.equal(sourceInputs.length,106);
const testChanges=[];
async function bindTests(inputs){return Promise.all(inputs.map(async input=>{const sha256=await hash(input.file);if(changedTests.includes(input.file))testChanges.push({file:input.file,beforeSha256:input.sha256,sha256});else assert.equal(sha256,input.sha256,'unaffected test '+input.file);return {file:input.file,sha256};}));}
const testInputs=await bindTests(prior.testInputs),retainedSkyTests=await bindTests(prior.retainedSkyTests);
for(const file of changedTests)if(![...testInputs,...retainedSkyTests].some(input=>input.file===file))testInputs.push({file,sha256:await hash(file)});
const buildLog=evidence+'/experience-optical-boundary-v30-build-2026-09-29.txt';assert.match(await fs.readFile(buildLog,'utf8'),/exitCode=0\s*$/);
const bundle='apps/wechat-miniapp/dist/weapp-check-sky-combined-clean-v30-0929';
const config=await read(bundle+'/project.config.json');assert.equal(config.appid,(await read(prior.bundle+'/project.config.json')).appid);config.projectname='Starward-Sky-Combined-Clean-V30-0929';config.setting.urlCheck=false;
await fs.writeFile(bundle+'/project.config.json',JSON.stringify(config,null,2)+'\n');
const fingerprint=await fingerprintBundle(path.resolve(bundle));
const code=(await Promise.all(fingerprint.files.filter(file=>file.path.endsWith('.js')).map(file=>fs.readFile(path.join(bundle,file.path),'utf8')))).join('\n');
assert(code.includes('http://127.0.0.1:8791'));assert(!code.includes('http://127.0.0.1:8787'));
const diagnostics={};for(const marker of Object.keys(prior.diagnostics)){assert(!code.includes(marker),marker);diagnostics[marker]='absent';}
assert(!fingerprint.files.some(file=>file.path.endsWith('.map')));const app=await read(bundle+'/app.json');assert.equal(app.debug??false,false);
const changedBundleFiles=fingerprint.files.filter(file=>prior.fingerprint.files.find(old=>old.path===file.path)?.sha256!==file.sha256).map(file=>file.path);
assert.deepEqual(changedBundleFiles.sort(),['project.config.json','sky/detail/index.js']);assert.equal(fingerprint.fileCount,prior.fingerprint.fileCount);
const packages=app.subpackages??app.subPackages??[],rawPackageBytes={main:0};
for(const file of fingerprint.files){const name=packages.find(item=>file.path.startsWith(item.root.replace(/\/$/, '')+'/'))?.root??'main';rawPackageBytes[name]=(rawPackageBytes[name]??0)+file.bytes;}
const mapSourceSha256=await hash('apps/wechat-miniapp/src/pages/map/index.scss');assert.equal(mapSourceSha256,'81283f7b2849cd55eed4a82d322885e1c76d7f8aa81ab26fc2fc584d198c0e82');
const record={scope:'Sky-only optical progressive composition. Fixed local clean v30; no phone, final quality/performance or independent final-review acceptance.',bundle,apiOrigin:prior.apiOrigin,appDebug:false,diagnostics,fingerprint,rawPackageBytes,sourceInputs,ownerChanges,testInputs,retainedSkyTests,testChanges,changedBundleFiles,mapSourceSha256,previousCandidate:{bundle:prior.bundle,sha256:prior.fingerprint.sha256},retainedRunningOpticalInputs:prior.retainedRunningOpticalInputs,retainedRunningSourceRecovery:prior.retainedRunningSourceRecovery,
 checks:{failingBefore:{cases:6,failed:6,exitCodes:[1,1],execs:['5e92bc','315ffe']},affectedBehaviours:{cases:42,passed:42,exitCode:0,exec:'852fe4'},testTypingRepair:{scope:'two new-test typing errors only',typecheckExitCode:0,affectedCases:15,passed:15,exitCode:0,exec:'58991'},softwareGpu:{before:'output/playwright/cloud-sky-optical-boundary-0929/before/result.json',after:'output/playwright/cloud-sky-optical-boundary-0929/after-r2/result.json',casesEach:10,partialFirstAfter:'output/playwright/cloud-sky-optical-boundary-0929/after/failed-trial.json',scope:'the first after diagnostic had a wrong exterior-region assumption at centered minimum FOV; preserved, fixed in separate r2 without production changes'},buildLog,buildExitCode:0,buildWarnings:3},
 difference:'SDSS desired fine field plus its immediate parent use the same two-image loader/budget. Shared registered artwork paints valid wider optical first and fine above, without W3 mixing. Finest actually visible field controls source metadata after failure/foreground; parent arrival/change/removal participates in the native draw queue. HTTP/decode retries retain valid layers; the existing GPU-reset flag remains intact.',
 limitations:'Native confirmation is still required for this new candidate. Ordinary overlay composition, phone, resource peak, final quality and final independent review remain unverified. Original finite fields and source artifacts are retained; no data editing, synthetic mask, new source, dependency or renderer.',sourceScope:'Sky only'};
await fs.writeFile(output,JSON.stringify(record,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({bundle,sha256:fingerprint.sha256,files:fingerprint.fileCount,bytes:fingerprint.totalBytes,rawPackageBytes,rawDelta:fingerprint.totalBytes-prior.fingerprint.totalBytes,changedBundleFiles,sourceInputs:sourceInputs.length,changedSkyOwners:ownerChanges.length,mapSourceSha256}));
