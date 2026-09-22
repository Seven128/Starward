import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { NotFoundException } from '@nestjs/common';
import { saoCatalogSource } from './sao-catalog-source.ts';
import { loadBsc5pBrightStarCatalog } from '@starward/astronomy-core/bsc5p-catalog';
import { assertSaoIndexPublication, assertSaoTilePublication, type ApiEnvelope, type SaoIndexPublication,
  type SaoTilePublication, type SourceSummary } from '@starward/miniapp-contracts';

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
  private readonly tiles=new Map<string,Promise<ApiEnvelope<SaoTilePublication>>>();
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
    const base=loadBsc5pBrightStarCatalog();
    if(data.index.baseCatalogVersion!==base.catalogVersion||data.index.baseAssetSha256!==base.catalogHash)throw Error('sao_base_catalog_mismatch');
    return envelope(data,data.publicationHash,[saoCatalogSource(data.index)]);
  }

  async tile(publicationHash:string,tileId:string):Promise<ApiEnvelope<SaoTilePublication>>{
    const publication=await this.get();
    if(publicationHash!==publication.data.publicationHash)throw new NotFoundException('sao_publication_not_found');
    const expected=publication.data.index.tiles.find(t=>t.id===tileId);
    if(!expected)throw new NotFoundException('sao_tile_not_found');
    const key=`${publicationHash}:${tileId}`;
    const found=this.tiles.get(key);
    if(found){this.tiles.delete(key);this.tiles.set(key,found);return found;}
    const pending=(async()=>{
      const bytes=await readFile(new URL(expected.file,this.directory));
      if(bytes.length!==expected.bytes||createHash('sha256').update(bytes).digest('hex')!==expected.sha256)throw Error('sao_tile_asset_integrity');
      const data={publicationHash,tile:JSON.parse(bytes.toString())};
      assertSaoTilePublication(data,publication.data,expected);
      return envelope(data,expected.sha256,publication.sources);
    })();
    this.tiles.set(key,pending);
    // Server retention only; request/cache budgets in the client remain separate.
    while(this.tiles.size>64)this.tiles.delete(this.tiles.keys().next().value!);
    try{return await pending;}catch(error){if(this.tiles.get(key)===pending)this.tiles.delete(key);throw error;}
  }
}
