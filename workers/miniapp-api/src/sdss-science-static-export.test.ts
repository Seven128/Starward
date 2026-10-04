import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {mkdtempSync,mkdirSync,readFileSync,realpathSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename,dirname,join} from 'node:path';
import {SDSS_OPTICAL_PUBLICATIONS,SDSS_OPTICAL_LEVELS,sdssScienceOpticalPublicationHash,
  type SdssScienceMeanOpticalPublication} from '@starward/miniapp-contracts';
import {SdssOpticalImageryService} from './sdss-optical-imagery';
import {exportSkyPublicAssets} from './sky-public-asset-export';
import {skyPublicAssetHeaders} from './sky-public-asset-headers';
import {createSyntheticSdssSciencePublication} from './test-fixtures/sdss-science-publication';
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const collect=async(owner:SdssOpticalImageryService)=>{const images=[];for await(const image of owner.publishedAssets())images.push(image);return images;};
test('standard export preserves six JPEG offers and only explicitly admitted v2/v3 science generations',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'starward-science-static-'));
 try{
  const firstDir=join(directory,'v2'),nextDir=join(directory,'v3');mkdirSync(firstDir);mkdirSync(nextDir);
  const first=createSyntheticSdssSciencePublication(firstDir),next=createSyntheticSdssSciencePublication(nextDir);
  // Structural v3 transport fixture only; these synthetic PNGs are not an
  // actual scientific derivation or source-quality admission.
  const old=next.value;
  const signed:SdssScienceMeanOpticalPublication={...old,
   schemaVersion:'sdss-dr17-science-optical-publication-v3',imageVersion:'science-optical-v3',
   pyramid:{method:'signed-coherent-science-mean-before-fixed-lupton-v1',validation:'SIGNED_LEVELS_REPRODUCED',
    statisticalFitCalls:0,scienceCorrection:'NONE',rgbMasterRole:'REFERENCE_ONLY',
    unknownSamples:'excluded-from-mean-and-divisor',displayAlpha:'rounded-coherent-sample-area-independent-of-brightness'},
   levels:Object.fromEntries(SDSS_OPTICAL_LEVELS.map(level=>{
    const {masterRgbSha256:_parent,...asset}=old.levels[level];
    return [level,{...asset,masterScienceSha256:Object.fromEntries(['g','r','i'].map(band=>[band,'1'.repeat(64)])),
     scienceMean:{unit:'mean source nanomaggies/native-pixel',availablePixels:512**2,emptyPixels:0,partialPixels:0,
      availableMasterSamples:512**2*asset.masterCrop.boxFactor**2,
      perBand:Object.fromEntries(['g','r','i'].map(band=>[band,{availableNegativeMeans:0,availableZeroMeans:0}]))}}];
   })) as SdssScienceMeanOpticalPublication['levels']};
  writeFileSync(next.manifestUrl,JSON.stringify(signed));const signedHash=sdssScienceOpticalPublicationHash(signed);
  const owner=new SdssOpticalImageryService({sciencePublications:[
   {reference:'M:51',expectedHash:first.expectedHash,manifestUrl:first.manifestUrl},
   {reference:'M:51',expectedHash:signedHash,manifestUrl:next.manifestUrl}]});
  const ordinary=await collect(new SdssOpticalImageryService());assert.equal(ordinary.length,18);
  assert.deepEqual(new Set(ordinary.map(image=>image.publicationHash)),new Set(Object.values(SDSS_OPTICAL_PUBLICATIONS).map(p=>p.publicationHash)));
  const images=await collect(owner);assert.equal(images.length,24);
  const exported=await exportSkyPublicAssets(join(directory,'export'),'1'.repeat(40),undefined,owner);
  const index=JSON.parse(readFileSync(join(exported.output,'index.json'),'utf8'));
  const optical=index.records.filter((row:any)=>row.route.startsWith('/v2/sky/sdss-optical/'));
  assert.equal(optical.length,24);
  for(const image of images){const row=optical.find((value:any)=>value.route===image.descriptor.downloadUrl);assert(row);
   assert.equal(row.sha256,image.descriptor.sha256);assert.equal(row.bytes,image.bytes.length);
   assert.deepEqual(row.headers,skyPublicAssetHeaders('sdss-optical',image.contentType,image.fieldDegrees));
   assert.deepEqual(readFileSync(join(exported.output,'files',row.route)),image.bytes);
  }
  const fragment=readFileSync(join(exported.output,'delivery.caddy'),'utf8');
  for(const row of optical)assert(fragment.includes(row.route));
  assert.equal(optical.some((row:any)=>/manifest|master|\.npy|receipt|binding/u.test(row.route)),false);
  const file=join(nextDir,signed.levels.DETAIL.file),original=readFileSync(file),changed=Buffer.from(original);
  changed[changed.length-1]^=1;writeFileSync(file,changed);
  await assert.rejects(collect(owner),/sdss_optical_asset_invalid/u);
  writeFileSync(file,original);assert.equal((await collect(owner)).length,24,'invalid bytes are never admitted or sticky across retry');
 }finally{
  assert.equal(dirname(realpathSync(directory)),realpathSync(tmpdir()));assert.match(basename(directory),/^starward-science-static-/u);
  rmSync(directory,{recursive:true}); // Only exclusively generated, verified temporary test scope.
 }
});
