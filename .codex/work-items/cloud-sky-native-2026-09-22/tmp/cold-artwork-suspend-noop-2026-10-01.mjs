// apps/wechat-miniapp/src/features/sky/sky-artwork-file-retention.test.ts
import test from "node:test";
import assert from "node:assert/strict";

// apps/wechat-miniapp/src/features/sky/sky-artwork-loader.ts
function createSkyArtworkLoader(deps) {
  const entries = /* @__PURE__ */ new Map();
  let wanted = [], active = true, tick = 0, pumping = false;
  const budget = deps.byteBudget ?? 16 * 1024 * 1024;
  const key = (a) => a.sha256;
  const wantedKeys = () => new Set(wanted.map(key));
  const wantedIds = (hash) => new Set(wanted.filter((a) => key(a) === hash).map((a) => a.id));
  const wantedIdentity = () => JSON.stringify(wanted.map((a) => [a.id, key(a)]));
  const drop = (k, e) => {
    entries.delete(k);
    e.request++;
    e.cancel?.();
    e.loaded?.release();
    e.file?.release();
  };
  const emit = () => {
    if (!active) return;
    const images = /* @__PURE__ */ new Map(), retainedImages = /* @__PURE__ */ new Map();
    let failed = false, loading = false;
    for (const a of wanted) {
      const e = entries.get(key(a));
      if (e?.state === "ready") images.set(a.id, e.loaded.image);
      else if (e?.state === "error") failed = true;
      else loading = true;
    }
    const currentKeys = wantedKeys();
    for (const [hash, e] of entries) if (e.state === "ready" && e.loaded && !currentKeys.has(hash))
      for (const id of e.ids) retainedImages.set(id, e.loaded.image);
    deps.changed({ images, retainedImages, failed, loading });
  };
  const trim = () => {
    let bytes = [...entries.values()].reduce((n, e) => n + (e.loaded || e.file ? e.asset.width * e.asset.height * 4 : 0), 0);
    const keep = wantedKeys();
    for (const [k, e] of [...entries].sort((a, b) => a[1].last - b[1].last)) {
      if (bytes <= budget) break;
      if (!keep.has(k) && (e.loaded || e.file)) {
        bytes -= e.asset.width * e.asset.height * 4;
        drop(k, e);
      }
    }
  };
  const pump = () => {
    if (!active || pumping) return;
    pumping = true;
    try {
      for (const asset2 of wanted) {
        if ([...entries.values()].filter((e) => e.state === "loading").length >= 2) break;
        const k = key(asset2), cached = entries.get(k);
        if (cached && cached.state !== "cold") continue;
        const entry = cached ?? { asset: asset2, ids: wantedIds(k), state: "loading", request: 0, last: ++tick };
        entry.state = "loading";
        const request = ++entry.request;
        entries.set(k, entry);
        const current = () => active && entries.get(k) === entry && entry.request === request;
        const fail = () => {
          if (!current()) return;
          entry.state = "error";
          delete entry.cancel;
          emit();
          pump();
        };
        try {
          const ready = (loaded) => {
            if (!current()) {
              loaded.release();
              return;
            }
            entry.loaded = loaded;
            delete entry.file;
            entry.state = "ready";
            delete entry.cancel;
            entry.last = ++tick;
            trim();
            emit();
            pump();
          };
          const cancel = entry.file ? entry.file.decode(ready, fail) : deps.start(asset2, ready, fail);
          if (entries.get(k) === entry && entry.state === "loading") entry.cancel = cancel;
        } catch {
          fail();
        }
      }
    } finally {
      pumping = false;
    }
  };
  return {
    update(next) {
      if (!active) return;
      const previous = wantedIdentity();
      wanted = next;
      const keep = wantedKeys();
      for (const [k, e] of entries) if (!keep.has(k) && e.state === "loading") {
        if (e.file) {
          e.request++;
          e.cancel?.();
          delete e.cancel;
          e.state = "cold";
        } else drop(k, e);
      }
      for (const [k, e] of entries) if (keep.has(k)) e.ids = wantedIds(k);
      for (const a of wanted) {
        const e = entries.get(key(a));
        if (e) e.last = ++tick;
      }
      trim();
      pump();
      if (previous !== wantedIdentity()) emit();
    },
    suspendUnusedDecoded() {
      return;
      if (!active) return;
      const keep = wantedKeys();
      let changed = false;
      for (const [k, e] of entries) if (!keep.has(k) && e.state === "ready" && e.loaded?.retainFile) {
        e.file = e.loaded.retainFile();
        delete e.loaded;
        e.state = "cold";
        changed = true;
      }
      if (changed) emit();
    },
    failed(image) {
      for (const e of entries.values()) if (e.loaded?.image === image && e.state === "ready") {
        e.loaded.release();
        delete e.loaded;
        e.state = "error";
        e.gpuFailed = true;
        emit();
        break;
      }
    },
    retry() {
      const resetGpu = [...entries.values()].some((e) => e.state === "error" && e.gpuFailed);
      for (const [k, e] of entries) if (e.state === "error") drop(k, e);
      pump();
      emit();
      return resetGpu;
    },
    dispose() {
      active = false;
      for (const [k, e] of entries) drop(k, e);
      wanted = [];
    }
  };
}

// apps/wechat-miniapp/src/features/sky/sky-artwork-request.ts
function skyJpegDimensions(bytes) {
  if (bytes.length < 12 || bytes[0] !== 255 || bytes[1] !== 216 || bytes[bytes.length - 2] !== 255 || bytes[bytes.length - 1] !== 217) return null;
  let offset = 2;
  while (offset + 4 <= Math.min(bytes.length, 64 * 1024)) {
    if (bytes[offset++] !== 255) return null;
    while (bytes[offset] === 255) offset++;
    const marker = bytes[offset++];
    if (marker === void 0 || marker === 218 || marker === 217) return null;
    if (marker === 1 || marker >= 208 && marker <= 215) continue;
    if (offset + 2 > bytes.length) return null;
    const length = bytes[offset] << 8 | bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) return null;
    if (marker >= 192 && marker <= 195 || marker >= 197 && marker <= 199 || marker >= 201 && marker <= 203 || marker >= 205 && marker <= 207) {
      if (length < 8 || bytes[offset + 2] !== 8) return null;
      const height = bytes[offset + 3] << 8 | bytes[offset + 4];
      const width = bytes[offset + 5] << 8 | bytes[offset + 6];
      return width > 0 && height > 0 ? { width, height } : null;
    }
    offset += length;
  }
  return null;
}
function startSkyArtworkRequest(input) {
  let active = true, written = false, image = null, released = false, decodeId = 0;
  const detach = () => {
    if (image) {
      image.onload = null;
      image.onerror = null;
      image = null;
    }
  };
  const remove = () => {
    if (written) {
      written = false;
      try {
        input.removeFile(input.filePath);
      } catch {
      }
    }
  };
  const release = () => {
    if (released) return;
    released = true;
    decodeId++;
    detach();
    remove();
  };
  const fail = () => {
    if (!active) return;
    active = false;
    release();
    input.fail();
  };
  const file = { release, decode(ready, failed) {
    if (released) {
      failed();
      return () => {
      };
    }
    detach();
    const id = ++decodeId;
    const current = () => !released && decodeId === id;
    const decodeFailed = () => {
      if (!current()) return;
      detach();
      decodeId++;
      failed();
    };
    try {
      image = input.canvas.createImage();
      image.onload = () => {
        if (!current()) return;
        if (image?.width !== input.asset.width || image.height !== input.asset.height) {
          decodeFailed();
          return;
        }
        const decoded = image;
        detach();
        ready({
          image: decoded,
          // A suspended/superseded handle cannot delete a file now used by a
          // newer decode. The cache lease retains the unconditional release.
          release() {
            if (current()) release();
          },
          retainFile() {
            if (!current()) throw new Error("sky_image_file_lease_retired");
            decodeId++;
            return file;
          }
        });
      };
      image.onerror = decodeFailed;
      image.src = input.filePath;
    } catch {
      decodeFailed();
    }
    return () => {
      if (current()) {
        decodeId++;
        detach();
      }
    };
  } };
  let task;
  try {
    task = input.request({ url: input.url, responseType: "arraybuffer", fail, success(response) {
      if (!active) return;
      if (response.statusCode !== 200 || !(response.data instanceof ArrayBuffer) || response.data.byteLength !== input.asset.bytes || response.data.byteLength < 24) {
        fail();
        return;
      }
      const bytes = new Uint8Array(response.data), header = new DataView(response.data);
      const dimensions = input.format === "jpeg" ? skyJpegDimensions(bytes) : [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v) && header.getUint32(12) === 1229472850 ? { width: header.getUint32(16), height: header.getUint32(20) } : null;
      if (dimensions?.width !== input.asset.width || dimensions.height !== input.asset.height) {
        fail();
        return;
      }
      try {
        input.writeFile({
          filePath: input.filePath,
          data: response.data,
          fail() {
            written = true;
            remove();
            fail();
          },
          success() {
            written = true;
            if (!active) {
              remove();
              return;
            }
            file.decode((loaded) => {
              if (!active) {
                loaded.release();
                return;
              }
              active = false;
              input.ready(loaded);
            }, fail);
          }
        });
      } catch {
        written = true;
        remove();
        fail();
      }
    } });
  } catch {
    fail();
  }
  task?.catch?.(() => void 0);
  return () => {
    if (!active) return;
    active = false;
    try {
      task?.abort?.();
    } finally {
      release();
    }
  };
}

// apps/wechat-miniapp/src/features/sky/sky-artwork-file-retention.test.ts
var imageBytes = 128 * 256 * 4;
var asset = (id) => ({ id, sha256: id, width: 128, height: 256, bytes: 64 });
function harness(byteBudget = 4 * imageBytes) {
  const body = new ArrayBuffer(64), bytes = new Uint8Array(body);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  const header = new DataView(body);
  header.setUint32(12, 1229472850);
  header.setUint32(16, 128);
  header.setUint32(20, 256);
  const requests = [], images = [], handles = [], files = /* @__PURE__ */ new Set();
  let state = { images: /* @__PURE__ */ new Map(), retainedImages: /* @__PURE__ */ new Map(), loading: false, failed: false };
  const loader = createSkyArtworkLoader({ byteBudget, changed(next) {
    state = next;
  }, start(selected, ready, fail) {
    const path = "/owned/" + (requests.length + 1) + ".png";
    return startSkyArtworkRequest({
      asset: selected,
      url: "https://fixture.invalid/" + selected.sha256,
      filePath: path,
      canvas: { createImage() {
        const image = { width: 128, height: 256, src: "", onload: null, onerror: null };
        images.push(image);
        return image;
      } },
      request(options) {
        requests.push({ path, options });
        return { abort() {
        } };
      },
      writeFile(options) {
        files.add(options.filePath);
        options.success();
      },
      removeFile(file) {
        assert(files.delete(file), "release each owned file exactly once");
      },
      ready(value) {
        handles.push(value);
        ready(value);
      },
      fail
    });
  } });
  function finishRequest(index) {
    requests[index].options.success({ statusCode: 200, data: body });
    const image = images.find((candidate) => candidate.src === requests[index].path && candidate.onload);
    assert(image);
    image.onload();
    return image;
  }
  return { loader, requests, images, files, handles, finishRequest, get state() {
    return state;
  } };
}
test("unused illustrations keep bounded files and return through a fresh decode without another request", () => {
  const h = harness(), a = asset("a");
  h.loader.update([a]);
  const first = h.finishRequest(0), oldHandle = h.handles[0];
  h.loader.update([]);
  assert.equal(h.state.retainedImages.get("a"), first);
  h.loader.suspendUnusedDecoded();
  assert.equal(h.state.retainedImages.size, 0);
  assert.equal(h.files.size, 1);
  h.loader.suspendUnusedDecoded();
  assert.equal(h.files.size, 1);
  h.loader.update([{ ...a, id: "new-coordinate" }]);
  assert.equal(h.requests.length, 1);
  assert.equal(h.state.loading, true);
  const returning = h.images[1];
  assert.equal(returning.src, h.requests[0].path);
  assert.notEqual(returning, first);
  returning.onload();
  assert.equal(h.state.images.get("new-coordinate"), returning);
  assert.equal(h.state.failed, false);
  oldHandle.release();
  assert.equal(h.files.size, 1, "a transferred decoded handle cannot delete the current file");
  h.loader.dispose();
  assert.equal(h.files.size, 0);
  assert.equal(returning.onload, null);
  assert.equal(returning.onerror, null);
});
test("a canceled cached decode cannot publish late or delete the file reused by its replacement", () => {
  const h = harness(), a = asset("a");
  h.loader.update([a]);
  h.finishRequest(0);
  h.loader.update([]);
  h.loader.suspendUnusedDecoded();
  h.loader.update([a]);
  const late = h.images[1].onload;
  h.loader.update([]);
  assert.equal(h.images[1].onload, null);
  assert.equal(h.files.size, 1);
  h.loader.update([a]);
  late();
  assert.equal(h.state.images.size, 0);
  assert.equal(h.state.loading, true);
  h.images[2].onload();
  assert.equal(h.state.images.get("a"), h.images[2]);
  assert.equal(h.requests.length, 1);
  h.loader.dispose();
  assert.equal(h.files.size, 0);
});
test("a cached file decode failure is latched and explicit retry replaces its file instead of looping", () => {
  const h = harness(), a = asset("a");
  h.loader.update([a]);
  h.finishRequest(0);
  h.loader.update([]);
  h.loader.suspendUnusedDecoded();
  h.loader.update([a]);
  h.images[1].onerror();
  assert.equal(h.state.failed, true);
  h.loader.update([a]);
  assert.equal(h.requests.length, 1);
  assert.equal(h.images.length, 2);
  assert.equal(h.loader.retry(), false);
  assert.equal(h.files.size, 0);
  assert.equal(h.requests.length, 2);
  const replacement = h.finishRequest(1);
  assert.equal(h.state.images.get("a"), replacement);
  assert.equal(h.state.failed, false);
  h.loader.failed(replacement);
  assert.equal(h.files.size, 0);
  assert.equal(h.loader.retry(), true);
  h.finishRequest(2);
  h.loader.dispose();
  assert.equal(h.files.size, 0);
});
test("cold files still consume the original source-equivalent retention allowance", () => {
  const h = harness(imageBytes), a = asset("a"), b = asset("b");
  h.loader.update([a]);
  h.finishRequest(0);
  h.loader.update([]);
  h.loader.suspendUnusedDecoded();
  assert.equal(h.files.size, 1);
  h.loader.update([b]);
  h.finishRequest(1);
  assert.equal(h.files.size, 1, "trim the cold file instead of enlarging the cache");
  h.loader.update([a]);
  assert.equal(h.requests.length, 3, "an evicted file must use the real request boundary again");
  h.finishRequest(2);
  h.loader.dispose();
  assert.equal(h.files.size, 0);
});
test("cached decodes share the two-load queue and disposing cancels every in-flight decode", () => {
  const h = harness(), wanted = ["a", "b", "c"].map(asset);
  h.loader.update(wanted);
  assert.equal(h.requests.length, 2);
  h.finishRequest(0);
  h.finishRequest(1);
  h.finishRequest(2);
  h.loader.update([]);
  h.loader.suspendUnusedDecoded();
  h.loader.update(wanted);
  assert.equal(h.images.length, 5, "start two cached decodes");
  assert.equal(h.requests.length, 3);
  h.images[3].onload();
  assert.equal(h.images.length, 6, "completion admits the next cached decode");
  const late = h.images[5].onload;
  h.loader.dispose();
  assert.equal(h.files.size, 0);
  assert.equal(h.images[4].onload, null);
  assert.equal(h.images[5].onload, null);
  late();
  assert.equal(h.files.size, 0);
});
test("a cached decode still checks native dimensions before making the image usable", () => {
  const h = harness(), a = asset("a");
  h.loader.update([a]);
  h.finishRequest(0);
  h.loader.update([]);
  h.loader.suspendUnusedDecoded();
  h.loader.update([a]);
  h.images[1].width = 1;
  h.images[1].onload();
  assert.equal(h.state.failed, true);
  assert.equal(h.state.images.size, 0);
  h.loader.dispose();
  assert.equal(h.files.size, 0);
});
