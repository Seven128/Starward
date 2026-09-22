/** Offline spatial publication. Source rows stay server-side for object details.
 * Writes only to the caller's explicit output directory; does not deploy.
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createStellarMotion } from '../../packages/astronomy-core/src/stellar-vectors.ts';

type SourceRow = [string, number, number, number, number, number, number, number, string|null, string|null, string|null];
export type PublishedRow = [string, number, number, number, number, number, number, number];
const hash = (v:string|Buffer) => createHash('sha256').update(v).digest('hex');
const encode = (v:unknown) => Buffer.from(JSON.stringify(v));
const VERSION = 'sao-visual-supplement.v1';
const MAX_TILE_BYTES = 192 * 1024;
const MAX_TILE_ROWS = 768;
const RAD = Math.PI/180;
const vector = (ra:number,dec:number) => [Math.cos(dec*RAD)*Math.cos(ra*RAD),Math.cos(dec*RAD)*Math.sin(ra*RAD),Math.sin(dec*RAD)];

export async function publishSao(sourceDirectory:string, outputDirectory:string) {
  const raw = await readFile(path.join(sourceDirectory,`${VERSION}.json`));
  const provenance = JSON.parse(await readFile(path.join(sourceDirectory,`${VERSION}.manifest.json`),'utf8'));
  const data = JSON.parse(raw.toString('utf8'));
  const catalogHash=hash(raw);
  if(raw.length!==provenance.derivedAssetBytes || catalogHash!==provenance.derivedAssetSha256 ||
    !raw.equals(encode(data)) || data.catalogVersion!==VERSION || provenance.catalogVersion!==VERSION ||
    data.frame!=='FK5' || data.referenceEpoch!==2000 || data.magnitudeBand!=='VISUAL' || data.magnitudeLimit!==10 ||
    data.baseCatalogVersion!=='bsc5p-bright-stars.v2' || !/^[a-f0-9]{64}$/.test(data.baseAssetSha256) ||
    !Array.isArray(data.rows) || data.rows.length!==246280 || provenance.rowCount!==246280)
    throw Error('sao_source_publication_invalid');
  const cells = new Map<string,{center:number[];rows:PublishedRow[];radiusRad:number;maxMotionRadPerYear:number}>();
  const seen = new Set<string>();
  for(const s of data.rows as SourceRow[]) {
    if(!Array.isArray(s)||s.length!==11||!/^SAO:[1-9]\d{0,5}$/.test(s[0])||Number(s[0].slice(4))>258997||seen.has(s[0])||
      !s.slice(1,6).every(v=>typeof v==='number'&&Number.isFinite(v))||s[1]<-2||s[1]>10||
      s[2]<0||s[2]>=360||Math.abs(s[3])>90) throw Error('sao_source_row_invalid');
    seen.add(s[0]);
    const dec=Math.min(11,Math.floor((s[3]+90)/15)),decCenter=dec*15-82.5;
    // Reduce the converging longitude slices toward the poles. Selection uses
    // actual published point bounds, never assumes these cells are HEALPix.
    const raSegments=Math.max(1,Math.round(24*Math.cos(decCenter*RAD))),raWidth=360/raSegments;
    const ra=Math.floor(s[2]/raWidth),tier=[7,8,9,10].find(m=>s[1]<=m)!;
    const key=`${String(ra).padStart(2,'0')}-${String(dec).padStart(2,'0')}-${tier}`;
    let cell=cells.get(key);
    if(!cell) cells.set(key,cell={center:vector((ra+.5)*raWidth,decCenter),rows:[],radiusRad:0,maxMotionRadPerYear:0});
    const motion=createStellarMotion({raDeg:s[2],decDeg:s[3],pmRaCosDecArcsecYr:s[4],pmDecArcsecYr:s[5]});
    cell.rows.push([s[0],s[1],...motion]);
    const centerDot=cell.center.reduce((n,v,i)=>n+v*motion[i]!,0);
    cell.radiusRad=Math.max(cell.radiusRad,Math.acos(Math.max(-1,Math.min(1,centerDot)))+1e-12);
    cell.maxMotionRadPerYear=Math.max(cell.maxMotionRadPerYear,Math.hypot(motion[3],motion[4],motion[5]));
  }
  await mkdir(outputDirectory,{recursive:true});
  const tiles=[];
  for(const [cellId,cell] of [...cells.entries()].sort(([a],[b])=>a.localeCompare(b))) {
    // Stable identities/order, independent of upstream response ordering.
    cell.rows.sort((a,b)=>Number(a[0].slice(4))-Number(b[0].slice(4)));
    for(let start=0;start<cell.rows.length;start+=MAX_TILE_ROWS) {
      const id=`${cellId}-${Math.floor(start/MAX_TILE_ROWS)}`,rows=cell.rows.slice(start,start+MAX_TILE_ROWS);
      const bytes=encode({schemaVersion:'sao-stellar-tile-v1',catalogVersion:VERSION,catalogHash,tileId:id,rows});
      if(bytes.length>MAX_TILE_BYTES) throw Error('sao_tile_size_exceeded');
      const file=`${id}.json`;
      await writeFile(path.join(outputDirectory,file),bytes);
      tiles.push({id,file,sha256:hash(bytes),bytes:bytes.length,rowCount:rows.length,
        centerEqj:cell.center,radiusRad:cell.radiusRad,maxMotionRadPerYear:cell.maxMotionRadPerYear,
        minMagnitude:Math.min(...rows.map(r=>r[1])),maxMagnitude:Math.max(...rows.map(r=>r[1]))});
    }
  }
  const index={schemaVersion:'sao-stellar-index-v1',catalogVersion:VERSION,catalogHash,
    baseCatalogVersion:data.baseCatalogVersion,baseAssetSha256:data.baseAssetSha256,
    frame:'FK5',referenceEpoch:2000,magnitudeBand:'VISUAL',magnitudeLimit:10,
    rowCount:data.rows.length,maximumTileBytes:MAX_TILE_BYTES,maximumTileRows:MAX_TILE_ROWS,
    geometry:'Unit EQJ direction and tangent radians per Julian year; no refraction',
    partition:'15-degree declination rings; longitude segments round(24*cos(ring center)); disjoint magnitude tiers <=7/8/9/10; numeric SAO row chunks',
    coverage:'Magnitude selection only; not a claim of uniform completeness to magnitude 10',
    sources:provenance.source,acquisition:provenance.sourcePartitions.map((s:any)=>({query:s.query,responseSha256:s.responseSha256,retrievedAt:s.retrievedAt})),
    tiles};
  const indexBytes=encode(index);
  if(indexBytes.length>=2*1024*1024) throw Error('sao_index_size_exceeded');
  await writeFile(path.join(outputDirectory,'index.json'),indexBytes);
  const publication={schemaVersion:'sao-spatial-publication-v1',catalogVersion:VERSION,catalogHash,
    publicationHash:hash(indexBytes),indexSha256:hash(indexBytes),indexBytes:indexBytes.length,tileCount:tiles.length,rowCount:data.rows.length,
    tileBytes:tiles.reduce((n,t)=>n+t.bytes,0),hashEncoding:'UTF-8 ECMAScript JSON.stringify, no trailing newline'};
  await writeFile(path.join(outputDirectory,'publication.json'),encode(publication));
  return publication;
}

if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const [, , source,output]=process.argv;
  if(!source||!output) throw Error('usage: publish_sao.mts <generated-source-dir> <output-dir>');
  console.log(JSON.stringify(await publishSao(source,output)));
}
