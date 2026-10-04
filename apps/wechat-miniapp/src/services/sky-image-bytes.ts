import { skyImageContentHash } from "@starward/miniapp-contracts";

export interface SkyEncodedImage {
  sha256: string;
  bytes: number;
  width: number;
  height: number;
  format: "png" | "jpeg";
}

/** SOF dimensions, bounded before native decode. */
export function skyJpegDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 12 || bytes[0] !== 255 || bytes[1] !== 216 ||
    bytes[bytes.length - 2] !== 255 || bytes[bytes.length - 1] !== 217) return null;
  let offset = 2;
  while (offset + 4 <= Math.min(bytes.length, 64 * 1024)) {
    if (bytes[offset++] !== 255) return null;
    while (bytes[offset] === 255) offset++;
    const marker = bytes[offset++];
    if (marker === undefined || marker === 218 || marker === 217) return null;
    if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
    if (offset + 2 > bytes.length) return null;
    const length = (bytes[offset]! << 8) | bytes[offset + 1]!;
    if (length < 2 || offset + length > bytes.length) return null;
    if ((marker >= 192 && marker <= 195) || (marker >= 197 && marker <= 199) ||
      (marker >= 201 && marker <= 203) || (marker >= 205 && marker <= 207)) {
      if (length < 8 || bytes[offset + 2] !== 8) return null;
      const height = (bytes[offset + 3]! << 8) | bytes[offset + 4]!;
      const width = (bytes[offset + 5]! << 8) | bytes[offset + 6]!;
      return width > 0 && height > 0 ? { width, height } : null;
    }
    offset += length;
  }
  return null;
}

export function matchesSkyImageBytes(data: ArrayBuffer, asset: SkyEncodedImage): boolean {
  if (data.byteLength !== asset.bytes || data.byteLength < 24) return false;
  const bytes = new Uint8Array(data), header = new DataView(data);
  const dimensions = asset.format === "jpeg" ? skyJpegDimensions(bytes) :
    [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v) &&
      header.getUint32(12) === 0x49484452 ? { width: header.getUint32(16), height: header.getUint32(20) } : null;
  return dimensions?.width === asset.width && dimensions.height === asset.height &&
    skyImageContentHash(bytes) === asset.sha256;
}
