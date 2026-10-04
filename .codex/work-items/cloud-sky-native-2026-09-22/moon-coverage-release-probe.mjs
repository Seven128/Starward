import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const base='http://127.0.0.1:18928';
async function get(path){const r=await fetch(base+path,{signal:AbortSignal.timeout(10000)});const bytes=Buffer.from(await r.arrayBuffer());return {status:r.status,headers:r.headers,bytes,json:()=>JSON.parse(bytes)};}
const results=[];
for(const [version,path,type] of [['legacy','/v2/sky/moon/manifest','image/jpeg'],['coverage','/v2/sky/moon/coverage/manifest','image/png']]){
 const response=await get(path);assert.equal(response.status,200);
 const manifest=response.json(),image=await get(manifest.image.downloadUrl);
 assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),type);
 assert.equal(image.bytes.length,manifest.image.bytes);
 assert.equal(createHash('sha256').update(image.bytes).digest('hex'),manifest.image.sha256);
 assert.ok(image.headers.get('cache-control').includes('immutable'));
 const bad=await get(manifest.image.downloadUrl.replace(manifest.publicationHash,'0'.repeat(64)));assert.equal(bad.status,404);
 assert.equal((await get(manifest.image.downloadUrl)).status,200);
 const info=(await get('/v2/celestial-objects/SOLAR%3AMOON'+(version==='coverage'?'?moonTextureVersion=coverage-v2':''))).json();
 assert.equal(info.dataState,'FRESH');
 assert.ok(info.data.sources.some(s=>s.id===(version==='coverage'?'usgs-clementine-uv750-v21-coverage':'usgs-clementine-uv750-v2')));
 results.push({version,manifestBytes:response.bytes.length,imageBytes:image.bytes.length,sha256:manifest.image.sha256,
  publicationHash:manifest.publicationHash,wrongVersion:bad.status,contentRevision:info.data.contentRevision});
}
assert.notEqual(results[0].contentRevision,results[1].contentRevision);
const old=await get('/v2/sky/moon/ccdcceac70cf74c041cff589f59ea6a2b06f8b741f0be97e67b59799b22b73e6/clementine-uv750-v2-wms-2048x1024.jpg');
assert.equal(old.status,200);assert.equal(old.bytes.length,372399);
console.log(JSON.stringify({results,originalManifestImageStillAvailable:true},null,2));
