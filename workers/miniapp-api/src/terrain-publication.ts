import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import type { SourceSummary, TerrainOverlayData, TerrainOverlayRequest } from "@starward/miniapp-contracts";

export const COPERNICUS_DEM_LICENSE_URL = "https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM";
export const COPERNICUS_DEM_DOI = "10.5270/ESA-c5d3d65";
export const COPERNICUS_DEM_SOURCE_NOTICE = "© DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved";
export const COPERNICUS_DEM_MODIFIED_PRODUCT_NOTICE = "produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved";

export interface TerrainPublication {
  schemaVersion: "starward-terrain-publication-v1";
  publicationId: string;
  dataset: string;
  sourceProvider: string;
  license: string;
  licenseUrl: string;
  doi: string;
  attributionNotice: string;
  modifiedProductNotice: string;
  derivation: string;
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
  sources: Array<{ tileId: string; url: string; sha256: string; byteSize: number; etag: string | null }>;
  unavailableSourceTiles: string[];
  limitations: string[];
}

const manifestUrl = new URL("../assets/terrain/publication.json", import.meta.url);
let publicationPromise: Promise<TerrainPublication> | null = null;

const sha256Pattern = /^[a-f0-9]{64}$/u;
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const nonEmpty = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

function validatePublication(value: TerrainPublication) {
  const bounds = value.boundsGcj02;
  const center = value.centerGcj02;
  const image = value.image;
  if (
    value.schemaVersion !== "starward-terrain-publication-v1"
    || value.coordinateSystem !== "GCJ02"
    || !nonEmpty(value.publicationId)
    || !nonEmpty(value.dataset)
    || !nonEmpty(value.sourceProvider)
    || !nonEmpty(value.license)
    || value.licenseUrl !== COPERNICUS_DEM_LICENSE_URL
    || value.doi !== COPERNICUS_DEM_DOI
    || value.attributionNotice !== COPERNICUS_DEM_SOURCE_NOTICE
    || value.modifiedProductNotice !== COPERNICUS_DEM_MODIFIED_PRODUCT_NOTICE
    || !nonEmpty(value.derivation)
    || !nonEmpty(value.sourceResolution)
    || !finite(value.derivedResolutionM) || value.derivedResolutionM <= 0
    || !nonEmpty(value.derivedAt) || Number.isNaN(Date.parse(value.derivedAt))
    || !nonEmpty(value.transformVersion)
    || !finite(center?.latitude) || !finite(center?.longitude)
    || !finite(value.maximumRadiusKm) || value.maximumRadiusKm <= 0
    || !finite(bounds?.west) || !finite(bounds?.south) || !finite(bounds?.east) || !finite(bounds?.north)
    || bounds.west >= bounds.east || bounds.south >= bounds.north
    || center.longitude < bounds.west || center.longitude > bounds.east
    || center.latitude < bounds.south || center.latitude > bounds.north
    || !finite(value.elevationM?.minimum) || !finite(value.elevationM?.maximum)
    || value.elevationM.minimum > value.elevationM.maximum
    || !finite(value.validPixelPercent) || value.validPixelPercent <= 0 || value.validPixelPercent > 100
    || !image || !/^[a-z0-9][a-z0-9.-]*\.png$/u.test(image.file)
    || !sha256Pattern.test(image.sha256)
    || !Number.isSafeInteger(image.byteSize) || image.byteSize <= 0
    || !Number.isSafeInteger(image.width) || image.width <= 0
    || !Number.isSafeInteger(image.height) || image.height <= 0
    || !Array.isArray(value.sources) || value.sources.length === 0
    || value.sources.some(source => !nonEmpty(source.tileId) || !source.url.startsWith("https://") || !sha256Pattern.test(source.sha256) || !Number.isSafeInteger(source.byteSize) || source.byteSize <= 0)
    || !Array.isArray(value.unavailableSourceTiles)
    || !Array.isArray(value.limitations) || value.limitations.length === 0 || value.limitations.some(limit => !nonEmpty(limit))
  ) throw new Error("terrain_publication_invalid");
  return value;
}

export async function terrainPublication() {
  publicationPromise ??= readFile(manifestUrl, "utf8").then((text) => {
    return validatePublication(JSON.parse(text) as TerrainPublication);
  }).catch(error => {
    publicationPromise = null;
    throw error;
  });
  return publicationPromise;
}

export function terrainPublicationSource(publication: TerrainPublication): SourceSummary {
  return {
    id: `source:${publication.publicationId}`,
    kind: "OPEN_DATA",
    provider: publication.sourceProvider,
    title: publication.dataset,
    sourceUrl: `https://doi.org/${publication.doi}`,
    license: publication.license,
    licenseUrl: publication.licenseUrl,
    publishedAt: null,
    retrievedAt: publication.derivedAt,
    validFrom: null,
    validTo: null,
    state: publication.validPixelPercent < 99.9 ? "PARTIAL" : "FRESH",
    confidence: null,
    precision: `${publication.sourceResolution}; derived grid approximately ${publication.derivedResolutionM} m`,
    limitations: [
      publication.attributionNotice,
      publication.modifiedProductNotice,
      publication.derivation,
      ...publication.limitations,
    ],
  };
}

export function terrainImageUrl(file: string) {
  if (!/^[a-z0-9][a-z0-9.-]*\.png$/u.test(file)) throw new Error("terrain_asset_invalid");
  return new URL(`../assets/terrain/${file}`, import.meta.url);
}

export function terrainRequestIsCovered(publication: TerrainPublication, input: TerrainOverlayRequest) {
  const { latitude, longitude } = input.center;
  const latitudeDelta = input.radiusKm / 111.32;
  const longitudeDelta = input.radiusKm / (111.32 * Math.max(0.01, Math.cos(latitude * Math.PI / 180)));
  const insidePublishedBounds = longitude - longitudeDelta >= publication.boundsGcj02.west
    && longitude + longitudeDelta <= publication.boundsGcj02.east
    && latitude - latitudeDelta >= publication.boundsGcj02.south
    && latitude + latitudeDelta <= publication.boundsGcj02.north;
  const latKm = (latitude - publication.centerGcj02.latitude) * 111.32;
  const lonKm = (longitude - publication.centerGcj02.longitude) * 111.32 * Math.cos(latitude * Math.PI / 180);
  return insidePublishedBounds && Math.hypot(latKm, lonKm) + input.radiusKm <= publication.maximumRadiusKm + 0.05;
}

export function validateTerrainAsset(bytes: Buffer, publication: TerrainPublication) {
  const { image } = publication;
  if (bytes.byteLength !== image.byteSize) throw new Error("terrain_asset_size_mismatch");
  if (createHash("sha256").update(bytes).digest("hex") !== image.sha256) throw new Error("terrain_asset_hash_mismatch");
  if (bytes.byteLength < 33 || !bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    throw new Error("terrain_asset_png_invalid");
  if (bytes.toString("ascii", 12, 16) !== "IHDR") throw new Error("terrain_asset_png_invalid");
  if (bytes.readUInt32BE(16) !== image.width || bytes.readUInt32BE(20) !== image.height)
    throw new Error("terrain_asset_dimensions_mismatch");
  return bytes;
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
    source: null,
    lightPollution: { state: "UNAVAILABLE", datasetVersion: "UNAVAILABLE", cells: [], legend: [], source: null, coverageLabel: "当前范围没有已发布的年度卫星夜光栅格。" },
  };
}
