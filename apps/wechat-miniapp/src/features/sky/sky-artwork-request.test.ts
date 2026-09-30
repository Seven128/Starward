import test from "node:test";
import assert from "node:assert/strict";
import type { ConstellationArtwork } from "@starward/miniapp-contracts";
import { skyJpegDimensions,startSkyArtworkRequest,type SkyArtworkImage } from "./sky-artwork-request.ts";
function harness(){
  let request:any,write:any,ready:any,errors=0,removed=0,aborted=0;
  const image:SkyArtworkImage={src:'',onload:null,onerror:null,width:128,height:256};
  const asset={bytes:64,width:128,height:256} as ConstellationArtwork;
  const cancel=startSkyArtworkRequest({asset,url:'http://fixture.invalid/hash/art.png',filePath:'/owned/art-1.png',
    canvas:{createImage:()=>image},request(o){request=o;return{abort(){aborted++;}}},writeFile(o){write=o;},removeFile(){removed++;},
    ready(v){ready=v;},fail(){errors++;}});
  const body=new ArrayBuffer(64),bytes=new Uint8Array(body);bytes.set([137,80,78,71,13,10,26,10]);
  const header=new DataView(body);header.setUint32(12,0x49484452);header.setUint32(16,128);header.setUint32(20,256);
  return {image,cancel,body,get request(){return request;},get write(){return write;},getReady(){return ready;},get errors(){return errors;},get removed(){return removed;},get aborted(){return aborted;}};
}
test("request and file success alone cannot claim decoded art; release clears file once",()=>{
  const h=harness();h.request.success({statusCode:200,data:h.body});assert.equal(h.getReady(),undefined);
  h.write.success();assert.equal(h.getReady(),undefined);assert.equal(h.image.src,'/owned/art-1.png');
  h.image.onload!();assert.equal(h.getReady().image,h.image);h.getReady().release();h.getReady().release();assert.equal(h.removed,1);
});
test("cancellation during write removes the late file and cannot start decoding",()=>{
  const h=harness();h.request.success({statusCode:200,data:h.body});h.cancel();h.write.success();
  assert.equal(h.image.src,'');assert.equal(h.getReady(),undefined);assert.equal(h.removed,1);assert.equal(h.aborted,1);
});
test("wrong PNG identity/dimensions or native decode fail leave no usable image",()=>{
  const h=harness();new DataView(h.body).setUint32(16,512);h.request.success({statusCode:200,data:h.body});
  assert.equal(h.errors,1);assert.equal(h.write,undefined);
  const next=harness();next.request.success({statusCode:200,data:next.body});next.write.success();next.image.onerror!();
  assert.equal(next.errors,1);assert.equal(next.getReady(),undefined);assert.equal(next.removed,1);
});
test("published 512-pixel JPEG tile uses the same owned native decode and rejects wrong geometry",()=>{
  const bytes=new Uint8Array(32);
  bytes.set([0xff,0xd8,0xff,0xe0,0,4,0,0,0xff,0xc0,0,8,8,2,0,2,0,0]);
  bytes.set([0xff,0xda],18);bytes.set([0xff,0xd9],30);
  assert.deepEqual(skyJpegDimensions(bytes),{width:512,height:512});
  const image:SkyArtworkImage={src:"",onload:null,onerror:null,width:512,height:512};
  let request:any,write:any,ready:any,errors=0,removed=0;
  startSkyArtworkRequest({asset:{bytes:32,width:512,height:512},format:"jpeg",
    url:"https://fixture.invalid/tile",filePath:"/owned/tile-1.jpg",canvas:{createImage:()=>image},
    request(options){request=options;return{};},writeFile(options){write=options;},
    removeFile(){removed++;},ready(value){ready=value;},fail(){errors++;}});
  request.success({statusCode:200,data:bytes.buffer});write.success();image.onload!();
  assert.equal(ready.image,image);ready.release();assert.equal(removed,1);
  const corrupt=new Uint8Array(bytes);corrupt[15]=1;
  assert.equal(skyJpegDimensions(corrupt)?.width,256);
  let rejected=0,writes=0;
  startSkyArtworkRequest({asset:{bytes:32,width:512,height:512},format:"jpeg",
    url:"https://fixture.invalid/tile",filePath:"/owned/tile-2.jpg",canvas:{createImage:()=>image},
    request(options){options.success({statusCode:200,data:corrupt.buffer});return{};},
    writeFile(){writes++;},removeFile(){},ready(){},fail(){rejected++;}});
  assert.equal(rejected,1);assert.equal(writes,0);
});
test("synchronous native failures enter the retry path and release a possibly partial owned file",()=>{
  const bytes=new Uint8Array(64);
  bytes.set([137,80,78,71,13,10,26,10]);
  new DataView(bytes.buffer).setUint32(12,0x49484452);
  new DataView(bytes.buffer).setUint32(16,128);
  new DataView(bytes.buffer).setUint32(20,256);
  for(const stage of ["request","write"] as const){
    let failures=0,removed=0,ready=0;
    assert.doesNotThrow(()=>startSkyArtworkRequest({asset:{bytes:64,width:128,height:256},
      url:"https://fixture.invalid/art.png",filePath:`/owned/${stage}.png`,
      canvas:{createImage(){throw new Error("must not decode");}},
      request(options){if(stage==="request")throw new Error("native request unavailable");
        options.success({statusCode:200,data:bytes.buffer});return{};},
      writeFile(){throw new Error("native write unavailable");},
      removeFile(){removed++;},ready(){ready++;},fail(){failures++;}}));
    assert.equal(failures,1);assert.equal(ready,0);
    assert.equal(removed,stage==="write"?1:0);
  }
});
