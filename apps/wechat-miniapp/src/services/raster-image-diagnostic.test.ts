import assert from 'node:assert/strict';
import test from 'node:test';
import { rasterImageDiagnostic } from './raster-image-diagnostic';
import { reportRuntimeError } from './runtime-error';

test('raster diagnostics identify HTTP, admission and native causes without copying private input',()=>{
  const rows:unknown[][]=[],before=console.error;console.error=(...args)=>{rows.push(args);};
  try{
    for(const [message,stage,status] of [
      ['raster_image_download_failed:503','download',503],
      ['raster_image_hash_mismatch','file_admission',undefined],
      ['raster_image_file_stat_failed','file_stat',undefined],
      ['https://private.invalid/?token=private','file_owner',undefined],
    ] as const){
      const error=new Error(message,{cause:{errno:600001,errMsg:'private-location'}});
      const {code,...context}=rasterImageDiagnostic(error,'/v2/night-light/assets/private-place/image.png');
      assert.equal(context.stage,stage);assert.equal(context.status,status);assert.equal(context.resource,'night_light');
      reportRuntimeError('request',code,error,context);
    }
    assert.equal(rows.length,4);assert.equal((rows[0]![1] as {http:number}).http,503);
    assert(rows.every(row=>(row[1] as {errno:number}).errno===600001));
    assert.doesNotMatch(JSON.stringify(rows),/private|token|https|\.png/u);
    assert.equal(rasterImageDiagnostic({get message(){throw Error('private');}},null).code,'raster_image_read_failed');
  }finally{console.error=before;}
});
