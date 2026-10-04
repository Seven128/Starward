import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { assertSdssOpticalManifest } from '@starward/miniapp-contracts';
const output='.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-sdss-fault-transport-check-2026-09-29.json';
await assert.rejects(fs.access(output),{code:'ENOENT'});
const origin='http://127.0.0.1:8792',headers={'x-starward-measurement-probe':'1'};
async function control(mode:string) {
 const r=await fetch(origin+'/__sky_test/resource-mode',{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({mode}),signal:AbortSignal.timeout(5000)});
 assert.equal(r.status,200);return r.json();
}
async function json(path:string) { const r=await fetch(origin+path,{headers,signal:AbortSignal.timeout(5000)});assert.equal(r.status,200);return r.json(); }
const manifest=await json('/v2/sky/sdss-optical/450e5305189e0f31f5716513880ce480994e676379a79f8e571039b4bcde4b43/manifest');
assertSdssOpticalManifest(manifest,'M:82');
const rows=[];
async function image(level:'OVERVIEW'|'MEDIUM'|'DETAIL',expected:number) {
 const r=await fetch(origin+manifest.levels[level].downloadUrl,{headers,signal:AbortSignal.timeout(5000)});
 assert.equal(r.status,expected);const bytes=Buffer.from(await r.arrayBuffer());
 if(expected===200){assert.equal(bytes.length,manifest.levels[level].bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),manifest.levels[level].sha256);}
 rows.push({level,status:r.status,bytes:bytes.length,publishedBytes:expected===200,contentType:r.headers.get('content-type')});
}
try {
 await control('reject-sdss-details');
 await image('OVERVIEW',200);await image('MEDIUM',200);await image('DETAIL',503);
 await control('pass');await image('DETAIL',200);
 await control('hold-one-sdss-detail');
 const delayed=await fetch(origin+manifest.levels.DETAIL.downloadUrl,{headers,signal:AbortSignal.timeout(5000)});
 assert.equal(delayed.status,200);
 const held=await json('/__sky_test/traffic-status');assert.equal(held.heldResourceCount,1);
 await control('pass');
 const bytes=Buffer.from(await delayed.arrayBuffer());assert.equal(createHash('sha256').update(bytes).digest('hex'),manifest.levels.DETAIL.sha256);
 const final=await json('/__sky_test/traffic-status');
 assert.equal(final.heldResourceCount,0);assert.equal(final.active.length,0);assert.equal(final.resourceMode,'pass');
 const result={scope:'Task-local staging transport mechanism check only; no native, phone or product acceptance',epoch:final.epochStartedAt,publicationHash:manifest.publicationHash,rows,heldBodyReleasedWithExactPublishedHash:true,records:final.records,active:0,held:0,mode:final.resourceMode};
 await fs.writeFile(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({rows,heldBodyReleasedWithExactPublishedHash:true,mode:final.resourceMode,active:0,held:0}));
} finally { await control('pass'); }
