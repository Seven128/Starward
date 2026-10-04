import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const ROOT=fileURLToPath(new URL('../../../../',import.meta.url));
const base='output/playwright/cloud-sky-complete-resource-1003-r2';
const out='output/complete-resource-root-pixel-readback-1003-r1';
await fs.mkdir(path.join(ROOT,out));
const sha=b=>createHash('sha256').update(b).digest('hex');
const bind=async p=>{const b=await fs.readFile(path.resolve(ROOT,p));return {path:p,bytes:b.length,sha256:sha(b)};};
const resultPath=base+'/result.json',result=JSON.parse(await fs.readFile(path.join(ROOT,resultPath),'utf8'));
assert.equal(result.status,'MEASURED_WITH_FAILURES');
assert.deepEqual(result.retirementFailures,[{kind:'native-owner-current-after-hide'}]);
const crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let i=0;i<8;i++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
const crc=b=>{let c=0xffffffff;for(const x of b)c=crcTable[(c^x)&255]^(c>>>8);return (c^0xffffffff)>>>0;};
const paeth=(a,b,c)=>{const p=a+b-c,x=Math.abs(p-a),y=Math.abs(p-b),z=Math.abs(p-c);return x<=y&&x<=z?a:y<=z?b:c;};
function decode(b){
 assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 let p=8,w,h,channels,finished=false;const idat=[];
 while(p<b.length){const size=b.readUInt32BE(p),type=b.toString('ascii',p+4,p+8),data=b.subarray(p+8,p+8+size);assert(p+12+size<=b.length);assert.equal(crc(b.subarray(p+4,p+8+size)),b.readUInt32BE(p+8+size),type);
  if(type==='IHDR'){w=data.readUInt32BE(0);h=data.readUInt32BE(4);assert.equal(data[8],8);assert([2,6].includes(data[9]));channels=data[9]===6?4:3;assert.equal(data[10],0);assert.equal(data[11],0);assert.equal(data[12],0);}
  if(type==='IDAT')idat.push(data);if(type==='IEND'){finished=true;assert.equal(p+12+size,b.length);}p+=12+size;
 }
 assert(finished&&w&&h&&channels);const raw=inflateSync(Buffer.concat(idat)),stride=w*channels;assert.equal(raw.length,h*(stride+1));
 const pixels=Buffer.alloc(w*h*4);let previous=Buffer.alloc(stride),offset=0;
 for(let y=0;y<h;y++){const filter=raw[offset++];assert(filter<=4);const row=Buffer.alloc(stride);
  for(let x=0;x<stride;x++){const a=x>=channels?row[x-channels]:0,b=previous[x],c=x>=channels?previous[x-channels]:0;const predictor=[0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][filter];row[x]=(raw[offset++]+predictor)&255;}
  for(let x=0;x<w;x++){const j=(y*w+x)*4;pixels[j]=row[x*channels];pixels[j+1]=row[x*channels+1];pixels[j+2]=row[x*channels+2];pixels[j+3]=channels===4?row[x*channels+3]:255;}previous=row;
 }
 return {w,h,pixels};
}
const observations=[];for(const row of result.rows)for(const pass of row.passes){
 const prefix=base+'/'+row.condition.name+'-'+pass.label;
 observations.push({condition:row.condition.name,pass,png:prefix+'.png',rgba:prefix+'.rgba'});
}
assert.equal(observations.length,38);
const files=[resultPath,fileURLToPath(import.meta.url),...observations.flatMap(x=>[x.png,x.rgba])];
const before=await Promise.all(files.map(bind));await fs.writeFile(path.join(ROOT,out,'inputs-before.json'),JSON.stringify(before,null,2),{flag:'wx'});
const readback=[];
for(const o of observations){const png=await fs.readFile(path.join(ROOT,o.png)),raw=await fs.readFile(path.join(ROOT,o.rgba));assert.equal(sha(png),o.pass.pngSha256);assert.equal(sha(raw),o.pass.rgbaSha256);
 const decoded=decode(png);assert.equal(decoded.w,390);assert.equal(decoded.h,844);assert.equal(raw.length,390*844*4);
 let mismatch=0;for(let y=0;y<844;y++)for(let x=0;x<390*4;x++)if(decoded.pixels[y*390*4+x]!==raw[(843-y)*390*4+x])mismatch++;
 assert.equal(mismatch,0,o.png);assert.equal(o.pass.glError,0);assert.equal(o.pass.publication.stagedSnapshotId,o.pass.publication.publishedSnapshotId);
 readback.push({condition:o.condition,label:o.pass.label,rgbaBytes:raw.length,pngBytes:png.length,pngCrcAndAllFiltersValid:true,fullBottomUpReadbackMatches:true,rgbaSha256:sha(raw),pngSha256:sha(png),textureLive:o.pass.gpu.live.texture,textureFramePeak:o.pass.gpu.framePeak.texture,bufferLive:o.pass.gpu.live.buffer});
}
const after=await Promise.all(files.map(bind));assert.deepEqual(before,after);await fs.writeFile(path.join(ROOT,out,'inputs-after.json'),JSON.stringify(after,null,2),{flag:'wx'});
const retired=result.final.afterClear.gpu;
const output={status:'PASS_BOUNDED_FULL_PIXEL_AND_RECEIPT_READBACK_WITH_ORIGINAL_RETIREMENT_GAP',originalStatus:result.status,originalRetirementFailures:result.retirementFailures,beforeAfterEqual:true,inputs:before.length,readback,observed:{rows:result.rows.length,submissions:observations.length,totalTexturePeak:retired.totalPeak.texture,totalBufferPeak:retired.totalPeak.buffer,logicalHandlesAlive:retired.handles.filter(x=>x.alive).length,ordinaryDrawingBuffer:retired.ordinaryDrawingBuffer,returnComparisons:result.returnComparisons},limits:['Readonly full-image/source-receipt replay, no new GPU or target runtime execution','Original result remains MEASURED_WITH_FAILURES/exit1; unmanaged image membership after hide was not directly observed','PNG/readPixels equivalence and accepted snapshot identity are not whole UI, image quality, native memory, FPS, 12Mbps or 200DAU certification','Texture/buffer storage and ordinary readback plane are separate from decoded references, JS objects, driver/RSS and diagnostic retained bytes']};
await fs.writeFile(path.join(ROOT,out,'result.json'),JSON.stringify(output,null,2),{flag:'wx'});
console.log(JSON.stringify({status:output.status,submissions:readback.length,inputs:before.length,totalTexturePeak:output.observed.totalTexturePeak,totalBufferPeak:output.observed.totalBufferPeak,result:await bind(out+'/result.json')}));
