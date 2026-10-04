/** Synthetic transport/semantic fixture only; no real astronomy or quality claim. */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { OPTICAL_IMAGE_LEVELS } from "@starward/miniapp-contracts";
import { sdssDisplayOpticalPublicationHash, type SdssDisplayOpticalPublication } from "@starward/miniapp-contracts";
import { createSyntheticSdssSciencePublication } from "./sdss-science-publication.ts";

export function createSyntheticSdssDisplayPublication(directory: string) {
  const science = createSyntheticSdssSciencePublication(directory).value;
  const c = { bytes: 128, sha256: "2".repeat(64) }, n = 2048 ** 2;
  const names = ["sdss_noise_model_increment.py", "sdss_frame_noise.py", "sdss_noise_display.py", "sdss_display_recovery.py",
    "sdss_adaptive_display.py", "sdss_noise_aperture.py", "sdss_source_stencil.py", "sdss_gri_tan.py",
    "sdss_corrected_frame.py", "sdss_frame_quality.py", "sdss_noise_display_provenance.py"];
  const value: SdssDisplayOpticalPublication = { ...science, schemaVersion: "sdss-dr17-display-optical-publication-v1", imageVersion: "sdss-display-optical-v1",
    display: { producerVersion: "sdss-retained-sky-noise-model-increment-candidate-v1", previousNoiseModel: "sdss-retained-sky-complete-grid-stencil-v1",
      noiseModel: "sdss-retained-sky-idl-bilinear-constant-edge-v2", estimateRole: "DISPLAY_ONLY_NOT_NEW_MEASUREMENTS",
      candidateReceipt: c, previousCandidateReceipt: c, scientificCandidateReceipt: c, executionReceipt: c,
      dependencyPlanReceipt: c, sourceInputsReceipt: c,
      implementation: Object.fromEntries(names.map(name => [name, c])) as SdssDisplayOpticalPublication["display"]["implementation"],
      estimates: { g: c, r: c, i: c }, diagnostics: { qualified: c, radius: c, reached: c, protected: c, requested: c, changed: c },
      parentReportCanonicalSha256: c.sha256, planCanonicalSha256: c.sha256,
      policy: { radii: [1, 2, 4, 8], absoluteConditionalRatio: 3, realSourceHaloPixels: 8,
        variance: "repeated-native-ids-combined-before-variance-cross-field-cauchy-bound",
        supply: "known-bad-positive-different-run-completely-qualified-gri-with-nonoverlapping-mjd",
        strong: "signed-raw-preserved-and-excluded-from-weak-neighbor-apertures", unknown: "raw-preserved-no-unknown-hole-bridging" },
      counts: { requestedTargets: 100, changedEstimatePixels: 20, qualifiedCenters: n - 10, protectedCenters: 2, commonRatioReached: n - 12,
        radiusCounts: { "-1": 10, "0": 2, "1": n - 12, "2": 0, "4": 0, "8": 0 } },
      sourceScienceCorrection: "NONE", sourceAvailabilityCorrection: "NONE", qualityAdopted: false },
    pyramid: { method: "signed-display-estimate-mean-before-frozen-lupton-v1", validation: "DISPLAY_ESTIMATE_LEVELS_REPRODUCED",
      statisticalFitCalls: 0, scienceCorrection: "NONE", rgbMasterRole: "REFERENCE_ONLY", unknownSamples: "excluded-from-mean-and-divisor",
      displayAlpha: "original-rounded-coherent-sample-area-independent-of-processing-qualification-and-brightness" },
    levels: Object.fromEntries(OPTICAL_IMAGE_LEVELS.map(level => {
      const { masterRgbSha256: _old, ...asset } = science.levels[level];
      return [level, { ...asset, masterDisplayEstimatesSha256: { g: c.sha256, r: c.sha256, i: c.sha256 },
        displayEstimateMean: { unit: "mean display estimate in source nanomaggies/native-pixel", availablePixels: 512 ** 2,
          emptyPixels: 0, partialPixels: 0, availableMasterSamples: 512 ** 2 * asset.masterCrop.boxFactor ** 2 } }];
    })) as SdssDisplayOpticalPublication["levels"] };
  const manifestUrl = pathToFileURL(join(directory, "manifest.json"));
  const save = () => { writeFileSync(manifestUrl, JSON.stringify(value)); return sdssDisplayOpticalPublicationHash(value); };
  const expectedHash = save();
  return { value, expectedHash, manifestUrl, save };
}
