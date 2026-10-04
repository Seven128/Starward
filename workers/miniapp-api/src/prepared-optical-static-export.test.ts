import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {mkdtempSync,mkdirSync,readFileSync,realpathSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename,dirname,join} from 'node:path';
import {PreparedOpticalImageryService} from './prepared-optical-imagery';
import {exportSkyPublicAssets} from './sky-public-asset-export';
import {skyPublicAssetHeaders} from './sky-public-asset-headers';
import {createSyntheticPreparedOpticalPublication} from './test-fixtures/prepared-optical-publication';
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const collect=async(owner:PreparedOpticalImageryService)=>{const values=[];for await(const image of owner.publishedAssets())values.push(image);return values;};
test('standard sealed export includes only explicitly registered Prepared PNG generations with HTTP-equivalent headers',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'starward-prepared-static-'));
 try{
  const firstDir=join(directory,'first'),nextDir=join(directory,'next');mkdirSync(firstDir);mkdirSync(nextDir);
  const first=createSyntheticPreparedOpticalPublication(firstDir),next=createSyntheticPreparedOpticalPublication(nextDir,'synthetic-next-static');
  const owner=new PreparedOpticalImageryService([first,next].map(p=>({reference:'M:51',expectedHash:p.expectedHash,manifestUrl:p.manifestUrl})));
  assert.deepEqual(await collect(new PreparedOpticalImageryService()),[],'ordinary registry remains empty');
  const images=await collect(owner);assert.equal(images.length,6);
  const exported=await exportSkyPublicAssets(join(directory,'export'),'1'.repeat(40),owner);
  const index=JSON.parse(readFileSync(join(exported.output,'index.json'),'utf8'));
  const prepared=index.records.filter((r:any)=>r.route.startsWith('/v2/sky/prepared-optical/'));
  assert.equal(prepared.length,6);
  for(const image of images){const record=prepared.find((r:any)=>r.route===image.descriptor.downloadUrl);assert(record);
   assert.equal(record.sha256,image.descriptor.sha256);assert.equal(record.bytes,image.descriptor.bytes);
   assert.deepEqual(record.headers,skyPublicAssetHeaders('prepared-optical',image.contentType,image.fieldDegrees));
   const exportedBytes=readFileSync(join(exported.output,'files',record.route));
   assert.equal(sha(exportedBytes),record.sha256);assert.deepEqual(exportedBytes,image.bytes);
  }
  assert.equal(index.records.some((r:any)=>/manifest|master|receipt|rawXmp/u.test(r.route)&&r.route.includes('prepared-optical')),false);
  const artifact=JSON.parse(readFileSync(join(exported.output,'image-artifact.json'),'utf8'));
  assert.equal(artifact.revision,'1'.repeat(40));assert.equal(artifact.indexSha256,sha(readFileSync(join(exported.output,'index.json'))));
  assert.equal(artifact.fragmentSha256,sha(readFileSync(join(exported.output,'delivery.caddy'))));
  const fragment=readFileSync(join(exported.output,'delivery.caddy'),'utf8');
  for(const record of prepared)assert(fragment.includes(record.route));assert(fragment.includes('method GET HEAD'));
  const detail=join(nextDir,next.value.levels.DETAIL.file),original=readFileSync(detail),changed=Buffer.from(original);changed[changed.length-1]^=1;writeFileSync(detail,changed);
  await assert.rejects(collect(owner),/prepared_optical_asset_invalid/);
  writeFileSync(detail,original);assert.equal((await collect(owner)).length,6,'byte corruption does not enable an invalid static entry or poison retry');
 }finally{
  assert.equal(dirname(realpathSync(directory)),realpathSync(tmpdir()));assert.match(basename(directory),/^starward-prepared-static-/u);
  rmSync(directory,{recursive:true}); // Verified scope, exclusively generated test data.
 }
});
