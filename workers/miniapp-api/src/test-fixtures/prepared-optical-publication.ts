import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { OPTICAL_IMAGE_LEVELS, preparedOpticalPublicationHash, type PreparedOpticalPublication } from "@starward/miniapp-contracts";
import { syntheticOpticalPng } from "./synthetic-optical-png.ts";

/** Transport fixture only. It does not provide decoded source/master bytes or
 * a real producer receipt, and cannot stand for adopted observation quality. */
export function createSyntheticPreparedOpticalPublication(directory: string, publicationId = "synthetic-prepared-transport-v1") {
  const center = JSON.parse(readFileSync(new URL("../../assets/deep-sky/sdss-m51/manifest.json", import.meta.url), "utf8")).center;
  const content = { bytes: 128, sha256: "1".repeat(64) }, fieldDegrees = .22755555555555557;
  const value: PreparedOpticalPublication = {
    schemaVersion: "prepared-observation-optical-publication-v1", imageVersion: "prepared-optical-v1", publicationId,
    objectRef: "M:51", center, orientation: "north-up/east-left",
    source: { resourceId: "synthetic-fixture", sourceUrl: "https://example.invalid/prepared.jpg",
      metadataReferenceUrl: "https://example.invalid/observation/", policyUrl: "https://example.invalid/rights/",
      credit: "Complete synthetic transport credit", license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
      colourMeaning: "Synthetic encoded RGB, no scientific source admission", encodedJpeg: content, rawXmp: content, parserXmp: content,
      decodedRgb: { bytes: 32 * 24 * 3, sha256: content.sha256, shape: [24, 32, 3], rowOrder: "top-first" },
      nominalAvm: { referenceDimension: [64, 48], referencePixel: [32.5, 24.5], referenceValue: [center.raDeg, center.decDeg],
        scale: [-.00002, .00002], rotation: -91.9, decodedShapeWidthHeight: [32, 24], resizeCommonXFactor: .5, resizeYFactor: .5,
        crpixFitsOneBased: [16.25, 12.25], cdeltDegrees: [-.00004, .00004], spatialNotes: "Synthetic approximate geometry; not measured",
        spatialQuality: null, accuracy: "UNVERIFIED_APPROXIMATE_PUBLISHER_AVM" } },
    processing: { runtimeNetwork: "forbidden", modification: "Synthetic transport pixels only", coverage: "Unknown scientific availability",
      sourceAdapterVersion: "prepared-rgb-observation-avm-v1", producerVersion: "prepared-rgb-tan-master-v1", producerReceipt: content,
      sampleOffsetsDyDx: [[-.25, -.25], [-.25, .25], [.25, -.25], [.25, .25]], sampling: "encoded-RGB-bilinear-all-four-neighbours",
      levelResampling: "geometry-premultiplied-integer-box-round-to-nearest", validation: "BOUND_MASTER_AND_LEVELS_CHECKED" },
    master: { pixels: 2048, fieldDegrees, crpixFitsOneBased: 1024.5, rgba: { ...content, bytes: 2048 ** 2 * 4 },
      rgbaNpy: { bytes: 2048 ** 2 * 4 + 128, sha256: "2".repeat(64), format: "npy", shape: [2048, 2048, 4], dtype: "uint8", rowOrder: "top-first" },
      geometricSupportPixels: 2048 ** 2 / 2, geometricBlackPixels: 2048 ** 2 / 2, unit: "published-encoded-RGB",
      scientificAvailability: "UNKNOWN", scientificValidity: "UNKNOWN" },
    levels: Object.fromEntries(OPTICAL_IMAGE_LEVELS.map((level, index) => {
      const bytes = syntheticOpticalPng(0, 0, 0), extent = 2048 / 2 ** index, start = (2048 - extent) / 2, file = `M-51-${level.toLowerCase()}.png`;
      writeFileSync(join(directory, file), bytes);
      return [level, { file, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex"), format: "png", pixels: 512,
        fieldDegrees: Math.atan(Math.tan(fieldDegrees * Math.PI / 360) * extent / 2048) * 360 / Math.PI, crpixFitsOneBased: 256.5,
        displayAlpha: "geometric-source-area", scientificAvailability: "UNKNOWN", masterRgbaSha256: content.sha256,
        masterCrop: { boundsXYExclusive: [start, start, start + extent, start + extent], boxFactor: extent / 512 },
        geometricMasterSupportPixels: extent ** 2 / 2, alphaPixels: { opaque: 512 ** 2 / 2, partial: 0, zero: 512 ** 2 / 2 } }];
    })) as PreparedOpticalPublication["levels"],
  };
  const manifestUrl = pathToFileURL(join(directory, "manifest.json"));
  const save = () => { writeFileSync(manifestUrl, JSON.stringify(value)); return preparedOpticalPublicationHash(value); };
  return { value, manifestUrl, save, expectedHash: save() };
}
