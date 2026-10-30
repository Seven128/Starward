import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { fromArrayBuffer } from "geotiff";
import { PNG } from "pngjs";
import { displayRasterWindowBounds, displayRasterWindowKey, mercatorY, WEB_MERCATOR_CIRCUMFERENCE_M,
  type DisplayRasterWindow, type RasterBounds } from "@starward/coordinate-system";
import { NIGHT_LIGHT_FIXED_SCALE, nightLightBandForRadiance, type Gcj02Point, type SourceSummary } from "@starward/miniapp-contracts";
import type { DarkSkyPublicationRecord } from "./ports.ts";

export type NightLightDatasetRecord = DarkSkyPublicationRecord;
export interface FixedNightLightDataset extends NightLightDatasetRecord {
  payload: {
    schemaVersion: 2; datasetVersion: string; methodVersion: string; styleVersion: string; policy: typeof NIGHT_LIGHT_FIXED_SCALE;
    policySha256: string; minimumCloudFreeObservations: number; source: SourceSummary;
    rasterInventory: { sha256: string; publicationVersion: string; assetCount: number };
    aoi?: RasterBounds;
  };
}
export interface ShardedNightLightDataset extends NightLightDatasetRecord {
  payload: {
    schemaVersion: 3; datasetVersion: string; productName: string; dataYear: number; source: SourceSummary;
    methodVersion: string; styleVersion: string; policy: typeof NIGHT_LIGHT_FIXED_SCALE; policySha256: string;
    minimumCloudFreeObservations: number;
    shardedIndex: { file: "index.json"; bytes: number; sha256: string; indexVersion: string };
    coverage: "DECLARED_SOURCE_AOIS_WITH_PER_PIXEL_QUALITY";
    radianceUnit: "nW/cm²/sr"; calibratedSkyClass: false;
  };
}
export interface FixedNightLightInventory {
  schemaVersion: "starward-fixed-nightlight-inventory-v1"; releaseState: "SEALED"; datasetVersion: string;
  methodVersion: string; styleVersion: string; policySha256: string; publicationVersion: string; createdAt: string;
  aoiWgs84: RasterBounds; assets: { key: string; file: string; proofBytes: number; proofSha256: string }[];
}
type FileDescriptor = { file: string; bytes: number; sha256: string };
type NightLightSourceGrid = { width: number; height: number; west: number; north: number; longitudeStep: number; latitudeStep: number };
type ChunkPreparation = { algorithm: "bounded-source-core-physical-mass-v1"; adapterSha256: string; numericOwnerSha256: string };
interface NightLightRasterGrid {
  grid: string; window: DisplayRasterWindow; width: number; height: number; boundsGcj02: RasterBounds; affine: number[];
  schemaVersion?: string;
}
interface NightLightChunkGrid extends NightLightRasterGrid {
  schemaVersion: "starward-nightlight-warp-grid-v2"; byteOrder: "little-endian"; sourceGeolocationConvention: "TOP_LEFT_CORNER";
  source: NightLightSourceGrid; originalSource: NightLightSourceGrid; sourceSubdivision: number; preparation: ChunkPreparation;
  files: { targetArea: FileDescriptor; targetBranch: FileDescriptor };
  sourceChunks: { sourceWindow: [number, number, number, number]; origin: [number, number]; core: [number, number, number, number]; geometry: FileDescriptor }[];
}
const bands = ["radianceMean", "validAreaFraction", "sourceMissingAreaFraction", "insufficientCoverageAreaFraction", "publishedAreaFraction", "qualityMask"] as const;
export interface FixedNightLightRaster {
  schemaVersion: "starward-fixed-nightlight-raster-v2" | "starward-fixed-nightlight-raster-v3"; releaseState: "PREPARED"; publicationId: string;
  datasetVersion: string; methodVersion: string; styleVersion: string; policy: typeof NIGHT_LIGHT_FIXED_SCALE;
  sourceSet: { datasetVersion: string; radianceSha256: string; coverageSha256: string; policySha256: string; geometrySha256: string;
    numericalEngine?: { algorithm: "geos-dense-physical-area-intersection-v1"; shapelyVersion: string; geosVersion: string; sourceSha256: string };
    preparation?: ChunkPreparation };
  source: SourceSummary;
  derivation: "GDAL_PHYSICAL_AREA_SUM" | "GEOS_PHYSICAL_AREA_INTERSECTION" | "GEOS_PHYSICAL_AREA_CHUNKED_INTERSECTION" | "NUMERIC_FIXED_CELL_COMPOSITION";
  cells: { x: number; y: number; file: string; publicationId: string; numericSha256: string }[];
  image: FileDescriptor & { width: number; height: number };
  numeric: FileDescriptor & { format: "GEOTIFF_FLOAT64_DEFLATE_V1"; bands: readonly string[];
    coordinates: "derived-GCJ-Mercator-metres"; pixelInterpretation: "AREA" };
  unit: string; statistic: string;
  grid: NightLightRasterGrid | NightLightChunkGrid;
  quality: { policyVersion: string; minimumCloudFreeObservations: number; validPixelCount: number;
    validZeroPixelCount: number; pixelCount: number; maximumAreaExcessFraction: number;
    qualityMaskCounts: Record<"1" | "2" | "3" | "4" | "5" | "6", number> };
}
export interface FixedNightLightPixel {
  radianceMean: number | null; productBand: ReturnType<typeof nightLightBandForRadiance>;
  validAreaFraction: number; sourceMissingAreaFraction: number; insufficientCoverageAreaFraction: number; publishedAreaFraction: number;
  qualityMask: number; state: "AVAILABLE" | "PARTIAL" | "UNAVAILABLE";
  reason: "INSUFFICIENT_COVERAGE" | "SOURCE_MISSING" | "UNPUBLISHED" | "INSUFFICIENT_VALID_AREA" | null;
  datasetVersion: string; methodVersion: string; statistic: string; unit: string; publicationId: string;
}

const hashPattern = /^[a-f0-9]{64}$/u;
const filePattern = /^nightlight-v2-[a-f0-9]{64}\.png$/u;
const sha = (raw: Buffer | string) => createHash("sha256").update(raw).digest("hex");
const fail = (condition: unknown, code: string) => { if (!condition) throw new Error(code); };
const integer = (value: unknown, low: number, high: number) => Number.isInteger(value) && Number(value) >= low && Number(value) <= high;
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  return JSON.stringify(value);
}

function exactKeys(value: unknown, keys: readonly string[]) {
  return !!value && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).sort().join() === [...keys].sort().join();
}

/** A v3 proof explicitly carries a bounded source-core grid. Published bytes
 * remain pinned by the ordinary inventory/proof and image/numeric digests. */
function validateChunkGrid(proof: FixedNightLightRaster, dataset: FixedNightLightDataset) {
  const grid = proof.grid as NightLightChunkGrid, original = grid.originalSource, source = grid.source, s = grid.sourceSubdivision;
  const code = "nightlight_chunked_geometry_invalid";
  fail(grid.schemaVersion === "starward-nightlight-warp-grid-v2" && grid.byteOrder === "little-endian"
    && grid.sourceGeolocationConvention === "TOP_LEFT_CORNER" && integer(s, 1, 256)
    && exactKeys(original, ["width", "height", "west", "north", "longitudeStep", "latitudeStep"])
    && integer(original.width, 2, 2 ** 31 - 1) && integer(original.height, 2, 2 ** 31 - 1)
    && [original.west, original.north, original.longitudeStep, original.latitudeStep].every(Number.isFinite)
    && original.longitudeStep > 0 && original.latitudeStep < 0
    && original.width * original.longitudeStep <= 10.01 && -original.height * original.latitudeStep <= 10.01
    && original.west >= -180 && original.west + original.width * original.longitudeStep <= 180
    && original.north <= 85 && original.north + original.height * original.latitudeStep >= -85, code);
  fail(isDeepStrictEqual(source, { ...original, width: original.width * s, height: original.height * s,
    longitudeStep: original.longitudeStep / s, latitudeStep: original.latitudeStep / s }), code);
  const aoi = dataset.payload.aoi;
  fail(aoi && [aoi.west, aoi.east, aoi.south, aoi.north].every(Number.isFinite)
    && Math.abs(aoi.west - original.west) <= 1e-8 && Math.abs(aoi.north - original.north) <= 1e-8
    && Math.abs(aoi.east - original.west - original.width * original.longitudeStep) <= 1e-8
    && Math.abs(aoi.south - original.north - original.height * original.latitudeStep) <= 1e-8, code);
  const preparation = grid.preparation;
  fail(exactKeys(preparation, ["algorithm", "adapterSha256", "numericOwnerSha256"])
    && preparation.algorithm === "bounded-source-core-physical-mass-v1" && hashPattern.test(preparation.adapterSha256)
    && hashPattern.test(preparation.numericOwnerSha256) && isDeepStrictEqual(preparation, proof.sourceSet.preparation), code);
  fail(Array.isArray(grid.sourceChunks) && grid.sourceChunks.length >= 2 && exactKeys(grid.files, ["targetArea", "targetBranch"]), code);
  for (const [key, suffix, stride] of [["targetArea", "f64", 8], ["targetBranch", "u8", 1]] as const) {
    const file = grid.files[key];
    fail(exactKeys(file, ["file", "sha256", "bytes"]) && file.file === `${key}.${suffix}`
      && file.bytes === grid.width * grid.height * stride && hashPattern.test(file.sha256), code);
  }
  const events: { y: number; kind: number; left: number; right: number; id: number }[] = [], names = new Set<string>();
  let area = 0;
  for (const [id, chunk] of grid.sourceChunks.entries()) {
    fail(exactKeys(chunk, ["sourceWindow", "origin", "core", "geometry"]), code);
    const w = chunk.sourceWindow, origin = chunk.origin, core = chunk.core, descriptor = chunk.geometry;
    fail(Array.isArray(w) && w.length === 4 && w.every(value => integer(value, 0, 2 ** 31 - 1)) && w[2] >= 2 && w[3] >= 2
      && w[2] * w[3] * s * s <= 2402 ** 2 && w[0] + w[2] <= original.width && w[1] + w[3] <= original.height
      && isDeepStrictEqual(origin, [w[1] * s, w[0] * s]) && Array.isArray(core) && core.length === 4
      && core.every(value => integer(value, 0, 2 ** 31 - 1)) && core[0] === 0 && core[1] === 0
      && core[2] >= s && core[3] >= s && core[2] % s === 0 && core[3] % s === 0
      && core[2] <= w[3] * s && core[3] <= w[2] * s, code);
    const bottom = origin[0] + core[2], right = origin[1] + core[3], name = `chunks/${w[1]}-${w[0]}/warp-grid.json`;
    fail(w[3] === core[2] / s + Number(bottom < source.height) && w[2] === core[3] / s + Number(right < source.width)
      && exactKeys(descriptor, ["file", "sha256", "bytes"]) && descriptor.file === name && !names.has(name)
      && integer(descriptor.bytes, 1, 16 * 1024) && hashPattern.test(descriptor.sha256), code);
    names.add(name); area += core[2] * core[3];
    events.push({ y: origin[0], kind: 1, left: origin[1], right, id }, { y: bottom, kind: -1, left: origin[1], right, id });
  }
  fail(area === source.width * source.height, code);
  events.sort((a, b) => a.y - b.y || a.kind - b.kind || a.left - b.left);
  const active = new Map<number, { left: number; right: number }>();
  for (const event of events) {
    if (event.kind === -1) { fail(active.delete(event.id), code); continue; }
    fail(![...active.values()].some(other => event.left < other.right && other.left < event.right), code);
    active.set(event.id, event);
  }
  fail(active.size === 0, code);
}

/** Historical schema-1 datasets keep their original relative-grid consumer. */
function validateDatasetPolicy(record: NightLightDatasetRecord, data: Pick<FixedNightLightDataset["payload"],
  "datasetVersion" | "methodVersion" | "styleVersion" | "policy" | "policySha256" | "source" | "minimumCloudFreeObservations">) {
  fail(/^[a-z0-9][a-z0-9._-]{2,127}$/u.test(record.datasetVersion) && data.datasetVersion === record.datasetVersion
    && data.methodVersion === NIGHT_LIGHT_FIXED_SCALE.methodVersion && data.styleVersion === NIGHT_LIGHT_FIXED_SCALE.styleVersion
    && isDeepStrictEqual(data.policy, NIGHT_LIGHT_FIXED_SCALE) && hashPattern.test(data.policySha256)
    && hashPattern.test(record.radianceSha256) && hashPattern.test(record.coverageSha256)
    && data.source?.id === `eog-vnl:${record.datasetVersion}` && isDeepStrictEqual(data.source, record.source)
    && integer(data.minimumCloudFreeObservations, 1, 366), "nightlight_dataset_invalid");
}

export function fixedNightLightDataset(record: NightLightDatasetRecord): FixedNightLightDataset | null {
  const schema = (record.payload as { schemaVersion?: unknown } | null)?.schemaVersion;
  if (schema === 1) return null;
  if (schema !== 2) throw new Error("nightlight_dataset_schema_unsupported");
  const data = record.payload as FixedNightLightDataset["payload"];
  validateDatasetPolicy(record, data);
  fail(hashPattern.test(data.rasterInventory?.sha256) && integer(data.rasterInventory.assetCount, 1, 4096)
    && /^nightlight-fixed:[a-f0-9]{64}$/u.test(data.rasterInventory.publicationVersion), "nightlight_dataset_invalid");
  return record as FixedNightLightDataset;
}

/** Explicit schema-3 DB contract. A root is selected only beneath the runtime's
 * controlled dataset directory; database content cannot supply a directory.
 * This parser grants neither a public asset URL nor formal static readiness. */
export function shardedNightLightDataset(record: NightLightDatasetRecord): ShardedNightLightDataset {
  const data = record.payload as ShardedNightLightDataset["payload"] | null;
  fail(data?.schemaVersion === 3 && exactKeys(data, ["schemaVersion", "datasetVersion", "productName", "dataYear", "source",
    "minimumCloudFreeObservations", "methodVersion", "styleVersion", "policy", "policySha256", "shardedIndex",
    "coverage", "radianceUnit", "calibratedSkyClass"]), "nightlight_sharded_dataset_invalid");
  const selected = data!;
  validateDatasetPolicy(record, selected);
  fail(typeof selected.productName === "string" && selected.productName.trim().length > 0 && selected.productName === record.source.title
    && integer(selected.dataYear, 2012, 9999)
    && record.source.validFrom === `${selected.dataYear}-01-01T00:00:00.000Z`
    && record.source.validTo === `${selected.dataYear}-12-31T23:59:59.999Z`
    && selected.coverage === "DECLARED_SOURCE_AOIS_WITH_PER_PIXEL_QUALITY" && selected.radianceUnit === "nW/cm²/sr"
    && selected.calibratedSkyClass === false && exactKeys(selected.shardedIndex, ["file", "bytes", "sha256", "indexVersion"])
    && selected.shardedIndex.file === "index.json" && integer(selected.shardedIndex.bytes, 1, 4 * 1024 * 1024)
    && hashPattern.test(selected.shardedIndex.sha256) && /^nightlight-sharded:[a-f0-9]{64}$/u.test(selected.shardedIndex.indexVersion),
  "nightlight_sharded_dataset_invalid");
  return record as ShardedNightLightDataset;
}

async function pinnedFile(file: string, descriptor: Pick<FileDescriptor, "bytes" | "sha256">, maximum: number, signal?: AbortSignal) {
  signal?.throwIfAborted();
  fail(integer(descriptor.bytes, 1, maximum) && hashPattern.test(descriptor.sha256), "nightlight_file_descriptor_invalid");
  fail((await stat(file)).size === descriptor.bytes, "nightlight_file_size_invalid");
  const raw = await readFile(file, { signal });
  fail(raw.length === descriptor.bytes && sha(raw) === descriptor.sha256, "nightlight_file_hash_invalid");
  return raw;
}

export async function readFixedNightLightInventory(directory: string, dataset: FixedNightLightDataset, signal?: AbortSignal) {
  const file = path.join(directory, "inventory.json"), bytes = (await stat(file)).size;
  const raw = await pinnedFile(file, { bytes, sha256: dataset.payload.rasterInventory.sha256 }, 2 * 1024 * 1024, signal);
  const inventory = JSON.parse(raw.toString("utf8")) as FixedNightLightInventory;
  fail(inventory.schemaVersion === "starward-fixed-nightlight-inventory-v1" && inventory.releaseState === "SEALED"
    && inventory.datasetVersion === dataset.datasetVersion && inventory.policySha256 === dataset.payload.policySha256
    && inventory.methodVersion === dataset.payload.methodVersion && inventory.styleVersion === dataset.payload.styleVersion
    && Number.isFinite(Date.parse(inventory.createdAt)) && Array.isArray(inventory.assets)
    && inventory.assets.length === dataset.payload.rasterInventory.assetCount
    && inventory.assets.every(entry => entry && /^\d+(?:-\d+){4}$/u.test(entry.key) && filePattern.test(entry.file)
      && integer(entry.proofBytes, 1, 1024 * 1024) && hashPattern.test(entry.proofSha256))
    && new Set(inventory.assets.map(entry => entry.key)).size === inventory.assets.length
    && new Set(inventory.assets.map(entry => entry.file)).size === inventory.assets.length, "nightlight_inventory_invalid");
  const core = { datasetVersion: inventory.datasetVersion, policySha256: inventory.policySha256, assets: inventory.assets };
  fail(inventory.publicationVersion === `nightlight-fixed:${sha(canonical(core))}`
    && inventory.publicationVersion === dataset.payload.rasterInventory.publicationVersion, "nightlight_inventory_version_invalid");
  return inventory;
}

export async function readFixedNightLightProof(directory: string, dataset: FixedNightLightDataset,
  entry: FixedNightLightInventory["assets"][number], signal?: AbortSignal) {
  fail(filePattern.test(entry.file), "nightlight_asset_file_invalid");
  const raw = await pinnedFile(path.join(directory, entry.file + ".json"), { bytes: entry.proofBytes, sha256: entry.proofSha256 }, 1024 * 1024, signal);
  return validateFixedNightLightProof(JSON.parse(raw.toString("utf8")), dataset, entry);
}

/** Shared scientific/projection admission after the caller verifies the proof
 * file's complete byte identity. A prepared contract is not DB publication. */
export function validateFixedNightLightProof(value: unknown, dataset: FixedNightLightDataset,
  entry: Pick<FixedNightLightInventory["assets"][number], "key" | "file">) {
  const proof = value as FixedNightLightRaster;
  fail(!!proof && ["starward-fixed-nightlight-raster-v2", "starward-fixed-nightlight-raster-v3"].includes(proof.schemaVersion) && proof.releaseState === "PREPARED"
    && proof.datasetVersion === dataset.datasetVersion && proof.methodVersion === dataset.payload.methodVersion
    && proof.styleVersion === dataset.payload.styleVersion && isDeepStrictEqual(proof.policy, NIGHT_LIGHT_FIXED_SCALE)
    && isDeepStrictEqual(proof.source, dataset.source) && proof.sourceSet?.datasetVersion === dataset.datasetVersion
    && proof.sourceSet.radianceSha256 === dataset.radianceSha256 && proof.sourceSet.coverageSha256 === dataset.coverageSha256
    && proof.sourceSet.policySha256 === dataset.payload.policySha256 && hashPattern.test(proof.sourceSet.geometrySha256)
    && proof.unit === NIGHT_LIGHT_FIXED_SCALE.unit && proof.statistic === NIGHT_LIGHT_FIXED_SCALE.statistics.map,
  "nightlight_proof_identity_invalid");
  const grid = proof.grid, window = grid?.window;
  const bounds = displayRasterWindowBounds(window);
  fail(displayRasterWindowKey(window) === entry.key && grid.grid === window.grid
    && grid.width === window.columns * 256 && grid.height === window.rows * 256
    && proof.image?.file === entry.file && proof.image.width === grid.width && proof.image.height === grid.height
    && hashPattern.test(proof.image.sha256) && integer(proof.image.bytes, 1, 16 * 1024 * 1024)
    && (Object.keys(bounds) as (keyof RasterBounds)[]).every(key => Math.abs(grid.boundsGcj02?.[key] - bounds[key]) < 1e-8),
  "nightlight_proof_grid_invalid");
  const composition = window.columns * window.rows > 1;
  const chunked = proof.schemaVersion === "starward-fixed-nightlight-raster-v3";
  if (chunked) validateChunkGrid(proof, dataset);
  else fail((grid.schemaVersion === undefined || grid.schemaVersion === "starward-nightlight-warp-grid-v1")
    && !("sourceChunks" in grid) && proof.sourceSet.preparation === undefined, "nightlight_proof_grid_invalid");
  fail((composition ? proof.derivation === "NUMERIC_FIXED_CELL_COMPOSITION" : chunked ? proof.derivation === "GEOS_PHYSICAL_AREA_CHUNKED_INTERSECTION"
    : ["GDAL_PHYSICAL_AREA_SUM", "GEOS_PHYSICAL_AREA_INTERSECTION"].includes(proof.derivation)) && Array.isArray(proof.cells)
    && proof.cells.length === (composition ? window.columns * window.rows : 0), "nightlight_proof_derivation_invalid");
  const engine = proof.sourceSet.numericalEngine;
  if (["GEOS_PHYSICAL_AREA_INTERSECTION", "GEOS_PHYSICAL_AREA_CHUNKED_INTERSECTION"].includes(proof.derivation) || engine !== undefined) fail(engine?.algorithm === "geos-dense-physical-area-intersection-v1"
    && /^\d+\.\d+\.\d+$/u.test(engine.shapelyVersion) && /^\d+\.\d+\.\d+$/u.test(engine.geosVersion)
    && hashPattern.test(engine.sourceSha256), "nightlight_numeric_engine_invalid");
  const pixelSize = WEB_MERCATOR_CIRCUMFERENCE_M / (256 * 2 ** window.zoom);
  const expectedAffine = [pixelSize, 0, (window.x / 2 ** window.zoom - .5) * WEB_MERCATOR_CIRCUMFERENCE_M,
    0, -pixelSize, (.5 - window.y / 2 ** window.zoom) * WEB_MERCATOR_CIRCUMFERENCE_M];
  fail(Array.isArray(grid.affine) && grid.affine.length === 6 && grid.affine.every((value, i) => Number.isFinite(value)
    && Math.abs(value - expectedAffine[i]!) < 1e-7), "nightlight_proof_affine_invalid");
  const numeric = proof.numeric, quality = proof.quality;
  fail(numeric?.file === entry.file + ".numbers.tif" && numeric.format === "GEOTIFF_FLOAT64_DEFLATE_V1"
    && isDeepStrictEqual(numeric.bands, bands) && numeric.coordinates === "derived-GCJ-Mercator-metres" && numeric.pixelInterpretation === "AREA"
    && hashPattern.test(numeric.sha256) && integer(numeric.bytes, 1, grid.width * grid.height * 6 * 8 + 1024 * 1024)
    && quality?.policyVersion === NIGHT_LIGHT_FIXED_SCALE.qualityPolicy.version
    && quality.minimumCloudFreeObservations === dataset.payload.minimumCloudFreeObservations
    && quality.pixelCount === grid.width * grid.height && integer(quality.validPixelCount, 0, quality.pixelCount)
    && integer(quality.validZeroPixelCount, 0, quality.validPixelCount)
    && Number.isFinite(quality.maximumAreaExcessFraction) && quality.maximumAreaExcessFraction >= 0
    && quality.maximumAreaExcessFraction <= NIGHT_LIGHT_FIXED_SCALE.qualityPolicy.areaFractionNumericalTolerance,
  "nightlight_proof_numeric_invalid");
  const counts = quality.qualityMaskCounts;
  fail(counts && ["1", "2", "3", "4", "5", "6"].every(key => integer(counts[key as keyof typeof counts], 0, quality.pixelCount))
    && Object.values(counts).reduce((sum, value) => sum + value, 0) === quality.pixelCount
    && counts["1"] + counts["2"] === quality.validPixelCount, "nightlight_proof_quality_summary_invalid");
  const identity = sha(canonical(proof.sourceSet)), imageHash = proof.image.sha256, numericHash = proof.numeric.sha256;
  fail(proof.image.file === `nightlight-v2-${sha(`${identity}:${imageHash}:${numericHash}`)}.png`
    && proof.publicationId === `nightlight:${identity}:${imageHash}:${numericHash}`, "nightlight_proof_publication_id_invalid");
  return proof;
}

export async function readFixedNightLightImagePixels(directory: string, proof: FixedNightLightRaster, signal?: AbortSignal) {
  fail(filePattern.test(proof.image.file), "nightlight_asset_file_invalid");
  const bytes = await pinnedFile(path.join(directory, proof.image.file), proof.image, 16 * 1024 * 1024, signal);
  const image = PNG.sync.read(bytes, { checkCRC: true });
  fail(image.width === proof.image.width && image.height === proof.image.height, "nightlight_image_dimensions_invalid");
  return { bytes, pixels: image };
}

export async function readFixedNightLightImage(directory: string, proof: FixedNightLightRaster, signal?: AbortSignal) {
  return (await readFixedNightLightImagePixels(directory, proof, signal)).bytes;
}

/** Read the actual released numeric pixel, rather than decoding a colour band.
 * Spot statistics remain a separate declared 3×3 original-pixel sample. */
export async function readFixedNightLightPixel(directory: string, proof: FixedNightLightRaster, point: Gcj02Point,
  signal?: AbortSignal): Promise<FixedNightLightPixel | null> {
  fail(point.system === "GCJ02" && Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
    && Math.abs(point.latitude) < 85.051129 && Math.abs(point.longitude) <= 180, "nightlight_point_invalid");
  const window = proof.grid.window, worldPixels = 256 * 2 ** window.zoom;
  const x = Math.floor((point.longitude + 180) / 360 * worldPixels) - window.x * 256;
  const y = Math.floor(mercatorY(point.latitude) * worldPixels) - window.y * 256;
  if (x < 0 || x >= proof.grid.width || y < 0 || y >= proof.grid.height) return null;
  fail(proof.numeric.file === proof.image.file + ".numbers.tif" && filePattern.test(proof.image.file), "nightlight_asset_file_invalid");
  const bytes = await pinnedFile(path.join(directory, proof.numeric.file), proof.numeric, proof.grid.width * proof.grid.height * 6 * 8 + 1024 * 1024, signal);
  const tiff = await fromArrayBuffer(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  try {
    const image = await tiff.getImage();
    const projectedCode = image.getGeoKeys()?.ProjectedCSTypeGeoKey;
    fail(image.getWidth() === proof.grid.width && image.getHeight() === proof.grid.height && image.getSamplesPerPixel() === 6
      && bands.every((_, index) => image.getSampleFormat(index) === 3 && image.getBitsPerSample(index) === 64)
      && (projectedCode === undefined || projectedCode === 32767),
    "nightlight_numeric_dimensions_invalid");
    const origin = image.getOrigin(), resolution = image.getResolution();
    fail(Math.abs(origin[0]! - proof.grid.affine[2]!) < 1e-7 && Math.abs(origin[1]! - proof.grid.affine[5]!) < 1e-7
      && Math.abs(resolution[0]! - proof.grid.affine[0]!) < 1e-9 && Math.abs(resolution[1]! - proof.grid.affine[4]!) < 1e-9,
    "nightlight_numeric_affine_invalid");
    const data = await image.readRasters({ window: [x, y, x + 1, y + 1], signal });
    signal?.throwIfAborted();
    const [mean, valid, missing, coverage, published, mask] = Array.from({ length: 6 }, (_, band) => Number(data[band]![0]));
    const tolerance = NIGHT_LIGHT_FIXED_SCALE.qualityPolicy.areaFractionNumericalTolerance;
    fail(integer(mask, 1, 6) && [valid, missing, coverage, published].every(value => Number.isFinite(value) && value! >= 0 && value! <= 1)
      && valid! + missing! + coverage! <= published! + tolerance
      && (mask! <= 2 ? Number.isFinite(mean) && mean! >= 0 && valid! + 1e-12 >= NIGHT_LIGHT_FIXED_SCALE.qualityPolicy.minimumValidAreaFraction
        && (mask !== 1 || valid! >= 1 - tolerance) : Number.isNaN(mean)), "nightlight_numeric_pixel_invalid");
    const value = mask! <= 2 ? mean! : null;
    return { radianceMean: value, productBand: value === null ? null : nightLightBandForRadiance(value),
      validAreaFraction: valid!, sourceMissingAreaFraction: missing!, insufficientCoverageAreaFraction: coverage!, publishedAreaFraction: published!, qualityMask: mask!,
      state: mask === 1 ? "AVAILABLE" : mask === 2 ? "PARTIAL" : "UNAVAILABLE",
      reason: mask! <= 2 ? null : mask === 3 ? "INSUFFICIENT_COVERAGE" : mask === 4 ? "SOURCE_MISSING" : mask === 5 ? "UNPUBLISHED" : "INSUFFICIENT_VALID_AREA",
      datasetVersion: proof.datasetVersion, methodVersion: proof.methodVersion, statistic: proof.statistic, unit: proof.unit, publicationId: proof.publicationId };
  } finally { await tiff.close(); }
}
