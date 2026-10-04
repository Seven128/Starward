import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fingerprintBundle} from '../../../../tools/miniapp/release-bundle-artifact.mjs';
const evidence='.codex/work-items/cloud-sky-native-2026-09-22/evidence';
const output=evidence+'/experience-combined-clean-v31-candidate-2026-09-29.json';
await assert.rejects(fs.access(output),{code:'ENOENT'});
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const hash=async file=>createHash('sha256').update(await fs.readFile(file)).digest('hex');
const prior=await read(evidence+'/experience-combined-clean-v30-candidate-2026-09-29.json');
assert.equal((await fingerprintBundle(path.resolve(prior.bundle))).sha256,prior.fingerprint.sha256);
const changedOwner='apps/wechat-miniapp/src/features/sky/sky-constellation-visibility.ts';
const changedTests=['sky-constellation-visibility.test.ts','sky-constellation-render.test.ts','sky-constellation-labels.test.ts'].map(file=>'apps/wechat-miniapp/src/features/sky/'+file);
const sourceInputs=[],ownerChanges=[],testChanges=[];
for(const input of prior.sourceInputs){const sha256=await hash(input.file);if(input.file===changedOwner){assert.notEqual(sha256,input.sha256);ownerChanges.push({file:input.file,beforeSha256:input.sha256,sha256});}else assert.equal(sha256,input.sha256,'unaffected Sky owner '+input.file);sourceInputs.push({file:input.file,sha256});}
assert.equal(ownerChanges.length,1);assert.equal(sourceInputs.length,106);
async function bindTests(inputs){return Promise.all(inputs.map(async input=>{const sha256=await hash(input.file);if(changedTests.includes(input.file))testChanges.push({file:input.file,beforeSha256:input.sha256,sha256});else assert.equal(sha256,input.sha256,'unaffected check '+input.file);return {file:input.file,sha256};}));}
const testInputs=await bindTests(prior.testInputs),retainedSkyTests=await bindTests(prior.retainedSkyTests);
for(const file of changedTests)if(![...testInputs,...retainedSkyTests].some(input=>input.file===file))testInputs.push({file,sha256:await hash(file)});
const buildLog=evidence+'/experience-constellation-local-v31-build-2026-09-29.txt';assert.match(await fs.readFile(buildLog,'utf8'),/exitCode=0\s*$/);
const bundle='apps/wechat-miniapp/dist/weapp-check-sky-combined-clean-v31-0929';
const config=await read(bundle+'/project.config.json');assert.equal(config.appid,(await read(prior.bundle+'/project.config.json')).appid);config.projectname='Starward-Sky-Combined-Clean-V31-0929';config.setting.urlCheck=false;
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
const record={scope:'Sky-only close-field constellation fade; prepared clean v31, native verification follows in its own trace; not phone or final acceptance.',bundle,apiOrigin:prior.apiOrigin,appDebug:false,diagnostics,fingerprint,rawPackageBytes,sourceInputs,ownerChanges,testInputs,retainedSkyTests,testChanges,changedBundleFiles,mapSourceSha256,previousCandidate:{bundle:prior.bundle,sha256:prior.fingerprint.sha256},retainedRunningOpticalInputs:prior.retainedRunningOpticalInputs,retainedRunningSourceRecovery:prior.retainedRunningSourceRecovery,
 checks:{failingBefore:{cases:6,failed:2,exitCode:1,exec:'3d6e62'},affectedBehaviours:{cases:23,passed:23,exitCode:0,exec:'caf329'},typecheck:{exitCode:0,exec:'33385c'},labelFixtureDiagnostic:{exec:'c640a5',reason:'zoom changes name collisions, so nearby Gemini also appears at15 degrees; assertion now follows centred Ori identity rather than assuming a constant label count; no production correction'},buildLog,buildExitCode:0,buildWarnings:3},
 difference:'The existing constellationVisibility owner supplies a reversible local display window to current artwork, line, name and image-eligibility consumers. Broad-view intent and geometry are unchanged. The10–25-degree fade is initial Miniapp tuning bounded by the existing25-degree identification view and the paused reference8.89-degree crop; it is not a universal reference-FOV definition or completion threshold.',
 limitations:'Selection persistence/breathing/name LOD, bright-star spikes, unresolved-halo picking, continuous observing-time playback, deep-sky area-helper fade, native overlays, phone, quality/performance and final independent review remain open. No new data, dependency, time owner or image editing.'};
await fs.writeFile(output,JSON.stringify(record,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({bundle,sha256:fingerprint.sha256,files:fingerprint.fileCount,bytes:fingerprint.totalBytes,rawPackageBytes,rawDelta:fingerprint.totalBytes-prior.fingerprint.totalBytes,changedBundleFiles,sourceInputs:sourceInputs.length,mapSourceSha256}));
