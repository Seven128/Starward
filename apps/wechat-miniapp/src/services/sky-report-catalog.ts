import { assertSkyObservationFrames, assertStellarScene, STELLAR_SCENE_FORMAT, type ApiEnvelope, type SkyReport } from "@starward/miniapp-contracts";
import { projectSkyTargetCoordinates } from "./sky-report-targets";
import { projectSkySolarGeometry } from "./sky-report-solar";
import { projectSkyMoonGeometry } from "./sky-report-moon";
import { projectSkyPlanetGeometry } from "./sky-report-planets";
import { projectSkyTimeModel } from "./sky-report-time-model";

/** Applies after network/304/offline recovery, without mutating the cached representation. */
export function projectAdoptedSkyCatalog(envelope: ApiEnvelope<SkyReport>): ApiEnvelope<SkyReport> {
  envelope = projectSkyTargetCoordinates(envelope);
  envelope = projectSkySolarGeometry(envelope);
  envelope = projectSkyMoonGeometry(envelope);
  envelope = projectSkyPlanetGeometry(envelope);
  if (envelope.data.observationFrames !== undefined) {
    try { assertSkyObservationFrames(envelope.data.observationFrames,envelope.data.hourly.map(row=>row.at)); }
    catch {
      const { observationFrames: _invalid, ...data } = envelope.data;
      envelope = { ...envelope,
        dataState: envelope.dataState === "FRESH" ? "PARTIAL" : envelope.dataState,
        warnings: [...envelope.warnings,"巡天影像观测几何暂不可用，请联网后刷新。"],data };
    }
  }
  envelope = projectSkyTimeModel(envelope);
  const scene = envelope.data.skyScene;
  try { assertStellarScene(scene, envelope.data.hourly.map(row => row.at)); return envelope; }
  catch { /* A retired or malformed star representation does not retire independent report data. */ }
  const oldSources = new Set(Array.isArray(scene?.catalog?.sources) ? scene.catalog.sources.flatMap(source => source && typeof source.id === "string" ? [source.id] : []) : []);
  const retainedSources = (sources: SkyReport["sources"]) => sources.filter(source => !oldSources.has(source.id));
  return {
    ...envelope, dataState: envelope.dataState === "FRESH" ? "PARTIAL" : envelope.dataState,
    warnings: [...envelope.warnings, "亮星资料暂不可用，请联网后刷新。"], sources: retainedSources(envelope.sources),
    data: { ...envelope.data, offlineReady: false, precachedHours: 0, sources: retainedSources(envelope.data.sources),
      skyScene: { ...scene, format: STELLAR_SCENE_FORMAT, state: "UNAVAILABLE", observer: null, catalog: null,
        unavailableReason: "CATALOG_VERSION_RETIRED",
        frames: envelope.data.hourly.map(row => ({ at: row.at, state: "UNAVAILABLE", geometry: null })) } },
  };
}
