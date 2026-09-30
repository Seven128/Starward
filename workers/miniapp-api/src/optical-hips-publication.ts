import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile, realpath } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { NotFoundException } from "@nestjs/common";

type TileFormat = "jpeg" | "png";
interface OpticalSource {
  id: string;
  title: string;
  provider: string;
  originalDataUrl: string;
  originalRights: string;
  originalRightsUrl: string;
  hipsRecordUrl: string;
  hipsLicense: "ODbL-1.0";
  hipsDoi: string;
  format: TileFormat;
  tileWidth: 512;
  maxOrder: number;
}
interface ShardReference {
  sourceId: string;
  order: number;
  dir: number;
  file: string;
  sha256: string;
  bytes: number;
  tileCount: number;
}
interface OpticalPublication {
  schemaVersion: "starward-optical-hips-v1";
  publicationId: string;
  scope: "TRIAL" | "PRODUCTION";
  processing: string;
  limitations: readonly string[];
  sources: readonly OpticalSource[];
  shards: readonly ShardReference[];
}
interface PublishedTile {
  pixel: number;
  sha256: string;
  bytes: number;
}
interface TileShard {
  schemaVersion: "starward-optical-hips-shard-v1";
  sourceId: string;
  order: number;
  dir: number;
  tiles: readonly PublishedTile[];
}

const hash = (value:Uint8Array|string) => createHash("sha256").update(value).digest("hex");
const digest = (value:unknown):value is string => typeof value==="string" && /^[a-f0-9]{64}$/u.test(value);
const validText = (value:unknown):value is string => typeof value==="string" && value.trim().length>0;
const validSourceId = (value:unknown):value is string => typeof value==="string" && /^[a-z0-9-]{1,40}$/u.test(value);
const validOrder = (value:unknown):value is number => Number.isInteger(value) && (value as number)>=0 && (value as number)<=11;
const validPixel = (order:number,pixel:unknown):pixel is number => Number.isInteger(pixel) && (pixel as number)>=0 && (pixel as number)<12*4**order;
const expectedShard = (sourceId:string,order:number,dir:number) => `${sourceId}/Norder${order}/Dir${dir}/index.json`;
const expectedTile = (sourceId:string,order:number,pixel:number,format:TileFormat) =>
  `${sourceId}/Norder${order}/Dir${Math.floor(pixel/10000)*10000}/Npix${pixel}.${format==="jpeg"?"jpg":"png"}`;

/** A root publication binds a bounded set of directory indexes, each of which
 * binds the actual tile bytes. It does not infer coverage from a source MOC. */
function validateRoot(value:unknown):OpticalPublication {
  const root=value as OpticalPublication;
  if(root?.schemaVersion!=="starward-optical-hips-v1" || !validText(root.publicationId) ||
    (root.scope!=="TRIAL"&&root.scope!=="PRODUCTION") || !validText(root.processing) ||
    !Array.isArray(root.limitations) || !root.limitations.every(validText) ||
    !Array.isArray(root.sources) || root.sources.length<1 || root.sources.length>4 ||
    !Array.isArray(root.shards) || root.shards.length<1 || root.shards.length>20_000)
    throw new Error("optical_publication_invalid");
  const ids=new Set<string>();
  for(const source of root.sources){
    if(!validSourceId(source.id)||ids.has(source.id)||!validText(source.title)||
      !validText(source.provider)||!validText(source.originalDataUrl)||
      !validText(source.originalRights)||!validText(source.originalRightsUrl)||
      !validText(source.hipsRecordUrl)||source.hipsLicense!=="ODbL-1.0"||
      !validText(source.hipsDoi)||(source.format!=="jpeg"&&source.format!=="png")||
      source.tileWidth!==512||!validOrder(source.maxOrder))throw new Error("optical_publication_invalid");
    ids.add(source.id);
  }
  const shardIds=new Set<string>();
  for(const shard of root.shards){
    const source=root.sources.find(candidate=>candidate.id===shard.sourceId);
    const key=`${shard.sourceId}:${shard.order}:${shard.dir}`;
    if(!source || !validOrder(shard.order)||shard.order>source.maxOrder||
      !Number.isInteger(shard.dir)||shard.dir<0||shard.dir%10000!==0||
      shard.dir>=12*4**shard.order||shardIds.has(key)||
      shard.file!==expectedShard(source.id,shard.order,shard.dir)||!digest(shard.sha256)||
      !Number.isInteger(shard.bytes)||shard.bytes<32||shard.bytes>2_000_000||
      !Number.isInteger(shard.tileCount)||shard.tileCount<1||shard.tileCount>10000)
      throw new Error("optical_publication_invalid");
    shardIds.add(key);
  }
  return root;
}

function validateShard(value:unknown,ref:ShardReference):TileShard {
  const shard=value as TileShard;
  if(shard?.schemaVersion!=="starward-optical-hips-shard-v1"||shard.sourceId!==ref.sourceId||
    shard.order!==ref.order||shard.dir!==ref.dir||!Array.isArray(shard.tiles)||
    shard.tiles.length!==ref.tileCount)throw new Error("optical_shard_invalid");
  const seen=new Set<number>();
  for(const tile of shard.tiles){
    if(!validPixel(ref.order,tile.pixel)||Math.floor(tile.pixel/10000)*10000!==ref.dir||
      seen.has(tile.pixel)||!digest(tile.sha256)||!Number.isInteger(tile.bytes)||
      tile.bytes<24||tile.bytes>5_000_000)throw new Error("optical_shard_invalid");
    seen.add(tile.pixel);
  }
  return shard;
}

export class OpticalHipsPublicationService {
  private root:OpticalPublication|null=null;
  private rootHash:string|null=null;
  private shardCache=new Map<string,TileShard>();
  constructor(private readonly manifestUrl:URL|null=null) {}

  private publication() {
    if(!this.manifestUrl)throw new NotFoundException("optical_publication_unavailable");
    if(!this.root){
      // A missing/invalid source is never memoized as available.
      const bytes=readFileSync(this.manifestUrl);
      this.root=validateRoot(JSON.parse(bytes.toString("utf8")));
      this.rootHash=hash(bytes);
    }
    return this.root;
  }
  private requireVersion(publicationHash:string) {
    const root=this.publication();
    if(!digest(publicationHash)||publicationHash!==this.rootHash)
      throw new NotFoundException("optical_publication_not_found");
    return root;
  }
  manifest() {
    const root=this.publication();
    const publicationHash=this.rootHash!;
    return {...root,publicationHash,shards:root.shards.map(shard=>({...shard,
      indexUrl:`/v2/sky/optical/${publicationHash}/${shard.sourceId}/${shard.order}/${shard.dir}/index`,
    }))};
  }
  async index(publicationHash:string,sourceId:string,order:number,dir:number) {
    const {shard}=await this.loadShard(publicationHash,sourceId,order,dir);
    return {...shard,publicationHash,tiles:shard.tiles.map(tile=>({...tile,
      downloadUrl:`/v2/sky/optical/${publicationHash}/${sourceId}/${order}/${tile.pixel}`,
    }))};
  }
  async tile(publicationHash:string,sourceId:string,order:number,pixel:number) {
    if(!validOrder(order)||!validPixel(order,pixel))throw new NotFoundException("optical_tile_not_found");
    const dir=Math.floor(pixel/10000)*10000;
    const {root,shard}=await this.loadShard(publicationHash,sourceId,order,dir);
    const source=root.sources.find(candidate=>candidate.id===sourceId)!;
    const entry=shard.tiles.find(candidate=>candidate.pixel===pixel);
    if(!entry)throw new NotFoundException("optical_tile_not_found");
    const bytes=await this.readOwned(expectedTile(sourceId,order,pixel,source.format));
    if(bytes.length!==entry.bytes||hash(bytes)!==entry.sha256||
      (source.format==="jpeg"?(bytes[0]!==0xff||bytes[1]!==0xd8||bytes.at(-2)!==0xff||bytes.at(-1)!==0xd9)
        : ![137,80,78,71,13,10,26,10].every((part,i)=>bytes[i]===part)))
      throw new Error("optical_tile_asset_invalid");
    return {bytes,contentType:source.format==="jpeg"?"image/jpeg" as const:"image/png" as const,
      sourceId,sourceLabel:source.title,publicationHash};
  }
  private async loadShard(publicationHash:string,sourceId:string,order:number,dir:number) {
    const root=this.requireVersion(publicationHash);
    const ref=root.shards.find(item=>item.sourceId===sourceId&&item.order===order&&item.dir===dir);
    if(!ref)throw new NotFoundException("optical_shard_not_found");
    const key=ref.file;
    let shard=this.shardCache.get(key);
    if(!shard){
      const bytes=await this.readOwned(ref.file);
      if(bytes.length!==ref.bytes||hash(bytes)!==ref.sha256)throw new Error("optical_shard_asset_invalid");
      shard=validateShard(JSON.parse(bytes.toString("utf8")),ref);
      this.shardCache.set(key,shard);
      if(this.shardCache.size>8)this.shardCache.delete(this.shardCache.keys().next().value!);
    }
    return {root,shard};
  }
  private async readOwned(file:string) {
    if(!this.manifestUrl)throw new NotFoundException("optical_publication_unavailable");
    const root=await realpath(dirname(fileURLToPath(this.manifestUrl)));
    const asset=await realpath(resolve(root,file));
    const beneath=relative(root,asset);
    if(!beneath||beneath===".."||beneath.startsWith(`..\\`)||beneath.startsWith("../")||
      resolve(root,beneath)!==asset)throw new Error("optical_publication_path_invalid");
    return readFile(asset);
  }
}

// The root metadata is small and immutable for one service instance; tile bytes
// stay asynchronous. Kept local to avoid a runtime upstream network boundary.
