import { assertConstellationCatalog, type ApiEnvelope, type ConstellationCatalogPublication } from "@starward/miniapp-contracts";

function freeze<T>(value: T): T {
  if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}

/** Transport/cache remain shared. The static publication has no device pose,
 * observation context or expanded per-instant point arrays. */
export function createConstellationCatalogClient(deps: {
  request(signal?: AbortSignal): Promise<ApiEnvelope<ConstellationCatalogPublication>>;
  invalidate(): void;
}) {
  return async (signal?: AbortSignal) => {
    const envelope = await deps.request(signal);
    try {
      assertConstellationCatalog(envelope.data);
      const p=envelope.data.provenance;
      const expected=[
        [p.definitions.provider,p.definitions.url,p.definitions.license,p.definitions.licenseUrl],
        [p.art.author,p.art.url,p.art.license,p.art.licenseUrl],
        [p.astrometry.provider,p.astrometry.url,p.astrometry.license,p.astrometry.licenseUrl],
      ];
      if (!Array.isArray(envelope.sources) || envelope.sources.length !== expected.length ||
        expected.some(([provider,url,license,licenseUrl])=>!envelope.sources.some(s=>s.provider === provider &&
          s.sourceUrl === url && s.license === license && s.licenseUrl === licenseUrl)))
        throw new TypeError("constellation_catalog_invalid:envelope_sources");
    }
    catch (error) { deps.invalidate(); throw error; }
    return freeze(envelope);
  };
}
