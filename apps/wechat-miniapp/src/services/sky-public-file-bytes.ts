import { skyImageContentHash } from "@starward/miniapp-contracts";
import { matchesSkyImageBytes, type SkyEncodedImage } from "./sky-image-bytes";

/** Source-bound JSON bytes have no invented raster dimensions. Semantic JSON
 * admission remains with the validated publication consumer, after each read. */
export interface SkyEncodedJson {
  format: "json";
  sha256: string;
  bytes: number;
}
export type SkyEncodedFile = SkyEncodedImage | SkyEncodedJson;
export function skyEncodedFileBinding(asset: SkyEncodedFile): SkyEncodedFile {
  return asset.format === "json" ? { format: "json", sha256: asset.sha256, bytes: asset.bytes } :
    { format: asset.format, sha256: asset.sha256, bytes: asset.bytes, width: asset.width, height: asset.height };
}
export function sameSkyEncodedFileBinding(a: SkyEncodedFile, b: SkyEncodedFile): boolean {
  return a.format === b.format && a.bytes === b.bytes && a.sha256 === b.sha256 &&
    (a.format === "json" ? b.format === "json" : b.format !== "json" && a.width === b.width && a.height === b.height);
}
export function matchesSkyFileBytes(data: ArrayBuffer, asset: SkyEncodedFile): boolean {
  return asset.format === "json" ? data.byteLength === asset.bytes &&
    skyImageContentHash(new Uint8Array(data)) === asset.sha256 : matchesSkyImageBytes(data, asset);
}
