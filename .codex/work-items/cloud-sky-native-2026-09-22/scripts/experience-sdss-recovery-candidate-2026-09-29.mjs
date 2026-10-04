import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fingerprintBundle} from '../../../../tools/miniapp/release-bundle-artifact.mjs';
const evidence='.codex/work-items/cloud-sky-native-2026-09-22/evidence';
const output=evidence+'/experience-combined-clean-v29-candidate-2026-09-29.json';
await assert.rejects(fs.access(output),{code:'ENOENT'});
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const hash=async file=>createHash('sha256').update(await fs.readFile(file)).digest('hex');
const prior=await read(evidence+'/experience-combined-clean-v28-candidate-2026-09-29.json');
assert.equal((await fingerprintBundle(path.resolve(prior.bundle))).sha256,prior.fingerprint.sha256);
const changedOwners=['spot-sky-page.tsx','use-sky-sdss-optical.ts','use-sky-galactic-image.ts','use-sky-wide-field-w3.ts','use-sky-moon-texture.ts','use-sky-mars-texture.ts','use-sky-mercury-texture.ts','use-sky-opal-bands.ts','use-sky-optical-hips.ts'].map(file=>'apps/wechat-miniapp/src/features/sky/'+file);
const changedTests=['use-sky-sdss-optical.test.ts','stellar-page-recovery.test.ts'].map(file=>'apps/wechat-miniapp/src/features/sky/'+file);
const sourceInputs=[],ownerChanges=[];
for(const input of prior.sourceInputs){
 const sha256=await hash(input.file);
 if(changedOwners.includes(input.file)){assert.notEqual(sha256,input.sha256);ownerChanges.push({file:input.file,beforeSha256:input.sha256,sha256});}
 else assert.equal(sha256,input.sha256,'unaffected prior owner '+input.file);
 sourceInputs.push({file:input.file,sha256});
}
for(const file of changedOwners.filter(file=>!sourceInputs.some(input=>input.file===file))){
 const sha256=await hash(file);sourceInputs.push({file,sha256});ownerChanges.push({file,sha256,beforeSha256:null,scope:'newly bound input absent from the earlier 99-file source inventory; not a claim of its earlier hash'});
}
assert.equal(sourceInputs.length,106);assert.equal(ownerChanges.length,9);
const testChanges=[];
async function bindTests(inputs){return Promise.all(inputs.map(async input=>{
 const sha256=await hash(input.file);if(changedTests.includes(input.file))testChanges.push({file:input.file,beforeSha256:input.sha256,sha256});else assert.equal(sha256,input.sha256,'retained test '+input.file);return {file:input.file,sha256};
}));}
const testInputs=await bindTests(prior.testInputs),retainedSkyTests=await bindTests(prior.retainedSkyTests);
for(const file of changedTests)if(![...testInputs,...retainedSkyTests].some(input=>input.file===file))testInputs.push({file,sha256:await hash(file)});
const buildLog=evidence+'/experience-sdss-v29-build-r2-2026-09-29.txt';assert.match(await fs.readFile(buildLog,'utf8'),/exitCode=0\s*$/);
const bundle='apps/wechat-miniapp/dist/weapp-check-sky-combined-clean-v29-0929';
const config=await read(bundle+'/project.config.json');assert.equal(config.appid,(await read(prior.bundle+'/project.config.json')).appid);config.projectname='Starward-Sky-Combined-Clean-V29-0929';config.setting.urlCheck=false;
await fs.writeFile(bundle+'/project.config.json',JSON.stringify(config,null,2)+'\n');
const fingerprint=await fingerprintBundle(path.resolve(bundle));
const code=(await Promise.all(fingerprint.files.filter(file=>file.path.endsWith('.js')).map(file=>fs.readFile(path.join(bundle,file.path),'utf8')))).join('\n');
assert(code.includes('http://127.0.0.1:8791'));assert(!code.includes('http://127.0.0.1:8787'));
const diagnostics={};for(const marker of Object.keys(prior.diagnostics)){assert(!code.includes(marker),marker);diagnostics[marker]='absent';}
assert(!fingerprint.files.some(file=>file.path.endsWith('.map')));const app=await read(bundle+'/app.json');assert.equal(app.debug??false,false);
const changedBundleFiles=fingerprint.files.filter(file=>prior.fingerprint.files.find(old=>old.path===file.path)?.sha256!==file.sha256).map(file=>file.path);
assert.deepEqual(changedBundleFiles.sort(),['project.config.json','sky/detail/index.js']);
assert.equal(fingerprint.fileCount,prior.fingerprint.fileCount);
const packages=app.subpackages??app.subPackages??[],rawPackageBytes={main:0};
for(const file of fingerprint.files){const name=packages.find(item=>file.path.startsWith(item.root.replace(/\/$/,'')+'/'))?.root??'main';rawPackageBytes[name]=(rawPackageBytes[name]??0)+file.bytes;}
const mapSourceSha256=await hash('apps/wechat-miniapp/src/pages/map/index.scss');assert.equal(mapSourceSha256,'81283f7b2849cd55eed4a82d322885e1c76d7f8aa81ab26fc2fc584d198c0e82');
const record={scope:'Sky-only retry correction. Fixed clean v29 local development candidate; no native, phone, target-performance or final acceptance claim',bundle,apiOrigin:prior.apiOrigin,appDebug:false,diagnostics,fingerprint,rawPackageBytes,sourceInputs,ownerChanges,testInputs,retainedSkyTests,testChanges,changedBundleFiles,mapSourceSha256,
 previousCandidate:{bundle:prior.bundle,sha256:prior.fingerprint.sha256},retainedRunningOpticalInputs:prior.retainedRunningOpticalInputs,retainedRunningSourceRecovery:prior.retainedRunningSourceRecovery,
 checks:{failingBefore:{command:"node --import tsx --test --test-name-pattern='the public page retry preserves coarse' apps/wechat-miniapp/src/features/sky/use-sky-sdss-optical.test.ts",exitCode:1,actualCanvasResets:1,expectedCanvasResets:0,exec:'767975'},behaviour:{loadedCases:33,passed:33,exitCode:0,exec:'78037e',scope:'six existing behavior files; nonexistent GPU-textures test argument did not run; typecheck then found a new-test-only typing error'},testTypingRepair:{cases:10,passed:10,behaviorExitCode:0,typecheckExitCode:0,exec:'e9cba8'},nativeImageOwners:{cases:7,passed:7,exitCode:0,exec:'1125c1'},buildLog,buildExitCode:0,discardedBuildLog:evidence+'/experience-sdss-v29-build-2026-09-29.txt',discardedBuildReason:'incorrect environment variable would select default 8787; never opened/adopted; rebuilt with MINIAPP_API_BASE=8791 before fingerprinting'},
 difference:'Reuse existing native-image loader GPU-retry flag. All affected Sky hook/consumer retries retain the current Canvas and independent valid imagery for transport/decode failures; a recorded GPU failure still resets the GPU/Canvas owner. No new renderer, artwork or provider. Existing selected-object W3 compatibility path remains its own recovery owner.',
 limitations:'Seven changed hooks were not individually present in the old source inventory; their current hashes are now explicit. Prepared bundle alone is not target evidence. Ordinary-controls capture gap and final independent review of this change remain open.',sourceScope:'Sky only'};
await fs.writeFile(output,JSON.stringify(record,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({bundle,sha256:fingerprint.sha256,files:fingerprint.fileCount,bytes:fingerprint.totalBytes,rawPackageBytes,rawDelta:fingerprint.totalBytes-prior.fingerprint.totalBytes,changedBundleFiles,sourceInputs:sourceInputs.length,changedSkyOwners:ownerChanges.length,mapSourceSha256}));
