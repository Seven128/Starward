import { assertSaoIndexPublication,assertSaoTilePublication,type ApiEnvelope,type SaoIndexPublication,
  type SaoTilePublication,type SourceSummary } from '@starward/miniapp-contracts';

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

/** Existing authenticated-operation/response-cache own I/O and persistence.
 * Keep only validated immutable index identities here, never a second tile cache.
 */
export function createSaoCatalogClient(deps:{
  index(signal?:AbortSignal):Promise<ApiEnvelope<SaoIndexPublication>>;
  tile(publicationHash:string,tileId:string,signal?:AbortSignal):Promise<ApiEnvelope<SaoTilePublication>>;
  invalidateIndex():void;
  invalidateTile(publicationHash:string,tileId:string):void;
}){
  const known=new WeakSet<SaoIndexPublication>();
  return {
    async getIndex(signal?:AbortSignal){
      const result=await deps.index(signal);signal?.throwIfAborted();
      try{assertSaoIndexPublication(result.data);assertSources(result.sources,result.data);}
      catch(error){deps.invalidateIndex();throw error;}
      freeze(result);known.add(result.data);return result;
    },
    async getTile(publication:SaoIndexPublication,tileId:string,signal?:AbortSignal){
      if(!known.has(publication))throw new TypeError('sao_publication_invalid:unvalidated_index');
      const expected=publication.index.tiles.find(t=>t.id===tileId);
      if(!expected)throw new TypeError('sao_publication_invalid:unknown_tile');
      const result=await deps.tile(publication.publicationHash,tileId,signal);signal?.throwIfAborted();
      try{assertSaoTilePublication(result.data,publication,expected);assertSources(result.sources,publication);}
      catch(error){deps.invalidateTile(publication.publicationHash,tileId);throw error;}
      return freeze(result);
    },
  };
}
