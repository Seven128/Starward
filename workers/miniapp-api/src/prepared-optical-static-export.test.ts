import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {mkdtempSync,mkdirSync,readFileSync,realpathSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename,dirname,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {preparedNativeOpticalPublicationHash, assertPreparedRenderedOpticalManifest, preparedNativeDisplayGeometry} from '@starward/miniapp-contracts';
import {nativeTanNominalWidthDegrees} from '@starward/astronomy-core/tan-optical-geometry';
import {preparedNativeOpticalFixture, preparedRegisteredNativeFixture} from '../../../packages/miniapp-contracts/src/test-fixtures/prepared-native-optical-publication';
import {syntheticOpticalPng} from './test-fixtures/synthetic-optical-png';
import {PreparedOpticalImageryService} from './prepared-optical-imagery';
import {exportSkyPublicAssets} from './sky-public-asset-export';
import {skyPublicAssetHeaders} from './sky-public-asset-headers';
import {createSyntheticPreparedOpticalPublication} from './test-fixtures/prepared-optical-publication';
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const collect=async(owner:PreparedOpticalImageryService)=>{const values=[];for await(const image of owner.publishedAssets())values.push(image);return values;};

test('sealed native exports retain the client manifest for both immutable generations without a live registry',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'starward-prepared-static-'));
 try{
  const candidates=['native-static-first','native-static-next'].map(publicationId=>{
   const root=join(directory,publicationId);mkdirSync(root);
   const value=publicationId==='native-static-next'?preparedRegisteredNativeFixture(true):preparedNativeOpticalFixture(true);value.publicationId=publicationId;
   if(value.registration)value.registration.geometry.cdDegreesPerPixel[0][0]*=1.03;
   for(const [level,asset] of Object.entries(value.levels)){
    const bytes=syntheticOpticalPng(32,64,96,{width:asset.width,height:asset.height,colorType:2});
    Object.assign(asset,{file:`${publicationId}-${level.toLowerCase()}.png`,format:'png',bytes:bytes.length,sha256:sha(bytes),
     fieldDegrees:nativeTanNominalWidthDegrees(preparedNativeDisplayGeometry(value))});
    writeFileSync(join(root,asset.file),bytes);
   }
   const manifestUrl=pathToFileURL(join(root,'manifest.json'));writeFileSync(manifestUrl,JSON.stringify(value));
   return {reference:value.reference,expectedHash:preparedNativeOpticalPublicationHash(value),manifestUrl};
  });
  const owner=new PreparedOpticalImageryService(candidates);
  assert.deepEqual([...new PreparedOpticalImageryService().publishedMetadata()],[]);
  const exported=await exportSkyPublicAssets(join(directory,'export'),'2'.repeat(40),owner);
  const index=JSON.parse(readFileSync(join(exported.output,'index.json'),'utf8'));
  const native=index.records.filter((r:any)=>r.route.startsWith('/v2/sky/prepared-optical/'));
  assert.equal(native.length,8,'each retained generation needs its manifest and three admitted images');
  for(const candidate of candidates){
   const route=`/v2/sky/prepared-optical/${candidate.expectedHash}/manifest`,record=native.find((r:any)=>r.route===route);assert(record);
   const bytes=readFileSync(join(exported.output,'files',route)),manifest=JSON.parse(bytes.toString());
   assertPreparedRenderedOpticalManifest(manifest,candidate.reference,candidate.expectedHash);
   assert(manifest.imageVersion==='prepared-native-optical-v1');
   assert.deepEqual(bytes,Buffer.from(JSON.stringify(owner.manifest(candidate.expectedHash))));
   assert.equal(sha(bytes),record.sha256);assert.equal(bytes.length,record.bytes);
   assert.deepEqual(record.headers,{'content-type':'application/json; charset=utf-8',
    'cache-control':'public, max-age=31536000, immutable','x-content-type-options':'nosniff',
    'content-disposition':`attachment; filename="${manifest.publicationId}-prepared-optical-manifest.json"`});
   for(const asset of Object.values(manifest.levels)){
    const image=native.find((r:any)=>r.route===asset.downloadUrl);assert(image);
    assert.equal(sha(readFileSync(join(exported.output,'files',image.route))),asset.sha256);
   }
   assert.equal(manifest.processing.scientificAvailability,'UNKNOWN');
   assert.equal(manifest.source.credit,'Fixture complete attribution');
   if(manifest.schemaVersion==='prepared-native-optical-publication-v2'){
    assert(manifest.registration);assert(owner.source(manifest.reference,candidate.expectedHash).attribution?.statements.includes('Fixture reference attribution'));
   }
  }
  assert.throws(()=>new PreparedOpticalImageryService().manifest(candidates[0]!.expectedHash),/not_found/);
  const original=readFileSync(candidates[0]!.manifestUrl),changed=JSON.parse(original.toString());changed.source.credit+=' changed';
  writeFileSync(candidates[0]!.manifestUrl,JSON.stringify(changed));
  assert.throws(()=>[...new PreparedOpticalImageryService(candidates).publishedMetadata()],/publication_invalid/);
  writeFileSync(candidates[0]!.manifestUrl,original);
  assert.equal([...new PreparedOpticalImageryService(candidates).publishedMetadata()].length,2,'recovery must keep both pins');
 }finally{
  assert.equal(dirname(realpathSync(directory)),realpathSync(tmpdir()));assert.match(basename(directory),/^starward-prepared-static-/u);
  rmSync(directory,{recursive:true}); // Verified scope, exclusively generated test data.
 }
});
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
