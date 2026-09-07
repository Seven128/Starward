import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { sanitizeContributionImage } from "../../../workers/miniapp-api/src/media-object-store.ts";

const directory = path.resolve("artifacts/miniapp/upload-fixture");
const original = readFileSync(path.join(directory, "self-generated-transport-test.jpg"));
const segment = (marker: number, payload: Buffer) => {
  const header = Buffer.from([0xff, marker, 0, 0]);
  header.writeUInt16BE(payload.length + 2, 2);
  return Buffer.concat([header, payload]);
};
// Synthetic markers only: no real location or personal metadata.
const exif = segment(0xe1, Buffer.from("Exif\0\0synthetic-private-location"));
const comment = segment(0xfe, Buffer.from("synthetic-private-comment-after-scan"));
const injected = Buffer.concat([original.subarray(0, 2), exif, original.subarray(2, -2), comment, original.subarray(-2)]);
const sanitized = sanitizeContributionImage(injected, "image/jpeg");
assert.deepEqual(sanitized, original, "sanitizing metadata must preserve the actual encoded JPEG exactly");
assert.equal(sanitized.includes(Buffer.from("synthetic-private")), false);
writeFileSync(path.join(directory, "self-generated-with-private-markers.jpg"), injected);
writeFileSync(path.join(directory, "self-generated-sanitized.jpg"), sanitized);
console.log(JSON.stringify({ originalBytes: original.length, injectedBytes: injected.length, sanitizedBytes: sanitized.length, byteIdentical: true }));
