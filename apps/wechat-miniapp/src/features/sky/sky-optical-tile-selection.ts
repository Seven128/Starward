import type {OpticalHipsIndexData,OpticalHipsManifestData,SkyObservationFrame} from "@starward/miniapp-contracts";
import type {SkyArtworkView} from "./sky-artwork-registration";
import {selectSkyHipsTiles} from "./sky-hips-tile-selection";

export interface PublishedOpticalSelection {
  sourceId:string;
  format:"jpeg"|"png";
  order:number;
  pixels:readonly number[];
  dirs:readonly number[];
}

export interface PublishedOpticalTile {
  id:string;sha256:string;width:512;height:512;bytes:number;
  sourceId:string;sourcePriority:number;order:number;pixel:number;
  format:"jpeg"|"png";downloadUrl:string;
}

export interface OpticalCoverageReference {order:number;pixels:readonly number[]}

/** Shard directories identify possible candidates; actual coverage is resolved
 * from each fetched index. Source names and maxOrder are not coverage. */
export function selectPublishedOpticalCandidates(root:OpticalHipsManifestData,frame:SkyObservationFrame,
  view:SkyArtworkView,width:number,height:number):PublishedOpticalSelection[] {
  const candidates:PublishedOpticalSelection[]=[];
  for(const source of root.sources){
    const sourceShards=root.shards.filter(ref=>ref.sourceId===source.id);
    if(!sourceShards.length)continue;
    const minOrder:0|1=sourceShards.some(ref=>ref.order===0)?0:1;
    const directories=new Set(sourceShards.map(ref=>`${ref.order}:${ref.dir}`));
    const finest=selectSkyHipsTiles({frame,view,width,height,maxOrder:source.maxOrder,minOrder});
    if(finest.state!=="SELECTED")continue;
    const orders=[...new Set(sourceShards.map(ref=>ref.order))]
      .filter(order=>order>=minOrder&&order<=finest.order).sort((a,b)=>b-a);
    for(const order of orders){
      const selection=order===finest.order?finest:
        selectSkyHipsTiles({frame,view,width,height,maxOrder:order,minOrder});
      if(selection.state!=="SELECTED")continue;
      const pixels=selection.pixels.filter(pixel=>directories.has(
        `${selection.order}:${Math.floor(pixel/10000)*10000}`));
      if(pixels.length){
        candidates.push({sourceId:source.id,format:source.format,order:selection.order,pixels,
          dirs:[...new Set(pixels.map(pixel=>Math.floor(pixel/10000)*10000))]});
      }
    }
  }
  return candidates;
}

/** A coarser NESTED tile covers all of its fine descendants. This controls
 * further index lookups, never asserts that a missing image was published. */
export function publishedOpticalCoverageComplete(reference:OpticalCoverageReference,
  tiles:readonly PublishedOpticalTile[]):boolean {
  return reference.pixels.length>0&&reference.pixels.every(pixel=>tiles.some(tile=>
    tile.order<=reference.order&&Math.floor(pixel/4**(reference.order-tile.order))===tile.pixel));
}

/** A shard directory is only a lookup hint. Resolve against actual index
 * entries before requesting images. Cover the visible NESTED cells first;
 * spend remaining decoded-image slots on higher-priority finer detail. */
export function resolvePublishedOpticalTiles(candidates:readonly PublishedOpticalSelection[],
  indexes:readonly OpticalHipsIndexData[],reference:OpticalCoverageReference,
  maxTiles=12):PublishedOpticalTile[] {
  if(reference.pixels.length<1||reference.pixels.length>12)return [];
  const limit=Math.min(12,Math.max(0,Math.floor(maxTiles)));
  const fullMask=(1<<reference.pixels.length)-1;
  const byShard=new Map(indexes.map(index=>[`${index.sourceId}:${index.order}:${index.dir}`,index]));
  const sourcePriorities=new Map<string,number>();
  const available:Array<{tile:PublishedOpticalTile;mask:number}>=[];
  for(const candidate of candidates){
    if(!sourcePriorities.has(candidate.sourceId))sourcePriorities.set(candidate.sourceId,sourcePriorities.size);
    const sourcePriority=sourcePriorities.get(candidate.sourceId)!;
    for(const pixel of candidate.pixels){
      const dir=Math.floor(pixel/10000)*10000;
      const tile=byShard.get(`${candidate.sourceId}:${candidate.order}:${dir}`)?.tiles.find(entry=>entry.pixel===pixel);
      if(!tile)continue;
      const asset:PublishedOpticalTile={id:`${candidate.sourceId}:${candidate.order}:${pixel}`,sourceId:candidate.sourceId,
        sourcePriority,order:candidate.order,pixel,sha256:tile.sha256,width:512,height:512,
        bytes:tile.bytes,format:candidate.format,downloadUrl:tile.downloadUrl};
      const mask=reference.pixels.reduce((bits,visible,index)=>
        candidate.order<=reference.order&&
        Math.floor(visible/4**(reference.order-candidate.order))===pixel?bits|(1<<index):bits,0);
      if(mask)available.push({tile:asset,mask});
    }
  }
  const byDetail=[...available].sort((a,b)=>a.tile.sourcePriority-b.tile.sourcePriority||
    b.tile.order-a.tile.order||a.tile.pixel-b.tile.pixel);
  const chosen=new Set<typeof available[number]>();
  let covered=0;
  // The reference has at most twelve cells. Each coverage pick adds at least
  // one new cell, so all published coverage fits without selecting a redundant
  // tile before a later source or lower order can fill a hole.
  for(const entry of byDetail){
    if(chosen.size>=limit||covered===fullMask)break;
    if(!(entry.mask&~covered))continue;
    chosen.add(entry);covered|=entry.mask;
  }
  const rank=(tile:PublishedOpticalTile)=>[tile.sourcePriority,-tile.order] as const;
  for(const entry of byDetail){
    if(chosen.size>=limit)break;
    if(chosen.has(entry))continue;
    const improves=reference.pixels.some((_,index)=>{
      const bit=1<<index;
      if(!(entry.mask&bit))return false;
      const top=[...chosen].filter(other=>other.mask&bit)
        .sort((a,b)=>a.tile.sourcePriority-b.tile.sourcePriority||b.tile.order-a.tile.order)[0];
      if(!top)return true;
      const candidateRank=rank(entry.tile),topRank=rank(top.tile);
      return candidateRank[0]<topRank[0]||
        (candidateRank[0]===topRank[0]&&candidateRank[1]<topRank[1]);
    });
    if(improves)chosen.add(entry);
  }
  return [...chosen].map(entry=>entry.tile).sort((a,b)=>
    b.sourcePriority-a.sourcePriority||a.order-b.order||a.pixel-b.pixel);
}

export function selectPublishedOpticalTiles(root:OpticalHipsManifestData,frame:SkyObservationFrame,
  view:SkyArtworkView,width:number,height:number):PublishedOpticalSelection|null {
  return selectPublishedOpticalCandidates(root,frame,view,width,height)[0]??null;
}
