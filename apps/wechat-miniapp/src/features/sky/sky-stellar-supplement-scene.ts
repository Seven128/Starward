import {assertStellarGeometryFrame,type SaoIndexPublication,type SaoTilePublication,type StellarGeometryFrame} from '@starward/miniapp-contracts';
import type {ResolvedStellarFrame,ResolvedStellarScene} from './sky-stellar-scene';
import {exactSkyTimeFrame} from './sky-time-frame';
import {createSkyStellarTransform,immutableSkyStellarGeometry} from './sky-stellar-transform';
import {isAdmittedSaoIndexPublication,isAdmittedSaoTilePublication} from '../../services/sao-catalog-client';
import type {SkyDirectionProjector,SkyDirectionProjection} from './sky-view-projection';

export type SupplementPoint=readonly [reference:string,magnitude:number,azimuthDeg:number,altitudeDeg:number];
export interface SkyStellarSupplementFrame extends Pick<ResolvedStellarFrame,'displayDirection'|'displayTransmission'|'pointCount'> {
  publicationHash:string;
  catalogVersion:string;
  geometry:StellarGeometryFrame;
  points:readonly SupplementPoint[];
  forEachProjected?:(projector:SkyDirectionProjector,magnitudeLimit:number,
    visit:(pointIndex:number,point:SupplementPoint,projection:SkyDirectionProjection)=>void)=>void;
}
// A tile retains only its most recent time transform. Camera gestures reuse
// positions, and releasing a view's tile allows its derived points to be freed.
type TileTransform={geometry:StellarGeometryFrame;transform:ReturnType<typeof createSkyStellarTransform>;
  pointAt:(index:number)=>SupplementPoint};
const transformed=new WeakMap<SaoTilePublication,TileTransform>();
const reusableFrames=new WeakSet<SkyStellarSupplementFrame>();
export function isReusableSkyStellarSupplementFrame(value:SkyStellarSupplementFrame):boolean {return reusableFrames.has(value);}

export function supplementGeometry(publication:SaoIndexPublication,scene:ResolvedStellarScene|undefined,at:string|undefined){
  const geometry=exactSkyTimeFrame(scene?.frames,at)?.geometry;
  if(!scene?.publication||!scene.observer||scene.state!=='AVAILABLE'||!geometry||!at)return null;
  if(publication.index.baseCatalogVersion!==scene.publication.catalogVersion||publication.index.baseAssetSha256!==scene.publication.catalogHash)
    throw Error('sao_base_catalog_mismatch');
  assertStellarGeometryFrame(geometry,{catalog:scene.publication,at,observer:scene.observer});
  return geometry;
}

export function resolveSkyStellarSupplement(publication:SaoIndexPublication,tiles:readonly SaoTilePublication[],
  scene:ResolvedStellarScene|undefined,at:string|undefined):SkyStellarSupplementFrame|null{
  const geometry=supplementGeometry(publication,scene,at);if(!geometry)return null;
  const spans:Array<{start:number;end:number;tile:SaoTilePublication;cached:TileTransform}>=[];
  let pointCount=0;
  for(const tile of tiles){
    if(tile.publicationHash!==publication.publicationHash||tile.tile.catalogHash!==publication.index.catalogHash)
      throw Error('sao_tile_publication_mismatch');
    let cached=transformed.get(tile);
    if(cached?.geometry!==geometry){
      const rows=tile.tile.rows;
      const transform=createSkyStellarTransform(rows.length,index=>{
        const row=rows[index]!;return [row[2],row[3],row[4],row[5],row[6],row[7]];
      },geometry);
      const positioned:Array<SupplementPoint|undefined>=new Array(rows.length);
      const pointAt=(index:number)=>{
        if(positioned[index]===undefined){
          const row=rows[index]!,position=transform.position(index);
          positioned[index]=Object.freeze([row[0],row[1],position.azimuthDeg,position.altitudeDeg] as const);
        }
        return positioned[index]!;
      };
      cached={geometry,transform,pointAt};transformed.set(tile,cached);
    }
    spans.push({start:pointCount,end:pointCount+tile.tile.rows.length,tile,cached});
    pointCount+=tile.tile.rows.length;
  }
  // Keep tile-local work when the same exact-time tiles are aggregated again.
  // A sequential scan needs one span lookup per tile; arbitrary readers still
  // get the same row identity without retaining a flattened second catalogue.
  let previousSpan=spans[0];
  const locate=(index:number)=>{
    if(previousSpan&&index>=previousSpan.start&&index<previousSpan.end)return previousSpan;
    let lower=0,upper=spans.length-1;
    while(lower<=upper){const middle=(lower+upper)>>>1,span=spans[middle]!;
      if(index<span.start)upper=middle-1;
      else if(index>=span.end)lower=middle+1;
      else {previousSpan=span;return span;}}
    throw Error('sao_point_index_invalid');
  };
  const pointAt=(index:number)=>{const span=locate(index);return span.cached.pointAt(index-span.start);};
  const displayDirection=(index:number)=>{const span=locate(index);return span.cached.transform.displayDirection(index-span.start);};
  const displayTransmission=(index:number)=>{const span=locate(index);return span.cached.transform.displayTransmission(index-span.start);};
  const forEachProjected:NonNullable<SkyStellarSupplementFrame['forEachProjected']>=(projector,limit,visit)=>{
    for(const span of spans)span.cached.transform.forEachProjected(projector,limit,index=>span.tile.tile.rows[index]![1],
      (index,projection)=>visit(span.start+index,span.cached.pointAt(index),projection));
  };
  let points:readonly SupplementPoint[]|undefined;
  const resolved=Object.freeze({publicationHash:publication.publicationHash,catalogVersion:publication.index.catalogVersion,geometry,pointCount,
    get points(){return points??=Object.freeze(Array.from({length:pointCount},(_,index)=>pointAt(index)));},
    forEachProjected,displayDirection,displayTransmission});
  if(immutableSkyStellarGeometry(geometry)&&isAdmittedSaoIndexPublication(publication)&&tiles.every(isAdmittedSaoTilePublication))
    reusableFrames.add(resolved);
  return resolved;
}

export function currentStellarSupplement(frame:SkyStellarSupplementFrame|null|undefined,scene:ResolvedStellarScene|undefined,at:string|undefined){
  return frame&&frame.geometry.at===at&&frame.geometry===exactSkyTimeFrame(scene?.frames,at)?.geometry?frame:null;
}
