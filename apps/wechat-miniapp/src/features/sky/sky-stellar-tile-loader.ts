import type { ApiEnvelope, SaoIndexPublication, SaoTilePublication } from '@starward/miniapp-contracts';

export interface SkyStellarTileState {
  tiles: readonly SaoTilePublication[];
  loading: boolean;
  failed: boolean;
}
// Active view working set, separate from the existing transport LRU. Never
// retain a trail of all previous views or start one request per animation frame.
export const SKY_STELLAR_VIEW_BYTES = 6 * 1024 * 1024;
export const SKY_STELLAR_REQUESTS = 3;

export function createSkyStellarTileLoader(deps:{
  publication:SaoIndexPublication;
  load(id:string,signal:AbortSignal):Promise<Pick<ApiEnvelope<SaoTilePublication>,'data'|'dataState'>>;
  changed(state:SkyStellarTileState):void;
}){
  const metadata=new Map(deps.publication.index.tiles.map(tile=>[tile.id,tile]));
  let wanted:string[]=[],disposed=false,overBudget=false;
  const loaded=new Map<string,SaoTilePublication>(),failed=new Set<string>(),refresh=new Set<string>();
  // Aborted requests keep their slot until settled: rapid turns cannot create
  // unbounded native requests even if abort completion is delayed.
  const pending=new Map<string,AbortController>();
  function publish(){if(!disposed)deps.changed({tiles:wanted.flatMap(id=>loaded.has(id)?[loaded.get(id)!]:[]),
    loading:!overBudget&&wanted.some(id=>refresh.has(id)||!loaded.has(id)&&!failed.has(id)),failed:overBudget||failed.size>0});}
  function pump(){
    if(disposed||overBudget)return;
    for(const id of wanted){
      if(pending.size>=SKY_STELLAR_REQUESTS)break;
      if(loaded.has(id)&&!refresh.has(id)||failed.has(id)||pending.has(id))continue;
      const controller=new AbortController();pending.set(id,controller);
      void Promise.resolve().then(()=>controller.signal.throwIfAborted()).then(()=>deps.load(id,controller.signal)).then(result=>{
        if(disposed||controller.signal.aborted||!wanted.includes(id))return;
        const tile=result.data;
        if(!['FRESH','STALE_USABLE'].includes(result.dataState))throw Error('stellar_tile_unusable');
        // The client validates bytes and scientific values. This owner enforces
        // that a late result belongs to exactly this request/publication.
        if(tile.publicationHash!==deps.publication.publicationHash||tile.tile.tileId!==id)throw Error('stellar_tile_result_mismatch');
        loaded.set(id,tile);
        if(result.dataState==='STALE_USABLE')failed.add(id);
      }).catch(()=>{
        if(!disposed&&!controller.signal.aborted&&wanted.includes(id))failed.add(id);
      }).finally(()=>{pending.delete(id);refresh.delete(id);if(!disposed){pump();publish();}});
    }
  }
  return {
    update(ids:readonly string[]){
      if(disposed)return;
      const next=[...new Set(ids)];
      if(next.some(id=>!metadata.has(id)))throw Error('stellar_tile_unknown');
      next.sort((a,b)=>metadata.get(a)!.minMagnitude-metadata.get(b)!.minMagnitude||a.localeCompare(b));
      if(next.length===wanted.length&&next.every((id,i)=>id===wanted[i]))return;
      wanted=next;
      overBudget=wanted.reduce((total,id)=>total+metadata.get(id)!.bytes,0)>SKY_STELLAR_VIEW_BYTES;
      for(const id of loaded.keys())if(overBudget||!wanted.includes(id))loaded.delete(id);
      for(const id of failed)if(!wanted.includes(id))failed.delete(id);
      for(const id of refresh)if(!wanted.includes(id))refresh.delete(id);
      for(const [id,request] of pending)if(overBudget||!wanted.includes(id))request.abort();
      pump();publish();
    },
    retry(){if(!disposed){for(const id of failed)refresh.add(id);failed.clear();pump();publish();}},
    dispose(){disposed=true;wanted=[];loaded.clear();failed.clear();refresh.clear();for(const request of pending.values())request.abort();},
  };
}
