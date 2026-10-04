import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const task=path.resolve('.codex/work-items/cloud-sky-native-2026-09-22');
const base='http://127.0.0.1:60065',sha=value=>createHash('sha256').update(value).digest('hex');
const prior=JSON.parse(await fs.readFile(path.join(task,'tmp/v45-context-resolved.json'),'utf8')).data;
const files=['tmp/v49-context-resolved.json','tmp/v49-context-readback.json','tmp/v49-current-public-report.json','tmp/v49-backend-state.json','tmp/v49-png-readback.json'];
for(const file of files.slice(1))await assert.rejects(fs.access(path.join(task,file)),{code:'ENOENT'});
async function request(route,options={}){
  const response=await fetch(base+route,{...options,signal:AbortSignal.timeout(15000)});
  const bytes=Buffer.from(await response.arrayBuffer());return {response,bytes};
}
// Re-resolve only the public formal spot and existing public time preference.
// A new epoch does not inherit or reactivate the previous Context identifier.
let resolved;
try { resolved={bytes:await fs.readFile(path.join(task,files[0]))}; }
catch(error){
  if(error.code!=='ENOENT')throw error;
  resolved=await request('/v2/observation-contexts/resolve',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({location:{kind:'FORMAL_SPOT',spotId:'spot:test-published'},localDate:prior.localDate,
      selectedAt:prior.selectedAtUtc,targetProfile:prior.targetProfile})});
  assert.equal(resolved.response.status,201);
  await fs.writeFile(path.join(task,files[0]),resolved.bytes,{flag:'wx'});
}
const context=JSON.parse(resolved.bytes.toString()).data;
assert.notEqual(context.contextId,prior.contextId);assert.equal(context.revision,1);assert.equal(context.selectedAtUtc,prior.selectedAtUtc);
assert.equal(context.location.spotId,'spot:test-published');assert.equal(context.privacyClass,'PUBLIC_REFERENCE');
const readback=await request('/v2/observation-contexts/'+encodeURIComponent(context.contextId),{headers:{'Cache-Control':'no-cache'}});
assert.equal(readback.response.status,200);assert.deepEqual(JSON.parse(readback.bytes.toString()).data,context);
const old=await request('/v2/observation-contexts/'+encodeURIComponent(prior.contextId));assert.equal(old.response.status,404);
const report=await request('/v2/spots/spot%3Atest-published/sky?contextId='+encodeURIComponent(context.contextId));
assert.equal(report.response.status,200);const reportData=JSON.parse(report.bytes.toString());
assert.equal(reportData.contextRevision,1);assert.equal(reportData.data.context.contextId,context.contextId);
assert.equal(reportData.data.context.contextFingerprint,context.contextFingerprint);
const state=await request('/__task/alias-state');assert.equal(state.response.status,200);
const stateData=JSON.parse(state.bytes.toString());assert.equal(stateData.publicPort,60065);assert.equal(stateData.localPort,55700);
const imageReads=[];
for(const publicationHash of [undefined,'87ab6341b43d660e3c93a2430994c0f38b409dafa86216e7e3313e98cdbbc073'])
  for(const level of ['OVERVIEW','MEDIUM','DETAIL']){
    const route='/v2/celestial-objects/M%3A42/image?level='+level+'&imageVersion=source-finite-v3'+(publicationHash?'&publicationHash='+publicationHash:'');
    const image=await request(route);assert.equal(image.response.status,200);
    const header=image.response.headers.get('x-starward-image-display-support');assert(header);
    const support=JSON.parse(header);assert.equal(support.version,'encoded-rgb-runs-v1');assert.equal(support.sourceSha256,sha(image.bytes));
    const revision=image.response.headers.get('x-starward-image-publication-hash');
    assert.equal(revision,publicationHash??'8b970f207d1b99b3b92e74eb68f0aa6a7ca1f7b5ac51ad86e9d0c6e239540054');
    imageReads.push({route,bytes:image.bytes.length,sha256:sha(image.bytes),publicationHash:revision,supportBytes:Buffer.byteLength(header),supportSha256:sha(header)});
  }
const modules=await Promise.all(['workers/miniapp-api/dist/controller.js','workers/miniapp-api/dist/deep-sky-imagery.js',
  'packages/miniapp-contracts/dist/sky-image-display-support.js'].map(async file=>({path:file,sha256:sha(await fs.readFile(file))})));
for(const [file,bytes] of [[files[1],readback.bytes],[files[2],report.bytes],[files[3],state.bytes]])
  await fs.writeFile(path.join(task,file),bytes,{flag:'wx'});
await fs.writeFile(path.join(task,files[4]),JSON.stringify({scope:'Fresh owned epoch with real compiled image/controller/contract chain; MEMORY_TEST formal spot/weather, no native page or device acceptance',
  contextIdSha256:sha(context.contextId),revision:1,fingerprint:context.contextFingerprint,selectedAtUtc:context.selectedAtUtc,
  priorContextStatus:old.response.status,publicPort:60065,localPort:stateData.localPort,imageReads,modules},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({contextIdSha256:sha(context.contextId),revision:1,selectedAtUtc:context.selectedAtUtc,
  freshContext:true,priorContextStatus:old.response.status,imageReads:imageReads.length,publicPort:60065,localPort:stateData.localPort}));
