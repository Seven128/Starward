import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, readdir, stat, rename, unlink, open } from "node:fs/promises";
import { resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createSkyPublicImageCache, type PublicSkyImageDescriptor, type SkyPublicImageFileSystem } from "../../../../apps/wechat-miniapp/src/services/sky-public-image-cache.ts";
const repo = fileURLToPath(new URL("../../../../", import.meta.url));
const output = resolve(repo, "output/sky-public-cache-real-files-1002-r1");
const cacheRoot = resolve(output, "public-files-v1");
const sha = (body: Uint8Array) => createHash("sha256").update(body).digest("hex");
const record = async (path: string) => { const body = await readFile(path); return { path: relative(repo, path).replaceAll(sep, "/"), bytes: body.length, sha256: sha(body) }; };
const inside = (path: string) => { const full = resolve(path); assert.ok(full.startsWith(cacheRoot + sep), full); return full; };
const sources = ["apps/wechat-miniapp/src/services/sky-public-image-cache.ts", "apps/wechat-miniapp/src/services/sky-public-image-runtime.ts",
  "apps/wechat-miniapp/src/services/sky-image-bytes.ts", "apps/wechat-miniapp/src/features/sky/sky-artwork-request.ts"];
const preserved = JSON.parse(await readFile(resolve(repo, ".codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json"), "utf8"));
const landscapePath = resolve(repo, "workers/miniapp-api/assets/landscape/manifest.json");
const moonPath = resolve(repo, "workers/miniapp-api/assets/moon/coverage-manifest.json");
const landscape = JSON.parse(await readFile(landscapePath, "utf8")), moon = JSON.parse(await readFile(moonPath, "utf8"));
const inputs = [{ asset: moon.image, dir: resolve(repo, "workers/miniapp-api/assets/moon") },
  ...landscape.resources.map((resource: any) => ({ asset: resource.image, dir: resolve(repo, "workers/miniapp-api/assets/landscape") }))];
const protectedPaths = [...sources.map(p => resolve(repo, p)), landscapePath, moonPath,
  ...inputs.map(i => resolve(i.dir, i.asset.file)), ...preserved.map((p: any) => resolve(repo, p.path))];
const before = await Promise.all(protectedPaths.map(record));
for (const expected of preserved) assert.equal(before.find(p => p.path === expected.path)?.sha256, expected.sha256);
await mkdir(output); // Exclusive new generation; never overwrite a previous trial.
await writeFile(resolve(output, "started.json"), JSON.stringify({ before, scope: "offline Windows Node FS; not WX/runtime/HTTP" }, null, 2));
await writeFile(resolve(output, "executed-task.mts"), await readFile(fileURLToPath(import.meta.url)));
let transfers = 0, transferredBytes = 0, nativeOperations = 0, peakOperations = 0;
const actions: Array<{ event: string; epoch: number; entries: number; bytes: number; reserved: number; leased: number; running: number }> = [];
let cache: ReturnType<typeof createSkyPublicImageCache>;
const observe = (event: string) => { if (cache) actions.push({ event, ...cache.inspect() }); };
const io = async <T>(event: string, operation: () => Promise<T>) => {
  nativeOperations++; peakOperations = Math.max(peakOperations, nativeOperations); observe(event);
  try { return await operation(); } finally { nativeOperations--; observe(event + ":done"); }
};
const fs: SkyPublicImageFileSystem = {
  mkdir: path => io("mkdir", async () => { assert.equal(resolve(path), cacheRoot); await mkdir(path, { recursive: true }); }),
  list: path => io("list", async () => { assert.equal(resolve(path), cacheRoot); return readdir(path); }),
  size: path => io("stat", async () => { const s = await stat(inside(path)); assert.ok(s.isFile()); return s.size; }),
  read: (path, length) => io("read", async () => {
    const handle = await open(inside(path), "r");
    try { const body = Buffer.alloc(length); const result = await handle.read(body, 0, length, 0);
      assert.equal(result.bytesRead, length); return body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer;
    } finally { await handle.close(); }
  }),
  write: (path, data) => io("write", async () => { await writeFile(inside(path), new Uint8Array(data)); }),
  rename: (from, to) => io("rename", () => rename(inside(from), inside(to))),
  remove: path => io("remove", async () => { try { await unlink(inside(path)); } catch (cause: any) { if (cause.code !== "ENOENT") throw cause; } }),
};
const descriptors: Array<{ input: string; descriptor: PublicSkyImageDescriptor }> = [];
for (const i of inputs) {
  const original = await readFile(resolve(i.dir, i.asset.file));
  assert.equal(original.length, i.asset.bytes); assert.equal(sha(original), i.asset.sha256);
  descriptors.push({ input: resolve(i.dir, i.asset.file), descriptor: { environment: "e".repeat(64), sha256: i.asset.sha256,
    bytes: i.asset.bytes, width: i.asset.width, height: i.asset.height, format: "png", url: "https://offline.invalid/approved-source" } });
}
const make = (session: string) => createSkyPublicImageCache({ fs, root: cacheRoot, session,
  byteBudget: 32 * 1024 * 1024, maxFileBytes: 8 * 1024 * 1024,
  transfer(asset) {
    transfers++; transferredBytes += asset.bytes;
    return { promise: (async () => { const item = descriptors.find(i => i.descriptor.sha256 === asset.sha256)!;
      const body = await readFile(item.input); return body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer; })(), cancel() {} };
  } });
const drain = async () => { for (let i = 0; i < 100; i++) await Promise.resolve(); await new Promise<void>(yes => setImmediate(yes)); };
const stages: any[] = [];
try {
  cache = make("cold_runtime"); await cache.ready();
  const acquired = await Promise.all(descriptors.map(i => cache.acquire(i.descriptor).promise));
  // Immediate post-delivery join exercises the independently found settlement race.
  const duplicate = await cache.acquire(descriptors[0]!.descriptor).promise;
  assert.equal(duplicate.filePath, acquired[0]!.filePath); assert.equal(transfers, 3);
  for (let i = 0; i < acquired.length; i++) assert.equal((await record(acquired[i]!.filePath)).sha256, descriptors[i]!.descriptor.sha256);
  acquired.forEach(lease => lease.release()); assert.ok((await stat(duplicate.filePath)).isFile()); duplicate.release(); await drain();
  const coldBytes = transferredBytes; stages.push({ stage: "cold", transfers, transferredBytes, owner: cache.inspect() });
  const warm = await Promise.all(descriptors.map(i => cache.acquire(i.descriptor).promise)); warm.forEach(lease => lease.release()); await drain();
  assert.equal(transferredBytes, coldBytes); stages.push({ stage: "same-runtime-warm", extraTransfers: 0, extraTransferBytes: 0, owner: cache.inspect() });
  cache = make("restarted_runtime"); await cache.ready();
  const restored = await Promise.all(descriptors.map(i => cache.acquire(i.descriptor).promise)); restored.forEach(lease => lease.release()); await drain();
  assert.equal(transferredBytes, coldBytes); assert.equal(cache.inspect().leased, 0);
  stages.push({ stage: "new-owner-restored", extraTransfers: 0, extraTransferBytes: 0, owner: cache.inspect() });
  const entries = JSON.parse(await readFile(resolve(cacheRoot, "index-v1.json"), "utf8")).entries;
  for (const entry of entries) assert.equal((await record(resolve(cacheRoot, entry.file))).sha256, entry.sha256);
  await writeFile(resolve(output, "retained-file-readback.json"), JSON.stringify({ entries, files: await Promise.all(entries.map((e: any) => record(resolve(cacheRoot, e.file)))) }, null, 2));
  const cleared = await cache.clear(); assert.equal(cleared.status, "complete"); assert.equal(cache.inspect().entries, 0);
  assert.deepEqual(await readdir(cacheRoot), ["index-v1.json"]);
  assert.deepEqual(JSON.parse(await readFile(resolve(cacheRoot, "index-v1.json"), "utf8")), { version: 1, entries: [] });
  stages.push({ stage: "clear", result: cleared, owner: cache.inspect() });
  assert.deepEqual(await Promise.all(protectedPaths.map(record)), before);
  const result = { status: "PASS_DEVELOPMENT_MECHANISM_ONLY", scope: "real existing encoded sources and Windows Node filesystem; no HTTP/Canvas/WX/native/device/DAU capacity claim",
    inputs: descriptors.map(i => ({ path: relative(repo, i.input).replaceAll(sep, "/"), descriptor: i.descriptor })), stages,
    peakNativeFsOperations: peakOperations, peakEncodedAndReservedBytes: Math.max(...actions.map(a => a.bytes + a.reserved)),
    before, after: await Promise.all(protectedPaths.map(record)), limitations: ["Consumers/App/Settings clear not migrated", "Node rename/restart is not WX FS acceptance", "File bytes do not measure native/GPU memory", "No image decode or rendering-quality claim"] };
  await writeFile(resolve(output, "result.json"), JSON.stringify(result, null, 2));
  await writeFile(resolve(output, "events.json"), JSON.stringify(actions, null, 2));
  await writeFile(resolve(output, "binding.json"), JSON.stringify(await Promise.all(["started.json", "executed-task.mts", "retained-file-readback.json", "result.json", "events.json", "public-files-v1/index-v1.json"].map(p => record(resolve(output, p)))), null, 2));
  console.log(JSON.stringify({ output: relative(repo, output), transfers, coldBytes, stages: stages.map(s => s.stage), result: await record(resolve(output, "result.json")) }));
} catch (cause) {
  await writeFile(resolve(output, "failure.json"), JSON.stringify({ message: String(cause), owner: cache?.inspect(), events: actions.length }, null, 2)); throw cause;
}
