import { catalogJsonIntegrity } from './catalog-json-integrity.ts';
import { isSaoStarReference } from './celestial-identity.ts';
export { isSaoStarReference } from './celestial-identity.ts';

export const SAO_SUPPLEMENT_VERSION='sao-visual-supplement.v1';
export const SAO_MAX_TILE_ROWS=768;
export const SAO_MAX_TILE_BYTES=192*1024;
export type SaoStellarRow=readonly [string,number,number,number,number,number,number,number];
export interface SaoTileReference {
  id:string; file:string; sha256:string; bytes:number; rowCount:number;
  centerEqj:readonly [number,number,number]; radiusRad:number; maxMotionRadPerYear:number;
  minMagnitude:number; maxMagnitude:number;
}
export interface SaoSpatialIndex {
  schemaVersion:'sao-stellar-index-v1'; catalogVersion:typeof SAO_SUPPLEMENT_VERSION; catalogHash:string;
  baseCatalogVersion:'bsc5p-bright-stars.v2'; baseAssetSha256:string;
  frame:'FK5';referenceEpoch:2000;magnitudeBand:'VISUAL';magnitudeLimit:10;rowCount:246280;
  maximumTileBytes:typeof SAO_MAX_TILE_BYTES;maximumTileRows:typeof SAO_MAX_TILE_ROWS;
  geometry:string;partition:string;coverage:string;
  sources:{landingUrl:string;specificationUrl:string;datasetMetadataUrl:string;rightsUrl:string;usagePolicyUrl:string;credit:string};
  acquisition:readonly {query:string;responseSha256:string;retrievedAt:string|null}[];
  tiles:readonly SaoTileReference[];
}
export interface SaoIndexPublication { publicationHash:string; index:SaoSpatialIndex; }
export interface SaoStellarTile {
  schemaVersion:'sao-stellar-tile-v1';catalogVersion:typeof SAO_SUPPLEMENT_VERSION;catalogHash:string;
  tileId:string;rows:readonly SaoStellarRow[];
}
export interface SaoTilePublication { publicationHash:string;tile:SaoStellarTile; }
const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
const hash=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/u.test(v);
const fail=(reason:string):never=>{throw new TypeError(`sao_publication_invalid:${reason}`);};

/** Shape, scientific identity, safe filenames, bounds and actual canonical bytes.
 * Enforce this after HTTP, conditional-cache and offline-cache reads alike.
 */
export function assertSaoIndexPublication(value:unknown):asserts value is SaoIndexPublication {
  const p=value as SaoIndexPublication,i=p?.index;
  if(!p||!hash(p.publicationHash)||!i||i.schemaVersion!=='sao-stellar-index-v1'||i.catalogVersion!==SAO_SUPPLEMENT_VERSION||!hash(i.catalogHash)||
    i.baseCatalogVersion!=='bsc5p-bright-stars.v2'||!hash(i.baseAssetSha256)||i.frame!=='FK5'||i.referenceEpoch!==2000||
    i.magnitudeBand!=='VISUAL'||i.magnitudeLimit!==10||i.rowCount!==246280||i.maximumTileBytes!==SAO_MAX_TILE_BYTES||i.maximumTileRows!==SAO_MAX_TILE_ROWS||
    ![i.geometry,i.partition,i.coverage].every(v=>typeof v==='string'&&v.length>0&&v.length<1000)||
    !Array.isArray(i.tiles)||i.tiles.length<1||i.tiles.length>4096) fail('index_shape');
  const ids=new Set<string>();let rows=0;
  for(const t of i.tiles){
    if(!t||typeof t.id!=='string'||!/^\d{2}-\d{2}-(?:7|8|9|10)-\d{1,3}$/u.test(t.id)||ids.has(t.id)||t.file!==`${t.id}.json`||
      !hash(t.sha256)||!Number.isInteger(t.bytes)||t.bytes<1||t.bytes>SAO_MAX_TILE_BYTES||
      !Number.isInteger(t.rowCount)||t.rowCount<1||t.rowCount>SAO_MAX_TILE_ROWS||
      !Array.isArray(t.centerEqj)||t.centerEqj.length!==3||!t.centerEqj.every(finite)||Math.abs(Math.hypot(...t.centerEqj)-1)>1e-9||
      !finite(t.radiusRad)||t.radiusRad<0||t.radiusRad>Math.PI||!finite(t.maxMotionRadPerYear)||t.maxMotionRadPerYear<0||
      !finite(t.minMagnitude)||!finite(t.maxMagnitude)||t.minMagnitude<-2||t.maxMagnitude>10||t.minMagnitude>t.maxMagnitude) fail('tile_bounds');
    ids.add(t.id);rows+=t.rowCount;
  }
  if(rows!==i.rowCount) fail('row_count');
  const s=i.sources;
  if(!s||s.landingUrl!=='https://heasarc.gsfc.nasa.gov/W3Browse/star-catalog/sao.html'||
    s.specificationUrl!=='https://cdsarc.cds.unistra.fr/viz-bin/ReadMe/I/131A?format=html'||
    s.datasetMetadataUrl!=='https://data.nasa.gov/dataset/smithsonian-astrophysical-observatory-star-catalog'||
    s.rightsUrl!=='https://www.usa.gov/government-works'||s.usagePolicyUrl!=='https://heasarc.gsfc.nasa.gov/docs/heasarc/data_policy.html'||
    typeof s.credit!=='string'||!s.credit||s.credit.length>1000||!Array.isArray(i.acquisition)||i.acquisition.length!==8) fail('source');
  for(const a of i.acquisition)if(!a||typeof a.query!=='string'||!a.query||a.query.length>1000||!hash(a.responseSha256)||
    a.retrievedAt!==null&&(typeof a.retrievedAt!=='string'||!Number.isFinite(Date.parse(a.retrievedAt)))) fail('acquisition');
  const integrity=catalogJsonIntegrity(i);
  if(integrity.bytes>=2*1024*1024||integrity.sha256!==p.publicationHash) fail('index_integrity');
}

/** expectedTile is from the already validated index of expectedPublication. */
export function assertSaoTilePublication(value:unknown,expectedPublication:SaoIndexPublication,expectedTile:SaoTileReference):asserts value is SaoTilePublication {
  const p=value as SaoTilePublication,t=p?.tile;
  if(!p||p.publicationHash!==expectedPublication.publicationHash||!t||t.schemaVersion!=='sao-stellar-tile-v1'||
    t.catalogVersion!==SAO_SUPPLEMENT_VERSION||t.catalogHash!==expectedPublication.index.catalogHash||t.tileId!==expectedTile.id||
    !Array.isArray(t.rows)||t.rows.length!==expectedTile.rowCount) fail('tile_identity');
  let previous=0;
  for(const r of t.rows){
    if(!Array.isArray(r)||r.length!==8||!isSaoStarReference(r[0])||Number(r[0].slice(4))<=previous||!r.slice(1).every(finite)||
      r[1]<expectedTile.minMagnitude||r[1]>expectedTile.maxMagnitude) fail('row');
    previous=Number(r[0].slice(4));
    const norm=Math.hypot(r[2],r[3],r[4]),speed=Math.hypot(r[5],r[6],r[7]);
    if(Math.abs(norm-1)>1e-9||speed>expectedTile.maxMotionRadPerYear+1e-15||
      Math.abs(r[2]*r[5]+r[3]*r[6]+r[4]*r[7])>Math.max(1e-15,speed*1e-9)||
      (expectedTile.centerEqj[0]*r[2]+expectedTile.centerEqj[1]*r[3]+expectedTile.centerEqj[2]*r[4])<Math.cos(expectedTile.radiusRad)-1e-12) fail('row_geometry');
  }
  const integrity=catalogJsonIntegrity(t);
  if(integrity.bytes!==expectedTile.bytes||integrity.sha256!==expectedTile.sha256) fail('tile_integrity');
}
