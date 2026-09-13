import { readFile } from "node:fs/promises";
import type { TerrainOverlayData, TerrainOverlayRequest } from "@starward/miniapp-contracts";

interface TerrainPublication {
  schemaVersion: "starward-terrain-publication-v1";
  publicationId: string;
  dataset: string;
  sourceProvider: string;
  sourceResolution: string;
  derivedResolutionM: number;
  derivedAt: string;
  coordinateSystem: "GCJ02";
  transformVersion: string;
  centerGcj02: { latitude: number; longitude: number };
  maximumRadiusKm: number;
  boundsGcj02: { west: number; south: number; east: number; north: number };
  elevationM: { minimum: number; maximum: number };
  validPixelPercent: number;
  image: { file: string; sha256: string; byteSize: number; width: number; height: number };
  limitations: string[];
}

const manifestUrl = new URL("../assets/terrain/publication.json", import.meta.url);
let publicationPromise: Promise<TerrainPublication> | null = null;

export async function terrainPublication() {
  publicationPromise ??= readFile(manifestUrl, "utf8").then((text) => {
    const value = JSON.parse(text) as TerrainPublication;
    if (value.schemaVersion !== "starward-terrain-publication-v1" || value.coordinateSystem !== "GCJ02")
      throw new Error("terrain_publication_invalid");
    return value;
  });
  return publicationPromise;
}

export function terrainImageUrl(file: string) {
  if (!/^[a-z0-9][a-z0-9.-]*\.png$/u.test(file)) throw new Error("terrain_asset_invalid");
  return new URL(`../assets/terrain/${file}`, import.meta.url);
}

export function terrainRequestIsCovered(publication: TerrainPublication, input: TerrainOverlayRequest) {
  const { latitude, longitude } = input.center;
  const latKm = (latitude - publication.centerGcj02.latitude) * 111.32;
  const lonKm = (longitude - publication.centerGcj02.longitude) * 111.32 * Math.cos(latitude * Math.PI / 180);
  return Math.hypot(latKm, lonKm) + input.radiusKm <= publication.maximumRadiusKm + 0.05;
}

export function terrainUnavailable(input: TerrainOverlayRequest, reason: string): TerrainOverlayData {
  return {
    state: "UNAVAILABLE",
    purpose: input.purpose,
    requestedRadiusKm: input.radiusKm,
    effectiveRadiusKm: null,
    centerGcj02: input.center,
    publicationId: null,
    datasetVersion: null,
    sourceProvider: null,
    sourceResolution: null,
    derivedResolutionM: null,
    derivedAt: null,
    coordinateTransformVersion: null,
    imageUrl: null,
    imageBoundsGcj02: null,
    elevationM: null,
    coverageLabel: reason,
    limitations: [reason],
    lightPollution: { state: "UNAVAILABLE", datasetVersion: "UNAVAILABLE", cells: [], legend: [], source: null, coverageLabel: "当前范围没有已发布的年度卫星夜光栅格。" },
  };
}
