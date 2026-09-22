import { assertStellarCatalogPublication, assertStellarGeometryFrame, type SkyReport, type SkyScene,
  type SkySceneCatalog, type SkySceneCatalogReference, type SkyScenePoint, type SkyTargetFrame, type StellarCatalogPublication } from "@starward/miniapp-contracts";
import { projectStellarMotion } from "@starward/astronomy-core/stellar-vectors";
import { exactSkyTimeFrame } from "./sky-time-frame";

export interface ResolvedStellarScene extends Omit<SkyScene, "catalog"> {
  catalog: (SkySceneCatalog & SkySceneCatalogReference) | null;
  publication: StellarCatalogPublication | null;
}
export interface ResolvedSkyReport extends Omit<SkyReport, "skyScene"> { skyScene: ResolvedStellarScene; }
export interface ResolvedStellarFrame { at: string; state: "AVAILABLE"; points: readonly SkyScenePoint[]; }
const catalogs = new WeakMap<StellarCatalogPublication, SkySceneCatalog & SkySceneCatalogReference>();
// One current time per report: gestures reuse it; scrubbing never retains an entire day of star arrays.
const currentFrames = new WeakMap<ResolvedStellarScene, ResolvedStellarFrame>();

/** Input remains usable when one independently loaded layer is missing. */
export function skySceneHasContent(scene: ResolvedStellarScene | undefined, at: string | undefined,
  targetFrame: SkyTargetFrame | undefined): boolean {
  if (!scene || !at || targetFrame?.at !== at) return false;
  const stars = resolveSkySceneFrame(scene, at);
  const deep = exactSkyTimeFrame(scene.deepSky?.frames, at);
  return Boolean(stars || targetFrame.targets.length ||
    (scene.deepSky?.state === "AVAILABLE" && scene.deepSky.catalog && deep?.state === "AVAILABLE" && deep.points));
}

/** Local render model only. Never put expanded stars into the shared report query/cache. */
export function attachSkyCatalog(report: SkyReport, publication: StellarCatalogPublication | undefined): ResolvedSkyReport {
  const scene = report.skyScene;
  if (scene.state === "AVAILABLE" && scene.catalog && publication) {
    try {
      assertStellarCatalogPublication(publication, scene.catalog);
      let catalog = catalogs.get(publication);
      if (!catalog) {
        catalog = Object.freeze({ catalogVersion: publication.catalogVersion, catalogHash: publication.catalogHash,
          magnitudeLimit: publication.magnitudeLimit, rowCount: publication.rows.length, sources: publication.sources,
          entries: Object.freeze(publication.rows.map(([sourceId, displayName, magnitude, colorIndex]) => Object.freeze({
            sourceId, objectRef: sourceId, displayName, magnitude, colorIndex, magnitudeBand: "V" as const, colorIndexBand: "B-V" as const,
          }))) });
        catalogs.set(publication, catalog);
      }
      return { ...report, skyScene: { ...scene, catalog, publication } };
    } catch { /* Independent star failure must preserve weather, solar targets and deep-sky data. */ }
  }
  return { ...report, offlineReady: false, precachedHours: 0,
    skyScene: { ...scene, state: "UNAVAILABLE", catalog: null, publication: null,
      unavailableReason: scene.unavailableReason ?? "STELLAR_CATALOG_UNAVAILABLE" } };
}

/** Resolve only the exact selected instant, from the same publication used for labels and picking. */
export function resolveSkySceneFrame(scene: ResolvedStellarScene | undefined, at: string | undefined): ResolvedStellarFrame | undefined {
  if (!scene || scene.state !== "AVAILABLE" || !scene.catalog || !scene.publication || !scene.observer) return undefined;
  const frame = exactSkyTimeFrame(scene.frames, at);
  if (!frame || frame.state !== "AVAILABLE" || !frame.geometry) return undefined;
  const cached = currentFrames.get(scene);
  if (cached?.at === at) return cached;
  try {
    assertStellarGeometryFrame(frame.geometry, { catalog: scene.publication, at: at!, observer: scene.observer });
    const points: SkyScenePoint[] = [];
    scene.publication.rows.forEach((row, index) => {
      const position = projectStellarMotion([row[4], row[5], row[6], row[7], row[8], row[9]], frame.geometry!.julianYears, frame.geometry!.equatorialToEnu);
      if (position.altitudeDeg > 0) points.push(Object.freeze([index, position.azimuthDeg, position.altitudeDeg] as const));
    });
    const resolved: ResolvedStellarFrame = Object.freeze({ at: at!, state: "AVAILABLE", points: Object.freeze(points) });
    currentFrames.set(scene, resolved);
    return resolved;
  } catch { return undefined; }
}
