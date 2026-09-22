import test from "node:test";
import assert from "node:assert/strict";
import type { ConstellationArtwork } from "@starward/miniapp-contracts";
import { createSkyArtworkLoader,type SkyArtworkLoadState,type LoadedSkyArtwork } from "./sky-artwork-loader.ts";
const asset=(id:string)=>({id,sha256:id,width:512,height:512} as ConstellationArtwork);
function harness(){
  const calls:{asset:ConstellationArtwork;ready:(v:LoadedSkyArtwork)=>void;fail:()=>void;cancelled:boolean}[]=[];
  let state:SkyArtworkLoadState|null=null,released=0;
  const loader=createSkyArtworkLoader({byteBudget:1024*1024,changed(s){state=s;},start(asset,ready,fail){
    const call={asset,ready,fail,cancelled:false};calls.push(call);return()=>{call.cancelled=true;};
  }});
  const ready=(i:number)=>{const image={i};calls[i]!.ready({image,release(){released++;}});return image;};
  return {loader,calls,ready,get state(){return state!;},get released(){return released;}};
}
test("only two image loads start together and ready figures survive repeated camera updates",()=>{
  const h=harness(),a=asset('a'),b=asset('b'),c=asset('c');h.loader.update([a,b,c]);assert.equal(h.calls.length,2);
  h.ready(0);assert.equal(h.calls.length,3);h.ready(1);h.ready(2);
  for(let n=0;n<10;n++)h.loader.update([a,b,c]);
  assert.equal(h.calls.length,3);assert.equal(h.state.images.size,3);assert.equal(h.state.loading,false);
  h.loader.update([c]);assert.equal(h.released,2,'evict unused decoded images at retention budget');
  assert.equal(h.state.images.size,1);h.loader.dispose();assert.equal(h.released,3);
});
test("hidden/superseded late responses cannot restore unwanted figures",()=>{
  const h=harness();h.loader.update([asset('a'),asset('b')]);h.loader.update([asset('c')]);
  assert.equal(h.calls[0]!.cancelled,true);assert.equal(h.calls[1]!.cancelled,true);
  h.ready(0);assert.equal(h.released,1);assert.equal(h.state.images.size,0);
  h.loader.dispose();h.ready(2);assert.equal(h.released,2);
});
test("failure is latched through pose updates until explicit retry; GPU failures share recovery",()=>{
  const h=harness(),a=asset('a');h.loader.update([a]);h.calls[0]!.fail();
  h.loader.update([a]);assert.equal(h.calls.length,1);assert.equal(h.state.failed,true);
  h.loader.retry();assert.equal(h.calls.length,2);const image=h.ready(1);assert.equal(h.state.failed,false);
  h.loader.failed(image);assert.equal(h.state.failed,true);assert.equal(h.released,1);
  h.loader.failed(image);assert.equal(h.released,1);h.loader.dispose();
});
