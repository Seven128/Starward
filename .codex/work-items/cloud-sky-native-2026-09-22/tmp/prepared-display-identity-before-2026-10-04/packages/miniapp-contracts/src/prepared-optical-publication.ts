import { OPTICAL_IMAGE_LEVELS, type OpticalImageLevel, type OpticalContentIdentity,
  opticalPublicationContentHash, opticalContentHashPattern, isOpticalContentIdentity,
  isOpticalPublicationText, isOpticalHttpsLink } from "./optical-publication-content.ts";

/** Prepared historical observation colour is independent of calibrated gri
 * science. Structural admission never adopts source quality or astrometry. */
export const PREPARED_OPTICAL_VERSION = "prepared-optical-v1" as const;
export interface PreparedOpticalAvmGeometry {
  referenceDimension: [number, number]; referencePixel: [number, number];
  referenceValue: [number, number]; scale: [number, number]; rotation: number;
  decodedShapeWidthHeight: [number, number]; resizeCommonXFactor: number; resizeYFactor: number;
  crpixFitsOneBased: [number, number]; cdeltDegrees: [number, number];
  spatialNotes: string | null; spatialQuality: string | null;
  accuracy: "UNVERIFIED_APPROXIMATE_PUBLISHER_AVM";
}
export interface PreparedOpticalAsset extends OpticalContentIdentity {
  file: string; format: "png"; pixels: 512; fieldDegrees: number; crpixFitsOneBased: 256.5;
  displayAlpha: "geometric-source-area"; scientificAvailability: "UNKNOWN";
  masterRgbaSha256: string;
  masterCrop: { boundsXYExclusive: [number, number, number, number]; boxFactor: 1 | 2 | 4 };
  geometricMasterSupportPixels: number;
  alphaPixels: { opaque: number; partial: number; zero: number };
}
export interface PreparedOpticalPublication {
  schemaVersion: "prepared-observation-optical-publication-v1";
  imageVersion: typeof PREPARED_OPTICAL_VERSION;
  publicationId: string; objectRef: string;
  center: { raDeg: number; decDeg: number; frame: "ICRS J2000" };
  orientation: "north-up/east-left";
  source: {
    resourceId: string; sourceUrl: string; metadataReferenceUrl: string;
    credit: string; license: "CC BY 4.0"; licenseUrl: string; policyUrl: string; colourMeaning: string;
    encodedJpeg: OpticalContentIdentity; rawXmp: OpticalContentIdentity; parserXmp: OpticalContentIdentity;
    decodedRgb: OpticalContentIdentity & { shape: [number, number, 3]; rowOrder: "top-first" };
    nominalAvm: PreparedOpticalAvmGeometry;
  };
  processing: {
    runtimeNetwork: "forbidden"; modification: string; coverage: string;
    sourceAdapterVersion: "prepared-rgb-observation-avm-v1";
    producerVersion: "prepared-rgb-tan-master-v1";
    /** Complete upstream generation receipt, not an inferred mask/quality score. */
    producerReceipt: OpticalContentIdentity;
    sampleOffsetsDyDx: [[-.25, -.25], [-.25, .25], [.25, -.25], [.25, .25]];
    sampling: "encoded-RGB-bilinear-all-four-neighbours";
    levelResampling: "geometry-premultiplied-integer-box-round-to-nearest";
    validation: "BOUND_MASTER_AND_LEVELS_CHECKED";
  };
  master: {
    pixels: 2048; fieldDegrees: number; crpixFitsOneBased: 1024.5;
    /** Decoded top-first uint8 RGBA payload, excluding the NPY header. */
    rgba: OpticalContentIdentity;
    /** Offline serialized container. Its file bytes/hash never stand for
     * decoded payload identity or client/native residency. */
    rgbaNpy: OpticalContentIdentity & { format: "npy"; shape: [2048, 2048, 4];
      dtype: "uint8"; rowOrder: "top-first" };
    geometricSupportPixels: number;
    geometricBlackPixels: number; scientificAvailability: "UNKNOWN"; scientificValidity: "UNKNOWN";
    unit: "published-encoded-RGB";
  };
  levels: Record<OpticalImageLevel, PreparedOpticalAsset>;
}
export type PreparedOpticalManifest = Omit<PreparedOpticalPublication, "levels"> & {
  publicationHash: string;
  levels: Record<OpticalImageLevel, PreparedOpticalAsset & { downloadUrl: string }>;
};

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const positive = (value: unknown): value is number => finite(value) && value > 0;
const count = (value: unknown, maximum: number): value is number => typeof value === "number" &&
  Number.isSafeInteger(value) && value >= 0 && value <= maximum;
const pair = (value: unknown): value is [number, number] => Array.isArray(value) && value.length === 2 && value.every(finite);
const close = (a: number, b: number) => Math.abs(a - b) <= 1e-12 * Math.max(Math.abs(a), Math.abs(b), 1);
const nullableText = (value: unknown) => value === null || isOpticalPublicationText(value);

function nominalGeometry(value: PreparedOpticalAvmGeometry | null | undefined): boolean {
  if (!value || value.accuracy !== "UNVERIFIED_APPROXIMATE_PUBLISHER_AVM" ||
    ![value.referenceDimension, value.referencePixel, value.referenceValue, value.scale,
      value.decodedShapeWidthHeight, value.crpixFitsOneBased, value.cdeltDegrees].every(pair) ||
    !finite(value.rotation) || !positive(value.resizeCommonXFactor) || !positive(value.resizeYFactor) ||
    value.referenceDimension.some(v => !positive(v)) || value.decodedShapeWidthHeight.some(v => !Number.isSafeInteger(v) || v <= 1) ||
    value.referenceValue[0] < 0 || value.referenceValue[0] >= 360 || Math.abs(value.referenceValue[1]) > 90 ||
    !(value.scale[0] < 0 && value.scale[1] > 0 && value.cdeltDegrees[0] < 0 && value.cdeltDegrees[1] > 0) ||
    !nullableText(value.spatialNotes) || !nullableText(value.spatialQuality)) return false;
  // The AVM source adapter preserves each declared axis scale. Real prepared
  // observations may have non-square pixels; only the resize factor is common.
  // Never equalize source scales or weaken the per-axis CDELT relation below.
  const factor = value.decodedShapeWidthHeight[0] / value.referenceDimension[0];
  return close(value.resizeCommonXFactor, factor) &&
    close(value.resizeYFactor, value.decodedShapeWidthHeight[1] / value.referenceDimension[1]) &&
    value.crpixFitsOneBased.every((v, i) => close(v, value.referencePixel[i]! * factor)) &&
    value.cdeltDegrees.every((v, i) => close(v, value.scale[i]! / factor));
}

/** Only the enclosing hash and download URLs are transport fields. Source
 * credit, uncertainty, source bytes, geometry and processing remain content. */
export function preparedOpticalPublicationHash(value: PreparedOpticalPublication): string {
  const { publicationHash: _hash, ...root } = value as PreparedOpticalManifest;
  const levels = Object.fromEntries(OPTICAL_IMAGE_LEVELS.map(level => {
    const { downloadUrl: _url, ...asset } = root.levels[level] as PreparedOpticalManifest["levels"][OpticalImageLevel];
    return [level, asset];
  }));
  return opticalPublicationContentHash({ ...root, levels });
}

/** Supported producer structure only. The caller still pins a reviewed
 * publication; a fresh hash cannot authorize a new source or scientific claim. */
export function assertPreparedOpticalPublication(value: unknown, reference: string,
  expectedHash?: string): asserts value is PreparedOpticalPublication {
  const root = value as PreparedOpticalPublication | null;
  const invalid = () => { throw new Error("prepared_optical_publication_invalid"); };
  if (!root || !/^M:(?:[1-9]|[1-9]\d|10\d|110)$/u.test(reference) || root.objectRef !== reference ||
    root.schemaVersion !== "prepared-observation-optical-publication-v1" || root.imageVersion !== PREPARED_OPTICAL_VERSION ||
    !isOpticalPublicationText(root.publicationId) || /[:/\\]/u.test(root.publicationId) ||
    root.orientation !== "north-up/east-left" || root.center?.frame !== "ICRS J2000" ||
    !finite(root.center.raDeg) || root.center.raDeg < 0 || root.center.raDeg >= 360 ||
    !finite(root.center.decDeg) || Math.abs(root.center.decDeg) > 90) return invalid();
  const source = root.source;
  if (!source || ![source.resourceId, source.credit, source.colourMeaning].every(isOpticalPublicationText) ||
    ![source.sourceUrl, source.metadataReferenceUrl, source.policyUrl].every(isOpticalHttpsLink) ||
    source.license !== "CC BY 4.0" || source.licenseUrl !== "https://creativecommons.org/licenses/by/4.0/" ||
    ![source.encodedJpeg, source.rawXmp, source.parserXmp, source.decodedRgb].every(isOpticalContentIdentity) ||
    !nominalGeometry(source.nominalAvm) || !Array.isArray(source.decodedRgb.shape) || source.decodedRgb.shape.length !== 3 ||
    source.decodedRgb.rowOrder !== "top-first" || source.decodedRgb.shape[2] !== 3 ||
    source.decodedRgb.shape[0] !== source.nominalAvm.decodedShapeWidthHeight[1] ||
    source.decodedRgb.shape[1] !== source.nominalAvm.decodedShapeWidthHeight[0] ||
    source.decodedRgb.bytes !== source.decodedRgb.shape[0] * source.decodedRgb.shape[1] * 3) return invalid();
  const processing = root.processing;
  if (!processing || processing.runtimeNetwork !== "forbidden" ||
    ![processing.modification, processing.coverage].every(isOpticalPublicationText) ||
    processing.sourceAdapterVersion !== "prepared-rgb-observation-avm-v1" ||
    processing.producerVersion !== "prepared-rgb-tan-master-v1" || !isOpticalContentIdentity(processing.producerReceipt) ||
    processing.sampling !== "encoded-RGB-bilinear-all-four-neighbours" ||
    processing.levelResampling !== "geometry-premultiplied-integer-box-round-to-nearest" ||
    processing.validation !== "BOUND_MASTER_AND_LEVELS_CHECKED" ||
    JSON.stringify(processing.sampleOffsetsDyDx) !== "[[-0.25,-0.25],[-0.25,0.25],[0.25,-0.25],[0.25,0.25]]") return invalid();
  const master = root.master;
  if (!master || master.pixels !== 2048 || master.crpixFitsOneBased !== 1024.5 ||
    !positive(master.fieldDegrees) || master.fieldDegrees > 4 || !isOpticalContentIdentity(master.rgba) ||
    master.rgba.bytes !== master.pixels ** 2 * 4 || !isOpticalContentIdentity(master.rgbaNpy) ||
    master.rgbaNpy.format !== "npy" || master.rgbaNpy.dtype !== "uint8" || master.rgbaNpy.rowOrder !== "top-first" ||
    JSON.stringify(master.rgbaNpy.shape) !== "[2048,2048,4]" || master.rgbaNpy.bytes <= master.rgba.bytes ||
    master.rgbaNpy.bytes > master.rgba.bytes + 16384 ||
    !count(master.geometricSupportPixels, 2048 ** 2) || master.geometricSupportPixels === 0 ||
    !count(master.geometricBlackPixels, master.geometricSupportPixels) || master.unit !== "published-encoded-RGB" ||
    master.scientificAvailability !== "UNKNOWN" || master.scientificValidity !== "UNKNOWN" || !root.levels ||
    Object.keys(root.levels).sort().join() !== "DETAIL,MEDIUM,OVERVIEW") return invalid();
  for (const [index, level] of OPTICAL_IMAGE_LEVELS.entries()) {
    const asset = root.levels[level], extent = 2048 / 2 ** index, start = (2048 - extent) / 2, factor = extent / 512;
    const field = Math.atan(Math.tan(master.fieldDegrees * Math.PI / 360) * extent / 2048) * 360 / Math.PI;
    if (!isOpticalContentIdentity(asset) || asset.file !== `${reference.replace(":", "-")}-${level.toLowerCase()}.png` ||
      asset.format !== "png" || asset.pixels !== 512 || asset.crpixFitsOneBased !== 256.5 ||
      asset.displayAlpha !== "geometric-source-area" || asset.scientificAvailability !== "UNKNOWN" ||
      asset.masterRgbaSha256 !== master.rgba.sha256 || !finite(asset.fieldDegrees) || !close(asset.fieldDegrees, field) ||
      asset.masterCrop?.boxFactor !== factor ||
      JSON.stringify(asset.masterCrop.boundsXYExclusive) !== JSON.stringify([start, start, start + extent, start + extent]) ||
      !count(asset.geometricMasterSupportPixels, extent ** 2) || !asset.alphaPixels ||
      ![asset.alphaPixels.opaque, asset.alphaPixels.partial, asset.alphaPixels.zero].every(v => count(v, 512 ** 2)) ||
      asset.alphaPixels.opaque + asset.alphaPixels.partial + asset.alphaPixels.zero !== 512 ** 2) return invalid();
    // Supported integer box factors retain exact binary source-stencil areas.
    // Black RGB with opaque alpha remains geometry; no brightness mask exists.
    const minimum = asset.alphaPixels.opaque * factor ** 2 + asset.alphaPixels.partial;
    const maximum = asset.alphaPixels.opaque * factor ** 2 + asset.alphaPixels.partial * (factor ** 2 - 1);
    if (asset.geometricMasterSupportPixels < minimum || asset.geometricMasterSupportPixels > maximum ||
      (factor === 1 && asset.alphaPixels.partial !== 0) ||
      (level === "OVERVIEW" && asset.geometricMasterSupportPixels !== master.geometricSupportPixels)) return invalid();
    if (index > 0) {
      const parent = root.levels[OPTICAL_IMAGE_LEVELS[index - 1]!];
      if (asset.geometricMasterSupportPixels > parent.geometricMasterSupportPixels ||
        parent.geometricMasterSupportPixels - asset.geometricMasterSupportPixels > (extent * 2) ** 2 - extent ** 2) return invalid();
    }
  }
  const actualHash = preparedOpticalPublicationHash(root);
  if (expectedHash !== undefined && (!opticalContentHashPattern.test(expectedHash) || actualHash !== expectedHash)) return invalid();
}

export function assertPreparedOpticalManifest(value: unknown, reference: string,
  expectedHash: string): asserts value is PreparedOpticalManifest {
  assertPreparedOpticalPublication(value, reference, expectedHash);
  const root = value as PreparedOpticalManifest;
  if (root.publicationHash !== expectedHash || OPTICAL_IMAGE_LEVELS.some(level =>
    root.levels[level].downloadUrl !== `/v2/sky/prepared-optical/${expectedHash}/${root.levels[level].file}`))
    throw new Error("prepared_optical_manifest_invalid");
}
