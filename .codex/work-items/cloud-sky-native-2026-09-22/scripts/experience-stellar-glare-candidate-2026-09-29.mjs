import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fingerprintBundle} from '../../../../tools/miniapp/release-bundle-artifact.mjs';
const evidence='.codex/work-items/cloud-sky-native-2026-09-22/evidence';
const output=evidence+'/experience-combined-clean-v33-candidate-2026-09-29.json';
await assert.rejects(fs.access(output),{code:'ENOENT'});
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const hash=async file=>createHash('sha256').update(await fs.readFile(file)).digest('hex');
const prior=await read(evidence+'/experience-combined-clean-v32-candidate-2026-09-29.json');
assert.equal((await fingerprintBundle(path.resolve(prior.bundle))).sha256,prior.fingerprint.sha256);
const owner='apps/wechat-miniapp/src/features/sky/sky-gpu-renderer.ts';
const gpuFile=evidence+'/experience-stellar-glare-gpu-validation-2026-09-29.json';
const gpu=await read(gpuFile);assert.equal(gpu.ownerSha256,await hash(owner));
const sourceInputs=[],ownerChanges=[];
for(const input of prior.sourceInputs){const sha256=await hash(input.file);
 if(input.file===owner){assert.notEqual(sha256,input.sha256);ownerChanges.push({...input,beforeSha256:input.sha256,sha256});}
 else assert.equal(sha256,input.sha256,'unaffected production input '+input.file);
 sourceInputs.push({file:input.file,sha256});}
assert.equal(ownerChanges.length,1);
const testInputs=[],retainedSkyTests=[];
for(const [name,inputs] of [['testInputs',prior.testInputs],['retainedSkyTests',prior.retainedSkyTests]]){
 for(const input of inputs){assert.equal(await hash(input.file),input.sha256,'unaffected bound check '+input.file);
  (name==='testInputs'?testInputs:retainedSkyTests).push(input);}}
const firstBoundTests=[];
for(const name of ['sky-star-appearance','sky-canvas-time','sky-named-star-labels','sky-planet-disc','sky-canvas-lifecycle']){
 const file=`apps/wechat-miniapp/src/features/sky/${name}.test.ts`;
 if(![...testInputs,...retainedSkyTests].some(input=>input.file===file)){firstBoundTests.push(file);testInputs.push({file,sha256:await hash(file)});}}
const buildLog=evidence+'/experience-stellar-glare-v33-build-2026-09-29.txt';assert.match(await fs.readFile(buildLog,'utf8'),/exitCode=0\s*$/);
const bundle='apps/wechat-miniapp/dist/weapp-check-sky-combined-clean-v33-0929';
const config=await read(bundle+'/project.config.json');assert.equal(config.appid,(await read(prior.bundle+'/project.config.json')).appid);
config.projectname='Starward-Sky-Combined-Clean-V33-0929';config.setting.urlCheck=false;
await fs.writeFile(bundle+'/project.config.json',JSON.stringify(config,null,2)+'\n');
const fingerprint=await fingerprintBundle(path.resolve(bundle));
const code=(await Promise.all(fingerprint.files.filter(file=>file.path.endsWith('.js')).map(file=>fs.readFile(path.join(bundle,file.path),'utf8')))).join('\n');
assert(code.includes('http://127.0.0.1:8791'));assert(!code.includes('http://127.0.0.1:8787'));
const diagnostics={};for(const marker of Object.keys(prior.diagnostics)){assert(!code.includes(marker),marker);diagnostics[marker]='absent';}
assert(!fingerprint.files.some(file=>file.path.endsWith('.map')));
const app=await read(bundle+'/app.json');assert.equal(app.debug??false,false);
const changedBundleFiles=fingerprint.files.filter(file=>prior.fingerprint.files.find(old=>old.path===file.path)?.sha256!==file.sha256).map(file=>file.path);
assert.deepEqual(changedBundleFiles.sort(),['project.config.json','sky/detail/index.js']);
assert.equal(fingerprint.fileCount,prior.fingerprint.fileCount);
const packages=app.subpackages??app.subPackages??[],rawPackageBytes={main:0};
for(const file of fingerprint.files){const name=packages.find(item=>file.path.startsWith(item.root.replace(/\/$/,'')+'/'))?.root??'main';rawPackageBytes[name]=(rawPackageBytes[name]??0)+file.bytes;}
const mapSourceSha256=await hash('apps/wechat-miniapp/src/pages/map/index.scss');assert.equal(mapSourceSha256,prior.mapSourceSha256);
const record={scope:'Sky shared point-source glare. Prepared clean v33; native verification pending; no phone/final acceptance.',
 bundle,apiOrigin:prior.apiOrigin,appDebug:false,diagnostics,fingerprint,rawPackageBytes,sourceInputs,ownerChanges,addedOwners:[],
 testInputs,retainedSkyTests,firstBoundTests,changedBundleFiles,mapSourceSha256,
 firstBoundTestNote:'The named-star-label VM fixture was not part of the frozen v32 bound tests. Broader affected checks exposed its missing selection input; its fixture and real page-label suppression assertions are repaired in v33. No old test hash is fabricated.',
 previousCandidate:{bundle:prior.bundle,sha256:prior.fingerprint.sha256},retainedRunningOpticalInputs:prior.retainedRunningOpticalInputs,
 retainedRunningSourceRecovery:prior.retainedRunningSourceRecovery,
 checks:{gpu:{file:gpuFile,sha256:await hash(gpuFile)},affected:{files:5,cases:59,passed:59,exec:'d907dd'},typecheck:{exitCode:0,exec:'777dbf'},
  buildLog,buildExitCode:0,buildExec:'c91f7d'},
 difference:'The existing star profile adds bounded bright halo/axis wings and respects the actual point-size range. BSC/SAO/unresolved planets share it. Colour, core radius, opacity, identity, geometry and picking owners are retained, without new attributes, textures, GPU programs, requests or state owner.',
 limits:'Software GPU results are bounded pixel checks, not target performance or native stellar quality. Native composed reticle/name/pulse, unresolved-patch picking semantics, continuous time, deep-sky helpers, SAO late/failing layers, full visual/registration quality, phone/new Moon, operational costs and final review remain open.'};
await fs.writeFile(output,JSON.stringify(record,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,bundle,sha256:fingerprint.sha256,fileCount:fingerprint.fileCount,bytes:fingerprint.totalBytes,rawPackageBytes,
 changedBundleFiles,sourceInputs:sourceInputs.length,firstBoundTests,mapSourceSha256}));
