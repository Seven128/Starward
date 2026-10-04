import { OPTICAL_IMAGE_LEVELS, opticalPublicationContentHash,
  isOpticalContentIdentity as content, opticalContentHashPattern as hash,
  type OpticalContentIdentity } from "./optical-publication-content.ts";
import { assertSdssCalibratedOpticalBase, type SdssScienceOpticalPublicationBase,
  type SdssScienceOpticalAssetBase } from "./sdss-science-optical-publication.ts";
import type { OpticalImageLevel } from "./optical-publication-content.ts";

/** Original calibrated samples remain the mother. These levels consume
 * processed display estimates, never new measurements or photometry. */
export const SDSS_DISPLAY_OPTICAL_VERSION = "sdss-display-optical-v1" as const;
export const SDSS_DISPLAY_PYRAMID = "signed-display-estimate-mean-before-frozen-lupton-v1" as const;
const PRODUCER = "sdss-retained-sky-noise-model-increment-candidate-v1" as const;
const NOISE = "sdss-retained-sky-idl-bilinear-constant-edge-v2" as const;
const PREVIOUS = "sdss-retained-sky-complete-grid-stencil-v1" as const;
const DIAGNOSTICS = ["qualified", "radius", "reached", "protected", "requested", "changed"] as const;
const IMPLEMENTATIONS = ["sdss_noise_model_increment.py", "sdss_frame_noise.py", "sdss_noise_display.py",
  "sdss_display_recovery.py", "sdss_adaptive_display.py", "sdss_noise_aperture.py", "sdss_source_stencil.py",
  "sdss_gri_tan.py", "sdss_corrected_frame.py", "sdss_frame_quality.py", "sdss_noise_display_provenance.py"] as const;
type GriIdentity = Record<"g" | "r" | "i", OpticalContentIdentity>;

export interface SdssDisplayOpticalAsset extends SdssScienceOpticalAssetBase {
  masterDisplayEstimatesSha256: Record<"g" | "r" | "i", string>;
  displayEstimateMean: {
    unit: "mean display estimate in source nanomaggies/native-pixel";
    availablePixels: number; emptyPixels: number; partialPixels: number;
    availableMasterSamples: number;
  };
}
export interface SdssDisplayOpticalPublication extends SdssScienceOpticalPublicationBase {
  schemaVersion: "sdss-dr17-display-optical-publication-v1";
  imageVersion: typeof SDSS_DISPLAY_OPTICAL_VERSION;
  display: {
    producerVersion: typeof PRODUCER;
    previousNoiseModel: typeof PREVIOUS;
    noiseModel: typeof NOISE;
    estimateRole: "DISPLAY_ONLY_NOT_NEW_MEASUREMENTS";
    candidateReceipt: OpticalContentIdentity;
    previousCandidateReceipt: OpticalContentIdentity;
    scientificCandidateReceipt: OpticalContentIdentity;
    executionReceipt: OpticalContentIdentity;
    dependencyPlanReceipt: OpticalContentIdentity;
    sourceInputsReceipt: OpticalContentIdentity;
    implementation: Record<typeof IMPLEMENTATIONS[number], OpticalContentIdentity>;
    /** Complete saved NPY identities; offline provenance, no client downloads. */
    estimates: GriIdentity;
    diagnostics: Record<typeof DIAGNOSTICS[number], OpticalContentIdentity>;
    parentReportCanonicalSha256: string; planCanonicalSha256: string;
    policy: {
      radii: [1, 2, 4, 8]; absoluteConditionalRatio: 3; realSourceHaloPixels: 8;
      variance: "repeated-native-ids-combined-before-variance-cross-field-cauchy-bound";
      supply: "known-bad-positive-different-run-completely-qualified-gri-with-nonoverlapping-mjd";
      strong: "signed-raw-preserved-and-excluded-from-weak-neighbor-apertures";
      unknown: "raw-preserved-no-unknown-hole-bridging";
    };
    counts: {
      requestedTargets: number; changedEstimatePixels: number; qualifiedCenters: number;
      protectedCenters: number; commonRatioReached: number;
      radiusCounts: Record<"-1" | "0" | "1" | "2" | "4" | "8", number>;
    };
    sourceScienceCorrection: "NONE"; sourceAvailabilityCorrection: "NONE";
    qualityAdopted: false;
  };
  pyramid: {
    method: typeof SDSS_DISPLAY_PYRAMID; validation: "DISPLAY_ESTIMATE_LEVELS_REPRODUCED";
    statisticalFitCalls: 0; scienceCorrection: "NONE"; rgbMasterRole: "REFERENCE_ONLY";
    unknownSamples: "excluded-from-mean-and-divisor";
    displayAlpha: "original-rounded-coherent-sample-area-independent-of-processing-qualification-and-brightness";
  };
  levels: Record<OpticalImageLevel, SdssDisplayOpticalAsset>;
}
export type SdssDisplayOpticalManifest = Omit<SdssDisplayOpticalPublication, "levels"> & {
  publicationHash: string;
  levels: Record<OpticalImageLevel, SdssDisplayOpticalAsset & { downloadUrl: string }>;
};

const count = (v: unknown, max: number): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0 && v <= max;
const keys = (v: unknown, names: readonly string[]): boolean => !!v && typeof v === "object" &&
  !Array.isArray(v) && Object.keys(v).sort().join() === [...names].sort().join();

export function sdssDisplayOpticalPublicationHash(value: SdssDisplayOpticalPublication): string {
  const { publicationHash: _hash, ...root } = value as SdssDisplayOpticalManifest;
  const levels = Object.fromEntries(OPTICAL_IMAGE_LEVELS.map(level => {
    const { downloadUrl: _url, ...asset } = root.levels[level] as SdssDisplayOpticalManifest["levels"][OpticalImageLevel];
    return [level, asset];
  }));
  return opticalPublicationContentHash({ ...root, levels });
}

/** Byte/semantic admission only. Descriptors separately pin reviewed content;
 * admission is not source, astrometry, colour, device or adoption acceptance. */
export function assertSdssDisplayOpticalPublication(value: unknown, reference: string,
  expectedHash?: string): asserts value is SdssDisplayOpticalPublication {
  const root = value as SdssDisplayOpticalPublication | null;
  const invalid = () => { throw new Error("sdss_display_optical_publication_invalid"); };
  if (!root || root.schemaVersion !== "sdss-dr17-display-optical-publication-v1" ||
    root.imageVersion !== SDSS_DISPLAY_OPTICAL_VERSION) return invalid();
  try { assertSdssCalibratedOpticalBase(root, reference); } catch { return invalid(); }
  const d = root.display, p = root.pyramid, max = root.master.pixels ** 2;
  if (!d || d.producerVersion !== PRODUCER || d.previousNoiseModel !== PREVIOUS || d.noiseModel !== NOISE ||
    d.estimateRole !== "DISPLAY_ONLY_NOT_NEW_MEASUREMENTS" || d.sourceScienceCorrection !== "NONE" ||
    d.sourceAvailabilityCorrection !== "NONE" || d.qualityAdopted !== false ||
    ![d.candidateReceipt, d.previousCandidateReceipt, d.scientificCandidateReceipt, d.executionReceipt,
      d.dependencyPlanReceipt, d.sourceInputsReceipt].every(content) ||
    !keys(d.implementation, IMPLEMENTATIONS) || !Object.values(d.implementation).every(content) ||
    !keys(d.estimates, ["g", "r", "i"]) || !Object.values(d.estimates).every(content) ||
    !keys(d.diagnostics, DIAGNOSTICS) || !Object.values(d.diagnostics).every(content) ||
    typeof d.parentReportCanonicalSha256 !== "string" || !hash.test(d.parentReportCanonicalSha256) ||
    typeof d.planCanonicalSha256 !== "string" || !hash.test(d.planCanonicalSha256)) return invalid();
  const policy = d.policy, c = d.counts;
  if (!policy || JSON.stringify(policy.radii) !== "[1,2,4,8]" || policy.absoluteConditionalRatio !== 3 ||
    policy.realSourceHaloPixels !== 8 ||
    policy.variance !== "repeated-native-ids-combined-before-variance-cross-field-cauchy-bound" ||
    policy.supply !== "known-bad-positive-different-run-completely-qualified-gri-with-nonoverlapping-mjd" ||
    policy.strong !== "signed-raw-preserved-and-excluded-from-weak-neighbor-apertures" ||
    policy.unknown !== "raw-preserved-no-unknown-hole-bridging" ||
    !c || ![c.requestedTargets, c.changedEstimatePixels, c.qualifiedCenters, c.protectedCenters,
      c.commonRatioReached].every(v => count(v, max)) || c.changedEstimatePixels > c.requestedTargets ||
    c.protectedCenters > c.qualifiedCenters || !keys(c.radiusCounts, ["-1", "0", "1", "2", "4", "8"]) ||
    !Object.values(c.radiusCounts).every(v => count(v, max)) ||
    Object.values(c.radiusCounts).reduce((a, b) => a + b, 0) !== max ||
    c.radiusCounts["0"] !== c.protectedCenters || c.radiusCounts["-1"] < max - c.qualifiedCenters ||
    c.commonRatioReached > max - c.radiusCounts["-1"] - c.radiusCounts["0"]) return invalid();
  if (!p || p.method !== SDSS_DISPLAY_PYRAMID || p.validation !== "DISPLAY_ESTIMATE_LEVELS_REPRODUCED" ||
    p.statisticalFitCalls !== 0 || p.scienceCorrection !== "NONE" || p.rgbMasterRole !== "REFERENCE_ONLY" ||
    p.unknownSamples !== "excluded-from-mean-and-divisor" ||
    p.displayAlpha !== "original-rounded-coherent-sample-area-independent-of-processing-qualification-and-brightness") return invalid();
  for (const [index, level] of OPTICAL_IMAGE_LEVELS.entries()) {
    const a = root.levels[level], m = a.displayEstimateMean, factor = 4 / 2 ** index, extent = 512 * factor;
    if ("masterScienceSha256" in a || "scienceMean" in a || "masterRgbSha256" in a ||
      !keys(a.masterDisplayEstimatesSha256, ["g", "r", "i"]) ||
      (["g", "r", "i"] as const).some(b => a.masterDisplayEstimatesSha256[b] !== d.estimates[b].sha256) ||
      !m || m.unit !== "mean display estimate in source nanomaggies/native-pixel" ||
      !count(m.availablePixels, 512 ** 2) || !count(m.emptyPixels, 512 ** 2) ||
      m.availablePixels + m.emptyPixels !== 512 ** 2 || !count(m.partialPixels, m.availablePixels) ||
      !count(m.availableMasterSamples, extent ** 2) || m.availableMasterSamples > root.master.jointAvailability.availablePixels ||
      m.availableMasterSamples < (m.availablePixels - m.partialPixels) * factor ** 2 + m.partialPixels ||
      m.availableMasterSamples > m.availablePixels * factor ** 2 - m.partialPixels ||
      (factor === 1 && m.partialPixels !== 0) ||
      (index === 0 && m.availableMasterSamples !== root.master.jointAvailability.availablePixels) ||
      (index > 0 && m.availableMasterSamples >
        root.levels[OPTICAL_IMAGE_LEVELS[index - 1]!].displayEstimateMean.availableMasterSamples)) return invalid();
  }
  const actual = sdssDisplayOpticalPublicationHash(root);
  if (expectedHash !== undefined && (!hash.test(expectedHash) || expectedHash !== actual)) return invalid();
}

export function assertSdssDisplayOpticalManifest(value: unknown, reference: string,
  expectedHash: string): asserts value is SdssDisplayOpticalManifest {
  assertSdssDisplayOpticalPublication(value, reference, expectedHash);
  const root = value as SdssDisplayOpticalManifest;
  if (root.publicationHash !== expectedHash || OPTICAL_IMAGE_LEVELS.some(level =>
    root.levels[level].downloadUrl !== `/v2/sky/sdss-optical/${expectedHash}/${root.levels[level].file}`))
    throw new Error("sdss_display_optical_manifest_invalid");
}
