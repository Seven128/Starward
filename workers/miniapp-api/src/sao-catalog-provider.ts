import {readFileSync} from 'node:fs';
import {parseSaoCatalog} from '@starward/astronomy-core/sao-catalog';
import {loadBsc5pStarCatalog} from '@starward/astronomy-core/bsc5p-catalog';
import {assertSaoIndexPublication,type SourceSummary} from '@starward/miniapp-contracts';
import {saoCatalogSource} from './sao-catalog-source.ts';

const loaded=new Map<string,{catalog:ReturnType<typeof parseSaoCatalog>;source:SourceSummary}>();
/** Existing celestial-detail service is synchronous. Load once, lazily, from
 * fixed local files; the full source pack is never exposed as an HTTP asset.
 */
export function loadSaoCatalog(baseVersion:'bsc5p-bright-stars.v2'|'bsc5p-bright-stars.v3'='bsc5p-bright-stars.v2'){
  const cached=loaded.get(baseVersion);if(cached)return cached;
  const location=new URL(baseVersion==='bsc5p-bright-stars.v3'?'../assets/sao-v2/':'../assets/sao/',import.meta.url);
  const manifest=JSON.parse(readFileSync(new URL('publication.json',location),'utf8'));
  const index=JSON.parse(readFileSync(new URL('index.json',location),'utf8'));
  const publication={publicationHash:manifest.publicationHash,index};assertSaoIndexPublication(publication);
  const base=loadBsc5pStarCatalog(baseVersion);
  if(index.baseAssetSha256!==base.catalogHash||index.baseCatalogVersion!==base.catalogVersion)throw Error('sao_base_catalog_mismatch');
  const catalog=parseSaoCatalog(readFileSync(new URL('catalog.json',location)),{
    catalogHash:index.catalogHash,baseCatalogVersion:base.catalogVersion,baseAssetSha256:base.catalogHash});
  const current=Object.freeze({catalog,source:Object.freeze(saoCatalogSource(publication.index))});loaded.set(baseVersion,current);return current;
}
