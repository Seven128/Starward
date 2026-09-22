import {assertStellarGeometryFrame,type SaoIndexPublication,type SaoTilePublication,type StellarGeometryFrame} from '@starward/miniapp-contracts';
import {projectStellarMotion} from '@starward/astronomy-core/stellar-vectors';
import type {ResolvedStellarScene} from './sky-stellar-scene';
import {exactSkyTimeFrame} from './sky-time-frame';

export type SupplementPoint=readonly [reference:string,magnitude:number,azimuthDeg:number,altitudeDeg:number];
export interface SkyStellarSupplementFrame {
  publicationHash:string;
  catalogVersion:string;
  geometry:StellarGeometryFrame;
  points:readonly SupplementPoint[];
}
// A tile retains only its most recent time transform. Camera gestures reuse
// positions, and releasing a view's tile allows its derived points to be freed.
const transformed=new WeakMap<SaoTilePublication,{geometry:StellarGeometryFrame;points:readonly SupplementPoint[]}>();

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
  const points:SupplementPoint[]=[];
  for(const tile of tiles){
    if(tile.publicationHash!==publication.publicationHash||tile.tile.catalogHash!==publication.index.catalogHash)
      throw Error('sao_tile_publication_mismatch');
    let cached=transformed.get(tile);
    if(cached?.geometry!==geometry){
      const positioned:SupplementPoint[]=[];
      for(const [reference,magnitude,x,y,z,vx,vy,vz] of tile.tile.rows){
        const position=projectStellarMotion([x,y,z,vx,vy,vz],geometry.julianYears,geometry.equatorialToEnu);
        if(position.altitudeDeg>0)positioned.push(Object.freeze([reference,magnitude,position.azimuthDeg,position.altitudeDeg] as const));
      }
      cached={geometry,points:Object.freeze(positioned)};transformed.set(tile,cached);
    }
    points.push(...cached.points);
  }
  return {publicationHash:publication.publicationHash,catalogVersion:publication.index.catalogVersion,geometry,points:Object.freeze(points)};
}

export function currentStellarSupplement(frame:SkyStellarSupplementFrame|null|undefined,scene:ResolvedStellarScene|undefined,at:string|undefined){
  return frame&&frame.geometry.at===at&&frame.geometry===exactSkyTimeFrame(scene?.frames,at)?.geometry?frame:null;
}
