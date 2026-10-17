import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {readTargetOpticalImageFile} from './target-optical-image-file.ts';
import {syntheticOpticalPng} from './test-fixtures/synthetic-optical-png.ts';
test('declared region RGBA/grayscale containers do not relax old RGB or discard display alpha',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'starward-optical-container-'));
 const manifest=pathToFileURL(join(directory,'manifest.json'));
 for(const colorType of [0,2,6]as const){
  const bytes=syntheticOpticalPng(32,64,96,{width:24,height:18,colorType}),file=`fixture-${colorType}.png`;
  await writeFile(join(directory,file),bytes,{flag:'wx'});
  const asset={file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),width:24,height:18,fieldDegrees:1};
  const actual=await readTargetOpticalImageFile(manifest,asset,'png','prepared_optical_asset_invalid',{pngColorTypes:[colorType]});
  assert.deepEqual(actual.bytes,bytes);assert.equal(actual.pixelWidth,24);assert.equal(actual.pixelHeight,18);
  if(colorType!==2)await assert.rejects(readTargetOpticalImageFile(manifest,asset,'png','prepared_optical_asset_invalid'),/asset_invalid/);
  if(colorType!==6)await assert.rejects(readTargetOpticalImageFile(manifest,asset,'png','prepared_optical_asset_invalid',{pngColorTypes:[6]}),/asset_invalid/);
  await assert.rejects(readTargetOpticalImageFile(manifest,{...asset,height:19},'png','prepared_optical_asset_invalid',{pngColorTypes:[colorType]}),/asset_invalid/);
 }
});
