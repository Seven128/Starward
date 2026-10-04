import { SDSS_OPTICAL_LEVELS, type SdssOpticalLevel, type SdssOpticalPublication } from "./sdss-optical-publication.ts";
import { opticalPublicationContentHash, isOpticalContentIdentity as content,
  isOpticalPublicationText as text, isOpticalRecipeValue as jsonValue, isOpticalHttpsLink as https,
  opticalContentHashPattern as hashPattern, type OpticalContentIdentity, type OpticalRecipeValue } from "./optical-publication-content.ts";
export type { OpticalContentIdentity, OpticalRecipeValue } from "./optical-publication-content.ts";

/** Explicit opt-in; the existing JPEG discovery/immutable offers remain v1. */
export const SDSS_SCIENCE_OPTICAL_VERSION = "science-optical-v2" as const;
export const SDSS_SCIENCE_MEAN_OPTICAL_VERSION = "science-optical-v3" as const;
export const SDSS_SCIENCE_MEAN_PYRAMID = "signed-coherent-science-mean-before-fixed-lupton-v1" as const;
export interface SdssScienceFrameIdentity extends OpticalContentIdentity {
  sourceUrl: string;
  /** Exact complete admission receipt saved by the offline writer. */
  admissionReceipt: OpticalContentIdentity;
  identity: { rerun: string; run: number; camcol: number; field: number; band: "g" | "r" | "i" };
  /** The original source WCS is retained, without claiming full asTrans accuracy. */
  primaryHeaderSha256: string;
}
export interface SdssScienceOpticalAssetBase extends OpticalContentIdentity {
  file: string;
  format: "png";
  pixels: 512;
  fieldDegrees: number;
  crpixFitsOneBased: 256.5;
  sampleAvailability: "joint-area-alpha";
  masterAvailabilitySha256: string;
  masterCrop: { boundsXYExclusive: [number, number, number, number]; boxFactor: 1 | 2 | 4 };
}
export interface SdssScienceOpticalAsset extends SdssScienceOpticalAssetBase { masterRgbSha256: string }
export interface SdssScienceMeanOpticalAsset extends SdssScienceOpticalAssetBase {
  masterScienceSha256: Record<"g" | "r" | "i", string>;
  scienceMean: {
    unit: "mean source nanomaggies/native-pixel";
    availablePixels: number; emptyPixels: number; partialPixels: number;
    availableMasterSamples: number;
    perBand: Record<"g" | "r" | "i", { availableNegativeMeans: number; availableZeroMeans: number }>;
  };
}
export interface SdssScienceOpticalPublicationBase {
  publicationId: string;
  objectRef: string;
  center: SdssOpticalPublication["center"];
  orientation: "north-up/east-left";
  source: SdssOpticalPublication["source"];
  processing: SdssOpticalPublication["processing"];
  master: {
    pixels: 2048;
    fieldDegrees: number;
    astrometry: "source-primary-linear-TAN-approximation";
    scientificValidity: "UNKNOWN";
    unit: "nanomaggies/pixel";
    sourceFrames: SdssScienceFrameIdentity[];
    /** Hashes identify complete saved NPY files; these are offline provenance,
     * not additional client downloads or inferred scientific confidence. */
    science: Record<"g" | "r" | "i", OpticalContentIdentity>;
    jointAvailability: OpticalContentIdentity & { availablePixels: number };
    /** v2 parent RGB; v3 reference RGB only, never the parent of coarse levels. */
    rgb: OpticalContentIdentity;
    /** Actual shared producer recipe, applied once before any crop. */
    transfer: { recipe: { [key: string]: OpticalRecipeValue }; validation: "WHOLE_MASTER_REPRODUCED" };
  };
}
export interface SdssEncodedScienceOpticalPublication extends SdssScienceOpticalPublicationBase {
  schemaVersion: "sdss-dr17-science-optical-publication-v2";
  imageVersion: typeof SDSS_SCIENCE_OPTICAL_VERSION;
  levels: Record<SdssOpticalLevel, SdssScienceOpticalAsset>;
}
export interface SdssScienceMeanOpticalPublication extends SdssScienceOpticalPublicationBase {
  schemaVersion: "sdss-dr17-science-optical-publication-v3";
  imageVersion: typeof SDSS_SCIENCE_MEAN_OPTICAL_VERSION;
  pyramid: {
    method: typeof SDSS_SCIENCE_MEAN_PYRAMID;
    validation: "SIGNED_LEVELS_REPRODUCED";
    statisticalFitCalls: 0;
    scienceCorrection: "NONE";
    rgbMasterRole: "REFERENCE_ONLY";
    unknownSamples: "excluded-from-mean-and-divisor";
    displayAlpha: "rounded-coherent-sample-area-independent-of-brightness";
  };
  levels: Record<SdssOpticalLevel, SdssScienceMeanOpticalAsset>;
}
export type SdssScienceOpticalPublication = SdssEncodedScienceOpticalPublication | SdssScienceMeanOpticalPublication;
type ManifestFor<P extends SdssScienceOpticalPublication> = Omit<P, "levels"> & {
  publicationHash: string;
  levels: Record<SdssOpticalLevel, P["levels"][SdssOpticalLevel] & { downloadUrl: string }>;
};
export type SdssEncodedScienceOpticalManifest = ManifestFor<SdssEncodedScienceOpticalPublication>;
export type SdssScienceMeanOpticalManifest = ManifestFor<SdssScienceMeanOpticalPublication>;
export type SdssScienceOpticalManifest = SdssEncodedScienceOpticalManifest | SdssScienceMeanOpticalManifest;

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const count = (value: unknown, maximum: number): value is number => Number.isSafeInteger(value) &&
  typeof value === "number" && value >= 0 && value <= maximum;
const positive = (value: unknown): value is number => finite(value) && value > 0;
const qParameter = (value: unknown): value is number => positive(value) && value <= 1e10;
/** Admit the actual shared producer variants, including their statistical
 * obligations. A fresh hash alone cannot make an invalid recipe supported. */
function transferRecipe(value: unknown, available: number, total: number): boolean {
  if (!record(value) || !jsonValue(value) || value.method !== "Astropy make_lupton_rgb" ||
    typeof value.version !== "string" || !/^\d+\.\d+\.\d+(?:[a-zA-Z0-9.+-]*)$/u.test(value.version) ||
    JSON.stringify(value.rgbBands) !== '["i","r","g"]' || value.intervalMinimum !== 0 ||
    value.scope !== "one complete coherent science master before any level crop" ||
    value.availableSciencePixels !== available || value.totalMasterPixels !== total ||
    value.scienceCorrection !== "NONE; calibrated samples/eligibility unchanged" ||
    value.displayClipping !== "nonpositive intensity/negative channels clip only in display; never science absence" ||
    !positive(value.stretch) || !qParameter(value.Q) || !record(value.requestedParameters) ||
    !qParameter(value.requestedParameters.Q)) return false;
  // The shared Astropy stretch records its effective Q separately: requested
  // values below float32 epsilon become .1, rather than their input value.
  if (value.Q !== (value.requestedParameters.Q < 1 / 2 ** 23 ? .1 : value.requestedParameters.Q)) return false;
  if (value.kind === "fixed") return value.stretchClass === "LuptonAsinhStretch" &&
    positive(value.requestedParameters.stretch) && value.stretch === value.requestedParameters.stretch &&
    value.statisticalFit === null;
  if (value.kind !== "whole-master-zscale" || value.stretchClass !== "LuptonAsinhZscaleStretch" ||
    !record(value.statisticalFit)) return false;
  const fit = value.statisticalFit, stride = Math.max(1, Math.floor(available / 1000)), samples = Math.min(1000, Math.ceil(available / stride));
  return fit.method === "Astropy ZScaleInterval through LuptonAsinhZscaleStretch" &&
    fit.scope === "all coherent master samples; never individual crop/level" &&
    fit.intensity === "float64 arithmetic mean of i/r/g; no pedestal or background subtraction" &&
    fit.excludedIncoherentPixels === total - available && fit.finiteIntensitySamples === available &&
    count(fit.negativeIntensitySamples, available) && count(fit.zeroIntensitySamples, available) &&
    fit.negativeIntensitySamples + fit.zeroIntensitySamples <= available &&
    fit.nSamples === 1000 && fit.contrast === .25 && fit.maxReject === .5 && fit.minNpixels === 5 &&
    fit.krej === 2.5 && fit.maxIterations === 5 && fit.deterministicRasterStride === stride &&
    fit.actualStatisticalSamples === samples && count(fit.actualSampleNegativeCount, samples) &&
    count(fit.actualSampleZeroCount, samples) && fit.actualSampleNegativeCount + fit.actualSampleZeroCount <= samples &&
    fit.actualSampleNegativeCount <= fit.negativeIntensitySamples && fit.actualSampleZeroCount <= fit.zeroIntensitySamples &&
    typeof fit.sampleFloat64Sha256 === "string" && hashPattern.test(fit.sampleFloat64Sha256) &&
    typeof fit.sampleRasterIndicesInt64Sha256 === "string" && hashPattern.test(fit.sampleRasterIndicesInt64Sha256) &&
    fit.libraryFitCalls === 1 && fit.derivedStretch === "library z2 - z1, not a fitted black level";
}
/** One hash owner for offline packaging and transport. URLs/hash are envelopes;
 * every publication field, including source/recipe/crop metadata, is bound. */
export function sdssScienceOpticalPublicationHash(value: SdssScienceOpticalPublication): string {
  const { publicationHash: _hash, ...root } = value as SdssScienceOpticalManifest;
  const levels = Object.fromEntries(SDSS_OPTICAL_LEVELS.map(level => {
    const { downloadUrl: _url, ...asset } = root.levels[level] as SdssScienceOpticalManifest["levels"][SdssOpticalLevel];
    return [level, asset];
  }));
  const publication = { ...root, levels };
  if (!jsonValue(publication)) throw new Error("sdss_science_optical_json_invalid");
  return opticalPublicationContentHash(publication);
}

/** Shared calibrated SDSS source/mother and complete three-level geometry.
 * Both original-science and processed-display contracts preserve these facts;
 * neither admits the other producer's level meaning or processing policy. */
export function assertSdssCalibratedOpticalBase(value: unknown, reference: string): asserts value is
  SdssScienceOpticalPublicationBase & { levels: Record<SdssOpticalLevel, SdssScienceOpticalAssetBase> } {
  const root = value as (SdssScienceOpticalPublicationBase & {
    levels: Record<SdssOpticalLevel, SdssScienceOpticalAssetBase> }) | null;
  const invalid = () => { throw new Error("sdss_calibrated_optical_base_invalid"); };
  if (!root || !/^M:(?:[1-9]|[1-9]\d|10\d|110)$/u.test(reference) || root.objectRef !== reference ||
    !text(root.publicationId) || /[:/\\]/u.test(root.publicationId) || root.orientation !== "north-up/east-left" ||
    root.center?.frame !== "ICRS J2000" || !finite(root.center.raDeg) || root.center.raDeg < 0 || root.center.raDeg >= 360 ||
    !finite(root.center.decDeg) || Math.abs(root.center.decDeg) > 90 || !root.source ||
    root.source.provider !== "Sloan Digital Sky Survey" || root.source.license !== "CC BY 4.0" ||
    root.source.licenseUrl !== "https://creativecommons.org/licenses/by/4.0/" ||
    ![root.source.dataset, root.source.landingUrl, root.source.imageUsePolicyUrl,
      root.source.credit, root.source.processingDocumentationUrl].every(text) ||
    ![root.source.landingUrl, root.source.imageUsePolicyUrl, root.source.processingDocumentationUrl].every(https) ||
    !root.processing || root.processing.runtimeNetwork !== "forbidden" ||
    !text(root.processing.modification) || !text(root.processing.coverage)) return invalid();
  const master = root.master;
  if (!master || master.pixels !== 2048 || !finite(master.fieldDegrees) || master.fieldDegrees <= 0 || master.fieldDegrees >= 180 ||
    master.astrometry !== "source-primary-linear-TAN-approximation" || master.scientificValidity !== "UNKNOWN" ||
    master.unit !== "nanomaggies/pixel" || !master.science || Object.keys(master.science).sort().join() !== "g,i,r" ||
    ![master.science.g, master.science.r, master.science.i, master.rgb, master.jointAvailability].every(content) ||
    !Number.isSafeInteger(master.jointAvailability.availablePixels) || master.jointAvailability.availablePixels <= 0 ||
    master.jointAvailability.availablePixels > master.pixels ** 2 ||
    master.transfer?.validation !== "WHOLE_MASTER_REPRODUCED" ||
    !transferRecipe(master.transfer.recipe, master.jointAvailability.availablePixels, master.pixels ** 2) ||
    !Array.isArray(master.sourceFrames) || !master.sourceFrames.length || master.sourceFrames.length % 3) return invalid();
  const fields = new Map<string, Set<string>>();
  for (const frame of master.sourceFrames) {
    const id = frame?.identity;
    if (!content(frame) || !content(frame.admissionReceipt) || !id || typeof id.rerun !== "string" ||
      !/^[1-9]\d*$/u.test(id.rerun) || !Number.isSafeInteger(id.run) || id.run <= 0 || id.run > 999999 ||
      !Number.isInteger(id.camcol) || id.camcol < 1 || id.camcol > 6 || !Number.isInteger(id.field) || id.field < 0 || id.field > 9999 ||
      !["g", "r", "i"].includes(id.band) || typeof frame.primaryHeaderSha256 !== "string" || !hashPattern.test(frame.primaryHeaderSha256)) return invalid();
    const key = `${id.rerun}/${id.run}/${id.camcol}/${id.field}`, bands = fields.get(key) ?? new Set<string>();
    if (bands.has(id.band)) return invalid();
    bands.add(id.band); fields.set(key, bands);
    const file = `frame-${id.band}-${String(id.run).padStart(6, "0")}-${id.camcol}-${String(id.field).padStart(4, "0")}.fits.bz2`;
    if (frame.sourceUrl !== `https://data.sdss.org/sas/dr17/eboss/photoObj/frames/${id.rerun}/${id.run}/${id.camcol}/${file}`) return invalid();
  }
  if ([...fields.values()].some(bands => bands.size !== 3) || !root.levels ||
    Object.keys(root.levels).sort().join() !== "DETAIL,MEDIUM,OVERVIEW") return invalid();
  for (const [index, level] of SDSS_OPTICAL_LEVELS.entries()) {
    const a = root.levels[level], extent = 2048 / 2 ** index, start = (2048 - extent) / 2;
    const field = Math.atan(Math.tan(master.fieldDegrees * Math.PI / 360) * extent / 2048) * 360 / Math.PI;
    if (!content(a) || a.file !== `${reference.replace(":", "-")}-${level.toLowerCase()}.png` ||
      a.format !== "png" || a.pixels !== 512 || a.crpixFitsOneBased !== 256.5 ||
      a.sampleAvailability !== "joint-area-alpha" || a.masterAvailabilitySha256 !== master.jointAvailability.sha256 ||
      !finite(a.fieldDegrees) || Math.abs(a.fieldDegrees - field) > 1e-12 ||
      a.masterCrop?.boxFactor !== extent / 512 ||
      JSON.stringify(a.masterCrop.boundsXYExclusive) !== JSON.stringify([start, start, start + extent, start + extent])) return invalid();
  }
}

/** Structural/immutable admission only. A valid candidate is not an adopted
 * source/colour/PSF/absolute-astrometry or target-runtime quality result. */
export function assertSdssScienceOpticalPublication(value: unknown, reference: string,
  expectedHash?: string): asserts value is SdssScienceOpticalPublication {
  const root = value as SdssScienceOpticalPublication | null;
  const invalid = () => { throw new Error("sdss_science_optical_publication_invalid"); };
  const encoded = root?.schemaVersion === "sdss-dr17-science-optical-publication-v2" && root.imageVersion === SDSS_SCIENCE_OPTICAL_VERSION;
  const signed = root?.schemaVersion === "sdss-dr17-science-optical-publication-v3" && root.imageVersion === SDSS_SCIENCE_MEAN_OPTICAL_VERSION;
  if (!root || (!encoded && !signed) || "display" in root) return invalid();
  try { assertSdssCalibratedOpticalBase(root, reference); } catch { return invalid(); }
  const master = root.master;
  if (encoded && "pyramid" in root) return invalid();
  if (signed) {
    const p = (root as SdssScienceMeanOpticalPublication).pyramid;
    if (!p || p.method !== SDSS_SCIENCE_MEAN_PYRAMID || p.validation !== "SIGNED_LEVELS_REPRODUCED" ||
      p.statisticalFitCalls !== 0 || p.scienceCorrection !== "NONE" || p.rgbMasterRole !== "REFERENCE_ONLY" ||
      p.unknownSamples !== "excluded-from-mean-and-divisor" ||
      p.displayAlpha !== "rounded-coherent-sample-area-independent-of-brightness") return invalid();
  }
  for (const [index, level] of SDSS_OPTICAL_LEVELS.entries()) {
    const a = root.levels[level], extent = 2048 / 2 ** index, start = (2048 - extent) / 2;
    if (encoded && (!("masterRgbSha256" in a) || a.masterRgbSha256 !== master.rgb.sha256 ||
      "masterScienceSha256" in a || "scienceMean" in a)) return invalid();
    if (signed) {
      const asset = a as SdssScienceMeanOpticalAsset, mean = asset.scienceMean, maximum = 512 ** 2, factor = extent / 512;
      if ("masterRgbSha256" in a || !asset.masterScienceSha256 ||
        Object.keys(asset.masterScienceSha256).sort().join() !== "g,i,r" ||
        (["g", "r", "i"] as const).some(band => asset.masterScienceSha256[band] !== master.science[band].sha256) ||
        !mean || mean.unit !== "mean source nanomaggies/native-pixel" ||
        !count(mean.availablePixels, maximum) || !count(mean.emptyPixels, maximum) ||
        mean.availablePixels + mean.emptyPixels !== maximum || !count(mean.partialPixels, mean.availablePixels) ||
        !count(mean.availableMasterSamples, extent ** 2) ||
        mean.availableMasterSamples > master.jointAvailability.availablePixels ||
        mean.availableMasterSamples < (mean.availablePixels - mean.partialPixels) * factor ** 2 + mean.partialPixels ||
        mean.availableMasterSamples > mean.availablePixels * factor ** 2 - mean.partialPixels ||
        (factor === 1 && mean.partialPixels !== 0) ||
        (index === 0 && mean.availableMasterSamples !== master.jointAvailability.availablePixels) ||
        (index > 0 && mean.availableMasterSamples >
          (root as SdssScienceMeanOpticalPublication).levels[SDSS_OPTICAL_LEVELS[index - 1]!].scienceMean.availableMasterSamples) ||
        !mean.perBand || Object.keys(mean.perBand).sort().join() !== "g,i,r" ||
        (["g", "r", "i"] as const).some(band => !mean.perBand[band] ||
          !count(mean.perBand[band].availableNegativeMeans, mean.availablePixels) ||
          !count(mean.perBand[band].availableZeroMeans, mean.availablePixels) ||
          mean.perBand[band].availableNegativeMeans + mean.perBand[band].availableZeroMeans > mean.availablePixels)) return invalid();
    }
  }
  const actualHash = sdssScienceOpticalPublicationHash(root);
  if (expectedHash !== undefined && (!hashPattern.test(expectedHash) || actualHash !== expectedHash)) return invalid();
}

/** Transport must carry a separately admitted optical hash, never the W3 hash. */
export function assertSdssScienceOpticalManifest(value: unknown, reference: string,
  expectedHash: string): asserts value is SdssScienceOpticalManifest {
  assertSdssScienceOpticalPublication(value, reference, expectedHash);
  const root = value as SdssScienceOpticalManifest;
  if (root.publicationHash !== expectedHash || SDSS_OPTICAL_LEVELS.some(level =>
    root.levels[level].downloadUrl !== `/v2/sky/sdss-optical/${expectedHash}/${root.levels[level].file}`))
    throw new Error("sdss_science_optical_manifest_invalid");
}
