import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile,mkdtemp,rm,realpath} from 'node:fs/promises';
import {join,dirname,basename} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {exportSkyPublicAssets,skyStaticDeliveryFragment} from './sky-public-asset-export.ts';
import {SaoPublicationService} from './sao-publication.ts';
import {skyPublicAssetHeaders} from './sky-public-asset-headers.ts';
import {validateSkyStaticBundle} from '../../../tools/deployment/sky-static-bundle.mjs';
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
test('standard sealed export includes all adopted SAO raw tiles, with source bytes/headers and API-only exclusions',async()=>{
 const temporary=process.env.CLOUD_SKY_SAO_STATIC_OUTPUT?undefined:await mkdtemp(join(tmpdir(),'starward-sao-static-'));
 const container=process.env.CLOUD_SKY_SAO_STATIC_OUTPUT??join(temporary!,'export');
 try {
 const result=process.env.CLOUD_SKY_SAO_STATIC_REUSE==='1'?await validateSkyStaticBundle(join(container,'publication')):
  await exportSkyPublicAssets(container,'72e65cf309d700cb7d40c5b7afd53660fd39fa35');
 const output='output'in result?result.output:result.directory;
 const index=JSON.parse((await readFile(join(output,'index.json'))).toString());
 const directory=new URL('../assets/sao-v2/',import.meta.url),publication=(await new SaoPublicationService(directory).get()).data;
 const records=index.records.filter((r:any)=>r.route.startsWith('/v2/sky/supplements/sao/'));
 assert.equal(records.length,publication.index.tiles.length); assert.equal(records.length,826);
 let bytes=0;
 for(const tile of publication.index.tiles){
  const route=`/v2/sky/supplements/sao/v2/${publication.publicationHash}/assets/${tile.id}`,record=records.find((r:any)=>r.route===route);assert(record);
  assert.equal(record.sha256,tile.sha256);assert.equal(record.bytes,tile.bytes);
  assert.deepEqual(record.headers,skyPublicAssetHeaders('sao','application/json; charset=utf-8'));
  const body=await readFile(join(output,'files',route)),source=await readFile(new URL(tile.file,directory));
  assert.deepEqual(body,source);assert.equal(sha(body),tile.sha256);bytes+=body.length;
 }
 assert.equal(bytes,35314828); assert.equal(index.records.some((r:any)=>/\/supplements\/sao\/.*(?:tiles\/|index\.json|publication\.json)/u.test(r.route)),false);
 const good=records[0];
 for(const bad of [good.route.replace('/assets/','/tiles/'),good.route.replace('/v2/'+publication.publicationHash,'/'+publication.publicationHash),
  good.route+'/../index.json',good.route+'?private=1',good.route.replace('/assets/','/assets//')])
  assert.throws(()=>skyStaticDeliveryFragment([{...good,route:bad}]),/sky_static_route_invalid/);
 const artifact=JSON.parse((await readFile(join(output,'image-artifact.json'))).toString());assert.equal(artifact.indexSha256,sha(await readFile(join(output,'index.json'))));
 console.log(JSON.stringify({output,files:result.files,saoFiles:records.length,saoBytes:bytes,publicationHash:result.publicationHash}));
 } finally {
  if(temporary){assert.equal(dirname(await realpath(temporary)),await realpath(tmpdir()));assert.match(basename(temporary),/^starward-sao-static-/u);await rm(temporary,{recursive:true});}
 }
});
