import assert from "node:assert/strict";
import test from "node:test";
import { createSharePosterFiles } from "./share-poster-files";

const flush = async () => { for (let turn = 0; turn < 12; turn++) await Promise.resolve(); };
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(yes => { resolve = yes; });
  return { promise, resolve };
}

test("a shared preview PNG is not deleted while the album handoff still owns it", async () => {
  let bytes: string | undefined, removed = 0;
  const files = createSharePosterFiles<string>({ export: async frame => { bytes = frame; return "same.png"; },
    remove: async () => { removed++; bytes = undefined; } });
  const preview = await files.export("public-plan", () => true); files.retain(preview); files.release(preview);
  const album = await files.export("public-plan", () => true);
  files.release(preview); await flush();
  assert.equal(bytes, "public-plan"); assert.equal(removed, 0, "native album input remains readable");
  files.release(album); await flush(); assert.equal(bytes, undefined); assert.equal(removed, 1);
});

test("a new same-path export waits for an already-issued deletion to finish", async () => {
  const deletion = deferred(); let bytes: string | undefined, exports = 0;
  const files = createSharePosterFiles<string>({ export: async frame => { exports++; bytes = frame; return "same.png"; },
    remove: async () => { await deletion.promise; bytes = undefined; } });
  const first = await files.export("old-spot", () => true); files.release(first); await flush();
  const next = files.export("new-plan", () => true); await flush();
  assert.equal(exports, 1, "do not issue native export while its reused path is being deleted");
  deletion.resolve(); const image = await next;
  assert.equal(bytes, "new-plan"); assert.equal(exports, 2);
  files.retain(image); files.release(image); await flush(); assert.equal(bytes, "new-plan");
  files.release(image); await flush(); assert.equal(bytes, undefined);
});

test("retiring the prior preview during a same-path export cannot delete the new bytes", async () => {
  const exportDone = deferred(); let bytes: string | undefined, exports = 0, removed = 0;
  const files = createSharePosterFiles<string>({ export: async frame => {
    if (++exports === 2) await exportDone.promise;
    bytes = frame; return "same.png";
  }, remove: async () => { removed++; bytes = undefined; } });
  const old = await files.export("old-plan", () => true); const next = files.export("new-spot", () => true); await flush();
  files.release(old); exportDone.resolve(); const image = await next; await flush();
  assert.equal(bytes, "new-spot"); assert.equal(removed, 0);
  files.release(image); await flush(); assert.equal(bytes, undefined); assert.equal(removed, 1);
});

test("invalid native export cannot create an owned image; a settled cleanup failure does not wedge later exports", async () => {
  let calls = 0;
  const files = createSharePosterFiles<string>({ export: async () => ++calls === 1 ? "" : "valid.png",
    remove: async () => { throw new Error("native removal failed"); } });
  await assert.rejects(files.export("plan", () => true), /poster_export_path_unavailable/u);
  assert.throws(() => files.retain("unowned.png"), /poster_image_retired/u);
  const old = await files.export("spot", () => true); files.release(old); await flush();
  assert.equal(await files.export("new-plan", () => true), "valid.png");
});
