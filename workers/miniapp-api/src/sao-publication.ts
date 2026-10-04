import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { NotFoundException } from '@nestjs/common';
import { saoCatalogSource } from './sao-catalog-source.ts';
import { loadBsc5pStarCatalog } from '@starward/astronomy-core/bsc5p-catalog';
import { assertSaoIndexPublication, assertSaoTilePublication, type ApiEnvelope, type SaoIndexPublication,
  type SaoTilePublication, type SaoTileReference, type SourceSummary } from '@starward/miniapp-contracts';

function freeze<T>(value:T):T {
  if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;
}
function envelope<T>(data:T,etag:string,sources:readonly SourceSummary[]):ApiEnvelope<T>{
  return freeze({apiVersion:'v2',data,dataState:'FRESH',generatedAt:new Date().toISOString(),validAt:null,
    sources,warnings:[],etag:`W/"${etag}"`,requestId:`sao:${etag}`});
}

/** The only source is the fixed locally published asset directory. No provider
 * network request, user filename, account or observing-time state is accepted.
 */
export class SaoPublicationService {
  private current:Promise<ApiEnvelope<SaoIndexPublication>>|null=null;
  private readonly tiles=new Map<string,ApiEnvelope<SaoTilePublication>>();
  // Validated publication tile IDs bound distinct in-flight keys. Ready LRU
  // retirement must never detach the promise coalescing an unfinished read.
  private readonly pendingTiles=new Map<string,Promise<{envelope:ApiEnvelope<SaoTilePublication>;bytes:Buffer}>>();
  constructor(private readonly directory=new URL('../assets/sao/',import.meta.url)){}

  get():Promise<ApiEnvelope<SaoIndexPublication>>{
    if(!this.current)this.current=this.load().catch(error=>{this.current=null;throw error;});
    return this.current;
  }
  private async load(){
    const [manifestBytes,indexBytes]=await Promise.all([readFile(new URL('publication.json',this.directory)),readFile(new URL('index.json',this.directory))]);
    const manifest=JSON.parse(manifestBytes.toString()),index=JSON.parse(indexBytes.toString());
    if(manifest.schemaVersion!=='sao-spatial-publication-v1'||manifest.publicationHash!==manifest.indexSha256||
      manifest.indexBytes!==indexBytes.length||createHash('sha256').update(indexBytes).digest('hex')!==manifest.publicationHash||
      manifest.catalogHash!==index.catalogHash||manifest.catalogVersion!==index.catalogVersion||
      manifest.tileCount!==index.tiles?.length||manifest.rowCount!==index.rowCount)throw Error('sao_publication_manifest_invalid');
    const data={publicationHash:manifest.publicationHash,index};assertSaoIndexPublication(data);
    const base=loadBsc5pStarCatalog(data.index.baseCatalogVersion);
    if(data.index.baseCatalogVersion!==base.catalogVersion||data.index.baseAssetSha256!==base.catalogHash)throw Error('sao_base_catalog_mismatch');
    return envelope(data,data.publicationHash,[saoCatalogSource(data.index)]);
  }

  async tile(publicationHash:string,tileId:string):Promise<ApiEnvelope<SaoTilePublication>>{
    const {publication,expected,key}=await this.tileBinding(publicationHash,tileId);
    const reading=this.pendingTiles.get(key);
    if(reading)return (await reading).envelope;
    const found=this.tiles.get(key);
    if(found){this.tiles.delete(key);this.tiles.set(key,found);return found;}
    return (await this.readTile(publication,expected,key)).envelope;
  }

  /** Immutable source bytes for the public file consumer. Dynamic envelope
   * timestamps are not part of the published tile hash. Ready retention keeps
   * only the existing parsed envelope; raw buffers retire after delivery. */
  async asset(publicationHash:string,tileId:string){
    const {publication,expected,key}=await this.tileBinding(publicationHash,tileId);
    const result=await this.readTile(publication,expected,key);
    return {bytes:result.bytes,sha256:expected.sha256,contentType:'application/json; charset=utf-8'};
  }

  /** Only verified tiles in the adopted index enter standard static export.
   * This streams one raw file at a time, never loads the complete pack. */
  async *publishedAssets(){
    const publication=await this.get();
    for(const tile of publication.data.index.tiles){
      const result=await this.asset(publication.data.publicationHash,tile.id);
      yield {publicationHash:publication.data.publicationHash,tileId:tile.id,...result};
    }
  }

  private async tileBinding(publicationHash:string,tileId:string){
    const publication=await this.get();
    if(publicationHash!==publication.data.publicationHash)throw new NotFoundException('sao_publication_not_found');
    const expected=publication.data.index.tiles.find(t=>t.id===tileId);
    if(!expected)throw new NotFoundException('sao_tile_not_found');
    return {publication,expected,key:`${publicationHash}:${tileId}`};
  }

  private readTile(publication:ApiEnvelope<SaoIndexPublication>,expected:SaoTileReference,key:string){
    const reading=this.pendingTiles.get(key);
    if(reading)return reading;
    const pending=(async()=>{
      const bytes=await readFile(new URL(expected.file,this.directory));
      if(bytes.length!==expected.bytes||createHash('sha256').update(bytes).digest('hex')!==expected.sha256)throw Error('sao_tile_asset_integrity');
      const data={publicationHash:publication.data.publicationHash,tile:JSON.parse(bytes.toString())};
      assertSaoTilePublication(data,publication.data,expected);
      const result=envelope(data,expected.sha256,publication.sources);
      this.tiles.delete(key);this.tiles.set(key,result);
      // Server settled retention only; client budgets remain separate. The
      // shared unfinished read remains coalesced independently of this LRU.
      while(this.tiles.size>64)this.tiles.delete(this.tiles.keys().next().value!);
      return {envelope:result,bytes};
    })();
    this.pendingTiles.set(key,pending);
    void pending.finally(()=>{if(this.pendingTiles.get(key)===pending)this.pendingTiles.delete(key);}).catch(()=>undefined);
    return pending;
  }
}
