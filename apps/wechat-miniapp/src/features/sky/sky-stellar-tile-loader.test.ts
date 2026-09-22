import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import type {SaoIndexPublication,SaoTilePublication} from '@starward/miniapp-contracts';
import {createSkyStellarTileLoader,type SkyStellarTileState} from './sky-stellar-tile-loader';

const location=new URL('../../../../../workers/miniapp-api/assets/sao/',import.meta.url);
const publication:SaoIndexPublication={publicationHash:JSON.parse(readFileSync(new URL('publication.json',location),'utf8')).publicationHash,
  index:JSON.parse(readFileSync(new URL('index.json',location),'utf8'))};
const ids=publication.index.tiles.slice(0,8).map(t=>t.id);
function tile(id:string):SaoTilePublication{return {publicationHash:publication.publicationHash,
  tile:JSON.parse(readFileSync(new URL(`${id}.json`,location),'utf8'))};}
const tick=()=>new Promise<void>(resolve=>setImmediate(resolve));

test('cached stale tiles stay visible with recovery state; retry really reloads them and keeps old points while pending',async()=>{
  let calls=0,finish:()=>void=()=>{};const states:SkyStellarTileState[]=[];
  const loader=createSkyStellarTileLoader({publication,changed:s=>states.push(s),load:async id=>{
    calls++;if(calls===1)return {data:tile(id),dataState:'STALE_USABLE'};
    await new Promise<void>(resolve=>{finish=resolve;});return {data:tile(id),dataState:'FRESH'};
  }});
  loader.update([ids[0]!]);await tick();assert.equal(states.at(-1)!.tiles.length,1);assert.equal(states.at(-1)!.failed,true);
  loader.retry();await tick();assert.equal(calls,2);assert.equal(states.at(-1)!.tiles.length,1);
  assert.equal(states.at(-1)!.loading,true);finish();await tick();
  assert.equal(states.at(-1)!.failed,false);assert.equal(states.at(-1)!.loading,false);assert.equal(states.at(-1)!.tiles.length,1);loader.dispose();
});

test('bounded requests keep only current view; late aborted replies and dispose never publish obsolete stars',async()=>{
  const requests:{id:string;signal:AbortSignal;resolve:(t:SaoTilePublication)=>void}[]=[],states:SkyStellarTileState[]=[];
  const loader=createSkyStellarTileLoader({publication,changed:s=>states.push(s),
    load:(id,signal)=>new Promise(resolve=>requests.push({id,signal,resolve:data=>resolve({data,dataState:'FRESH'})}))});
  loader.update(ids);await tick();assert.equal(requests.length,3);
  loader.update(ids);await tick();assert.equal(requests.length,3,'same view does not restart requests');
  loader.update([ids[7]!]);assert(requests.every(r=>r.signal.aborted));await tick();assert.equal(requests.length,3);
  requests[0]!.resolve(tile(requests[0]!.id));await tick();assert.equal(requests.length,4);
  assert.deepEqual(states.at(-1)!.tiles,[],'late old-view success cannot reappear');
  requests[3]!.resolve(tile(ids[7]!));await tick();
  assert.deepEqual(states.at(-1)!.tiles.map(t=>t.tile.tileId),[ids[7]]);
  assert.equal(states.at(-1)!.loading,false);
  loader.update([]);assert.deepEqual(states.at(-1)!.tiles,[]);
  loader.dispose();const count=states.length;
  for(const r of requests.slice(1,3))r.resolve(tile(r.id));await tick();assert.equal(states.length,count);
});

test('partial failure preserves loaded tiles, only explicit retry repeats failure, and wrong publication is rejected',async()=>{
  let bad=true;const calls:string[]=[],states:SkyStellarTileState[]=[];
  const loader=createSkyStellarTileLoader({publication,changed:s=>states.push(s),load:async(id)=>{
    calls.push(id);return {data:id===ids[1]&&bad?{...tile(id),publicationHash:'0'.repeat(64)}:tile(id),dataState:'FRESH'};}});
  loader.update(ids.slice(0,2));await tick();assert.equal(states.at(-1)!.failed,true);
  assert.deepEqual(states.at(-1)!.tiles.map(t=>t.tile.tileId),[ids[0]]);
  loader.update(ids.slice(0,2));await tick();assert.equal(calls.length,2);
  bad=false;loader.retry();await tick();assert.equal(calls.length,3);
  assert.equal(states.at(-1)!.failed,false);assert.equal(states.at(-1)!.tiles.length,2);loader.dispose();
});

test('oversized requests fail explicitly without silently selecting a subset or issuing network requests',()=>{
  let requests=0;const states:SkyStellarTileState[]=[];
  const loader=createSkyStellarTileLoader({publication,changed:s=>states.push(s),load:async(id)=>{requests++;return {data:tile(id),dataState:'FRESH'};}});
  loader.update(publication.index.tiles.map(t=>t.id));assert.equal(requests,0);
  assert.equal(states.at(-1)!.failed,true);assert.equal(states.at(-1)!.loading,false);
  assert.deepEqual(states.at(-1)!.tiles,[]);loader.dispose();
});
