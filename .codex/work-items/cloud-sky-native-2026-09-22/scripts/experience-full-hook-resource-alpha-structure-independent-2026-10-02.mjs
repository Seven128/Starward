/** Independent immutable original-PNG structure audit, no raster rewrite. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {inflateSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../../../',import.meta.url)),file=p=>path.join(root,p),sha=b=>createHash('sha256').update(b).digest('hex');
const bind=p=>{const b=fs.readFileSync(file(p));return{path:p,bytes:b.length,sha256:sha(b)}};
const out=process.argv[2];assert.match(out??'',/^output\/[a-z0-9-]+$/);assert(!fs.existsSync(file(out)));fs.mkdirSync(file(out));
fs.copyFileSync(fileURLToPath(import.meta.url),file(out+'/executed-script.mjs.txt'),fs.constants.COPYFILE_EXCL);
const receipt='output/playwright/cloud-sky-full-hook-resource-1002-r4/result.json';
assert.equal(bind(receipt).sha256,'548b96c4dd399fcc88ff24cb3d73a18a09d884463890bb2a67eb24a4661ba20b');
const actual=JSON.parse(fs.readFileSync(file(receipt),'utf8')),independent='output/full-hook-resource-independent-1002-r2/result.json';
const review=JSON.parse(fs.readFileSync(file(independent),'utf8')),wanted=review.metrics[2].wanted;
assert.deepEqual(wanted,actual.rows[2].ready.hooks.find(h=>h.name==='artwork').wanted.map(a=>a.id));
const inventory=new Map(actual.inputs.filter(i=>i.transport==='ACTUAL_LOCAL_PUBLISHED_BYTES_OFFER_ONLY').map(a=>[a.id,a]));
const before=[receipt,independent,...wanted.map(id=>inventory.get(id).path)].map(bind);
const crc32=b=>{let value=0xffffffff;for(const byte of b){value^=byte;for(let bit=0;bit<8;bit++)value=(value>>>1)^((value&1)?0xedb88320:0);}return (value^0xffffffff)>>>0;};
const rows=[];
for(const id of wanted){const a=inventory.get(id),b=fs.readFileSync(file(a.path));assert.equal(sha(b),a.sha256);assert.equal(b.length,a.bytes);
 assert.deepEqual(b.subarray(0,8),Buffer.from([137,80,78,71,13,10,26,10]));let offset=8,chunks=[],compressed=[],header=null;
 while(offset<b.length){const length=b.readUInt32BE(offset),type=b.toString('ascii',offset+4,offset+8),end=offset+length+12;assert(end<=b.length);
  assert.equal(crc32(b.subarray(offset+4,offset+8+length)),b.readUInt32BE(offset+8+length),id+'/'+type);
  const bytes=b.subarray(offset+8,offset+8+length);chunks.push(type);if(type==='IHDR')header=bytes;if(type==='IDAT')compressed.push(bytes);
  offset=end;if(type==='IEND')break;
 }
 assert.equal(offset,b.length);assert.equal(chunks[0],'IHDR');assert.equal(chunks.at(-1),'IEND');assert(header&&header.length===13);
 const width=header.readUInt32BE(0),height=header.readUInt32BE(4),depth=header[8],colorType=header[9];
 assert.deepEqual([width,height],[a.width,a.height]);assert.equal(depth,8);assert([0,2].includes(colorType));assert.equal(header[10],0);assert.equal(header[11],0);assert.equal(header[12],0);
 assert(!chunks.includes('tRNS'));const channels=colorType===0?1:3,raw=inflateSync(Buffer.concat(compressed));
 assert.equal(raw.length,height*(width*channels+1));for(let y=0;y<height;y++)assert(raw[y*(width*channels+1)]<=4);
 // These actual PNG encodings have neither an alpha channel nor tRNS.
 // Every texel therefore has implicit alpha 255; RGB brightness is not tested.
 rows.push({id,path:a.path,sha256:a.sha256,width,height,depth,colorType,chunks,crcAndInflatedRowLayoutValid:true,
  alphaEncoding:'IMPLICIT_OPAQUE_NO_TRNS',nonzeroAlphaBox:{x:0,y:0,width,height},rgbaBytes:width*height*4,strictAlphaBoxSavings:0});
}
const result={status:'PASS',input:bind(receipt),independentWantedGeometry:bind(independent),rows,totalSourceRgbaBytes:rows.reduce((n,r)=>n+r.rgbaBytes,0),
 strictAlphaBoxSavings:0,scope:'Independent original-PNG CRC/chunk/inflated-row readback for actual 28 wanted images. No brightness/black-pixel classification, raster processing, source-missing/coverage claim, runtime PNG decoder, GPU pass, native acceptance or production edit.'};
fs.writeFileSync(file(out+'/result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
const after=before.map(b=>bind(b.path));assert.deepEqual(after,before);fs.writeFileSync(file(out+'/binding.json'),JSON.stringify({inputsBefore:before,inputsAfter:after,unchanged:true},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({result:bind(out+'/result.json'),binding:bind(out+'/binding.json'),images:rows.length,rgbaBytes:result.totalSourceRgbaBytes,savings:0}));
