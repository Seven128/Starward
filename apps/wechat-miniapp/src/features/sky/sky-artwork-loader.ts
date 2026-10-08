export interface SkyNativeImageAsset {
  id: string;
  sha256: string;
  width: number;
  height: number;
}
/** A cached immutable file can supply a fresh bitmap within its Canvas owner.
 * Releasing the cache also cancels any pending decode. */
export interface SkyArtworkFileCache {
  decode(ready: (image: LoadedSkyArtwork) => void, fail: () => void): () => void;
  release(): void;
  isCurrent?(): boolean;
  onRetire?(handler: () => void): () => void;
}
export interface LoadedSkyArtwork {
  image: object;
  release(): void;
  /** Transfer ownership to the file, dropping this owner's decoded handle. */
  retainFile?(): SkyArtworkFileCache;
  isCurrent?(): boolean;
  onRetire?(handler: () => void): () => void;
}
type NativeImageLifetime = { retired: boolean; current?: () => boolean };
const nativeImageLifetimes = new WeakMap<object, NativeImageLifetime>();
/** Draw owners can synchronously reject a queued, retired bitmap. The weak
 * registry neither owns the bitmap nor retains its file/Canvas after retirement. */
export function registerSkyNativeImageLifetime(image: object, current: () => boolean): () => void {
  const lifetime: NativeImageLifetime = { retired: false, current };
  nativeImageLifetimes.set(image, lifetime);
  return () => { lifetime.retired = true; delete lifetime.current; };
}
export function skyNativeImageIsCurrent(image: object): boolean {
  const lifetime = nativeImageLifetimes.get(image);
  return !lifetime || (!lifetime.retired && (lifetime.current?.() ?? false));
}
export interface SkyArtworkLoadState {
  images: ReadonlyMap<string,object>;
  /** Canvas-owned ready images outside the current wanted set. The optical
   * layer may draw these coarse tiles until new fine tiles are ready. */
  retainedImages: ReadonlyMap<string,object>;
  loading: boolean;
  failed: boolean;
}

/** Page/canvas-owned bounded native-image queue shared by constellation art and
 * published sky tiles. Astronomy and camera changes select wanted identities;
 * they never re-download a ready image each frame. */
export function createSkyArtworkLoader<Asset extends SkyNativeImageAsset>(deps: {
  start(asset: Asset, ready:(image:LoadedSkyArtwork)=>void, fail:()=>void):()=>void;
  changed(state:SkyArtworkLoadState):void;
  byteBudget?:number;
  /** Lower priorities survive non-wanted eviction longer, within byteBudget.
   * This never starts a load or pins an extra working set above the pressure. */
  retentionPriority?:(asset:Asset)=>number;
  /** Protect one already-ready non-wanted return bitmap, even above retention
   * pressure. The caller supplies applicable identities in preference order.
   * Never initiates an invisible load; Canvas/publication disposal still wins. */
  retainedFallbackIds?:readonly string[];
}) {
  type Entry={asset:Asset;ids:Set<string>;state:"loading"|"ready"|"cold"|"error";gpuFailed?:boolean;cancel?:()=>void;unsubscribe?:()=>void;loaded?:LoadedSkyArtwork;file?:SkyArtworkFileCache;request:number;last:number};
  const entries=new Map<string,Entry>();
  let wanted:readonly Asset[]=[],active=true,paused=false,tick=0,pumping=false;
  const budget=deps.byteBudget ?? 16*1024*1024;
  const key=(a:Asset)=>a.sha256;
  const usable=(e:Entry)=>e.state==='ready'&&e.loaded&&e.loaded.isCurrent?.()!==false&&skyNativeImageIsCurrent(e.loaded.image);
  const wantedKeys=()=>new Set(wanted.map(key));
  const retainedFallbackKeys=()=>{
    const selected=wantedKeys();
    const candidates=(deps.retainedFallbackIds??[]).map(id=>[...entries].find(([,entry])=>entry.ids.has(id)));
    const index=candidates.findIndex(candidate=>candidate && !selected.has(candidate[0]) && usable(candidate[1]));
    const keep=new Set<string>();
    if(index<0)return keep;
    keep.add(candidates[index]![0]);
    // A detail-first result may preserve its already-running coarse replacement.
    // No new offscreen request, and at most one pending preferred fallback.
    const pending=candidates.slice(0,index).find(candidate=>candidate?.[1].state==='loading');
    if(pending)keep.add(pending[0]);
    return keep;
  };
  const activeKeys=()=>new Set([...wantedKeys(),...retainedFallbackKeys()]);
  const wantedIds=(hash:string)=>new Set(wanted.filter(a=>key(a)===hash).map(a=>a.id));
  const wantedIdentity=()=>JSON.stringify(wanted.map(a=>[a.id,key(a)]));
  const drop=(k:string,e:Entry)=>{entries.delete(k);e.request++;e.unsubscribe?.();delete e.unsubscribe;e.cancel?.();e.loaded?.release();e.file?.release();};
  const emit=()=>{
    if(!active)return;
    const images=new Map<string,object>(),retainedImages=new Map<string,object>();let failed=false,loading=false;
    for(const a of wanted){const e=entries.get(key(a));if(e&&usable(e))images.set(a.id,e.loaded!.image);
      else if(e?.state==='error'||e?.state==='ready')failed=true;else loading ||= !paused;}
    const currentKeys=wantedKeys();
    for(const [hash,e] of entries)if(usable(e)&&!currentKeys.has(hash))
      for(const id of e.ids)retainedImages.set(id,e.loaded!.image);
    deps.changed({images,retainedImages,failed,loading});
  };
  const retire=(k:string,e:Entry)=>{
    if(!active||entries.get(k)!==e)return;
    e.request++;e.unsubscribe?.();delete e.unsubscribe;e.cancel?.();delete e.cancel;
    e.loaded?.release();e.file?.release();delete e.loaded;delete e.file;e.state='error';
    // Retirement is a latched failure. Only an explicit retry reacquires bytes.
    emit();
  };
  const watch=(k:string,e:Entry,owner:LoadedSkyArtwork|SkyArtworkFileCache)=>{
    e.unsubscribe?.();delete e.unsubscribe;
    const unsubscribe=owner.onRetire?.(()=>retire(k,e));
    if(unsubscribe&&entries.get(k)===e&&e.state!=='error')e.unsubscribe=unsubscribe;
    else unsubscribe?.();
  };
  const trim=()=>{
    // The original source-equivalent bound also covers cold files. Suspending
    // bitmaps does not grant a larger or unbounded encoded-file cache.
    let bytes=[...entries.values()].reduce((n,e)=>n+(e.loaded||e.file?e.asset.width*e.asset.height*4:0),0);
    const keep=activeKeys();
    const priority=(e:Entry)=>{const value=deps.retentionPriority?.(e.asset)??0;return Number.isFinite(value)?value:0;};
    for(const [k,e] of [...entries].sort((a,b)=>priority(b[1])-priority(a[1])||a[1].last-b[1].last)){
      if(bytes<=budget)break;
      if(!keep.has(k)&&(e.loaded||e.file)){bytes-=e.asset.width*e.asset.height*4;drop(k,e);}
    }
  };
  const pump=()=>{
    if(!active||paused||pumping)return;
    pumping=true;
    try {
      for(const asset of wanted){
        if([...entries.values()].filter(e=>e.state==='loading').length>=2)break;
        const k=key(asset),cached=entries.get(k);if(cached&&cached.state!=='cold')continue;
        const entry:Entry=cached??{asset,ids:wantedIds(k),state:'loading',request:0,last:++tick};
        entry.state='loading';const request=++entry.request;entries.set(k,entry);
        const current=()=>active&&!paused&&entries.get(k)===entry&&entry.request===request;
        const fail=()=>{if(!current())return;entry.state='error';delete entry.cancel;emit();pump();};
        try {
          const ready=(loaded:LoadedSkyArtwork)=>{
            if(!current()){loaded.release();return;}
            if(loaded.isCurrent?.()===false||!skyNativeImageIsCurrent(loaded.image)){loaded.release();fail();return;}
            entry.loaded=loaded;delete entry.file;entry.state='ready';delete entry.cancel;entry.last=++tick;
            watch(k,entry,loaded);trim();emit();pump();
          };
          const cancel=entry.file?entry.file.decode(ready,fail):deps.start(asset,ready,fail);
          if(entries.get(k)===entry&&entry.state==='loading')entry.cancel=cancel;
        }catch{fail();}
      }
    } finally {pumping=false;}
  };
  return {
    /** Suspend work for a retained, still-live Canvas. Ordinary disposal remains
     * destructive; ready bitmaps and the existing bounded file owner stay put. */
    pause(){
      if(!active||paused)return;
      paused=true;
      for(const [k,e] of entries)if(e.state==='loading'){
        if(e.file){e.request++;e.cancel?.();delete e.cancel;e.state='cold';}
        else drop(k,e);
      }
      emit();
    },
    resume(){if(active&&paused){paused=false;pump();emit();}},
    update(next:readonly Asset[]){
      if(!active)return;
      const previous=wantedIdentity();wanted=next;
      const selectedKeys=wantedKeys();
      const keep=activeKeys();
      for(const [k,e] of entries)if(!keep.has(k)&&e.state==='loading'){
        if(e.file){e.request++;e.cancel?.();delete e.cancel;e.state='cold';}
        else drop(k,e);
      }
      for(const [k,e] of entries)if(selectedKeys.has(k))e.ids=wantedIds(k);
      for(const a of wanted){const e=entries.get(key(a));if(e)e.last=++tick;}
      trim();pump();if(previous!==wantedIdentity())emit();
    },
    suspendUnusedDecoded(){
      if(!active||paused)return;
      const keep=activeKeys();let changed=false;
      for(const [k,e] of entries)if(!keep.has(k)&&e.state==='ready'&&e.loaded?.retainFile){
        if(!usable(e)){retire(k,e);continue;}
        try{e.file=e.loaded.retainFile();delete e.loaded;e.state='cold';watch(k,e,e.file);changed=true;}
        catch{retire(k,e);}
      }
      if(changed)emit();
    },
    failed(image:object){
      for(const e of entries.values())if(e.loaded?.image===image&&e.state==='ready'){
        e.unsubscribe?.();delete e.unsubscribe;e.loaded.release();delete e.loaded;e.state='error';e.gpuFailed=true;emit();break;
      }
    },
    retry(){
      const resetGpu=[...entries.values()].some(e=>e.state==='error'&&e.gpuFailed);
      for(const [k,e] of entries)if(e.state==='error')drop(k,e);
      pump();emit();
      return resetGpu;
    },
    dispose(){active=false;for(const [k,e] of entries)drop(k,e);wanted=[];},
  };
}
