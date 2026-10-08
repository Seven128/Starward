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
test("bounded optical retention keeps broad coverage through intermediate refinements",()=>{
  type Tile=ReturnType<typeof asset>&{order:number};
  const calls:{asset:Tile;ready:(v:LoadedSkyArtwork)=>void;fail:()=>void}[]=[],released:string[]=[];
  let state:SkyArtworkLoadState={images:new Map(),retainedImages:new Map(),loading:false,failed:false};
  const loader=createSkyArtworkLoader<Tile>({byteBudget:20*1024*1024,
    retentionPriority:tile=>tile.order,
    changed(value){state=value;},start(tile,ready,fail){calls.push({asset:tile,ready,fail});return()=>{};}});
  const level=(order:number,count:number)=>Array.from({length:count},(_,i)=>({...asset(`${order}:${i}`),order}));
  const coarse=level(3,7),middleA=level(4,7),middleB=level(5,10),detailA=level(6,9),detailB=level(8,11);
  const finish=()=>{for(let i=0;i<calls.length;i++){const call=calls[i]!;if(released.includes('ready:'+call.asset.id))continue;
    released.push('ready:'+call.asset.id);call.ready({image:{id:call.asset.id},release(){released.push(call.asset.id);}});}};
  for(const wanted of [coarse,middleA,middleB,detailA,detailB]){loader.update(wanted);finish();
    assert.equal(state.loading,false);assert(state.images.size+state.retainedImages.size<=20,'priority does not reserve extra cache');}
  assert(coarse.every(t=>state.retainedImages.has(t.id)),
    'already loaded broad exterior must survive repeated refinement within the same 20 MiB');
  const loaded=calls.length;loader.update(coarse);
  assert.equal(calls.length,loaded,'returning to the loaded overview must not reacquire its seven originals');
  assert.equal(state.images.size,7);assert.equal(state.loading,false);
  const elsewhere=level(9,20);loader.update(elsewhere);finish();
  assert.equal(state.retainedImages.size,0,'new wanted work wins; coarse priority is not a permanent pin');
  assert.equal(state.images.size,20);loader.dispose();
  assert.equal(released.filter(id=>!id.startsWith('ready:')).length,calls.length,'all accepted images retire once');
});
test("one explicit 1024 fallback survives overview decode and GPU failure under 2 MiB pressure",()=>{
  const overview=asset('overview'),medium={...asset('medium'),width:1024,height:1024},detail={...asset('detail'),width:1024,height:1024};
  const calls:{asset:ConstellationArtwork;ready:(v:LoadedSkyArtwork)=>void;fail:()=>void}[]=[],released:string[]=[];
  let state:SkyArtworkLoadState={images:new Map(),retainedImages:new Map(),loading:false,failed:false};
  const loader=createSkyArtworkLoader<ConstellationArtwork>({byteBudget:2*1024*1024,retainedFallbackIds:['overview','medium','detail'],
    changed(value){state=value;},start(asset,ready,fail){calls.push({asset,ready,fail});return()=>{};}});
  const ready=(i:number)=>{const id=calls[i]!.asset.id,image={id};calls[i]!.ready({image,release(){released.push(id);}});return image;};
  loader.update([detail,medium]);ready(0);const parent=ready(1);
  loader.update([overview]);
  assert.strictEqual(state.retainedImages.get('medium'),parent,'keep the applicable parent while overview decode is held');
  assert.deepEqual(released,['detail'],'do not protect both former wanted images');
  calls[2]!.fail();assert.strictEqual(state.retainedImages.get('medium'),parent);
  assert.equal(loader.retry(),false);const coarse=ready(3);
  assert.strictEqual(state.retainedImages.get('medium'),parent,'decoded replacement is not GPU success');
  loader.failed(coarse);assert.strictEqual(state.retainedImages.get('medium'),parent);
  assert.equal(state.failed,true);assert.equal(loader.retry(),true);ready(4);
  loader.update([detail,medium]);const fine=ready(5);
  assert.equal(state.retainedImages.has('overview'),true,'warm return keeps the broadest ready exterior');
  assert.strictEqual(state.images.get('detail'),fine);
  loader.dispose();assert.deepEqual(released.sort(),['detail','detail','medium','overview','overview'].sort(),
    'all five accepted images retire exactly once; the failed download owns no image');
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

test("paused source image owner cancels pending work and resumes current demand without retiring ready imagery",()=>{
  const h=harness(3*1024*1024),a=asset('ready'),b=asset('pending'),c=asset('queued');
  h.loader.update([a,b,c]);const image=h.ready(0);assert.equal(h.calls.length,3);
  h.loader.pause();assert.equal(h.calls[1]!.cancelled,true);assert.equal(h.calls[2]!.cancelled,true);
  assert.equal(h.state.images.get(a.id),image);assert.equal(h.state.loading,false);assert.equal(h.released,0);
  h.ready(1);assert.equal(h.released,1,'late canceled decode is retired instead of admitted');
  h.loader.update([a,b]);h.loader.retry();assert.equal(h.calls.length,3,'hidden update/retry cannot pump');
  h.loader.resume();assert.equal(h.calls.length,4);assert.equal(h.state.images.get(a.id),image);
  h.ready(3);assert.equal(h.state.images.size,2);assert.equal(h.state.loading,false);
  h.loader.pause();h.loader.dispose();assert.equal(h.released,3);h.loader.resume();assert.equal(h.calls.length,4);
});

test("paused file-backed decode keeps one valid lease and rejects its old completion after resume",()=>{
  const wanted=asset('figure');let state:SkyArtworkLoadState|null=null,cancelled=0,leasesReleased=0,bitmapsRetired=0;
  const decodes:Array<{ready:(v:LoadedSkyArtwork)=>void;fail:()=>void}>=[];
  const file={isCurrent:()=>true,release(){leasesReleased++;},decode(ready:(v:LoadedSkyArtwork)=>void,fail:()=>void){decodes.push({ready,fail});return()=>{cancelled++;};}};
  const loader=createSkyArtworkLoader({changed(v){state=v;},start(_asset,ready){ready({image:{first:true},release(){leasesReleased++;},
    retainFile(){bitmapsRetired++;return file;}});return()=>{};}});
  loader.update([wanted]);loader.update([]);loader.suspendUnusedDecoded();assert.equal(bitmapsRetired,1);
  loader.update([wanted]);assert.equal(decodes.length,1);loader.pause();assert.equal(cancelled,1);assert.equal(leasesReleased,0);
  loader.resume();assert.equal(decodes.length,2);let lateReleased=0;
  decodes[0]!.ready({image:{late:true},release(){lateReleased++;}});assert.equal(lateReleased,1);assert.equal(state!.images.size,0);
  const image={current:true};decodes[1]!.ready({image,release(){leasesReleased++;}});assert.equal(state!.images.get(wanted.id),image);
  loader.dispose();assert.equal(leasesReleased,1);
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
