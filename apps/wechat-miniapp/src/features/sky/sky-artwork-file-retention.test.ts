import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createSkyArtworkLoader,type LoadedSkyArtwork,type SkyArtworkLoadState} from './sky-artwork-loader.ts';
import {startSkyArtworkRequest,type SkyArtworkImage} from './sky-artwork-request.ts';
import {selectSkyLandscapePanorama} from './sky-landscape-resources.ts';
import type {SkyLandscapeResource} from '@starward/miniapp-contracts';
import type {SkyPanoramaMask} from './sky-landscape-mask.ts';

const imageBytes=128*256*4;
function bodyFor(id:string){
  const body=new ArrayBuffer(64),bytes=new Uint8Array(body);bytes.set([137,80,78,71,13,10,26,10]);
  const header=new DataView(body);header.setUint32(12,0x49484452);header.setUint32(16,128);header.setUint32(20,256);
  bytes.set(new TextEncoder().encode(id).subarray(0,32),32);return body;
}
const asset=(id:string)=>({id,sha256:createHash('sha256').update(new Uint8Array(bodyFor(id))).digest('hex'),width:128,height:256,bytes:64});
function harness(byteBudget=4*imageBytes,retainedFallbackIds:readonly string[]=[]){
  const requests:{path:string;body:ArrayBuffer;options:any}[]=[],images:SkyArtworkImage[]=[],handles:LoadedSkyArtwork[]=[],files=new Set<string>();
  let state:SkyArtworkLoadState={images:new Map(),retainedImages:new Map(),loading:false,failed:false};
  const loader=createSkyArtworkLoader<ReturnType<typeof asset>>({byteBudget,retainedFallbackIds,changed(next){state=next;},start(selected,ready,fail){
    const path='/owned/'+(requests.length+1)+'.png';
    return startSkyArtworkRequest({asset:selected,url:'https://fixture.invalid/'+selected.sha256,filePath:path,
      canvas:{createImage(){const image:SkyArtworkImage={width:128,height:256,src:'',onload:null,onerror:null};images.push(image);return image;}},
      request(options){requests.push({path,body:bodyFor(selected.id),options});return{abort(){}};},
      writeFile(options){files.add(options.filePath);options.success();},removeFile(file){assert(files.delete(file),'release each owned file exactly once');},
      ready(value){handles.push(value);ready(value);},fail});
  }});
  function finishRequest(index:number){requests[index]!.options.success({statusCode:200,data:requests[index]!.body});
    const image=images.find(candidate=>candidate.src===requests[index]!.path&&candidate.onload);assert(image);image.onload!();return image;}
  return {loader,requests,images,files,handles,finishRequest,get state(){return state;}};
}

test('unused illustrations keep bounded files and return through a fresh decode without another request',()=>{
  const h=harness(),a=asset('a');h.loader.update([a]);const first=h.finishRequest(0),oldHandle=h.handles[0]!;
  h.loader.update([]);assert.equal(h.state.retainedImages.get('a'),first);
  h.loader.suspendUnusedDecoded();assert.equal(h.state.retainedImages.size,0);assert.equal(h.files.size,1);
  h.loader.suspendUnusedDecoded();assert.equal(h.files.size,1);
  h.loader.update([{...a,id:'new-coordinate'}]);assert.equal(h.requests.length,1);assert.equal(h.state.loading,true);
  const returning=h.images[1]!;assert.equal(returning.src,h.requests[0]!.path);assert.notEqual(returning,first);
  returning.onload!();assert.equal(h.state.images.get('new-coordinate'),returning);assert.equal(h.state.failed,false);
  oldHandle.release();assert.equal(h.files.size,1,'a transferred decoded handle cannot delete the current file');
  h.loader.dispose();assert.equal(h.files.size,0);assert.equal(returning.onload,null);assert.equal(returning.onerror,null);
});

test('a single ready landscape fallback survives zero demand and returns without another decode',()=>{
  const h=harness(2*imageBytes,['landscape:overview','landscape:detail']);
  const overview=asset('landscape:overview'),detail=asset('landscape:detail');
  h.loader.update([overview,detail]);const coarse=h.finishRequest(0);h.finishRequest(1);
  h.loader.update([]);h.loader.suspendUnusedDecoded();
  assert.equal(h.state.retainedImages.get(overview.id),coarse);
  assert.equal(h.state.retainedImages.has(detail.id),false,'only one decoded return fallback remains');
  h.loader.update([overview,detail]);assert.equal(h.state.images.get(overview.id),coarse);
  assert.equal(h.images.length,3,'only the retired detail needs a new decode');
  assert.equal(h.requests.length,2);h.loader.dispose();assert.equal(h.files.size,0);
});

test('detail-first fade retains its successful bitmap and pending coarse replacement until ready',()=>{
  const h=harness(2*imageBytes,['landscape:overview','landscape:detail']);
  const overview=asset('landscape:overview'),detail=asset('landscape:detail');
  h.loader.update([overview,detail]);const fine=h.finishRequest(1);
  h.loader.update([]);h.loader.suspendUnusedDecoded();
  assert.equal(h.state.retainedImages.get(detail.id),fine);
  const coarse=h.finishRequest(0);h.loader.suspendUnusedDecoded();
  assert.equal(h.state.retainedImages.get(overview.id),coarse);
  assert.equal(h.state.retainedImages.has(detail.id),false);
  h.loader.update([overview]);assert.equal(h.state.images.get(overview.id),coarse);
  assert.equal(h.requests.length,2);h.loader.dispose();assert.equal(h.files.size,0);
});

test('a canceled cached decode cannot publish late or delete the file reused by its replacement',()=>{
  const h=harness(),a=asset('a');h.loader.update([a]);h.finishRequest(0);
  h.loader.update([]);h.loader.suspendUnusedDecoded();h.loader.update([a]);
  const late=h.images[1]!.onload!;h.loader.update([]);assert.equal(h.images[1]!.onload,null);assert.equal(h.files.size,1);
  h.loader.update([a]);late();assert.equal(h.state.images.size,0);assert.equal(h.state.loading,true);
  h.images[2]!.onload!();assert.equal(h.state.images.get('a'),h.images[2]);assert.equal(h.requests.length,1);
  h.loader.dispose();assert.equal(h.files.size,0);
});

test('a cached file decode failure is latched and explicit retry replaces its file instead of looping',()=>{
  const h=harness(),a=asset('a');h.loader.update([a]);h.finishRequest(0);
  h.loader.update([]);h.loader.suspendUnusedDecoded();h.loader.update([a]);h.images[1]!.onerror!();
  assert.equal(h.state.failed,true);h.loader.update([a]);assert.equal(h.requests.length,1);assert.equal(h.images.length,2);
  assert.equal(h.loader.retry(),false);assert.equal(h.files.size,0);assert.equal(h.requests.length,2);
  const replacement=h.finishRequest(1);assert.equal(h.state.images.get('a'),replacement);assert.equal(h.state.failed,false);
  h.loader.failed(replacement);assert.equal(h.files.size,0);assert.equal(h.loader.retry(),true);
  h.finishRequest(2);h.loader.dispose();assert.equal(h.files.size,0);
});

test('cold files still consume the original source-equivalent retention allowance',()=>{
  const h=harness(imageBytes),a=asset('a'),b=asset('b');h.loader.update([a]);h.finishRequest(0);
  h.loader.update([]);h.loader.suspendUnusedDecoded();assert.equal(h.files.size,1);
  h.loader.update([b]);h.finishRequest(1);assert.equal(h.files.size,1,'trim the cold file instead of enlarging the cache');
  h.loader.update([a]);assert.equal(h.requests.length,3,'an evicted file must use the real request boundary again');
  h.finishRequest(2);h.loader.dispose();assert.equal(h.files.size,0);
});

test('cached decodes share the two-load queue and disposing cancels every in-flight decode',()=>{
  const h=harness(),wanted=['a','b','c'].map(asset);h.loader.update(wanted);assert.equal(h.requests.length,2);
  h.finishRequest(0);h.finishRequest(1);h.finishRequest(2);
  h.loader.update([]);h.loader.suspendUnusedDecoded();h.loader.update(wanted);
  assert.equal(h.images.length,5,'start two cached decodes');assert.equal(h.requests.length,3);
  h.images[3]!.onload!();assert.equal(h.images.length,6,'completion admits the next cached decode');
  const late=h.images[5]!.onload!;h.loader.dispose();assert.equal(h.files.size,0);
  assert.equal(h.images[4]!.onload,null);assert.equal(h.images[5]!.onload,null);late();assert.equal(h.files.size,0);
});

test('a cached decode still checks native dimensions before making the image usable',()=>{
  const h=harness(),a=asset('a');h.loader.update([a]);h.finishRequest(0);
  h.loader.update([]);h.loader.suspendUnusedDecoded();h.loader.update([a]);h.images[1]!.width=1;h.images[1]!.onload!();
  assert.equal(h.state.failed,true);assert.equal(h.state.images.size,0);h.loader.dispose();assert.equal(h.files.size,0);
});

test('landscape refinement keeps the correct overview mask while returning to its cached detail file',()=>{
  const h=harness(),overview=asset('landscape:overview'),detail=asset('landscape:detail');
  const coarseMask={id:'overview'} as unknown as SkyPanoramaMask,fineMask={id:'detail'} as unknown as SkyPanoramaMask;
  const masks=new Map([['overview',coarseMask],['detail',fineMask]]);
  const selected=(id:'overview'|'detail')=>selectSkyLandscapePanorama({id} as SkyLandscapeResource,masks,h.state.images,h.state.retainedImages);
  h.loader.update([overview,detail]);const coarse=h.finishRequest(0);
  assert.deepEqual(selected('detail'),{image:coarse,mask:coarseMask},'fine loading preserves real coarse identity');
  const firstDetail=h.finishRequest(1);assert.deepEqual(selected('detail'),{image:firstDetail,mask:fineMask});
  h.loader.update([overview]);h.loader.suspendUnusedDecoded();assert.equal(h.state.retainedImages.size,0);assert.equal(h.files.size,2);
  assert.deepEqual(selected('overview'),{image:coarse,mask:coarseMask});
  h.loader.update([overview,detail]);assert.deepEqual(selected('detail'),{image:coarse,mask:coarseMask});
  const returning=h.images[2]!;assert.equal(returning.src,firstDetail.src);returning.onload!();
  assert.deepEqual(selected('detail'),{image:returning,mask:fineMask});assert.equal(h.requests.length,2);
  h.loader.dispose();assert.equal(h.files.size,0);
});
