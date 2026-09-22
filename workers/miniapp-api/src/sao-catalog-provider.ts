import {readFileSync} from 'node:fs';
import {parseSaoCatalog} from '@starward/astronomy-core/sao-catalog';
import {loadBsc5pBrightStarCatalog} from '@starward/astronomy-core/bsc5p-catalog';
import {assertSaoIndexPublication,type SourceSummary} from '@starward/miniapp-contracts';
import {saoCatalogSource} from './sao-catalog-source.ts';

let current:{catalog:ReturnType<typeof parseSaoCatalog>;source:SourceSummary}|null=null;
/** Existing celestial-detail service is synchronous. Load once, lazily, from
 * fixed local files; the full source pack is never exposed as an HTTP asset.
 */
export function loadSaoCatalog(){
  if(current)return current;
  const location=new URL('../assets/sao/',import.meta.url);
  const manifest=JSON.parse(readFileSync(new URL('publication.json',location),'utf8'));
  const index=JSON.parse(readFileSync(new URL('index.json',location),'utf8'));
  const publication={publicationHash:manifest.publicationHash,index};assertSaoIndexPublication(publication);
  const base=loadBsc5pBrightStarCatalog();
  if(index.baseAssetSha256!==base.catalogHash||index.baseCatalogVersion!==base.catalogVersion)throw Error('sao_base_catalog_mismatch');
  const catalog=parseSaoCatalog(readFileSync(new URL('catalog.json',location)),{
    catalogHash:index.catalogHash,baseCatalogVersion:base.catalogVersion,baseAssetSha256:base.catalogHash});
  current=Object.freeze({catalog,source:Object.freeze(saoCatalogSource(publication.index))});return current;
}
