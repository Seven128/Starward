import assert from "node:assert/strict";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
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

test("local upload retries ignore crash residue and retirement removes only their own temporary files", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "starward-media-residue-"));
  const store = new LocalFilesystemMediaObjectStore(root);
  const key = "contributions/0123456789abcdef01234567/residue-upload.png";
  const destination = path.join(root, ...key.split("/"));
  try {
    await mkdir(path.dirname(destination), { recursive: true });
    const legacy = destination + ".pending";
    const crash = destination + ".pending-01234567-89ab-cdef-0123-456789abcdef";
    const unrelated = destination + ".pending-unrelated";
    for (const file of [legacy, crash, unrelated]) await writeFile(file, "partial");
    // Contribution writers are serialized by the repository transaction.
    await store.put({ objectKey: key, bytes: Buffer.from("first") });
    await store.put({ objectKey: key, bytes: Buffer.from("second") });
    assert.equal(Buffer.from((await store.read(key))!).toString(), "second");
    assert.equal((await readdir(path.dirname(destination))).length, 4, "successful writers leave no own temporary file");
    await store.delete(key);
    assert.equal(await store.read(key), null);
    assert.deepEqual(await readdir(path.dirname(destination)), [path.basename(unrelated)]);
    await store.delete(key);
    await mkdir(destination);
    await assert.rejects(store.put({ objectKey: key, bytes: Buffer.from("rename must fail") }));
    assert.deepEqual((await readdir(path.dirname(destination))).sort(), [path.basename(destination), path.basename(unrelated)].sort());
  } finally { await rm(root, { recursive: true, force: true }); }
});
