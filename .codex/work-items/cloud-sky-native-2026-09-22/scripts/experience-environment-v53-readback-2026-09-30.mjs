import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const sha=value=>createHash('sha256').update(value).digest('hex');
const prior=JSON.parse(await fs.readFile(task+'/tmp/v49-context-readback.json','utf8')).data;
async function get(route,options={}) {
  const response=await fetch('http://127.0.0.1:60065'+route,{...options,signal:AbortSignal.timeout(15000)});
  return {status:response.status,bytes:Buffer.from(await response.arrayBuffer())};
}
const outputs=['v53-context-resolved.json','v53-context-readback.json','v53-current-public-report.json','v53-backend-state.json','v53-runtime-binding.json'];
for(const file of outputs)await assert.rejects(fs.access(task+'/tmp/'+file),{code:'ENOENT'});
const old=await get('/v2/observation-contexts/'+encodeURIComponent(prior.contextId));
assert.equal(old.status,404,'The previous epoch is gone; never silently reuse its Context');
const resolved=await get('/v2/observation-contexts/resolve',{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({location:{kind:'FORMAL_SPOT',spotId:prior.location.spotId},localDate:prior.localDate,
    selectedAt:prior.selectedAtUtc,targetProfile:prior.targetProfile})});
assert.equal(resolved.status,201);
const context=JSON.parse(resolved.bytes.toString()).data;
assert.notEqual(context.contextId,prior.contextId);
assert.equal(context.revision,1);assert.equal(context.selectedAtUtc,prior.selectedAtUtc);
assert.equal(context.privacyClass,'PUBLIC_REFERENCE');assert.deepEqual(context.location,prior.location);
const readback=await get('/v2/observation-contexts/'+encodeURIComponent(context.contextId),{headers:{'Cache-Control':'no-cache'}});
assert.equal(readback.status,200);assert.deepEqual(JSON.parse(readback.bytes.toString()).data,context);
const report=await get('/v2/spots/'+encodeURIComponent(context.location.spotId)+'/sky?contextId='+encodeURIComponent(context.contextId));
assert.equal(report.status,200);
const envelope=JSON.parse(report.bytes.toString());
assert.equal(envelope.contextRevision,1);assert.equal(envelope.data.context.contextId,context.contextId);
assert.equal(envelope.data.context.contextFingerprint,context.contextFingerprint);
assert.deepEqual(envelope.data.skyScene.observer,JSON.parse(await fs.readFile(task+'/tmp/v49-current-public-report.json','utf8')).data.skyScene.observer);
const state=await get('/__task/alias-state');assert.equal(state.status,200);
const backend=JSON.parse(state.bytes.toString());
assert.equal(backend.moduleSha256,'175d2b11a711ab83a3b0def4018de7afec6dfcaed70ab65f208722874057a9f7');
assert.equal(backend.publicationHash,'8380ab78a9f04426008e34c36abd268003906bffa3e3a0bfaab0500552db6cb0');
assert.equal(backend.publicPort,60065);assert.equal(backend.counts.contextPuts,0);
for(const [file,bytes] of [[outputs[0],resolved.bytes],[outputs[1],readback.bytes],[outputs[2],report.bytes],[outputs[3],state.bytes]])
  await fs.writeFile(task+'/tmp/'+file,bytes,{flag:'wx'});
const binding={scope:'Restored one owned task service after verified process/ports absent; real compiled Sky and MEMORY_TEST public formal spot/weather',
  contextIdSha256:sha(context.contextId),revision:1,fingerprint:context.contextFingerprint,selectedAtUtc:context.selectedAtUtc,
  priorContextStatus:old.status,publicPort:backend.publicPort,localPort:backend.localPort,moduleSha256:backend.moduleSha256,
  publicationHash:backend.publicationHash,reportSha256:sha(report.bytes),contextPuts:0,nativeContext:'unknown',execSession:46700};
await fs.writeFile(task+'/tmp/'+outputs[4],JSON.stringify(binding,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(binding));
