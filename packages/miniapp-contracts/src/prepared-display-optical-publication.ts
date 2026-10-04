import { OPTICAL_IMAGE_LEVELS, type OpticalImageLevel, type OpticalContentIdentity,
  isOpticalContentIdentity, isOpticalPublicationText, isOpticalHttpsLink,
  opticalContentHashPattern, opticalPublicationContentHash } from "./optical-publication-content.ts";
import { isPreparedOpticalGeometry, preparedOpticalContentHash,
  type PreparedOpticalGeometry, type PreparedOpticalAsset } from "./prepared-optical-common.ts";
import { assertPreparedOpticalPublication, type PreparedOpticalPublication } from "./prepared-optical-publication.ts";

/** A display estimate from one historical sRGB observation. It supplies neither
 * new observed detail nor a calibrated sky/flux measurement. Raw v1 is retained. */
export const PREPARED_DISPLAY_OPTICAL_VERSION = "prepared-display-optical-v1" as const;
export interface PreparedDisplayOpticalPublication extends PreparedOpticalGeometry<"background-subtracted-display-sRGB"> {
  schemaVersion: "prepared-observation-display-optical-publication-v1";
  imageVersion: typeof PREPARED_DISPLAY_OPTICAL_VERSION;
  /** Full raw content, without transport URLs. No parent fetch/cache is required. */
  parent: { publicationHash: string; publication: PreparedOpticalPublication };
  processing: {
    runtimeNetwork: "forbidden"; modification: string; coverage: string;
    producerVersion: "prepared-source-masked-background-display-v1";
    producerReceipt: OpticalContentIdentity;
    generationReceipt: OpticalContentIdentity; generationScript: OpticalContentIdentity;
    colourTransferImplementation: OpticalContentIdentity;
    sourceIcc: OpticalContentIdentity & { colourSpace: "sRGB" };
    background: OpticalContentIdentity & {
      format: "npz"; member: "background.npy"; shape: [2048, 2048, 3]; dtype: "float64";
      rowOrder: "top-first"; payload: OpticalContentIdentity;
    };
    estimationMask: OpticalContentIdentity & {
      format: "npy"; shape: [2048, 2048]; dtype: "bool"; rowOrder: "top-first";
      pixels: number; detectedOnlyPixels: number;
      role: "background-estimation-exclusion-not-geometry-or-science";
    };
    /** Only the prior footprint excludes estimation cells; none of its RGB is
     * mixed into this image. This is not a complete faint-structure mask. */
    geometryExclusion: {
      metadata: OpticalContentIdentity; rgbaNpy: OpticalContentIdentity; rgba: OpticalContentIdentity;
      metadataReferenceUrl: string; credit: string; license: "CC BY 4.0"; licenseUrl: string;
      pixels: 2048; center: PreparedOpticalGeometry["center"]; fieldDegrees: number;
      supportPixels: number; role: "background-estimation-exclusion-only-no-RGB";
    };
    estimate: {
      method: "photutils-background2d-median-source-mask-v1"; photutilsVersion: "3.0.0";
      domain: "prepared-encoded-sRGB-byte-values";
      boxSize: [256, 256]; meshFilterSize: [3, 3]; sigmaClip: { sigma: 3; maxiters: 10 };
      detectNSigma: 2; detectNPixels: 10; dilateRadiusTargetPixels: 10;
    };
    subtraction: "sRGB-to-linear-subtract-linearized-estimate-clamp-negative-to-zero-encode-sRGB-round";
    negativeChannelPixels: [number, number, number];
    alpha: "unchanged-parent-geometric-support";
    levelResampling: "geometry-premultiplied-integer-box-round-to-nearest";
    validation: "BOUND_PARENT_FORMULA_ALPHA_AND_LEVELS_CHECKED";
  };
}
export type PreparedDisplayOpticalManifest = Omit<PreparedDisplayOpticalPublication, "levels"> & {
  publicationHash: string;
  levels: Record<OpticalImageLevel, PreparedOpticalAsset & { downloadUrl: string }>;
};

const equalContent = (a: unknown, b: unknown) => opticalPublicationContentHash(a) === opticalPublicationContentHash(b);
const count = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 2048 ** 2;
const serializedArray = (value: OpticalContentIdentity, bytes: number) =>
  isOpticalContentIdentity(value) && value.bytes > bytes && value.bytes <= bytes + 16384;

export function preparedDisplayOpticalPublicationHash(value: PreparedDisplayOpticalPublication): string {
  return preparedOpticalContentHash(value);
}

export function assertPreparedDisplayOpticalPublication(value: unknown, reference: string,
  expectedHash?: string): asserts value is PreparedDisplayOpticalPublication {
  const root = value as PreparedDisplayOpticalPublication | null;
  const invalid = () => { throw new Error("prepared_display_optical_publication_invalid"); };
  if (!root || root.schemaVersion !== "prepared-observation-display-optical-publication-v1" ||
    root.imageVersion !== PREPARED_DISPLAY_OPTICAL_VERSION ||
    !isPreparedOpticalGeometry(root, reference, "background-subtracted-display-sRGB") || !root.parent) return invalid();
  const parent = root.parent.publication;
  assertPreparedOpticalPublication(parent, reference, root.parent.publicationHash);
  // An embedded parent is raw content, not an unbound transport envelope.
  if (!opticalContentHashPattern.test(root.parent.publicationHash) || "publicationHash" in parent ||
    OPTICAL_IMAGE_LEVELS.some(level => "downloadUrl" in parent.levels[level]) ||
    !equalContent(root.source, parent.source) || !equalContent(root.center, parent.center) ||
    root.master.fieldDegrees !== parent.master.fieldDegrees ||
    root.master.geometricSupportPixels !== parent.master.geometricSupportPixels) return invalid();
  for (const level of OPTICAL_IMAGE_LEVELS) {
    const asset = root.levels[level], raw = parent.levels[level];
    if (asset.fieldDegrees !== raw.fieldDegrees || !equalContent(asset.masterCrop, raw.masterCrop) ||
      asset.geometricMasterSupportPixels !== raw.geometricMasterSupportPixels ||
      !equalContent(asset.alphaPixels, raw.alphaPixels)) return invalid();
  }
  const p = root.processing;
  if (!p || p.runtimeNetwork !== "forbidden" || ![p.modification, p.coverage].every(isOpticalPublicationText) ||
    p.producerVersion !== "prepared-source-masked-background-display-v1" ||
    ![p.producerReceipt, p.generationReceipt, p.generationScript, p.colourTransferImplementation, p.sourceIcc].every(isOpticalContentIdentity) ||
    p.sourceIcc.colourSpace !== "sRGB" ||
    p.subtraction !== "sRGB-to-linear-subtract-linearized-estimate-clamp-negative-to-zero-encode-sRGB-round" ||
    p.alpha !== "unchanged-parent-geometric-support" ||
    p.levelResampling !== "geometry-premultiplied-integer-box-round-to-nearest" ||
    p.validation !== "BOUND_PARENT_FORMULA_ALPHA_AND_LEVELS_CHECKED" ||
    !Array.isArray(p.negativeChannelPixels) || p.negativeChannelPixels.length !== 3 ||
    !p.negativeChannelPixels.every(v => count(v) && v <= root.master.geometricSupportPixels)) return invalid();
  const b = p.background, mask = p.estimationMask, guard = p.geometryExclusion, recipe = p.estimate;
  if (!isOpticalContentIdentity(b) || b.bytes > 128 * 1024 * 1024 || b.format !== "npz" ||
    b.member !== "background.npy" || b.dtype !== "float64" || b.rowOrder !== "top-first" ||
    JSON.stringify(b.shape) !== "[2048,2048,3]" || !isOpticalContentIdentity(b.payload) || b.payload.bytes !== 2048 ** 2 * 3 * 8 ||
    !serializedArray(mask, 2048 ** 2) || mask.format !== "npy" || mask.dtype !== "bool" ||
    mask.rowOrder !== "top-first" || JSON.stringify(mask.shape) !== "[2048,2048]" ||
    mask.role !== "background-estimation-exclusion-not-geometry-or-science" || !count(mask.pixels) ||
    mask.pixels === 2048 ** 2 || !count(mask.detectedOnlyPixels) ||
    !guard || ![guard.metadata, guard.rgba].every(isOpticalContentIdentity) || guard.rgba.bytes !== 2048 ** 2 * 4 ||
    !serializedArray(guard.rgbaNpy, 2048 ** 2 * 4) || guard.pixels !== 2048 ||
    !isOpticalHttpsLink(guard.metadataReferenceUrl) || !isOpticalPublicationText(guard.credit) ||
    guard.license !== "CC BY 4.0" || guard.licenseUrl !== "https://creativecommons.org/licenses/by/4.0/" ||
    guard.role !== "background-estimation-exclusion-only-no-RGB" || !count(guard.supportPixels) ||
    !equalContent(guard.center, root.center) || guard.fieldDegrees !== root.master.fieldDegrees ||
    mask.pixels !== guard.supportPixels + mask.detectedOnlyPixels ||
    !recipe || recipe.method !== "photutils-background2d-median-source-mask-v1" || recipe.photutilsVersion !== "3.0.0" ||
    recipe.domain !== "prepared-encoded-sRGB-byte-values" || JSON.stringify(recipe.boxSize) !== "[256,256]" ||
    JSON.stringify(recipe.meshFilterSize) !== "[3,3]" || recipe.sigmaClip?.sigma !== 3 || recipe.sigmaClip.maxiters !== 10 ||
    recipe.detectNSigma !== 2 || recipe.detectNPixels !== 10 || recipe.dilateRadiusTargetPixels !== 10) return invalid();
  const actualHash = preparedDisplayOpticalPublicationHash(root);
  if (expectedHash !== undefined && (!opticalContentHashPattern.test(expectedHash) || expectedHash !== actualHash)) return invalid();
}

export function assertPreparedDisplayOpticalManifest(value: unknown, reference: string,
  expectedHash: string): asserts value is PreparedDisplayOpticalManifest {
  assertPreparedDisplayOpticalPublication(value, reference, expectedHash);
  const root = value as PreparedDisplayOpticalManifest;
  if (root.publicationHash !== expectedHash || OPTICAL_IMAGE_LEVELS.some(level =>
    root.levels[level].downloadUrl !== `/v2/sky/prepared-optical/${expectedHash}/${root.levels[level].file}`))
    throw new Error("prepared_display_optical_manifest_invalid");
}
