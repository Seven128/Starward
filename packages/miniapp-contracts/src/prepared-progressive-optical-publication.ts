import { OPTICAL_IMAGE_LEVELS, type OpticalImageLevel, type OpticalContentIdentity,
  isOpticalContentIdentity, isOpticalPublicationText, opticalContentHashPattern,
  opticalPublicationContentHash } from "./optical-publication-content.ts";
import { preparedOpticalContentHash, type PreparedOpticalAsset, type PreparedOpticalGeometry } from "./prepared-optical-common.ts";
import { assertPreparedOpticalPublication, type PreparedOpticalPublication } from "./prepared-optical-publication.ts";

/** Measured 512/1024/1024 profile. Two grids of the same encoded observation;
 * this neither relabels the original same-master v1 nor creates new detail. */
export interface PreparedProgressiveOpticalAsset extends Omit<PreparedOpticalAsset, "pixels" | "crpixFitsOneBased" | "masterCrop"> {
  pixels: 512 | 1024; crpixFitsOneBased: 256.5 | 512.5;
  samplingGrid: "master" | "fine";
  masterCrop: { boundsXYExclusive: [number, number, number, number]; boxFactor: 1 | 4 };
}
export interface PreparedProgressiveOpticalPublication extends PreparedOpticalGeometry<"published-encoded-RGB", PreparedProgressiveOpticalAsset> {
  schemaVersion: "prepared-observation-optical-publication-v2";
  imageVersion: "prepared-optical-v2";
  /** Immutable v1 supplies the already verified wide grid/source, including
   * its original levels and receipt. It is provenance, not a runtime download. */
  parent: { publicationHash: string; publication: PreparedOpticalPublication };
  fineGrid: {
    pixels: 1024; fieldDegrees: number; crpixFitsOneBased: 512.5;
    rgba: OpticalContentIdentity;
    rgbaNpy: OpticalContentIdentity & { format: "npy"; shape: [1024, 1024, 4]; dtype: "uint8"; rowOrder: "top-first" };
    producerMetadata: OpticalContentIdentity; producerReceipt: OpticalContentIdentity;
    sourceRgbSha256: string; sourceAvmHash: string;
    geometricSupportPixels: number; geometricBlackPixels: number;
    scientificAvailability: "UNKNOWN"; scientificValidity: "UNKNOWN"; unit: "published-encoded-RGB";
  };
  processing: Omit<PreparedOpticalPublication["processing"], "producerVersion" | "validation"> & {
    producerVersion: "prepared-rgb-tan-progressive-v2";
    validation: "BOUND_SAME_SOURCE_GRIDS_AND_LEVELS_CHECKED";
  };
}
export type PreparedProgressiveOpticalManifest = Omit<PreparedProgressiveOpticalPublication, "levels"> & {
  publicationHash: string;
  levels: Record<OpticalImageLevel, PreparedProgressiveOpticalAsset & { downloadUrl: string }>;
};

const count = (value: unknown, max: number) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= max;
const close = (a: number, b: number) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 1e-12 * Math.max(1, Math.abs(a), Math.abs(b));
const equal = (a: unknown, b: unknown) => {
  try { return opticalPublicationContentHash(a) === opticalPublicationContentHash(b); } catch { return false; }
};

export function preparedProgressiveOpticalPublicationHash(value: PreparedProgressiveOpticalPublication): string {
  return preparedOpticalContentHash(value);
}

export function assertPreparedProgressiveOpticalPublication(value: unknown, reference: string,
  expectedHash?: string): asserts value is PreparedProgressiveOpticalPublication {
  const root = value as PreparedProgressiveOpticalPublication | null;
  const invalid = () => { throw new Error("prepared_progressive_optical_publication_invalid"); };
  if (!root || root.imageVersion !== "prepared-optical-v2" || root.schemaVersion !== "prepared-observation-optical-publication-v2" ||
    !isOpticalPublicationText(root.publicationId) || /[:/\\]/u.test(root.publicationId) || !root.parent) return invalid();
  const parent = root.parent.publication;
  try {
    if (!opticalContentHashPattern.test(root.parent.publicationHash)) return invalid();
    assertPreparedOpticalPublication(parent, reference, root.parent.publicationHash);
    if ("publicationHash" in parent || OPTICAL_IMAGE_LEVELS.some(level => "downloadUrl" in parent.levels[level])) return invalid();
    for (const key of ["objectRef", "center", "orientation", "source", "master"] as const)
      if (!equal(root[key], parent[key])) return invalid();
  } catch { return invalid(); }
  const fine = root.fineGrid, max = 1024 ** 2;
  if (!fine || fine.pixels !== 1024 || fine.crpixFitsOneBased !== 512.5 ||
    !close(fine.fieldDegrees, parent.levels.DETAIL.fieldDegrees) ||
    ![fine.rgba, fine.rgbaNpy, fine.producerMetadata, fine.producerReceipt].every(isOpticalContentIdentity) ||
    fine.rgba.bytes !== max * 4 || fine.rgbaNpy.bytes <= fine.rgba.bytes || fine.rgbaNpy.bytes > fine.rgba.bytes + 16384 ||
    fine.rgbaNpy.format !== "npy" || fine.rgbaNpy.dtype !== "uint8" || fine.rgbaNpy.rowOrder !== "top-first" ||
    JSON.stringify(fine.rgbaNpy.shape) !== "[1024,1024,4]" ||
    fine.sourceRgbSha256 !== root.source.decodedRgb.sha256 || fine.sourceAvmHash !== opticalPublicationContentHash(root.source.nominalAvm) ||
    !count(fine.geometricSupportPixels, max) || fine.geometricSupportPixels === 0 ||
    !count(fine.geometricBlackPixels, fine.geometricSupportPixels) || fine.scientificAvailability !== "UNKNOWN" ||
    fine.scientificValidity !== "UNKNOWN" || fine.unit !== "published-encoded-RGB") return invalid();
  const p = root.processing;
  if (!p || p.runtimeNetwork !== "forbidden" || p.sourceAdapterVersion !== parent.processing.sourceAdapterVersion ||
    p.producerVersion !== "prepared-rgb-tan-progressive-v2" || !isOpticalContentIdentity(p.producerReceipt) ||
    p.validation !== "BOUND_SAME_SOURCE_GRIDS_AND_LEVELS_CHECKED" ||
    ![p.modification, p.coverage].every(isOpticalPublicationText) || p.sampling !== parent.processing.sampling ||
    p.levelResampling !== parent.processing.levelResampling || !equal(p.sampleOffsetsDyDx, parent.processing.sampleOffsetsDyDx) ||
    !root.levels || Object.keys(root.levels).sort().join() !== "DETAIL,MEDIUM,OVERVIEW") return invalid();
  for (const level of OPTICAL_IMAGE_LEVELS) {
    const a = root.levels[level], pixels = level === "OVERVIEW" ? 512 : 1024;
    const fineLevel = level === "DETAIL", factor = level === "OVERVIEW" ? 4 : 1;
    const bounds = level === "OVERVIEW" ? [0, 0, 2048, 2048] : fineLevel ? [0, 0, 1024, 1024] : [512, 512, 1536, 1536];
    if (!a || !isOpticalContentIdentity(a) || a.file !== parent.levels[level].file || a.format !== "png" ||
      a.pixels !== pixels || a.crpixFitsOneBased !== (pixels + 1) / 2 ||
      !close(a.fieldDegrees, parent.levels[level].fieldDegrees) || a.displayAlpha !== "geometric-source-area" ||
      a.scientificAvailability !== "UNKNOWN" || a.samplingGrid !== (fineLevel ? "fine" : "master") ||
      a.masterRgbaSha256 !== (fineLevel ? fine.rgba.sha256 : root.master.rgba.sha256) ||
      a.masterCrop?.boxFactor !== factor || JSON.stringify(a.masterCrop.boundsXYExclusive) !== JSON.stringify(bounds) ||
      !a.alphaPixels || ![a.alphaPixels.opaque, a.alphaPixels.partial, a.alphaPixels.zero].every(n => count(n, pixels ** 2)) ||
      a.alphaPixels.opaque + a.alphaPixels.partial + a.alphaPixels.zero !== pixels ** 2 ||
      !count(a.geometricMasterSupportPixels, (pixels * factor) ** 2)) return invalid();
    if (level === "OVERVIEW") {
      const { samplingGrid: _grid, downloadUrl: _url, ...asset } = a as PreparedProgressiveOpticalAsset & { downloadUrl?: string };
      if (!equal(asset, parent.levels.OVERVIEW)) return invalid();
    } else if (a.alphaPixels.partial !== 0 || a.geometricMasterSupportPixels !== a.alphaPixels.opaque ||
      (fineLevel ? a.geometricMasterSupportPixels !== fine.geometricSupportPixels :
        a.geometricMasterSupportPixels > root.master.geometricSupportPixels ||
        root.master.geometricSupportPixels - a.geometricMasterSupportPixels > 2048 ** 2 - 1024 ** 2)) return invalid();
  }
  if (expectedHash !== undefined && (!opticalContentHashPattern.test(expectedHash) ||
    preparedProgressiveOpticalPublicationHash(root) !== expectedHash)) return invalid();
}

export function assertPreparedProgressiveOpticalManifest(value: unknown, reference: string,
  expectedHash: string): asserts value is PreparedProgressiveOpticalManifest {
  assertPreparedProgressiveOpticalPublication(value, reference, expectedHash);
  const root = value as PreparedProgressiveOpticalManifest;
  if (root.publicationHash !== expectedHash || OPTICAL_IMAGE_LEVELS.some(level =>
    root.levels[level].downloadUrl !== `/v2/sky/prepared-optical/${expectedHash}/${root.levels[level].file}`))
    throw new Error("prepared_progressive_optical_manifest_invalid");
}
