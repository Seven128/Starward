import type { CelestialObjectPositionData, SpotSkyContext } from "@starward/miniapp-contracts";

/** Both camera commands and geometric markers must belong to the exact
 * currently displayed report and publication, including after async changes. */
export function skyObjectPositionIsCurrent(data: CelestialObjectPositionData,
  context: SpotSkyContext | undefined, at: string | undefined,
  catalog: { catalogVersion: string; catalogHash: string } | null) {
  return Boolean(context && catalog && data.position && data.spotId === context.spotId &&
    data.contextId === context.contextId && data.contextRevision === context.contextRevision &&
    data.contextFingerprint === context.contextFingerprint && data.at === at &&
    data.dataRevision === context.dataRevision && data.algorithmVersion === context.algorithmVersion &&
    data.position.catalogHash === catalog.catalogHash && data.position.catalogVersion === catalog.catalogVersion);
}
