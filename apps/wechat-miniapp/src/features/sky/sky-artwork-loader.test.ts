import test from "node:test";
import assert from "node:assert/strict";
import type { ConstellationArtwork } from "@starward/miniapp-contracts";
import { createSkyArtworkLoader,type SkyArtworkLoadState,type LoadedSkyArtwork } from "./sky-artwork-loader.ts";
const asset=(id:string)=>({id,sha256:id,width:512,height:512} as ConstellationArtwork);
function harness(byteBudget=1024*1024){
  const calls:{asset:ConstellationArtwork;ready:(v:LoadedSkyArtwork)=>void;fail:()=>void;cancelled:boolean}[]=[];
  let state:SkyArtworkLoadState|null=null,released=0;
  const loader=createSkyArtworkLoader<ConstellationArtwork>({byteBudget,changed(s){state=s;},start(asset,ready,fail){
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
test("a ready coarse image remains canvas-owned while a finer replacement loads",()=>{
  const h=harness(2*1024*1024),coarse=asset('coarse'),fine=asset('fine');
  h.loader.update([coarse]);const old=h.ready(0);
  h.loader.update([fine]);
  assert.equal(h.state.images.size,0);
  assert.equal(h.state.retainedImages.get('coarse'),old);
  assert.equal(h.released,0);
  h.ready(1);
  assert.equal(h.state.images.size,1);
  h.loader.dispose();assert.equal(h.released,2);
});
test("identical published bytes can belong to different tile identities without stale geometry",()=>{
  const h=harness(2*1024*1024);
  const first={...asset('order:1:4'),sha256:'same-bytes'};
  const second={...asset('order:1:5'),sha256:'same-bytes'};
  h.loader.update([first]);const image=h.ready(0);
  h.loader.update([first,second]);
  assert.deepEqual([...h.state.images.keys()],[first.id,second.id],
    "two coordinates may share one decoded image in the same view");
  h.loader.update([second]);
  assert.deepEqual([...h.state.images.keys()],[second.id]);
  assert.equal(h.state.retainedImages.size,0,"the old tile location is no longer visible");
  assert.equal(h.calls.length,1,"identical bytes reuse the decoded bitmap");
  h.loader.update([asset('fine')]);
  assert.equal(h.state.retainedImages.get(second.id),image,
    "the most recently displayed location remains available during refinement");
  assert.equal(h.state.retainedImages.has(first.id),false);
  h.loader.dispose();
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
test("retry distinguishes download failure from GPU failure while keeping an independent coarse image",()=>{
  const h=harness(2*1024*1024),coarse=asset('coarse'),fine=asset('fine');
  h.loader.update([coarse,fine]);const original=h.ready(0);h.calls[1]!.fail();
  assert.equal(h.loader.retry(),false,'a network retry must not retire the valid coarse canvas');
  assert.equal(h.state.images.get('coarse'),original);const detail=h.ready(2);
  h.loader.failed(detail);assert.equal(h.loader.retry(),true,'a failed GPU program/upload needs a new GPU generation');
  assert.equal(h.state.images.get('coarse'),original);h.ready(3);
  assert.equal(h.loader.retry(),false,'the resolved GPU failure does not force later ordinary retries');
  h.loader.dispose();
});
