import { isBrightStarReference, type ApiEnvelope, type SkyReport } from "@starward/miniapp-contracts";

/** Applies after both network/304 and persisted stale recovery, without mutating the cached representation. */
export function projectAdoptedSkyCatalog(envelope: ApiEnvelope<SkyReport>): ApiEnvelope<SkyReport> {
  const scene = envelope.data.skyScene;
  if (!scene || scene.state !== "AVAILABLE") return envelope;
  const catalog = scene.catalog;
  const current = catalog && Array.isArray(catalog.entries) && catalog.entries.length > 0 &&
    catalog.entries.every(entry => isBrightStarReference(entry.objectRef) && entry.sourceId === entry.objectRef);
  if (current) return envelope;
  const oldSources = new Set(Array.isArray(catalog?.sources) ? catalog.sources.map(source => source.id) : []);
  const retainedSources = (sources: SkyReport["sources"]) => sources.filter(source => !oldSources.has(source.id));
  return {
    ...envelope,
    dataState: envelope.dataState === "FRESH" ? "PARTIAL" : envelope.dataState,
    warnings: [...envelope.warnings, "亮星资料暂不可用，请联网后刷新。"],
    sources: retainedSources(envelope.sources),
    data: { ...envelope.data, sources: retainedSources(envelope.data.sources),
      skyScene: { ...scene, state: "UNAVAILABLE", catalog: null, unavailableReason: "CATALOG_VERSION_RETIRED",
        frames: scene.frames.map(frame => ({ at: frame.at, state: "UNAVAILABLE", points: null })) } },
  };
}
