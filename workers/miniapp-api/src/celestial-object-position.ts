import { createHash } from "node:crypto";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { BSC5P_CATALOG_VERSION, BSC5P_REVISED_CATALOG_VERSION, loadBsc5pStarCatalog } from "@starward/astronomy-core/bsc5p-catalog";
import { createStellarMotion, projectStellarMotion } from "@starward/astronomy-core/stellar-vectors";
import { assertStellarGeometryFrame, isBrightStarReference, isCelestialObjectReference, isSaoStarReference,
  STELLAR_GEOMETRY_FORMAT, STELLAR_GEOMETRY_REFERENCE_AT,
  skyPlanetBody, SKY_PLANET_ORDER, SKY_PLANET_CATALOG_VERSION, SKY_PLANET_CATALOG_HASH, validSkyPlanetGeometry,
  type ApiEnvelope, type CelestialObjectPositionData, type SkyReport, type SourceSummary } from "@starward/miniapp-contracts";
import { loadSaoCatalog } from "./sao-catalog-provider.ts";
import { skyLuminaryBody, skyLuminaryPosition, SKY_LUMINARY_CATALOG_VERSION,
  SKY_LUMINARY_CATALOG_HASH } from "@starward/miniapp-contracts";
import { skyReportTimeGeometry, reprojectSkyTimeDirection } from "@starward/astronomy-core/sky-time-model";

/** Consumes the already-authorized sky report; never resolves its own place,
 * clock, time grid or ephemeris. Off-screen stars use the rendering transform. */
export function celestialObjectPosition(reference: string, at: string, report: ApiEnvelope<SkyReport>): ApiEnvelope<CelestialObjectPositionData> {
  if (!isCelestialObjectReference(reference)) throw new BadRequestException("celestial_object_reference_invalid");
  const exactRow = report.data.hourly.find(row => row.at === at);
  const fine = exactRow ? null : skyReportTimeGeometry(report.data, at);
  if (!exactRow && !fine) throw new BadRequestException("celestial_object_time_outside_report");
  const { context, skyScene: scene } = report.data;
  const data: CelestialObjectPositionData = {
    reference, spotId: context.spotId, contextId: context.contextId,
    contextRevision: context.contextRevision, contextFingerprint: context.contextFingerprint, at,
    dataRevision: context.dataRevision, algorithmVersion: context.algorithmVersion,
    ...(fine ? { timeModelAlgorithmVersion: fine.modelAlgorithmVersion } : {}),
    position: null, unavailableReason: "OBJECT_GEOMETRY_UNAVAILABLE",
  };
  let sources: readonly SourceSummary[] = [];
  if (report.dataState === "EXPIRED" || report.dataState === "UNAVAILABLE") {
    data.unavailableReason = "SKY_UNAVAILABLE";
  } else {
    try {
      const planetBody = skyPlanetBody(reference);
      const luminary = skyLuminaryBody(reference);
      if (luminary) {
        const rows = report.data.hourly.filter(row => row.at === at);
        const position = fine ? skyLuminaryPosition(fine.hourly, luminary)
          : rows.length === 1 ? skyLuminaryPosition(rows[0], luminary) : null;
        if (!position) throw new Error("luminary_frame_unavailable");
        data.position = { ...position, catalogVersion: SKY_LUMINARY_CATALOG_VERSION,
          catalogHash: SKY_LUMINARY_CATALOG_HASH };
        sources = report.sources;
      } else if (planetBody) {
        const row = fine?.hourly ?? exactRow;
        const planets = row?.planets;
        if (!Array.isArray(planets) || planets.length !== SKY_PLANET_ORDER.length ||
          !planets.every((planet, index) => validSkyPlanetGeometry(planet, index)))
          throw new Error("planet_frame_unavailable");
        const planet = planets[SKY_PLANET_ORDER.indexOf(planetBody)]!;
        data.position = { azimuthDeg: planet.azimuthDeg, altitudeDeg: planet.altitudeDeg,
          catalogVersion: SKY_PLANET_CATALOG_VERSION, catalogHash: SKY_PLANET_CATALOG_HASH };
        sources = report.sources;
      } else if (isBrightStarReference(reference) || isSaoStarReference(reference)) {
        const frame = fine && scene.catalog && scene.observer ? { at, state: "AVAILABLE" as const,
          geometry: { catalogVersion: scene.catalog.catalogVersion, catalogHash: scene.catalog.catalogHash,
            format: STELLAR_GEOMETRY_FORMAT, referenceAt: STELLAR_GEOMETRY_REFERENCE_AT, at, observer: fine.observationFrame.observer,
            julianYears: fine.julianYears, equatorialToEnu: fine.observationFrame.equatorialToEnu } }
          : scene.frames.find(frame => frame.at === at);
        if (scene.state !== "AVAILABLE" || !scene.catalog || !scene.observer || frame?.state !== "AVAILABLE" || !frame.geometry)
          throw new Error("stellar_frame_unavailable");
        assertStellarGeometryFrame(frame.geometry, { catalog: scene.catalog, observer: scene.observer, at });
        if (scene.catalog.catalogVersion !== BSC5P_CATALOG_VERSION &&
          scene.catalog.catalogVersion !== BSC5P_REVISED_CATALOG_VERSION)
          throw new Error("stellar_catalog_version_unsupported");
        const base = loadBsc5pStarCatalog(scene.catalog.catalogVersion);
        if (base.catalogHash !== scene.catalog.catalogHash || base.catalogVersion !== scene.catalog.catalogVersion)
          throw new Error("stellar_catalog_binding_mismatch");
        const source = isSaoStarReference(reference) ? loadSaoCatalog(base.catalogVersion) : null;
        const star = source ? source.catalog.get(reference) : base.rows.find(row => row.sourceId === reference) ?? null;
        if (!star) throw new NotFoundException("celestial_object_not_found");
        const motion = createStellarMotion(star);
        const position = projectStellarMotion(motion, frame.geometry.julianYears, frame.geometry.equatorialToEnu);
        data.position = { ...position, catalogVersion: source?.catalog.catalogVersion ?? base.catalogVersion,
          catalogHash: source?.catalog.catalogHash ?? base.catalogHash };
        data.stellarMotion = { referenceAt: STELLAR_GEOMETRY_REFERENCE_AT, factors: motion };
        sources = source ? [source.source] : scene.catalog.sources;
      } else {
        const deep = scene.deepSky;
        const frame = fine ? deep?.frames.find(frame => frame.at === report.data.timeModel?.startAt)
          : deep?.frames.find(frame => frame.at === at);
        if (deep?.state !== "AVAILABLE" || !deep.catalog || frame?.state !== "AVAILABLE" || !frame.points)
          throw new Error("deep_sky_frame_unavailable");
        const index = deep.catalog.entries.findIndex(entry => entry.objectRef === reference);
        if (index < 0) throw new NotFoundException("celestial_object_not_found");
        const point = frame.points.find(point => point[0] === index);
        if (!point || !Number.isFinite(point[1]) || point[1] < 0 || point[1] >= 360 ||
          !Number.isFinite(point[2]) || Math.abs(point[2]) > 90) throw new Error("deep_sky_point_unavailable");
        const anchor = fine ? report.data.observationFrames?.find(value => value.at === frame.at) : null;
        if (fine && !anchor) throw new Error("deep_sky_anchor_unavailable");
        const direction = fine ? reprojectSkyTimeDirection(point[1], point[2], anchor!.equatorialToEnu,
          fine.observationFrame.equatorialToEnu) : { azimuthDeg: point[1], altitudeDeg: point[2] };
        data.position = { ...direction,
          catalogVersion: deep.catalog.catalogVersion, catalogHash: deep.catalog.catalogHash };
        sources = deep.catalog.sources;
      }
      data.unavailableReason = null;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      // One unavailable geometry owner must not invent a location or destroy
      // the other catalogue, weather, search result or selected-object details.
      data.position = null;
    }
  }
  const dataState = data.position ? report.dataState === "STALE_USABLE" ? "STALE_USABLE" : "FRESH" : "UNAVAILABLE";
  return { apiVersion: "v2", data, dataState, generatedAt: new Date().toISOString(), validAt: at,
    contextRevision: context.contextRevision,
    etag: `W/"${createHash("sha256").update(JSON.stringify({ data, dataState })).digest("hex")}"`,
    sources, warnings: ["几何方位未计大气折射、天气或地形遮挡，不表示肉眼可见。",
      ...(fine ? ["此时刻按报告的有界连续时间模型求值；不是借用相邻报告帧或现场实测。"] : [])],
    requestId: report.requestId };
}
