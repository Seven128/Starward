import { crc32, deflateSync } from "node:zlib";

function chunk(type: string, data: Buffer) {
  const name = Buffer.from(type), output = Buffer.alloc(data.length + 12);
  output.writeUInt32BE(data.length); name.copy(output, 4); data.copy(output, 8);
  output.writeUInt32BE(crc32(Buffer.concat([name, data])) >>> 0, data.length + 8);
  return output;
}

/** Encoded test pixels only. No scientific source or processing receipt. */
export function syntheticOpticalPng(red = 32, green = 64, blue = 96,
  options = { width: 512, height: 512, colorType: 6 as 0 | 2 | 6 }): Buffer {
  const { width, height, colorType } = options, channels = colorType === 0 ? 1 : colorType === 2 ? 3 : 4;
  const header = Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = colorType;
  const scanlines = Buffer.alloc(height * (1 + width * channels));
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const p = y * (1 + width * channels) + 1 + x * channels;
    scanlines[p] = red;
    if (channels > 1) { scanlines[p + 1] = green; scanlines[p + 2] = blue; }
    if (channels === 4) scanlines[p + 3] = x < width / 2 ? 255 : 0;
  }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header),
    chunk("IDAT", deflateSync(scanlines)), chunk("IEND", Buffer.alloc(0))]);
}
