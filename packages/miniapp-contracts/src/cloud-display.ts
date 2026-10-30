import { DISPLAY_RASTER_GRID, displayRasterWindowBounds, displayRasterWindowKey,
  type DisplayRasterWindow, type RasterBounds } from "@starward/coordinate-system";
import { CLOUD_SAMPLING_POLICY, cloudInstant, cloudTimeBracket, type CloudNativeTime } from "./cloud-grid.ts";
import { utf8ContentIntegrity } from "./utf8-content-integrity.ts";

export const CLOUD_DISPLAY_STYLE = "total-cloud-existing-three-band-v1" as const;
export const CLOUD_DISPLAY_COORDINATE_MEANING = "GCJ-02 display pixels sampled from WGS84 numeric grid" as const;
/** These are the existing offline producer's finite batch bounds, not a
 * nationwide product specification or a client/native memory allowance. */
export const CLOUD_DISPLAY_MAXIMUM_WINDOWS = 16;
export const CLOUD_DISPLAY_MAXIMUM_TIMES = 289;

export interface CloudDisplayNumericSource {
  publicationId: string;
  manifestSha256: string;
  runAt: string;
  frames: readonly (CloudNativeTime & { values: { sha256: string } })[];
}
export interface CloudDisplayBracket {
  lowerAt: string; upperAt: string; fraction: number;
  lowerValuesSha256: string; upperValuesSha256: string;
}
export interface CloudDisplayWindowDescriptor {
  schemaVersion: "starward-cloud-display-window-v1";
  sourceManifestSha256: string;
  sourcePublicationId: string;
  runAt: string;
  selectedAt: string;
  brackets: CloudDisplayBracket;
  samplingPolicy: typeof CLOUD_SAMPLING_POLICY;
  coordinateMeaning: typeof CLOUD_DISPLAY_COORDINATE_MEANING;
  styleVersion: typeof CLOUD_DISPLAY_STYLE;
  codeHashes: string[];
  window: DisplayRasterWindow;
  boundsGcj02: RasterBounds;
  width: number; height: number;
  validPixels: number; zeroPixels: number; missingPixels: number;
  imageSha256: string;
}
export interface CloudDisplayWindowProof extends CloudDisplayWindowDescriptor {
  publicationId: string;
  image: { file: string; bytes: number; sha256: string };
}
export interface CloudDisplayInventoryRecord {
  windowKey: string; selectedAt: string; file: string; bytes: number;
  width: number; height: number; validPixels: number; proofSha256: string;
}
export interface CloudDisplayInventory {
  schemaVersion: "starward-cloud-display-inventory-v1";
  publicationId: string;
  sourcePublicationId: string;
  sourceManifestSha256: string;
  records: CloudDisplayInventoryRecord[];
}

/** Cloud has its own unit, native time and missing-data contract. Annual
 * night-light MapLayerRaster and the legacy point snapshot keep their meaning.
 * imageUrl is supplied only by the later qualified static publication owner. */
export interface MapCloudRaster {
  schemaVersion: "map-cloud-raster-v1";
  publicationId: string;
  sourcePublicationId: string;
  sourceManifestSha256: string;
  runAt: string;
  /** The Context's complete-future-240h deadline, not a qualification of the
   * latest run or of continuous acquisition/publication timeliness. */
  sourceValidUntil: string;
  selectedAt: string;
  brackets: CloudDisplayBracket;
  samplingPolicy: typeof CLOUD_SAMPLING_POLICY;
  nativeGrid: { crs: "WGS84"; registration: "grid-point-centres"; resolutionDegrees: 0.1 };
  coordinateGrid: typeof DISPLAY_RASTER_GRID;
  window: DisplayRasterWindow;
  boundsGcj02: RasterBounds;
  width: number; height: number;
  styleVersion: typeof CLOUD_DISPLAY_STYLE;
  unit: "%";
  validPixelCount: number; zeroPixelCount: number; missingPixelCount: number;
  imageUrl: string;
  imageBytes: number; imageSha256: string;
}
export type PreparedMapCloudRaster = Omit<MapCloudRaster, "imageUrl">;

const fail = (code: string): never => { throw new Error(`cloud_display_${code}`); };
const hash = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
const exact = (value: unknown, fields: readonly string[]): boolean => value !== null && typeof value === "object"
  && !Array.isArray(value) && Object.keys(value).sort().join() === [...fields].sort().join();
const count = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const canonicalInstant = (value: unknown): value is string => typeof value === "string" && cloudInstant(value) === value;
const digest = (value: unknown) => utf8ContentIntegrity(JSON.stringify(value)).sha256;
const descriptorFields = ["schemaVersion", "sourceManifestSha256", "sourcePublicationId", "runAt", "selectedAt", "brackets",
  "samplingPolicy", "coordinateMeaning", "styleVersion", "codeHashes", "window", "boundsGcj02", "width", "height",
  "validPixels", "zeroPixels", "missingPixels", "imageSha256"] as const;

/** Preserve the producer's original v1 serialization and therefore existing
 * immutable pilot identities; this does not rehash or rewrite a stored proof. */
export function cloudDisplayDescriptor(proof: CloudDisplayWindowDescriptor): CloudDisplayWindowDescriptor {
  return { schemaVersion: proof.schemaVersion, sourceManifestSha256: proof.sourceManifestSha256,
    sourcePublicationId: proof.sourcePublicationId, runAt: proof.runAt, selectedAt: proof.selectedAt,
    brackets: proof.brackets, samplingPolicy: proof.samplingPolicy, coordinateMeaning: proof.coordinateMeaning,
    styleVersion: proof.styleVersion, codeHashes: proof.codeHashes, window: proof.window, boundsGcj02: proof.boundsGcj02,
    width: proof.width, height: proof.height, validPixels: proof.validPixels, zeroPixels: proof.zeroPixels,
    missingPixels: proof.missingPixels, imageSha256: proof.imageSha256 };
}

export function assertCloudDisplayProof(value: unknown, source: CloudDisplayNumericSource): CloudDisplayWindowProof {
  const proof = value as CloudDisplayWindowProof;
  if (!exact(proof, [...descriptorFields, "publicationId", "image"]) || proof.schemaVersion !== "starward-cloud-display-window-v1"
    || !hash(proof.sourceManifestSha256) || proof.sourceManifestSha256 !== source.manifestSha256
    || proof.sourcePublicationId !== source.publicationId || proof.runAt !== source.runAt
    || !canonicalInstant(proof.runAt) || !canonicalInstant(proof.selectedAt)
    || proof.samplingPolicy !== CLOUD_SAMPLING_POLICY || proof.coordinateMeaning !== CLOUD_DISPLAY_COORDINATE_MEANING
    || proof.styleVersion !== CLOUD_DISPLAY_STYLE || !Array.isArray(proof.codeHashes) || ![6, 8].includes(proof.codeHashes.length)
    || !proof.codeHashes.every(hash) || !hash(proof.imageSha256)) fail("proof_invalid");
  const bracket = cloudTimeBracket(source.frames, source.runAt, proof.selectedAt), declared = proof.brackets;
  if (!bracket || !exact(declared, ["lowerAt", "upperAt", "fraction", "lowerValuesSha256", "upperValuesSha256"])
    || declared.lowerAt !== bracket.lowerAt || declared.upperAt !== bracket.upperAt || declared.fraction !== bracket.fraction
    || declared.lowerValuesSha256 !== source.frames[bracket.lowerIndex]?.values.sha256
    || declared.upperValuesSha256 !== source.frames[bracket.upperIndex]?.values.sha256) fail("bracket_mismatch");
  if (!exact(proof.window, ["grid", "zoom", "x", "y", "columns", "rows", "tilePixels"])) fail("window_invalid");
  const bounds = displayRasterWindowBounds(proof.window);
  if (proof.window.columns > 3 || proof.window.rows > 3 || proof.width !== proof.window.columns * 256
    || proof.height !== proof.window.rows * 256 || !exact(proof.boundsGcj02, ["west", "east", "north", "south"])
    || (Object.keys(bounds) as (keyof RasterBounds)[]).some(key => proof.boundsGcj02[key] !== bounds[key])
    || !count(proof.validPixels) || !count(proof.zeroPixels) || !count(proof.missingPixels)
    || proof.validPixels + proof.missingPixels !== proof.width * proof.height || proof.zeroPixels > proof.validPixels) fail("geometry_or_quality_invalid");
  const identity = digest(cloudDisplayDescriptor(proof));
  if (proof.publicationId !== `cloud-display:${identity}` || !exact(proof.image, ["file", "bytes", "sha256"])
    || proof.image.file !== `cloud-${identity}.png` || proof.image.sha256 !== proof.imageSha256
    || !Number.isSafeInteger(proof.image.bytes) || proof.image.bytes < 1 || proof.image.bytes > 16 * 1024 * 1024) fail("image_identity_invalid");
  return proof;
}

export function createCloudDisplayProof(descriptor: CloudDisplayWindowDescriptor, imageBytes: number,
  source: CloudDisplayNumericSource): CloudDisplayWindowProof {
  const content = cloudDisplayDescriptor(descriptor), identity = digest(content);
  return assertCloudDisplayProof({ ...content, publicationId: `cloud-display:${identity}`,
    image: { file: `cloud-${identity}.png`, bytes: imageBytes, sha256: content.imageSha256 } }, source);
}

export function assertCloudDisplayInventory(value: unknown, source: CloudDisplayNumericSource): CloudDisplayInventory {
  const inventory = value as CloudDisplayInventory;
  if (!exact(inventory, ["schemaVersion", "publicationId", "sourcePublicationId", "sourceManifestSha256", "records"])
    || inventory.schemaVersion !== "starward-cloud-display-inventory-v1" || !hash(inventory.sourceManifestSha256)
    || inventory.sourceManifestSha256 !== source.manifestSha256 || inventory.sourcePublicationId !== source.publicationId
    || !Array.isArray(inventory.records) || inventory.records.length < 1
    || inventory.records.length > CLOUD_DISPLAY_MAXIMUM_WINDOWS * CLOUD_DISPLAY_MAXIMUM_TIMES) fail("inventory_invalid");
  const windows = new Map<string, Set<string>>();
  for (const record of inventory.records) {
    if (!exact(record, ["windowKey", "selectedAt", "file", "bytes", "width", "height", "validPixels", "proofSha256"])
      || typeof record.windowKey !== "string" || !/^\d{1,2}-\d{1,4}-\d{1,4}-[1-3]-[1-3]$/u.test(record.windowKey)
      || !canonicalInstant(record.selectedAt) || !cloudTimeBracket(source.frames, source.runAt, record.selectedAt)
      || !/^cloud-[a-f0-9]{64}\.png$/u.test(record.file) || !Number.isSafeInteger(record.bytes)
      || record.bytes < 1 || record.bytes > 16 * 1024 * 1024 || ![256, 512, 768].includes(record.width)
      || ![256, 512, 768].includes(record.height) || !count(record.validPixels)
      || record.validPixels > record.width * record.height || !hash(record.proofSha256)) fail("inventory_record_invalid");
    const times = windows.get(record.windowKey) ?? new Set<string>();
    if (times.has(record.selectedAt)) fail("inventory_duplicate");
    times.add(record.selectedAt); windows.set(record.windowKey, times);
    if (times.size > CLOUD_DISPLAY_MAXIMUM_TIMES || windows.size > CLOUD_DISPLAY_MAXIMUM_WINDOWS) fail("inventory_invalid");
  }
  if (inventory.publicationId !== `cloud-display-inventory:${digest({ source: inventory.sourceManifestSha256, records: inventory.records })}`)
    fail("inventory_identity_invalid");
  return inventory;
}

export function createCloudDisplayInventory(source: CloudDisplayNumericSource,
  records: CloudDisplayInventoryRecord[]): CloudDisplayInventory {
  return assertCloudDisplayInventory({ schemaVersion: "starward-cloud-display-inventory-v1",
    publicationId: `cloud-display-inventory:${digest({ source: source.manifestSha256, records })}`,
    sourcePublicationId: source.publicationId, sourceManifestSha256: source.manifestSha256, records }, source);
}

export function assertCloudDisplayRecord(record: CloudDisplayInventoryRecord, proof: CloudDisplayWindowProof) {
  if (record.windowKey !== displayRasterWindowKey(proof.window) || record.selectedAt !== proof.selectedAt
    || record.file !== proof.image.file || record.bytes !== proof.image.bytes || record.width !== proof.width
    || record.height !== proof.height || record.validPixels !== proof.validPixels) fail("record_proof_mismatch");
}
