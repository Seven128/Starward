import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { SDSS_OPTICAL_LEVELS, sdssScienceOpticalPublicationHash, type SdssEncodedScienceOpticalPublication } from "@starward/miniapp-contracts";
import { syntheticOpticalPng } from "./synthetic-optical-png.ts";
export { syntheticOpticalPng } from "./synthetic-optical-png.ts";

const digest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
/** Structural/transport fixture only: no science arrays or receipts are supplied,
 * reproduced or admitted as real imagery. Tests use real encoded synthetic PNGs. */
export function createSyntheticSdssSciencePublication(directory: string, publicationId = "synthetic-transport-v2") {
  const old = JSON.parse(readFileSync(new URL("../../assets/deep-sky/sdss-m51/manifest.json", import.meta.url), "utf8"));
  const content = { bytes: 128, sha256: "1".repeat(64) }, fieldDegrees = .22755555555555557;
  const value: SdssEncodedScienceOpticalPublication = {
    schemaVersion: "sdss-dr17-science-optical-publication-v2", imageVersion: "science-optical-v2", publicationId,
    objectRef: "M:51", center: old.center, orientation: "north-up/east-left",
    source: { ...old.source, dataset: "Synthetic transport fixture; no scientific source admission" },
    processing: { runtimeNetwork: "forbidden", modification: "Synthetic encoded transport fixture only", coverage: "No scientific coverage claim" },
    master: { pixels: 2048, fieldDegrees, astrometry: "source-primary-linear-TAN-approximation", scientificValidity: "UNKNOWN", unit: "nanomaggies/pixel",
      sourceFrames: (["g", "r", "i"] as const).map(band => ({ ...content, admissionReceipt: content, primaryHeaderSha256: content.sha256,
        identity: { rerun: "301", run: 1, camcol: 1, field: 1, band },
        sourceUrl: `https://data.sdss.org/sas/dr17/eboss/photoObj/frames/301/1/1/frame-${band}-000001-1-0001.fits.bz2` })),
      science: { g: content, r: content, i: content }, jointAvailability: { ...content, availablePixels: 4194304 }, rgb: content,
      transfer: { validation: "WHOLE_MASTER_REPRODUCED", recipe: { method: "Astropy make_lupton_rgb", version: "8.0.1", rgbBands: ["i", "r", "g"], intervalMinimum: 0,
        scope: "one complete coherent science master before any level crop", availableSciencePixels: 4194304, totalMasterPixels: 4194304,
        scienceCorrection: "NONE; calibrated samples/eligibility unchanged", displayClipping: "nonpositive intensity/negative channels clip only in display; never science absence",
        kind: "fixed", stretchClass: "LuptonAsinhStretch", stretch: 5, Q: 8, requestedParameters: { stretch: 5, Q: 8 }, statisticalFit: null } } },
    levels: Object.fromEntries(SDSS_OPTICAL_LEVELS.map((level, index) => {
      const bytes = syntheticOpticalPng(32 + index), extent = 2048 / 2 ** index, start = (2048 - extent) / 2, file = `M-51-${level.toLowerCase()}.png`;
      writeFileSync(join(directory, file), bytes);
      return [level, { bytes: bytes.length, sha256: digest(bytes), file, format: "png", pixels: 512,
        fieldDegrees: Math.atan(Math.tan(fieldDegrees * Math.PI / 360) * extent / 2048) * 360 / Math.PI,
        crpixFitsOneBased: 256.5, sampleAvailability: "joint-area-alpha", masterRgbSha256: content.sha256, masterAvailabilitySha256: content.sha256,
        masterCrop: { boundsXYExclusive: [start, start, start + extent, start + extent], boxFactor: extent / 512 } }];
    })) as SdssEncodedScienceOpticalPublication["levels"],
  };
  const manifestUrl = pathToFileURL(join(directory, "manifest.json"));
  const save = () => { writeFileSync(manifestUrl, JSON.stringify(value)); return sdssScienceOpticalPublicationHash(value); };
  return { value, manifestUrl, save, expectedHash: save() };
}
