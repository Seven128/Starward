import { assertStellarCatalogPublication, assertStellarGeometryFrame, type SkyGeometryReport, type SkyScene,
  type SkySceneCatalog, type SkySceneCatalogReference, type SkyScenePoint, type StellarCatalogPublication } from "@starward/miniapp-contracts";
import { projectStellarMotion } from "@starward/astronomy-core/stellar-vectors";
import { exactSkyTimeFrame } from "./sky-time-frame";
import { exactSkyObservationFrame } from "./sky-observation-frame";
import { skySolarLightAt } from "./sky-solar-light";

export interface ResolvedStellarScene extends Omit<SkyScene, "catalog"> {
  catalog: (SkySceneCatalog & SkySceneCatalogReference) | null;
  publication: StellarCatalogPublication | null;
}
export interface ResolvedSkyReport extends Omit<SkyGeometryReport, "skyScene"> { skyScene: ResolvedStellarScene; }
export interface ResolvedStellarFrame { at: string; state: "AVAILABLE"; points: readonly SkyScenePoint[]; }
const catalogs = new WeakMap<StellarCatalogPublication, SkySceneCatalog & SkySceneCatalogReference>();
// One current time per report: gestures reuse it; scrubbing never retains an entire day of star arrays.
const currentFrames = new WeakMap<ResolvedStellarScene, ResolvedStellarFrame>();

/** Deep-sky availability/time belongs to its independent layer, never the
 * separately downloaded bright-star publication. Retain a valid static
 * catalog when one instant is missing, without inventing that instant's points. */
export function resolveSkyDeepSkyScene(scene: Pick<SkyScene, "deepSky"> | undefined, at: string | undefined) {
  const deep = scene?.deepSky;
  if (deep?.state !== "AVAILABLE" || !deep.catalog) return undefined;
  const frame = exactSkyTimeFrame(deep.frames, at);
  return { catalog: deep.catalog,
    frame: frame?.state === "AVAILABLE" && frame.points ? frame : undefined };
}

/** Drawing and gestures retain each independent exact report layer. A legacy
 * suggestion list or failed external catalog cannot revoke native astronomy. */
export function skySceneHasContent(report: ResolvedSkyReport | undefined, at: string | undefined): boolean {
  if (!report?.skyScene || !at) return false;
  const scene = report.skyScene;
  const stars = resolveSkySceneFrame(scene, at);
  const deep = resolveSkyDeepSkyScene(scene, at);
  const targetFrame = exactSkyTimeFrame(report.targetFrames, at);
  return Boolean(stars || deep?.frame?.points || targetFrame?.targets.length ||
    skySolarLightAt(report.hourly, at) || exactSkyObservationFrame(report, at));
}

/** Local render model only. Never put expanded stars into the shared report query/cache. */
export function attachSkyCatalog(report: SkyGeometryReport, publication: StellarCatalogPublication | undefined): ResolvedSkyReport {
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
