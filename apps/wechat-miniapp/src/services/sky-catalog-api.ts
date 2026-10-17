import { CONSTELLATION_CATALOG_VERSION, MINIAPP_API_BASE_PATH, SDSS_OPTICAL_PUBLICATIONS } from "@starward/miniapp-contracts";
import { requestOperation, invalidateApiCache } from "./api-client";
import { createStellarCatalogClient } from "./stellar-catalog-client";
import { createSaoCatalogClient } from "./sao-catalog-client";
import { createConstellationCatalogClient } from "./constellation-catalog-client";
import { skyPublishedResourceUrl } from "./sky-resource-origin";
import { capturePublishedSkyImageGeneration, readPublishedSkyJson } from "./sky-public-image-runtime";

// Only Sky consumes static catalog admission and immutable source links.
// Keep them in its package; transport, authentication and caches stay shared.
export const getStellarCatalog = createStellarCatalogClient({
  request: (reference, signal) => requestOperation(
    `stellar-catalog:${reference.catalogVersion}:${reference.catalogHash}`, "stellarCatalogGet", {
      pathParams: { catalogVersion: reference.catalogVersion, catalogHash: reference.catalogHash },
      ...(signal ? { signal } : {}),
    }),
  invalidate: reference => invalidateApiCache(`stellar-catalog:${reference.catalogVersion}:${reference.catalogHash}:`),
});

export const saoCatalogClient = createSaoCatalogClient({
  index: signal => requestOperation('sao-index:v2', 'saoIndexGet', { ...(signal ? {signal} : {}) }),
  tile: (publicationHash, tileId, signal) => requestOperation(`sao-tile:${publicationHash}:${tileId}`, 'saoTileGet', {
    pathParams: {publicationHash, tileId}, ...(signal ? {signal} : {}),
  }),
  invalidateIndex: () => invalidateApiCache('sao-index:v2:'),
  invalidateTile: (publicationHash, tileId) => invalidateApiCache(`sao-tile:${publicationHash}:${tileId}:`),
  generation: capturePublishedSkyImageGeneration,
  fileTile: (publication, tile, signal) => readPublishedSkyJson({format:'json',sha256:tile.sha256,bytes:tile.bytes},
    skyPublishedResourceUrl(`/v2/sky/supplements/sao/v2/${publication.publicationHash}/assets/${tile.id}`),
    publication.publicationHash, signal),
});

export const getConstellationCatalog = createConstellationCatalogClient({
  request: signal => requestOperation(`constellation-catalog:${CONSTELLATION_CATALOG_VERSION}`, "constellationCatalogGet", {
    ...(signal ? {signal} : {}),
  }),
  invalidate: () => invalidateApiCache("constellation-catalog:"),
});

export function constellationAssetUrl(catalogHash: string, file: string) {
  const sourceFile = ["constellationship.fab", "constellationsart.fab", "constellation_names.eng.fab", "info.ini"].includes(file);
  if (!/^[a-f0-9]{64}$/u.test(catalogHash) || !(sourceFile || file === "geometry-v2.json" || /^[a-z_-]+\.png$/u.test(file))) throw new Error("constellation_asset_reference_invalid");
  return skyPublishedResourceUrl(MINIAPP_API_BASE_PATH+"/sky/constellations/"+catalogHash+"/assets/"+file);
}

export function deepSkyManifestUrl(sourceId: string, expectedOpticalHash?: string): string | undefined {
  const optical = Object.values(SDSS_OPTICAL_PUBLICATIONS).find(publication =>
    sourceId === `optical-imagery:${publication.publicationId}:${publication.publicationHash}`);
  if (optical) return expectedOpticalHash === undefined || expectedOpticalHash === optical.publicationHash
    ? skyPublishedResourceUrl(MINIAPP_API_BASE_PATH + "/sky/sdss-optical/" + optical.publicationHash + "/manifest") : undefined;
  const boundOptical = /^(optical-imagery|prepared-optical-imagery):[^:/\\]+:([a-f0-9]{64})$/u.exec(sourceId);
  if (expectedOpticalHash && boundOptical?.[2] === expectedOpticalHash)
    return skyPublishedResourceUrl(MINIAPP_API_BASE_PATH +
      (boundOptical[1] === "prepared-optical-imagery" ? "/sky/prepared-optical/" : "/sky/sdss-optical/") + expectedOpticalHash + "/manifest");
  const match = /^imagery:[^:]+:([a-f0-9]{64})$/u.exec(sourceId);
  return match ? skyPublishedResourceUrl(MINIAPP_API_BASE_PATH + "/sky/deep-sky/" + match[1] + "/manifest") : undefined;
}

