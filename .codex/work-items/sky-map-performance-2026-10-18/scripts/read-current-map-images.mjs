// Read only the two current metadata-qualified public images, not phone state.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';
const [metadataFile,pointerFile,directory] = process.argv.slice(2);
if(!metadataFile || !pointerFile || !directory)throw Error('arguments_required');
const metadata=JSON.parse(await fs.readFile(metadataFile,'utf8'));
const pointer=JSON.parse(await fs.readFile(pointerFile,'utf8'));
const origin=new URL(pointer.apiOrigin).origin;
await fs.mkdir(directory,{recursive:false});
const results=[];
for(const item of metadata.results) {
  if(item.status!==200)continue;
  const kind=item.path==='/v2/terrain/overlay'?'terrain':item.path==='/v2/map/night-light'?'night-light':null;
  if(!kind)throw Error('metadata_scope_invalid');
  const d=kind==='terrain'?item.body.data:item.body.data.raster;
  const url=new URL(d.imageUrl,origin);
  if(url.origin!==origin || !url.pathname.startsWith('/v2/'+kind+'/assets/') || url.search || url.hash ||
    !/^[a-f0-9]{64}$/.test(d.imageSha256) || !Number.isSafeInteger(d.imageBytes) || d.imageBytes<24 || d.imageBytes>2*1024*1024)
    throw Error('image_scope_invalid');
  const result={kind,startedAt:new Date().toISOString(),expectedBytes:d.imageBytes,expectedSha256:d.imageSha256};
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try {
    const response=await fetch(url,{signal:controller.signal,redirect:'error'});result.status=response.status;
    const reader=response.body.getReader(),chunks=[];let count=0;
    while(true){const {done,value}=await reader.read();if(done)break;count+=value.byteLength;
      if(count>d.imageBytes){await reader.cancel();throw Error('image_length_limit');}chunks.push(value);}
    const bytes=Buffer.concat(chunks),hash=createHash('sha256').update(bytes).digest('hex');
    result.actualBytes=bytes.length;result.actualSha256=hash;
    if(response.status!==200 || bytes.length!==d.imageBytes || hash!==d.imageSha256)throw Error('image_binding_mismatch');
    if(bytes.length<24 || bytes.readUInt32BE(0)!==0x89504e47 || bytes.readUInt32BE(4)!==0x0d0a1a0a)throw Error('image_not_png');
    const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
    if(width<1 || height<1 || width*height>4*1024*1024)throw Error('image_decode_bound');
    const image=PNG.sync.read(bytes);let nonTransparentPixels=0,alphaSum=0,minAlpha=255,maxAlpha=0;
    for(let p=3;p<image.data.length;p+=4){const a=image.data[p];if(a)nonTransparentPixels++;alphaSum+=a;minAlpha=Math.min(minAlpha,a);maxAlpha=Math.max(maxAlpha,a);}
    Object.assign(result,{width,height,pixelCount:width*height,nonTransparentPixels,minAlpha,maxAlpha,meanAlpha:alphaSum/(width*height)});
    result.file=kind+'.png';await fs.writeFile(path.join(directory,result.file),bytes,{flag:'wx'});
  } catch(error) {result.failure=error?.name==='AbortError'?'bounded_read_timeout':/^(image_)[a-z_]+$/.test(error?.message??'')?error.message:'current_read_failed';}
  finally {clearTimeout(timer);result.finishedAt=new Date().toISOString();}
  results.push(result);
}
const result={scope:'CURRENT_METADATA_BOUND_PUBLIC_IMAGES_NOT_HISTORICAL_PHONE_DOWNLOAD_OR_NATIVE_PRESENTATION',results};
await fs.writeFile(path.join(directory,'manifest.private.json'),JSON.stringify(result,null,2),{flag:'wx'});
console.log(JSON.stringify(result));
