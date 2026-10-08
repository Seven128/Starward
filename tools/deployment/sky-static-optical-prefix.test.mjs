import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,readFile} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {writeSkyStaticBundle,validateSkyStaticBundle,mergeSkyStaticBundles} from './sky-static-bundle.mjs';
const base=`/v2/sky/optical/${'a'.repeat(64)}/ps1-dr1/1/0`,common={'cache-control':'public, max-age=31536000, immutable','x-content-type-options':'nosniff'};
const tile={route:base,bytes:Buffer.from([255,216,255,217]),headers:{...common,'content-type':'image/jpeg','x-starward-image-source':'ps1-dr1'}},index={route:base+'/index',bytes:Buffer.from('{"tiles":[0]}'),headers:{...common,'content-type':'application/json; charset=utf-8'}};
const inputs=rows=>(async function*(){yield* rows;})();
test('static optical pixel zero and its directory index coexist in either arrival order',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'starward-optical-prefix-'));
 for(const [name,rows] of [['index-first',[index,tile]],['tile-first',[tile,index]]]){
  const b=await writeSkyStaticBundle(path.join(root,name),inputs(rows)),v=await validateSkyStaticBundle(b.output);
  assert.equal(v.files,2);assert.deepEqual(v.records.map(r=>r.route),[base,base+'/index']);
  assert((await readFile(path.join(b.output,'files'+base+'.tile'))).equals(tile.bytes));
  assert((await readFile(path.join(b.output,'files'+index.route))).equals(index.bytes));
 }
 const solo=await writeSkyStaticBundle(path.join(root,'legacy-solo'),inputs([tile]));
 assert((await readFile(path.join(solo.output,'files'+base))).equals(tile.bytes),'valid old non-colliding layout remains unchanged');
 const onlyIndex=await writeSkyStaticBundle(path.join(root,'index-only'),inputs([index]));
 const merged=await mergeSkyStaticBundles({directories:[solo.output,onlyIndex.output],outputDirectory:path.join(root,'union')});assert.equal((await validateSkyStaticBundle(merged.output)).files,2);
 assert((await readFile(path.join(merged.output,'files'+base+'.tile'))).equals(tile.bytes));
 assert((await readFile(path.join(solo.output,'files'+base))).equals(tile.bytes),'union must preserve original bundle');
});
