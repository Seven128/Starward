import type { TerrainHorizonData, TerrainHorizonRequest } from "@starward/miniapp-contracts";

/** The chart only accepts the requested station and a complete angular index.
 * A successful HTTP response cannot turn missing directions into zero angles. */
export function checkedTerrainHorizon(data: TerrainHorizonData, input: TerrainHorizonRequest): TerrainHorizonData {
  const center = data?.centerGcj02;
  if (!center || center.system !== "GCJ02" || !Number.isFinite(center.latitude) || !Number.isFinite(center.longitude)
    || center.latitude.toFixed(7) !== input.center.latitude.toFixed(7)
    || center.longitude.toFixed(7) !== input.center.longitude.toFixed(7)
    || !["AVAILABLE", "PARTIAL", "UNAVAILABLE"].includes(data.state)) throw new Error("terrain_horizon_station_mismatch");
  const model = data.model;
  if (!model) {
    if (data.state !== "UNAVAILABLE") throw new Error("terrain_horizon_model_missing");
    return data;
  }
  if (model.bearingReference !== "TRUE_NORTH_CLOCKWISE" || model.sectorWidthDegrees !== 1
    || !Number.isFinite(model.radiusM) || model.radiusM <= 0 || !Number.isFinite(model.observerHeightM)
    || model.observerHeightM < 0 || !Array.isArray(model.sectors) || model.sectors.length !== 360)
    throw new Error("terrain_horizon_model_invalid");
  let known = 0;
  for (let index = 0; index < model.sectors.length; index++) {
    const sector = model.sectors[index];
    if (!sector || sector.bearingDegrees !== index || !Number.isInteger(sector.sampleCount) || sector.sampleCount < 0
      || (sector.elevationDegrees !== null && (!Number.isFinite(sector.elevationDegrees)
        || Math.abs(sector.elevationDegrees) > 90 || sector.sampleCount === 0))) throw new Error("terrain_horizon_sector_invalid");
    if (sector.elevationDegrees !== null) known++;
  }
  if (known !== model.knownSectors || (data.state === "AVAILABLE" ? known !== 360
    : data.state === "PARTIAL" ? known === 0 || known === 360 : known !== 0))
    throw new Error("terrain_horizon_coverage_invalid");
  return data;
}
