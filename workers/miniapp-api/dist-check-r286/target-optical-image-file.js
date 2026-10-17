import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
/** Bound JPEG SOF dimensions, without decoding or accepting dimensions from a
 * filename. Full decode/colour admission is the offline producer's obligation. */
function jpegDimensions(bytes) {
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9)
        return null;
    let offset = 2;
    while (offset + 4 <= bytes.length) {
        if (bytes[offset++] !== 0xff)
            return null;
        while (bytes[offset] === 0xff)
            offset++;
        const marker = bytes[offset++];
        if (marker === 0xda || marker === 0xd9 || marker === undefined)
            return null;
        if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7))
            continue;
        if (offset + 2 > bytes.length)
            return null;
        const length = bytes.readUInt16BE(offset);
        if (length < 2 || offset + length > bytes.length)
            return null;
        if (marker === 0xc0 || marker === 0xc2) {
            if (length !== 17 || bytes[offset + 2] !== 8 || bytes[offset + 7] !== 3)
                return null;
            return [bytes.readUInt16BE(offset + 5), bytes.readUInt16BE(offset + 3)];
        }
        offset += length;
    }
    return null;
}
export async function readTargetOpticalImageFile(manifestUrl, asset, format, invalidCode, pngContainer) {
    const bytes = await readFile(new URL(asset.file, manifestUrl));
    const rectangular = "width" in asset;
    const width = rectangular ? asset.width : asset.pixels, height = rectangular ? asset.height : asset.pixels;
    const jpegSize = format === "jpeg" && rectangular ? jpegDimensions(bytes) : null;
    const colorTypes = pngContainer?.pngColorTypes ?? [rectangular ? 2 : 6];
    if (!colorTypes.length || colorTypes.some(type => ![0, 2, 6].includes(type)))
        throw new Error(invalidCode);
    const formatValid = format === "png" ? bytes.length >= 45 &&
        bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
        bytes.readUInt32BE(8) === 13 && bytes.toString("ascii", 12, 16) === "IHDR" &&
        bytes.readUInt32BE(16) === width && bytes.readUInt32BE(20) === height &&
        bytes[24] === 8 && colorTypes.includes(bytes[25]) && bytes[26] === 0 && bytes[27] === 0 && bytes[28] === 0 &&
        bytes.readUInt32BE(bytes.length - 12) === 0 && bytes.subarray(-8, -4).toString("ascii") === "IEND" :
        bytes[0] === 0xff && bytes[1] === 0xd8 && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9 &&
            (!rectangular || jpegSize?.[0] === width && jpegSize[1] === height);
    if (bytes.length !== asset.bytes || createHash("sha256").update(bytes).digest("hex") !== asset.sha256 || !formatValid)
        throw new Error(invalidCode);
    return { bytes, contentType: format === "png" ? "image/png" : "image/jpeg",
        fieldDegrees: asset.fieldDegrees, pixelSize: "pixels" in asset ? asset.pixels : undefined,
        pixelWidth: width, pixelHeight: height };
}
//# sourceMappingURL=target-optical-image-file.js.map