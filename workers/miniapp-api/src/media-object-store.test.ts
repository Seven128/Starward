import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { LocalFilesystemMediaObjectStore } from "./media-object-store.ts";

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
