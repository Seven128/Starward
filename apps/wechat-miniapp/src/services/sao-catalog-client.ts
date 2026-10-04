import { assertSaoIndexPublication,assertSaoTilePublication,type ApiEnvelope,type SaoIndexPublication,
  type SaoTilePublication,type SaoTileReference,type SourceSummary } from '@starward/miniapp-contracts';

function freeze<T>(value:T):T {
  if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;
}
function assertSources(sources:readonly SourceSummary[],publication:SaoIndexPublication){
  const source=sources?.[0],p=publication.index;
  const dates=p.acquisition.map(a=>a.retrievedAt);
  const expected=dates.every((v):v is string=>v!==null)?new Date(Math.max(...dates.map(Date.parse))).toISOString():null;
  if(!Array.isArray(sources)||sources.length!==1||!source||source.id!==`sao:${p.catalogHash}`||source.kind!=='OPEN_DATA'||
    source.sourceUrl!==p.sources.landingUrl||source.licenseUrl!==p.sources.rightsUrl||
    source.license!=='U.S. government works (NASA dataset metadata)'||source.retrievedAt!==expected)
    throw new TypeError('sao_publication_invalid:envelope_sources');
}

/** Existing operation/cache owns the index. Optional published-file transport
 * shares Sky's encoded owner; this client keeps no parsed tile cache.
 */
export function createSaoCatalogClient(deps:{
  index(signal?:AbortSignal):Promise<ApiEnvelope<SaoIndexPublication>>;
  tile(publicationHash:string,tileId:string,signal?:AbortSignal):Promise<ApiEnvelope<SaoTilePublication>>;
  invalidateIndex():void;
  invalidateTile(publicationHash:string,tileId:string):void;
  fileTile?(publication:SaoIndexPublication,tile:SaoTileReference,signal?:AbortSignal):Promise<unknown>;
  generation?():{isCurrent():boolean};
}){
  const known=new WeakMap<SaoIndexPublication,{envelope:ApiEnvelope<SaoIndexPublication>;generation:{isCurrent():boolean}}>();
  return {
    async getIndex(signal?:AbortSignal){
      const generation=deps.generation?.()??{isCurrent:()=>true};
      const result=await deps.index(signal);signal?.throwIfAborted();
      if(!generation.isCurrent())throw new TypeError('sao_publication_invalid:retired_index');
      try{assertSaoIndexPublication(result.data);assertSources(result.sources,result.data);}
      catch(error){deps.invalidateIndex();throw error;}
      // Response-cache may return the same immutable object to two observers.
      // A new delivery must not overwrite the originating generation of a
      // retired observer's capability. Share the full immutable index, but give
      // each admitted delivery its own small publication/envelope wrapper.
      const admitted=freeze({...result,data:{...result.data}});
      known.set(admitted.data,{envelope:admitted,generation});return admitted;
    },
    async getTile(publication:SaoIndexPublication,tileId:string,signal?:AbortSignal){
      const admitted=known.get(publication);
      if(!admitted)throw new TypeError('sao_publication_invalid:unvalidated_index');
      if(!admitted.generation.isCurrent())throw new TypeError('sao_publication_invalid:retired_index');
      const expected=publication.index.tiles.find(t=>t.id===tileId);
      if(!expected)throw new TypeError('sao_publication_invalid:unknown_tile');
      const result:ApiEnvelope<SaoTilePublication>=deps.fileTile?{
        ...admitted.envelope,data:{publicationHash:publication.publicationHash,tile:await deps.fileTile(publication,expected,signal) as SaoTilePublication['tile']},
        etag:`W/"${expected.sha256}"`,requestId:`sao-file:${expected.sha256}`,
      }:await deps.tile(publication.publicationHash,tileId,signal);
      signal?.throwIfAborted();
      if(!admitted.generation.isCurrent())throw new TypeError('sao_publication_invalid:retired_index');
      try{assertSaoTilePublication(result.data,publication,expected);assertSources(result.sources,publication);}
      catch(error){deps.invalidateTile(publication.publicationHash,tileId);throw error;}
      return freeze(result);
    },
  };
}
