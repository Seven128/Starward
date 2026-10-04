import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const task=path.resolve('.codex/work-items/cloud-sky-native-2026-09-22');
const prior=JSON.parse(await fs.readFile(path.join(task,'tmp/v46-context-readback.json'),'utf8')).data;
const binding=JSON.parse(await fs.readFile(path.join(task,'evidence/experience-scene-v46-binding-2026-09-30.json'),'utf8'));
const files=['tmp/v47-context-readback.json','tmp/v47-backend-state.json'];
for(const file of files)await assert.rejects(fs.access(path.join(task,file)),{code:'ENOENT'});
const contextReply=await fetch('http://127.0.0.1:60065/v2/observation-contexts/'+encodeURIComponent(prior.contextId),
  {headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(10000)});
assert.equal(contextReply.status,200);const contextBytes=Buffer.from(await contextReply.arrayBuffer());
const context=JSON.parse(contextBytes.toString()).data;
for(const key of ['contextId','contextFingerprint','revision','selectedAtUtc','localDate','timezone'])assert.equal(context[key],prior[key]);
const stateReply=await fetch('http://127.0.0.1:60065/__task/alias-state',{signal:AbortSignal.timeout(10000)});
assert.equal(stateReply.status,200);const stateBytes=Buffer.from(await stateReply.arrayBuffer());
const state=JSON.parse(stateBytes.toString());assert.equal(state.moduleSha256,binding.backend.moduleSha256);
await fs.writeFile(path.join(task,files[0]),contextBytes,{flag:'wx'});await fs.writeFile(path.join(task,files[1]),stateBytes,{flag:'wx'});
console.log(JSON.stringify({contextIdSha256:createHash('sha256').update(context.contextId).digest('hex'),
  revision:context.revision,fingerprint:context.contextFingerprint,selectedAtUtc:context.selectedAtUtc,
  moduleSha256:state.moduleSha256,counts:state.counts,scope:'Read-only backend readback, not current native page acceptance'}));
