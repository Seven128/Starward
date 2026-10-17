import { assertStellarGeometryFrame, assertStellarCatalogPublication, assertStellarCatalogReference,
  type StellarCatalogReference, type SkyGeometryReport, type SkyScene,
  type SkySceneCatalog, type SkySceneCatalogReference, type SkyScenePoint, type StellarCatalogPublication } from "@starward/miniapp-contracts";
import { projectStellarMotion } from "@starward/astronomy-core/stellar-vectors";
import { exactSkyTimeFrame } from "./sky-time-frame";
import { exactSkyObservationFrame } from "./sky-observation-frame";
import { skySolarLightAt } from "./sky-solar-light";
import { isAdmittedStellarCatalogPublication } from "../../services/stellar-catalog-client";

import { skyStarDisplayColor, skyStarDisplayTransmission } from "./sky-star-appearance";
import { prepareSkyDirection, type PreparedSkyDirection } from "./sky-view-projection";

// Palette projection belongs to this immutable local render model, not the
// wire catalogue or report cache. Legacy controlled scenes may omit it.
type RenderCatalog = SkySceneCatalog & SkySceneCatalogReference & { readonly displayColors?: readonly (string | null)[]; readonly magnitudeOrdered?: boolean };

export interface ResolvedStellarScene extends Omit<SkyScene, "catalog"> {
  catalog: RenderCatalog | null;
  publication: StellarCatalogPublication | null;
}
export interface ResolvedSkyReport extends Omit<SkyGeometryReport, "skyScene"> { skyScene: ResolvedStellarScene; }
export interface ResolvedStellarFrame {
  at: string; state: "AVAILABLE"; points: readonly SkyScenePoint[];
  /** Display-only altitude factor, in the same point order and exact-time lifetime. */
  displayTransmission?: (pointIndex: number) => number;
  /** Camera-independent projection input, prepared lazily at this exact time. */
  displayDirection?: (pointIndex: number) => PreparedSkyDirection | null;
}
const catalogs = new WeakMap<StellarCatalogPublication, RenderCatalog>();
// One current time per report: gestures reuse it; scrubbing never retains an entire day of star arrays.
const currentFrames = new WeakMap<ResolvedStellarScene, ResolvedStellarFrame>();

/** Bind this scene's reference on every use; only the immutable original
 * transport object may reuse full publication admission. */
export function assertRetainedStellarCatalogPublication(value: StellarCatalogPublication,
  expected: StellarCatalogReference): void {
  assertStellarCatalogReference(expected);
  if (isAdmittedStellarCatalogPublication(value) && value.catalogVersion === expected.catalogVersion &&
    value.catalogHash === expected.catalogHash) return;
  assertStellarCatalogPublication(value, expected);
}

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
      assertRetainedStellarCatalogPublication(publication, scene.catalog);
      let catalog = catalogs.get(publication);
      if (!catalog) {
        catalog = Object.freeze({ catalogVersion: publication.catalogVersion, catalogHash: publication.catalogHash,
          magnitudeLimit: publication.magnitudeLimit, rowCount: publication.rows.length, sources: publication.sources,
          // Preserve wire order. Only this immutable model can certify a
          // brightness prefix; legacy/non-monotonic inputs keep a full scan.
          magnitudeOrdered: publication.rows.every((row,index)=>index===0 || row[2]>=publication.rows[index-1]![2]),
          displayColors: Object.freeze(publication.rows.map(row => skyStarDisplayColor(row[3]))),
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
      points.push(Object.freeze([index, position.azimuthDeg, position.altitudeDeg] as const));
    });
    // Resolve only stars the current display actually considers. Changing time
    // replaces this one-frame memo; daylight/playback does not precompute a
    // whole catalogue of factors that the painter would otherwise skip.
    const transmissions: Array<number | undefined> = new Array(points.length);
    const displayTransmission = (index: number) =>
      transmissions[index] ??= skyStarDisplayTransmission(points[index]![2]);
    const directions: Array<PreparedSkyDirection | null | undefined> = new Array(points.length);
    const displayDirection = (index: number) => {
      if (directions[index] === undefined)
        directions[index] = prepareSkyDirection(points[index]![1], points[index]![2]);
      return directions[index]!;
    };
    const resolved: ResolvedStellarFrame = Object.freeze({ at: at!, state: "AVAILABLE", points: Object.freeze(points),
      displayTransmission, displayDirection });
    currentFrames.set(scene, resolved);
    return resolved;
  } catch { return undefined; }
}
