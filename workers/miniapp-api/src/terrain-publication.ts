import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import type { SourceSummary, TerrainElevationColorEncoding, TerrainOverlayData, TerrainOverlayRequest } from "@starward/miniapp-contracts";
import { displayRasterBounds, displayRasterWindowBounds, displayRasterRegionKey, displayRasterWindowKey,
  type DisplayRasterRegion, type DisplayRasterWindow } from "@starward/coordinate-system";

export const COPERNICUS_DEM_LICENSE_URL = "https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM";
export const COPERNICUS_DEM_DOI = "10.5270/ESA-c5d3d65";
export const COPERNICUS_DEM_SOURCE_NOTICE = "© DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved";
export const COPERNICUS_DEM_MODIFIED_PRODUCT_NOTICE = "produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved";
export const COPERNICUS_DEM_LIABILITY_NOTICE = "依法或受委托负责哥白尼计划的组织，不对哥白尼 WorldDEM-30 的任何使用承担责任。";
export const TERRARIUM_DATASET_URL = "https://registry.opendata.aws/terrain-tiles/";
export const TERRARIUM_LICENSE_URL = "https://github.com/tilezen/joerd/blob/master/docs/attribution.md";
export const TERRARIUM_MODIFIED_NOTICE = "Starward对Terrain Tiles进行GCJ-02重投影、双线性取样和合成坡度阴影；这些修改未经USGS或NOAA批准或背书。";
export const TERRARIUM_LIABILITY_NOTICE = "数据按原样提供，USGS和NOAA不保证其对特定用途的适用性，不承担数据错误或遗漏造成的损失；ETOPO1不能用于导航。所用美国政府原始资料在美国不受版权保护。";

export function terrariumAttribution(contributors: readonly string[]) {
  if (!contributors.length || contributors.some(source => !/^(srtm|gmted|etopo1)\/[^\s,]+$/u.test(source)))
    throw new Error("terrain_source_contributors_unsupported");
  const families = new Set(contributors.map(source => source.split("/")[0]));
  return ["Terrain Tiles by Mapzen / Linux Foundation.",
    ...(families.has("srtm") ? ["SRTM data courtesy of the U.S. Geological Survey."] : []),
    ...(families.has("gmted") ? ["GMTED2010 data courtesy of the U.S. Geological Survey."] : []),
    ...(families.has("etopo1") ? ["Global ETOPO1 terrain data: DOC/NOAA/NESDIS/NCEI, U.S. Department of Commerce."] : []),
  ].join(" ");
}

export interface TerrainSourceRange { offset: number; byteSize: number; sha256: string }
export interface TerrainPublicationSourceObject {
  tileId: string; url: string; sha256: string; byteSize: number; etag: string | null;
  // Legacy v1 hashes bind the entire downloaded object; v2 binds the exact
  // retrieved byte ranges, never an invented full-object checksum.
  hashScope?: "RETRIEVED_RANGES" | "FULL_FILE";
  ranges?: TerrainSourceRange[];
  /** Actual provider response metadata, never inferred from the requested area. */
  contributors?: string[];
}

export interface TerrainPublication {
  schemaVersion: "starward-terrain-publication-v1" | "starward-terrain-publication-v2" | "starward-terrain-publication-v3" | "starward-terrain-publication-v4";
  fixedRaster?: DisplayRasterRegion & { haloPixels: 1; sourceSetSha256: string; styleVersion: "horn-igor-relief-v3" };
  fixedWindow?: DisplayRasterWindow & { haloPixels: 1; sourceSetSha256: string; styleVersion: "horn-igor-relief-v3";
    cells: { publicationId: string | null; file: string | null; x: number; y: number }[] };
  publicationId: string;
  dataset: string;
  sourceProvider: string;
  license: string;
  licenseUrl: string;
  doi: string | null;
  attributionNotice: string;
  modifiedProductNotice: string;
  derivation: string;
  sourceResolution: string;
  derivedResolutionM: number;
  derivedAt: string;
  coordinateSystem: "GCJ02";
  transformVersion: string;
  centerGcj02: { latitude: number; longitude: number };
  maximumRadiusKm: number | null;
  boundsGcj02: { west: number; south: number; east: number; north: number };
  elevationM: { minimum: number; maximum: number };
  imageStyle?: "ELEVATION_COLOR" | "RELIEF_OVERLAY";
  elevationColorEncoding?: TerrainElevationColorEncoding;
  validPixelPercent: number;
  validPixelCount?: number;
  image: { file: string; sha256: string; byteSize: number; width: number; height: number };
  sources: TerrainPublicationSourceObject[];
  unavailableSourceTiles: string[];
  sourceIssues?: { tileId: string; reason: "NOT_FOUND" | "READ_FAILED" | "UNSUPPORTED_SOURCE" }[];
  limitations: string[];
}

const manifestUrl = new URL("../assets/terrain/publication.json", import.meta.url);
let publicationPromise: Promise<TerrainPublication> | null = null;

const sha256Pattern = /^[a-f0-9]{64}$/u;
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const nonEmpty = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

export function validateTerrainPublication(value: TerrainPublication) {
  const bounds = value.boundsGcj02;
  const center = value.centerGcj02;
  const image = value.image;
  const viewportProduct = value.schemaVersion === "starward-terrain-publication-v3" || value.schemaVersion === "starward-terrain-publication-v4";
  if (
    !["starward-terrain-publication-v1", "starward-terrain-publication-v2", "starward-terrain-publication-v3", "starward-terrain-publication-v4"].includes(value.schemaVersion)
    || value.coordinateSystem !== "GCJ02"
    || !nonEmpty(value.publicationId)
    || !nonEmpty(value.dataset)
    || !nonEmpty(value.sourceProvider)
    || !nonEmpty(value.license)
    || (!viewportProduct && (value.licenseUrl !== COPERNICUS_DEM_LICENSE_URL
      || value.doi !== COPERNICUS_DEM_DOI || value.attributionNotice !== COPERNICUS_DEM_SOURCE_NOTICE
      || value.modifiedProductNotice !== COPERNICUS_DEM_MODIFIED_PRODUCT_NOTICE))
    || !nonEmpty(value.derivation)
    || !nonEmpty(value.sourceResolution)
    || !finite(value.derivedResolutionM) || value.derivedResolutionM <= 0
    || !nonEmpty(value.derivedAt) || Number.isNaN(Date.parse(value.derivedAt))
    || !nonEmpty(value.transformVersion)
    || !finite(center?.latitude) || !finite(center?.longitude)
    || (viewportProduct ? value.maximumRadiusKm !== null : !finite(value.maximumRadiusKm) || value.maximumRadiusKm <= 0)
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
  if (viewportProduct) {
    if (value.licenseUrl !== TERRARIUM_LICENSE_URL || value.doi !== null
      || value.modifiedProductNotice !== TERRARIUM_MODIFIED_NOTICE || value.imageStyle !== "RELIEF_OVERLAY"
      || value.sources.length > (value.fixedWindow ? 64 : 12) || !value.limitations.includes(TERRARIUM_LIABILITY_NOTICE)
      || !Array.isArray(value.sourceIssues) || value.sourceIssues.length !== value.unavailableSourceTiles.length
      || value.sourceIssues.some(issue => !value.unavailableSourceTiles.includes(issue.tileId)
        || !["NOT_FOUND", "READ_FAILED", "UNSUPPORTED_SOURCE"].includes(issue.reason))
      || value.sources.some(source => source.hashScope !== "FULL_FILE" || source.ranges !== undefined
        || !nonEmpty(source.etag) || !Array.isArray(source.contributors) || source.contributors.length > 512
        || !/^terrarium\/\d{1,2}\/\d+\/\d+$/u.test(source.tileId)
        || source.url !== `https://elevation-tiles-prod.s3.amazonaws.com/${source.tileId}.png`)
      || value.attributionNotice !== terrariumAttribution(value.sources.flatMap(source => source.contributors!)))
      throw new Error("terrain_viewport_publication_invalid");
  }
  if (value.schemaVersion === "starward-terrain-publication-v4") {
    const grid = value.fixedRaster ?? value.fixedWindow;
    if (!grid || grid.haloPixels !== 1 || grid.styleVersion !== "horn-igor-relief-v3"
      || Boolean(value.fixedRaster) === Boolean(value.fixedWindow) || !sha256Pattern.test(grid.sourceSetSha256)
      || image.width !== ("span" in grid ? grid.span : grid.columns) * grid.tilePixels
      || image.height !== ("span" in grid ? grid.span : grid.rows) * grid.tilePixels
      || Object.entries("span" in grid ? displayRasterBounds(grid) : displayRasterWindowBounds(grid))
        .some(([key, coordinate]) => Math.abs(coordinate - bounds[key as keyof typeof bounds]) > 1e-12)
      || grid.sourceSetSha256 !== terrainSourceSetHash(value.sources, value.sourceIssues)
      || !Number.isSafeInteger(value.validPixelCount) || value.validPixelCount! <= 0 || value.validPixelCount! > image.width * image.height
      || Math.round(value.validPixelCount! / (image.width * image.height) * 10000) / 100 !== value.validPixelPercent)
      throw new Error("terrain_fixed_publication_invalid");
    if (value.fixedWindow && (value.fixedWindow.cells.length !== value.fixedWindow.columns * value.fixedWindow.rows
      || value.fixedWindow.cells.some((cell, index) => cell.x !== value.fixedWindow!.x + index % value.fixedWindow!.columns
        || cell.y !== value.fixedWindow!.y + Math.floor(index / value.fixedWindow!.columns)
        || Boolean(cell.file) !== Boolean(cell.publicationId)))) throw new Error("terrain_fixed_publication_invalid");
    const key = "span" in grid ? `terrarium-cn-v2-fixed-${displayRasterRegionKey(grid)}` : `terrarium-cn-v2-window-${displayRasterWindowKey(grid)}`;
    if (image.file !== `${key}-${grid.sourceSetSha256}-${image.sha256}.png`
      || value.publicationId !== `terrain:${key}:${grid.sourceSetSha256}:${image.sha256}`
      || value.transformVersion !== "starward-coordinate-system-gcj02-mercator-v1") throw new Error("terrain_fixed_publication_invalid");
  } else if (value.fixedRaster || value.fixedWindow) throw new Error("terrain_fixed_publication_invalid");
  if (value.schemaVersion === "starward-terrain-publication-v2" && value.sources.some(source =>
    source.hashScope !== "RETRIEVED_RANGES" || !nonEmpty(source.etag)
    || !Array.isArray(source.ranges) || !source.ranges.length
    || source.ranges.some(range => !Number.isSafeInteger(range.offset) || range.offset < 0
      || !Number.isSafeInteger(range.byteSize) || range.byteSize <= 0
      || range.offset + range.byteSize > source.byteSize || !sha256Pattern.test(range.sha256))
    || createHash("sha256").update(JSON.stringify(source.ranges)).digest("hex") !== source.sha256
  )) throw new Error("terrain_source_ranges_invalid");
  const encoding = value.elevationColorEncoding;
  if ((value.imageStyle !== undefined && value.imageStyle !== "ELEVATION_COLOR" && value.imageStyle !== "RELIEF_OVERLAY")
    || (value.imageStyle === "RELIEF_OVERLAY" && encoding !== undefined)) throw new Error("terrain_image_style_invalid");
  const rgb = (channels: unknown) => Array.isArray(channels) && channels.length === 3
    && channels.every(channel => Number.isInteger(channel) && channel >= 0 && channel <= 255);
  if (encoding !== undefined && (!encoding
    || encoding.format !== "starward-terrain-elevation-color-v1"
    || encoding.imageSha256 !== image.sha256
    || !finite(encoding.minimumM) || !finite(encoding.maximumM)
    || encoding.minimumM >= encoding.maximumM || !finite(encoding.maximumM - encoding.minimumM)
    || !rgb(encoding.lowRgb) || !rgb(encoding.highRgb)
    || !Number.isInteger(encoding.alpha) || encoding.alpha < 1 || encoding.alpha > 255
    || encoding.clipping !== "CLAMP" || encoding.shading !== "SYNTHETIC_HILLSHADE"
  )) throw new Error("terrain_elevation_color_encoding_invalid");
  return value;
}

export function terrainSourceSetHash(sources: readonly TerrainPublicationSourceObject[], issues: TerrainPublication["sourceIssues"] = []) {
  return createHash("sha256").update(JSON.stringify({ sources: sources.map(source => [source.tileId, source.sha256, source.etag])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0]), "en")),
    issues: issues.map(issue => [issue.tileId, issue.reason]).sort((a, b) => a[0]!.localeCompare(b[0]!, "en")) })).digest("hex");
}

export async function terrainPublication() {
  publicationPromise ??= readFile(manifestUrl, "utf8").then((text) => {
    return validateTerrainPublication(JSON.parse(text) as TerrainPublication);
  }).catch(error => {
    publicationPromise = null;
    throw error;
  });
  return publicationPromise;
}

export function terrainPublicationSource(publication: TerrainPublication): SourceSummary {
  const viewportProduct = publication.schemaVersion === "starward-terrain-publication-v3" || publication.schemaVersion === "starward-terrain-publication-v4";
  const sourceUrl = viewportProduct ? TERRARIUM_DATASET_URL : `https://doi.org/${publication.doi}`;
  const liability = viewportProduct ? TERRARIUM_LIABILITY_NOTICE : COPERNICUS_DEM_LIABILITY_NOTICE;
  return {
    id: `source:${publication.publicationId}`,
    kind: "OPEN_DATA",
    provider: publication.sourceProvider,
    title: publication.dataset,
    sourceUrl,
    attribution: {
      name: publication.sourceProvider,
      url: sourceUrl,
      statements: [publication.attributionNotice, publication.modifiedProductNotice, liability],
    },
    license: publication.license,
    licenseUrl: publication.licenseUrl,
    publishedAt: null,
    // The manifest records derivation, not acquisition of the upstream DEM.
    retrievedAt: null,
    validFrom: null,
    validTo: null,
    state: publication.validPixelPercent < 99.9 || publication.sourceIssues?.length ? "PARTIAL" : "FRESH",
    confidence: null,
    precision: `${publication.sourceResolution}; derived grid approximately ${publication.derivedResolutionM} m`,
    limitations: [
      publication.attributionNotice,
      publication.modifiedProductNotice,
      liability,
      publication.derivation,
      ...(publication.elevationColorEncoding ? [
        `地形基色的高程色带为 ${publication.elevationColorEncoding.minimumM} 至 ${publication.elevationColorEncoding.maximumM} m，高程超出色带区间时使用端点颜色；明暗还含合成阴影，不能仅凭颜色读取精确海拔或判断现场光照。`,
      ] : []),
      ...publication.limitations,
    ],
  };
}

export function terrainImageUrl(file: string) {
  if (!/^[a-z0-9][a-z0-9.-]*\.png$/u.test(file)) throw new Error("terrain_asset_invalid");
  return new URL(`../assets/terrain/${file}`, import.meta.url);
}

export function terrainRequestIsCovered(publication: TerrainPublication, input: TerrainOverlayRequest) {
  if (input.viewportBounds) {
    const b = input.viewportBounds, p = publication.boundsGcj02, epsilon = 1e-7;
    return (publication.schemaVersion === "starward-terrain-publication-v3" || publication.schemaVersion === "starward-terrain-publication-v4")
      && b.west >= p.west - epsilon && b.east <= p.east + epsilon
      && b.south >= p.south - epsilon && b.north <= p.north + epsilon;
  }
  if (publication.maximumRadiusKm === null) return false;
  const { latitude, longitude } = input.center;
  const latitudeDelta = input.radiusKm / 111.32;
  const longitudeDelta = input.radiusKm / (111.32 * Math.max(0.01, Math.cos(latitude * Math.PI / 180)));
  // Dynamic request identities retain 7 coordinate decimals (about 1 cm).
  // This only covers rounding at that boundary, not missing geographic data.
  const epsilon = 1e-7;
  const insidePublishedBounds = longitude - longitudeDelta >= publication.boundsGcj02.west - epsilon
    && longitude + longitudeDelta <= publication.boundsGcj02.east + epsilon
    && latitude - latitudeDelta >= publication.boundsGcj02.south - epsilon
    && latitude + latitudeDelta <= publication.boundsGcj02.north + epsilon;
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
    requestedRadiusKm: input.radiusKm ?? null,
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
    elevationColorEncoding: null,
    coverageLabel: reason,
    limitations: [reason],
    source: null,
    lightPollution: { state: "UNAVAILABLE", datasetVersion: "UNAVAILABLE", cells: [], legend: [], source: null, coverageLabel: "当前范围没有已发布的年度卫星夜光栅格。" },
  };
}
