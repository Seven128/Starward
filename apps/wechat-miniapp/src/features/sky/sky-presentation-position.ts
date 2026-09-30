import { assertStellarGeometryFrame, assertStellarGeometryMotion, isBrightStarReference, isSaoStarReference,
  STELLAR_GEOMETRY_REFERENCE_AT, SKY_LUMINARY_CATALOG_HASH, SKY_LUMINARY_CATALOG_VERSION,
  SKY_PLANET_CATALOG_HASH, SKY_PLANET_CATALOG_VERSION, SKY_PLANET_ORDER, validSkyPlanetGeometry,
  skyLuminaryBody, skyLuminaryPosition, skyPlanetBody,
  type ApiEnvelope, type CelestialObjectPositionData, type SkyReport } from "@starward/miniapp-contracts";
import { projectStellarMotion, type StellarMotion } from "@starward/astronomy-core/stellar-vectors";
import type { CelestialPositionBinding } from "../../services/celestial-position-response";
import type { ResolvedSkyReport } from "./sky-stellar-scene";
import { exactSkyTimeFrame } from "./sky-time-frame";

export interface SkyPositionPresentation {
  source: ApiEnvelope<SkyReport>;
  rendered: ResolvedSkyReport;
  anchorAt: string;
}

/** Same authorized publication, observer and rendered instant as Canvas. The
 * only lazy input is an identity-bound star motion, not a new ephemeris or a
 * remotely fetched position for each elapsed frame. Negative altitude remains. */
export function skyPresentationPosition(binding: CelestialPositionBinding,
  catalog: { catalogVersion: string; catalogHash: string } | null,
  presentation: SkyPositionPresentation | undefined,
  anchor?: ApiEnvelope<CelestialObjectPositionData>): CelestialObjectPositionData | null {
  if (!presentation || !catalog || ["EXPIRED", "UNAVAILABLE"].includes(presentation.source.dataState)) return null;
  const report = presentation.rendered, context = report.context;
  if (!["spotId", "contextId", "contextRevision", "contextFingerprint", "dataRevision", "algorithmVersion"].every(
    key => binding[key as keyof CelestialPositionBinding] === context[key as keyof typeof context])) return null;
  const row = exactSkyTimeFrame(report.hourly, binding.at);
  if (!row) return null;
  try {
    let position: CelestialObjectPositionData["position"] = null;
    const luminary = skyLuminaryBody(binding.reference), planet = skyPlanetBody(binding.reference);
    if (luminary) {
      const direction = skyLuminaryPosition(row, luminary);
      if (direction) position = { ...direction, catalogVersion: SKY_LUMINARY_CATALOG_VERSION, catalogHash: SKY_LUMINARY_CATALOG_HASH };
    } else if (planet) {
      if (row.planets?.length === SKY_PLANET_ORDER.length && row.planets.every((value, index) => validSkyPlanetGeometry(value, index))) {
        const direction = row.planets[SKY_PLANET_ORDER.indexOf(planet)]!;
        position = { azimuthDeg: direction.azimuthDeg, altitudeDeg: direction.altitudeDeg,
          catalogVersion: SKY_PLANET_CATALOG_VERSION, catalogHash: SKY_PLANET_CATALOG_HASH };
      }
    } else if (isBrightStarReference(binding.reference) || isSaoStarReference(binding.reference)) {
      const scene = report.skyScene, frame = exactSkyTimeFrame(scene.frames, binding.at);
      if (scene.state !== "AVAILABLE" || !scene.catalog || !scene.publication || !scene.observer || !frame?.geometry || frame.state !== "AVAILABLE") return null;
      assertStellarGeometryFrame(frame.geometry, { catalog: scene.catalog, observer: scene.observer, at: binding.at });
      let motion: StellarMotion | null = null;
      if (isBrightStarReference(binding.reference) && catalog.catalogHash === scene.catalog.catalogHash &&
        catalog.catalogVersion === scene.catalog.catalogVersion) {
        const star = scene.publication.rows.find(row => row[0] === binding.reference);
        if (star) motion = [star[4], star[5], star[6], star[7], star[8], star[9]];
      } else if (isSaoStarReference(binding.reference) && anchor && ["FRESH", "STALE_USABLE"].includes(anchor.dataState)) {
        const data = anchor.data;
        if (data.reference === binding.reference && data.at === presentation.anchorAt &&
          ["spotId", "contextId", "contextRevision", "contextFingerprint", "dataRevision", "algorithmVersion"].every(
            key => data[key as keyof CelestialPositionBinding] === binding[key as keyof CelestialPositionBinding]) &&
          data.position?.catalogVersion === catalog.catalogVersion && data.position.catalogHash === catalog.catalogHash &&
          data.stellarMotion?.referenceAt === STELLAR_GEOMETRY_REFERENCE_AT) {
          assertStellarGeometryMotion(data.stellarMotion.factors);
          motion = data.stellarMotion.factors;
        }
      }
      if (motion) position = { ...projectStellarMotion(motion, frame.geometry.julianYears, frame.geometry.equatorialToEnu), ...catalog };
    } else {
      const deep = report.skyScene.deepSky, frame = exactSkyTimeFrame(deep?.frames, binding.at);
      if (deep?.state !== "AVAILABLE" || !deep.catalog || frame?.state !== "AVAILABLE" || !frame.points ||
        deep.catalog.catalogVersion !== catalog.catalogVersion || deep.catalog.catalogHash !== catalog.catalogHash) return null;
      const index = deep.catalog.entries.findIndex(entry => entry.objectRef === binding.reference);
      const point = frame.points.find(point => point[0] === index);
      if (point) position = { azimuthDeg: point[1], altitudeDeg: point[2], ...catalog };
    }
    if (!position || position.catalogVersion !== catalog.catalogVersion || position.catalogHash !== catalog.catalogHash ||
      !Number.isFinite(position.azimuthDeg) || position.azimuthDeg < 0 || position.azimuthDeg >= 360 ||
      !Number.isFinite(position.altitudeDeg) || Math.abs(position.altitudeDeg) > 90) return null;
    return { ...binding, position, unavailableReason: null,
      ...(presentation.source.data.timeModel && !exactSkyTimeFrame(presentation.source.data.hourly, binding.at)
        ? { timeModelAlgorithmVersion: presentation.source.data.timeModel.algorithmVersion } : {}) };
  } catch { return null; }
}
