import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { LocalFilesystemMediaObjectStore, sanitizeContributionImage } from "./media-object-store.ts";

test("JPEG metadata is stripped between scans without changing entropy bytes", () => {
  const segment = (marker: number, body: Buffer) => {
    const header = Buffer.from([0xff, marker, 0, 0]);
    header.writeUInt16BE(body.length + 2, 2);
    return Buffer.concat([header, body]);
  };
  const start = Buffer.from([0xff, 0xd8]);
  const frame = segment(0xc2, Buffer.from([8, 0, 1, 0, 1, 1, 1, 0x11, 0]));
  const scan = segment(0xda, Buffer.from([1, 1, 0, 0, 63, 0]));
  const entropy = Buffer.from([0x12, 0xff, 0x00, 0x34, 0xff, 0xd0, 0x56]);
  const end = Buffer.from([0xff, 0xd9]);
  const privateSegments = [0xe1, 0xed, 0xfe].map((marker) => segment(marker, Buffer.from("private location")));
  const input = Buffer.concat([start, frame, scan, entropy, ...privateSegments, scan, entropy, end]);
  const expected = Buffer.concat([start, frame, scan, entropy, scan, entropy, end]);
  assert.deepEqual(sanitizeContributionImage(input, "image/jpeg"), expected);
  assert.throws(() => sanitizeContributionImage(Buffer.concat([start, end]), "image/jpeg"), /incomplete/);
  assert.throws(() => sanitizeContributionImage(input.subarray(0, -2), "image/jpeg"), /incomplete/);
  assert.throws(() => sanitizeContributionImage(Buffer.concat([input, Buffer.from("tail")]), "image/jpeg"), /trailing_data/);
});

test("local media object keys are portable across Windows and POSIX", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "starward-media-store-"));
  const store = new LocalFilesystemMediaObjectStore(root);
  try {
    await assert.rejects(
      store.put({
        objectKey:
          "contributions/0123456789abcdef01234567/upload:01234567-89ab-cdef-0123-456789abcdef.jpg",
        bytes: Buffer.from("unsafe"),
      }),
      /media_object_key_invalid/u,
    );
    const objectKey =
      "contributions/0123456789abcdef01234567/01234567-89ab-cdef-0123-456789abcdef.jpg";
    await store.put({ objectKey, bytes: Buffer.from("portable") });
    assert.deepEqual(await store.read(objectKey), Buffer.from("portable"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
