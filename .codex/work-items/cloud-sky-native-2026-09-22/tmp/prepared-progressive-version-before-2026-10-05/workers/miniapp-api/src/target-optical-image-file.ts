import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

interface OpticalFileAsset {
  file: string; bytes: number; sha256: string; pixels: 512; fieldDegrees: number;
}

/** Byte/container admission of a field whose publication was already pinned.
 * Source colour, geometric/scientific alpha and credit belong to its provider.
 * Hash the exact returned buffer, rather than a separate pre-read file. */
export async function readTargetOpticalImageFile(manifestUrl: URL, asset: OpticalFileAsset,
  format: "png" | "jpeg", invalidCode: "sdss_optical_asset_invalid" | "prepared_optical_asset_invalid") {
  const bytes = await readFile(new URL(asset.file, manifestUrl));
  const formatValid = format === "png" ? bytes.length >= 45 &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
    bytes.readUInt32BE(8) === 13 && bytes.toString("ascii", 12, 16) === "IHDR" &&
    bytes.readUInt32BE(16) === asset.pixels && bytes.readUInt32BE(20) === asset.pixels &&
    bytes[24] === 8 && bytes[25] === 6 && bytes[26] === 0 && bytes[27] === 0 && bytes[28] === 0 &&
    bytes.readUInt32BE(bytes.length - 12) === 0 && bytes.subarray(-8, -4).toString("ascii") === "IEND" :
    bytes[0] === 0xff && bytes[1] === 0xd8 && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9;
  if (bytes.length !== asset.bytes || createHash("sha256").update(bytes).digest("hex") !== asset.sha256 || !formatValid)
    throw new Error(invalidCode);
  return { bytes, contentType: format === "png" ? "image/png" as const : "image/jpeg" as const,
    fieldDegrees: asset.fieldDegrees, pixelSize: asset.pixels };
}
