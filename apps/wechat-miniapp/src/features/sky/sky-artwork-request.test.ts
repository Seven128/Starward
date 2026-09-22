import test from "node:test";
import assert from "node:assert/strict";
import type { ConstellationArtwork } from "@starward/miniapp-contracts";
import { startSkyArtworkRequest,type SkyArtworkImage } from "./sky-artwork-request.ts";
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
