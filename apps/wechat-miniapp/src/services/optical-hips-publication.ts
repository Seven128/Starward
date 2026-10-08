import {opticalHipsSourceIdentityValid,type OpticalHipsIndexData,type OpticalHipsManifestData} from "@starward/miniapp-contracts";

const sha=(value:unknown):value is string=>typeof value==="string"&&/^[a-f0-9]{64}$/u.test(value);
const id=(value:unknown):value is string=>typeof value==="string"&&/^[a-z0-9-]{1,40}$/u.test(value);
const order=(value:unknown):value is number=>Number.isInteger(value)&&(value as number)>=0&&(value as number)<=11;
const pixel=(level:number,value:unknown):value is number=>Number.isInteger(value)&&(value as number)>=0&&(value as number)<12*4**level;
const bytes=(value:unknown,cap:number):value is number=>Number.isInteger(value)&&(value as number)>0&&(value as number)<=cap;
const url=(value:unknown,path:string):value is string=>value===path;

/** The wire body is bare JSON. Do not let a stale/malformed publication choose
 * an arbitrary download URL or claim coverage that was not listed. */
export function assertOpticalHipsManifest(value:unknown):asserts value is OpticalHipsManifestData {
  const root=value as OpticalHipsManifestData;
  if(!["starward-optical-hips-v1","starward-optical-hips-v2"].includes(root?.schemaVersion)||!sha(root.publicationHash)||
    (root.scope!=="TRIAL"&&root.scope!=="PRODUCTION")||
    !Array.isArray(root.sources)||root.sources.length<1||root.sources.length>4||
    !Array.isArray(root.shards)||root.shards.length<1||root.shards.length>20_000||
    !Array.isArray(root.limitations)||!root.limitations.every(a=>typeof a==="string"))
    throw new Error("optical_publication_invalid");
  const sourceIds=new Set<string>();
  for(const source of root.sources){
    if(!id(source.id)||sourceIds.has(source.id)||!order(source.maxOrder)||
      source.tileWidth!==512||(source.format!=="jpeg"&&source.format!=="png")||
      ![source.title,source.provider,source.originalDataUrl,source.originalRights,
        source.originalRightsUrl,source.hipsRecordUrl].every(a=>typeof a==="string"&&a.length>0)||
      !opticalHipsSourceIdentityValid(source,root.schemaVersion)||
      source.hipsLicense!=="ODbL-1.0")throw new Error("optical_publication_invalid");
    sourceIds.add(source.id);
  }
  const shardIds=new Set<string>();
  for(const shard of root.shards){
    const source=root.sources.find(a=>a.id===shard.sourceId);
    const key=`${shard.sourceId}:${shard.order}:${shard.dir}`;
    if(!source||!order(shard.order)||shard.order>source.maxOrder||
      !pixel(shard.order,shard.dir)||shard.dir%10000!==0||shardIds.has(key)||
      !sha(shard.sha256)||!bytes(shard.bytes,2_000_000)||
      !bytes(shard.tileCount,10_000)||
      shard.file!==`${source.id}/Norder${shard.order}/Dir${shard.dir}/index.json`||
      !url(shard.indexUrl,`/v2/sky/optical/${root.publicationHash}/${source.id}/${shard.order}/${shard.dir}/index`))
      throw new Error("optical_publication_invalid");
    shardIds.add(key);
  }
}

export function assertOpticalHipsIndex(value:unknown,root:OpticalHipsManifestData,
  sourceId:string,level:number,dir:number):asserts value is OpticalHipsIndexData {
  const index=value as OpticalHipsIndexData;
  const ref=root.shards.find(a=>a.sourceId===sourceId&&a.order===level&&a.dir===dir);
  if(!ref||index?.schemaVersion!=="starward-optical-hips-shard-v1"||
    index.publicationHash!==root.publicationHash||index.sourceId!==sourceId||
    index.order!==level||index.dir!==dir||!Array.isArray(index.tiles)||
    index.tiles.length!==ref.tileCount)throw new Error("optical_index_invalid");
  const seen=new Set<number>();
  for(const tile of index.tiles){
    if(!pixel(level,tile.pixel)||Math.floor(tile.pixel/10000)*10000!==dir||
      seen.has(tile.pixel)||!sha(tile.sha256)||!bytes(tile.bytes,5_000_000)||
      !url(tile.downloadUrl,`/v2/sky/optical/${root.publicationHash}/${sourceId}/${level}/${tile.pixel}`))
      throw new Error("optical_index_invalid");
    seen.add(tile.pixel);
  }
}
