import { crc32, deflateSync } from "node:zlib";

function chunk(type: string, data: Buffer) {
  const name = Buffer.from(type), output = Buffer.alloc(data.length + 12);
  output.writeUInt32BE(data.length); name.copy(output, 4); data.copy(output, 8);
  output.writeUInt32BE(crc32(Buffer.concat([name, data])) >>> 0, data.length + 8);
  return output;
}

/** Encoded test pixels only. No scientific source or processing receipt. */
export function syntheticOpticalPng(red = 32, green = 64, blue = 96): Buffer {
  const header = Buffer.alloc(13); header.writeUInt32BE(512); header.writeUInt32BE(512, 4); header[8] = 8; header[9] = 6;
  const scanlines = Buffer.alloc(512 * (1 + 512 * 4));
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const p = y * (1 + 512 * 4) + 1 + x * 4;
    scanlines[p] = red; scanlines[p + 1] = green; scanlines[p + 2] = blue; scanlines[p + 3] = x < 256 ? 255 : 0;
  }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header),
    chunk("IDAT", deflateSync(scanlines)), chunk("IEND", Buffer.alloc(0))]);
}
