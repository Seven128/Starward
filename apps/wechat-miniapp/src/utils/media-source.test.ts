import assert from "node:assert/strict";
import test from "node:test";
import { mediaSource } from "./media-source";

test("published pictures use current BFF while packaged and external media retain their identity", () => {
  Object.assign(globalThis, { __MINIAPP_API_BASE__: "https://local-test.invalid/" });
  const path = "/v2/spots/spot%3Aexample/media/upload%3A123-abc/image";
  assert.equal(mediaSource(path), `https://local-test.invalid${path}`);
  for (const original of ["/assets/media/example.jpg", "https://example.org/photo.jpg", "data:image/png;base64,AA==", ""])
    assert.equal(mediaSource(original), original);
});
