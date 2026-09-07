import { mkdir, writeFile } from "node:fs/promises";
import { crc32, deflateSync } from "node:zlib";
import path from "node:path";

// Self-generated transport fixture: no photograph, EXIF, or location evidence.
const chunk = (type, data) => {
  const name = Buffer.from(type);
  const output = Buffer.alloc(data.length + 12);
  output.writeUInt32BE(data.length); name.copy(output, 4); data.copy(output, 8);
  output.writeUInt32BE(crc32(Buffer.concat([name, data])) >>> 0, data.length + 8);
  return output;
};
const header = Buffer.alloc(13);
header.writeUInt32BE(32); header.writeUInt32BE(32, 4); header[8] = 8; header[9] = 6;
const pixels = Buffer.alloc(32 * 129);
for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
  const offset = y * 129 + 1 + x * 4;
  pixels.set([180, 80, 60, 255], offset);
}
const target = path.resolve("artifacts/miniapp/upload-fixture/self-generated-transport-test.png");
await mkdir(path.dirname(target), { recursive: true });
await writeFile(target, Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk("IHDR", header), chunk("IDAT", deflateSync(pixels)), chunk("IEND", Buffer.alloc(0))]));
console.log(target);
